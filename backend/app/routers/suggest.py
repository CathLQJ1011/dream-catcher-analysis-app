"""Capture pre-fill (docs/api-contract.md, Capture helpers)."""

from __future__ import annotations

from fastapi import APIRouter

from app.deps import CurrentUser, Db
from app.schemas import DreamSuggestion, SuggestIn
from app.services import suggest

router = APIRouter(tags=["capture"])


@router.post("/dreams/suggest", response_model=DreamSuggestion)
def suggest_dream(body: SuggestIn, user: CurrentUser, db: Db):
    suggest.check_limit(user.id)
    return suggest.suggest(db, user, body.text)
