"""Rules that derive fields from what the dreamer recorded."""

from __future__ import annotations

POSITIVE = {"calm", "lucid", "joy"}
NEGATIVE = {"fear", "unease", "sadness"}


def dream_type(valence: int | None, intensity: int | None, emotions: list[str]) -> str:
    """Decision 9's starting rule (docs/data-model.md); the dreamer can always override it.

    nightmare: very dark and intense · pleasant: light · mixed: both positive and
    negative feelings · neutral: everything else.
    """
    if valence is not None and valence <= -2 and (intensity or 0) >= 4:
        return "nightmare"
    if valence is not None and valence >= 1:
        return "pleasant"
    felt = set(emotions)
    if felt & POSITIVE and felt & NEGATIVE:
        return "mixed"
    return "neutral"
