"""Capture step 2, filled in from the dream (docs/screens.md, "Capture is three steps"; decision 23).

Claude reads the dream and proposes feelings, map position, vividness, lucidity, a title and the
people, places and images in it. It only describes the dream as told; meaning belongs to readings.
Dictionary codes and people are matched here in code, not by Claude. Nothing is saved.
"""

from __future__ import annotations

import logging
from typing import Literal

import anthropic
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Person, User
from app.errors import ApiError
from app.matching import find_symbols
from app.schemas import DreamSuggestion, Emotion, MapPoint, PersonMatch, SuggestedElement, SuggestedEmotion
from app.services import ai_limit, readings
from app.services.dreams import LOOKUP_KINDS, _symbol_index

log = logging.getLogger(__name__)

HOURLY_LIMIT = 30  # decision 17
UNAVAILABLE = "Couldn't read the dream automatically. Fill in what you remember."

PROMPT = """You help someone log a dream they just told, half-awake, in a dream journal.
Read the dream and fill in a short check-in for them to correct. Describe only what is in
the dream as told; do not interpret it or say what it means.

Use the dream's own language for every word you write (title, own words, elements). If the
dreamer mixes languages, keep each word as they said it.

- title: a plain name to find the dream by later, at most 8 words, built from its most
  memorable image or event ("The cat at the empty bowl"). Not a summary, not a meaning.
- emotions: the one or two feelings the dreamer had during the dream, strongest first, each
  as one of: calm, lucid (wonder, awe, knowing it's a dream), longing, joy, fear, unease
  (anxiety, guilt, shame, something off), sadness, neutral (flat or no clear feeling). Use
  what they say they felt; if they say nothing, infer gently from what happens, and prefer
  one feeling to guessing two. intensity 1 (faint) to 5 (overwhelming). own_word: when the
  dreamer names a feeling more exact than the family ("guilty", "怀念", "embarrassed"), their
  word exactly as written; otherwise null. Never invent an own_word.
- valence: how dark or light the dream felt overall, -2 (very dark) to 2 (very light).
- intensity: how quiet or intense it was overall, 1 to 5.
- vividness: 0 to 1, from how much clear detail the telling has (colors, faces, places,
  dialogue). A few vague fragments is about 0.2; a rich scene is 0.8 or more.
- lucidity: 0 not aware it was a dream, 1 a hazy sense, 2 knew it was a dream, 3 could steer
  it. Use 0 unless the telling says so.
- elements: the 3 to 8 most important concrete things, in the dreamer's words, 1 to 3 words
  each, no duplicates: people ("my sister", "a stranger"; kind person), places (kind place),
  images and objects, animals included (kind symbol), body parts that matter in the dream
  (kind body), colors the dreamer mentions (kind color). Do not add anything the dream
  doesn't contain."""


class _Feeling(BaseModel):
    emotion: Emotion
    intensity: int
    own_word: str | None


class _Element(BaseModel):
    kind: Literal["symbol", "person", "place", "body", "color"]
    value: str


class _Read(BaseModel):
    title: str
    emotions: list[_Feeling]
    valence: float
    intensity: float
    vividness: float
    lucidity: int
    elements: list[_Element]


def check_limit(user_id: int) -> None:
    ai_limit.check(user_id, "suggest", HOURLY_LIMIT, "That's a lot of dreams for one hour. Fill this one in yourself.")


def call_claude(text: str) -> _Read:
    try:
        response = readings.client().beta.messages.parse(
            model=readings.MODEL,
            max_tokens=4000,
            system=[{"type": "text", "text": PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": f"<dream>\n{text}\n</dream>"}],
            output_format=_Read,
            output_config={"effort": "low"},
            # Dreams can be violent or sexual; a declined request retries on a fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except readings.ReadingFailed as e:
        raise ApiError(503, "ai_unavailable", str(e)) from e
    except anthropic.APIError as e:
        log.warning("dream suggestion failed: %s", type(e).__name__)  # never the dream text
        raise ApiError(503, "ai_unavailable", UNAVAILABLE) from e

    if response.stop_reason != "end_turn" or response.parsed_output is None:
        raise ApiError(503, "ai_unavailable", UNAVAILABLE)
    return response.parsed_output


def suggest(db: Session, user: User, text: str) -> DreamSuggestion:
    read = call_claude(text)
    clamp = lambda v, lo, hi: max(lo, min(hi, v))  # noqa: E731

    emotions = [
        SuggestedEmotion(
            position=i + 1,
            emotion=f.emotion,
            intensity=int(clamp(f.intensity, 1, 5)),
            label=(f.own_word or "").strip()[:64] or None,
        )
        for i, f in enumerate(read.emotions[:2])
    ]

    entries, _ = _symbol_index(db)
    people = {p.name.strip().lower(): p for p in db.scalars(select(Person).where(Person.user_id == user.id))}
    elements, seen = [], set()
    for e in read.elements[:8]:
        value = e.value.strip()[:500]
        if not value or (e.kind, value.lower()) in seen:
            continue
        seen.add((e.kind, value.lower()))
        element = SuggestedElement(kind=e.kind, value=value)
        if e.kind in LOOKUP_KINDS:
            # Same order as saving: 周公解梦 first, then the Jungian glossary.
            found = find_symbols(value, entries, "zhougong") or find_symbols(value, entries, "jung")
            element.symbol_code = found[0].code if found else None
        if e.kind == "person" and (match := people.get(value.lower())):
            element.person_match = PersonMatch(id=match.id, name=match.name)
        elements.append(element)

    return DreamSuggestion(
        emotions=emotions,
        map=MapPoint(valence=clamp(read.valence, -2, 2), intensity=clamp(read.intensity, 1, 5)),
        vividness=clamp(read.vividness, 0, 1),
        lucidity=int(clamp(read.lucidity, 0, 3)),
        elements=elements,
        title=read.title.strip()[:200],
    )
