"""Email + password sign-in (decision 8). Google and Apple are added once their
developer accounts exist; they will create sessions the same way."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Cookie, Response
from sqlalchemy import delete, select

from app.db.models import AuthSession, User
from app.deps import Db
from app.errors import ApiError
from app.routers.me import user_out
from app.schemas import Login, Register, UserOut
from app.security import (
    COOKIE_SECURE,
    SESSION_COOKIE,
    SESSION_DAYS,
    hash_password,
    new_session_token,
    token_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def start_session(db: Db, user: User, response: Response) -> None:
    token, hashed, expires = new_session_token()
    db.add(AuthSession(user_id=user.id, token_hash=hashed, expires_at=expires))
    # http-only: page scripts can't read it, so a script injected into the page can't steal it.
    response.set_cookie(
        SESSION_COOKIE, token, max_age=SESSION_DAYS * 86_400,
        httponly=True, samesite="lax", secure=COOKIE_SECURE, path="/",
    )


@router.post("/register", status_code=201, response_model=UserOut)
def register(body: Register, db: Db, response: Response):
    email = body.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise ApiError(409, "email_taken", "An account with that email already exists.", "email")
    user = User(email=email, password_hash=hash_password(body.password))
    if body.display_name:
        user.display_name = body.display_name
    db.add(user)
    db.flush()
    start_session(db, user, response)
    db.commit()
    return user_out(db, user)


@router.post("/login", response_model=UserOut)
def login(body: Login, db: Db, response: Response):
    user = db.scalars(select(User).where(User.email == body.email.strip().lower())).first()
    # Same message whether the email or the password was wrong, so it doesn't reveal who has an account.
    if not verify_password(body.password, user.password_hash if user else None):
        raise ApiError(401, "wrong_credentials", "Email or password is incorrect.")
    start_session(db, user, response)
    db.commit()
    return user_out(db, user)


@router.post("/logout", status_code=204)
def logout(db: Db, response: Response, dc_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None):
    if dc_session:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == token_hash(dc_session)))
        db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.post("/password/forgot", status_code=202)
def forgot_password():
    # Always 202 so it doesn't reveal which emails exist.
    # Not sending email yet: that needs an email service (a later decision).
    return None
