"""Dreams: create, read, update, list, delete and restore (docs/api-contract.md, Dreams)."""

from __future__ import annotations

import base64
from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import selectinload

from app.db.models import Dream, DreamElement, DreamEmotion, Symbol
from app.deps import CurrentUser, Db
from app.errors import ApiError, not_found
from app.schemas import DeletedDream, DreamCreate, DreamList, DreamOut, DreamPatch, DreamType, Emotion, RelatedDream
from app.services.dreams import apply_fields, choose_top_element, next_number, to_out, to_summary

router = APIRouter(prefix="/dreams", tags=["dreams"])

PURGE_AFTER = timedelta(days=30)  # decision 6


def own_dream(db: Db, user: CurrentUser, dream_id: int, *, deleted: bool = False) -> Dream:
    dream = db.get(Dream, dream_id)
    # Someone else's dream gets the same 404 as a missing one.
    if dream is None or dream.user_id != user.id or (dream.deleted_at is not None) != deleted:
        raise not_found()
    return dream


# ---------- List and search ----------


@router.get("", response_model=DreamList)
def list_dreams(
    user: CurrentUser,
    db: Db,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
    emotion: Emotion | None = None,
    symbol: str | None = None,
    person_id: int | None = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
    type: DreamType | None = None,
    lucid: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    cursor: str | None = None,
):
    in_range = [Dream.user_id == user.id, Dream.deleted_at.is_(None)]
    if date_from:
        in_range.append(Dream.dreamed_on >= date_from)
    if date_to:
        in_range.append(Dream.dreamed_on <= date_to)

    # Counts for the emotion filter chips cover the whole range, before the other filters.
    counts = dict(db.execute(
        select(DreamEmotion.emotion, func.count(func.distinct(Dream.id)))
        .join(Dream).where(*in_range, DreamEmotion.kept).group_by(DreamEmotion.emotion)
    ).all())

    where = list(in_range)
    if emotion:
        where.append(exists().where(DreamEmotion.dream_id == Dream.id, DreamEmotion.emotion == emotion, DreamEmotion.kept))
    if symbol:
        where.append(exists().where(
            DreamElement.dream_id == Dream.id, DreamElement.kept,
            DreamElement.symbol_id == select(Symbol.id).where(Symbol.code == symbol).scalar_subquery(),
        ))
    if person_id is not None:
        where.append(exists().where(DreamElement.dream_id == Dream.id, DreamElement.person_id == person_id))
    if q:
        like = f"%{q}%"
        where.append(or_(
            Dream.text.ilike(like), Dream.title.ilike(like),
            exists().where(DreamElement.dream_id == Dream.id, DreamElement.value.ilike(like)),
        ))
    if type:
        where.append(Dream.dream_type == type)
    if lucid is not None:
        where.append(Dream.lucidity >= 2 if lucid else or_(Dream.lucidity < 2, Dream.lucidity.is_(None)))
    if cursor:
        last_date, last_id = _read_cursor(cursor)
        where.append(or_(Dream.dreamed_on < last_date, (Dream.dreamed_on == last_date) & (Dream.id < last_id)))

    dreams = db.scalars(
        select(Dream).where(*where)
        .order_by(Dream.dreamed_on.desc(), Dream.id.desc())
        .limit(limit + 1)
        .options(selectinload(Dream.emotions), selectinload(Dream.elements).selectinload(DreamElement.symbol))
    ).all()
    page, more = dreams[:limit], len(dreams) > limit
    return DreamList(
        items=[to_summary(d) for d in page],
        next_cursor=_make_cursor(page[-1]) if more else None,
        counts_by_emotion=counts,
    )


def _make_cursor(dream: Dream) -> str:
    return base64.urlsafe_b64encode(f"{dream.dreamed_on.isoformat()}|{dream.id}".encode()).decode()


def _read_cursor(cursor: str) -> tuple[date, int]:
    try:
        day, dream_id = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
        return date.fromisoformat(day), int(dream_id)
    except (ValueError, UnicodeDecodeError):
        raise ApiError(400, "bad_cursor", "That page link is invalid.", "cursor") from None


# ---------- Recently deleted (declared before /{dream_id} so "deleted" isn't read as an id) ----------


