"""Sharing a dream to Community, anonymized, and taking it back (docs/api-contract.md, Community)."""

from __future__ import annotations

import re

from fastapi import APIRouter
from sqlalchemy import select, update

from app.db.models import Dream, SharedDream
from app.deps import CurrentUser, Db
from app.routers.dreams import own_dream
from app.schemas import ShareCreate, SharedOut, SharePreview
from app.services.dreams import to_summary

router = APIRouter(tags=["sharing"])


def anonymize(dream: Dream) -> SharePreview:
    """Replaces the people tagged in a dream with "someone" ("my sister's" → "someone's"; 奶奶 → 某人).

    A first pass by rule; the AI version (Phase 5) also catches names that weren't tagged.
    The dreamer always sees and can edit the result before sharing.
    """
    text, removed = dream.text, []
    people = sorted({el.value for el in dream.elements if el.kind == "person" and el.kept}, key=len, reverse=True)
    for person in people:
        if any("\u4e00" <= ch <= "\u9fff" for ch in person):
            pattern, someone = re.escape(person), "某人"  # Chinese has no word boundaries
        else:
            pattern, someone = rf"\b(?:(?:my|our|his|her|their)\s+)?{re.escape(person)}\b", "someone"
        text, n = re.subn(pattern, someone, text, flags=re.IGNORECASE)
        if n:
            removed.append(person)
    # "Someone" at the start of a sentence.
    text = re.sub(r"(^|[.!?]\s+)someone", lambda m: m.group(1) + "Someone", text)
    return SharePreview(text=text, removed=removed)


@router.post("/dreams/{dream_id}/share/preview", response_model=SharePreview)
def preview_share(dream_id: int, user: CurrentUser, db: Db):
    return anonymize(own_dream(db, user, dream_id))


@router.post("/dreams/{dream_id}/share", status_code=201, response_model=SharedOut)
def share_dream(dream_id: int, body: ShareCreate, user: CurrentUser, db: Db):
    dream = own_dream(db, user, dream_id)
    summary = to_summary(dream)
    # Sharing again updates the earlier snapshot in place.
    share = dream.share or SharedDream()
    share.text, share.emotion, share.blend = body.text, summary.emotion, summary.blend
    share.top_symbol = summary.top_symbol.value if summary.top_symbol else None
    share.include_readings, share.include_image = body.include_readings, body.include_image
    dream.share = share
    dream.visibility = "shared"
    db.commit()
    return dream.share


@router.delete("/dreams/{dream_id}/share", status_code=204)
def unshare_dream(dream_id: int, user: CurrentUser, db: Db):
    dream = own_dream(db, user, dream_id)
    dream.share = None
    dream.visibility = "private"
    db.commit()


@router.delete("/me/shares", status_code=204)
def unshare_everything(user: CurrentUser, db: Db):
    mine = select(Dream.id).where(Dream.user_id == user.id)
    for share in db.scalars(select(SharedDream).where(SharedDream.dream_id.in_(mine))):
        db.delete(share)
    db.execute(update(Dream).where(Dream.user_id == user.id).values(visibility="private"))
    db.commit()
