"""Things endpoints ask for: a database session and the logged-in user."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AuthSession, User
from app.db.session import SessionLocal
from app.errors import ApiError
from app.security import SESSION_COOKIE, token_hash


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db


Db = Annotated[Session, Depends(get_db)]


def current_user(db: Db, dc_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None) -> User:
    if dc_session:
        session = db.scalars(select(AuthSession).where(AuthSession.token_hash == token_hash(dc_session))).first()
        if session and session.expires_at > datetime.now(UTC):
            return session.user
    raise ApiError(401, "not_logged_in", "Please log in.")


CurrentUser = Annotated[User, Depends(current_user)]