@router.get("/deleted", response_model=list[DeletedDream])
def recently_deleted(user: CurrentUser, db: Db):
    cutoff = datetime.now(UTC) - PURGE_AFTER
    dreams = db.scalars(
        select(Dream)
        .where(Dream.user_id == user.id, Dream.deleted_at.is_not(None), Dream.deleted_at >= cutoff)
        .order_by(Dream.deleted_at.desc())
    ).all()
    return [
        DeletedDream(id=d.id, number=d.number, dreamed_on=d.dreamed_on, title=d.title,
                     deleted_at=d.deleted_at, purge_on=(d.deleted_at + PURGE_AFTER).date())
        for d in dreams
    ]


# ---------- One dream ----------


@router.post("", status_code=201, response_model=DreamOut)
def create_dream(body: DreamCreate, user: CurrentUser, db: Db):
    dream = Dream(user_id=user.id, number=next_number(db, user), dreamed_on=body.dreamed_on, text=body.text,
                  source=body.source or "text")
    db.add(dream)  # before apply_fields, whose dictionary lookup would otherwise flush a half-attached dream
    apply_fields(db, user, dream, body)
    db.flush()
    choose_top_element(dream)
    db.commit()
    return to_out(db, dream)


@router.get("/{dream_id}", response_model=DreamOut)
def get_dream(dream_id: int, user: CurrentUser, db: Db):
    return to_out(db, own_dream(db, user, dream_id))


@router.get("/{dream_id}/related", response_model=list[RelatedDream])
def related_dreams(dream_id: int, user: CurrentUser, db: Db):
    """For "Connected dreams": your other dreams sharing a dictionary symbol or a person, most shared first."""
    dream = own_dream(db, user, dream_id)
    symbols = {el.symbol.code for el in dream.elements if el.kept and el.symbol}
    people = {el.value.strip().lower() for el in dream.elements if el.kept and el.kind == "person"}
    if not symbols and not people:
        return []
    others = db.scalars(
        select(Dream)
        .where(Dream.user_id == user.id, Dream.deleted_at.is_(None), Dream.id != dream.id)
        .options(selectinload(Dream.emotions), selectinload(Dream.elements).selectinload(DreamElement.symbol))
    ).all()
    found = []
    for other in others:
        shared_symbols = sorted(symbols & {el.symbol.code for el in other.elements if el.kept and el.symbol})
        shared_people = sorted(people & {el.value.strip().lower() for el in other.elements if el.kept and el.kind == "person"})
        if shared_symbols or shared_people:
            found.append(RelatedDream(dream=to_summary(other), symbols=shared_symbols, people=shared_people))
    found.sort(key=lambda r: (-(len(r.symbols) + len(r.people)), -r.dream.dreamed_on.toordinal()))
    return found


@router.patch("/{dream_id}", response_model=DreamOut)
def update_dream(dream_id: int, body: DreamPatch, user: CurrentUser, db: Db):
    dream = own_dream(db, user, dream_id)
    sent = body.model_dump(exclude_unset=True)

    if "dreamed_on" in sent:
        dream.dreamed_on = body.dreamed_on
    if "text" in sent and body.text != dream.text:
        dream.original_text = dream.original_text or dream.text  # keep the very first version
        dream.text = body.text
    if "dream_type" in sent:
        # The dreamer's own choice; recalculations won't overwrite it (decision 9).
        dream.dream_type = body.dream_type
        dream.dream_type_set_by = "user" if body.dream_type else "auto"

    apply_fields(db, user, dream, body)
    db.flush()

    if "top_element_id" in sent:
        if body.top_element_id is not None and body.top_element_id not in {el.id for el in dream.elements}:
            raise ApiError(422, "element_not_found", "That element isn't part of this dream.", "top_element_id")
        dream.top_element_id = body.top_element_id
    else:
        choose_top_element(dream)
    db.commit()
    return to_out(db, dream)


@router.delete("/{dream_id}", status_code=204)
def delete_dream(dream_id: int, user: CurrentUser, db: Db):
    dream = own_dream(db, user, dream_id)
    dream.deleted_at = datetime.now(UTC)
    # Decision 6: a shared copy disappears right away, not after 30 days.
    dream.visibility = "private"
    dream.share = None
    db.commit()


@router.post("/{dream_id}/restore", response_model=DreamOut)
def restore_dream(dream_id: int, user: CurrentUser, db: Db):
    dream = own_dream(db, user, dream_id, deleted=True)
    dream.deleted_at = None
    db.commit()
    return to_out(db, dream)


@router.delete("/{dream_id}/forever", status_code=204)
def delete_forever(dream_id: int, user: CurrentUser, db: Db):
    # Only from Recently deleted, so one tap can't erase a dream with no way back.
    dream = own_dream(db, user, dream_id, deleted=True)
    db.delete(dream)
    db.commit()
