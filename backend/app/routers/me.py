"""Your profile and settings (the Me screen)."""

from __future__ import annotations

from collections import Counter
from datetime import date, time, timedelta

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Dream, DreamEmotion, User
from app.deps import CurrentUser, Db
from app.errors import ApiError
from app.schemas import DeleteAccount, Reminder, Stats, UserOut, UserPatch

router = APIRouter(prefix="/me", tags=["me"])

DEFAULT_REMINDER = time(7, 30)


def user_out(db: Session, user: User) -> UserOut:
    live = (Dream.user_id == user.id) & Dream.deleted_at.is_(None)
    count, since = db.execute(select(func.count(), func.min(Dream.dreamed_on)).where(live)).one()
    shared = db.scalar(select(func.count()).where(live & (Dream.visibility == "shared")))
    recent = db.scalars(
        select(DreamEmotion.emotion).join(Dream)
        .where(live & DreamEmotion.kept & (Dream.dreamed_on >= date.today() - timedelta(days=90)))
    ).all()
    return UserOut(
        id=user.id, email=user.email, display_name=user.display_name, profile_orb=user.profile_orb,
        capture_with=user.capture_with, memories=user.memories, traditions=user.traditions, check_in=user.check_in,
        reminder=Reminder(enabled=user.reminder_at is not None, time=user.reminder_at),
        stats=Stats(dreams=count, since=since, shared=shared, top_emotions=[e for e, _ in Counter(recent).most_common(2)]),
    )


@router.get("", response_model=UserOut)
def get_me(user: CurrentUser, db: Db):
    return user_out(db, user)


@router.patch("", response_model=UserOut)
def update_me(body: UserPatch, user: CurrentUser, db: Db):
    sent = body.model_dump(exclude_unset=True)
    for name in ("display_name", "capture_with", "memories", "traditions", "check_in"):
        if name in sent:
            setattr(user, name, sent[name])
    if body.profile_orb is not None:
        orb = body.profile_orb
        if orb.mode == "dream":
            owns = db.scalar(select(Dream.id).where((Dream.id == orb.dream_id) & (Dream.user_id == user.id)))
            if not owns:
                raise ApiError(422, "dream_not_found", "That dream doesn't exist.", "profile_orb.dream_id")
        if orb.mode == "mix" and orb.emotion is None:
            raise ApiError(422, "invalid_value", "Pick at least one emotion.", "profile_orb.emotion")
        user.profile_orb = orb.model_dump(exclude_none=True)
    if body.reminder is not None:
        user.reminder_at = (body.reminder.time or DEFAULT_REMINDER) if body.reminder.enabled else None
    db.commit()
    return user_out(db, user)


@router.delete("", status_code=204)
def delete_me(body: DeleteAccount, user: CurrentUser, db: Db):
    # Deletes the account and, through the database's cascades, every dream and session.
    db.delete(user)
    db.commit()
