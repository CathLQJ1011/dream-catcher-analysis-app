"""Feelings in your own words (docs/api-contract.md, Capture helpers)."""

from __future__ import annotations

from fastapi import APIRouter

from app.deps import CurrentUser
from app.schemas import FeelingPlace, FeelingPlaced
from app.services import feelings

router = APIRouter(tags=["capture"])


@router.post("/feelings/place", response_model=FeelingPlaced)
def place_feeling(body: FeelingPlace, user: CurrentUser):
    feelings.check_limit(user.id)
    return FeelingPlaced(label=body.label, emotion=feelings.place(body.label))
