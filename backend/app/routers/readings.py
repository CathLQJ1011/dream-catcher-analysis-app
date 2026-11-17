"""AI readings of a dream (docs/api-contract.md, Readings): 周公解梦 and Jungian."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks

from app.db.models import Interpretation
from app.deps import CurrentUser, Db
from app.errors import ApiError, not_found
from app.routers.dreams import own_dream
from app.schemas import ReadingFeedback, ReadingOut, ReadingsCreate
from app.services import readings

router = APIRouter(tags=["readings"])

READY = ("zhougong", "jung")  # also the order the cards appear in


@router.post("/dreams/{dream_id}/readings", status_code=202, response_model=list[ReadingOut])
def start_readings(
    dream_id: int, user: CurrentUser, db: Db, tasks: BackgroundTasks, body: ReadingsCreate | None = None
):
    dream = own_dream(db, user, dream_id)
    traditions = (body or ReadingsCreate()).traditions
    if traditions is None:  # the traditions turned on in Me, or every ready one if none of them is ready yet
        traditions = [t for t in READY if t in user.traditions] or list(READY)
    if not_yet := [t for t in traditions if t not in READY]:
        raise ApiError(422, "tradition_not_ready", f"{', '.join(not_yet)} readings aren't available yet.", "traditions")
    started = readings.start(db, dream, traditions)
    tasks.add_task(readings.run_readings, [r.id for r in started])
    return [readings.to_out(r) for r in started]


@router.get("/dreams/{dream_id}/readings", response_model=list[ReadingOut])
def get_readings(dream_id: int, user: CurrentUser, db: Db):
    dream = own_dream(db, user, dream_id)
    return [readings.to_out(r) for r in readings.latest(dream)]


@router.post("/readings/{reading_id}/feedback", status_code=204)
def reading_feedback(reading_id: int, body: ReadingFeedback, user: CurrentUser, db: Db):
    r = db.get(Interpretation, reading_id)
    if r is None or r.dream.user_id != user.id or r.dream.deleted_at is not None:
        raise not_found("reading")
    r.resonated = body.resonated
    db.commit()
