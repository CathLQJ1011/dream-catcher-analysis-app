"""Patterns: one lens at a time over a period (docs/api-contract.md, Patterns)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter
from sqlalchemy import exists, select
from sqlalchemy.orm import selectinload

from app.db.models import Dream, DreamElement, DreamEmotion, Symbol
from app.deps import CurrentUser, Db
from app.schemas import DreamType, Emotion, Lens, PatternFrame, Period
from app.services import patterns

router = APIRouter(prefix="/patterns", tags=["patterns"])


@router.get("/{lens}", response_model=PatternFrame)
def get_pattern(
    lens: Lens,
    user: CurrentUser,
    db: Db,
    period: Period = "30d",
    emotion: Emotion | None = None,
    symbol: str | None = None,
    type: DreamType | None = None,
):
    today = date.today()
    where = [Dream.user_id == user.id, Dream.deleted_at.is_(None), Dream.dreamed_on >= patterns.period_start(period, today)]
    if emotion:
        where.append(exists().where(DreamEmotion.dream_id == Dream.id, DreamEmotion.emotion == emotion, DreamEmotion.kept))
    if symbol:
        where.append(exists().where(
            DreamElement.dream_id == Dream.id, DreamElement.kept,
            DreamElement.symbol_id == select(Symbol.id).where(Symbol.code == symbol).scalar_subquery(),
        ))
    if type:
        where.append(Dream.dream_type == type)
    dreams = db.scalars(
        select(Dream).where(*where)
        .order_by(Dream.dreamed_on, Dream.id)
        .options(selectinload(Dream.emotions), selectinload(Dream.elements).selectinload(DreamElement.symbol))
    ).all()
    return patterns.build(lens, period, list(dreams), today)
