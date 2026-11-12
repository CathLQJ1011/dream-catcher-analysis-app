"""Placing a feeling in the dreamer's own words onto one of the 8 orb emotions (decision 10, decision 22).

The word itself is kept as the emotion's `label`; this only picks its color. Nothing is saved here.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict, deque

import anthropic
from pydantic import BaseModel

from app.errors import ApiError
from app.schemas import Emotion
from app.services import readings

log = logging.getLogger(__name__)

HOURLY_LIMIT = 60  # a word is a tiny call, but still an AI call (decision 17)

PROMPT = """You place a feeling word onto one of eight emotion families for a dream journal.
The word is the dreamer's own, in any language. Pick the single family it is closest to:

- calm: peaceful, safe, at ease
- lucid: wonder, awe, curiosity, being aware or in control in the dream
- longing: nostalgia, missing someone or somewhere, yearning
- joy: happiness, delight, excitement, love
- fear: terror, panic, dread of something specific
- unease: anxiety, guilt, shame, confusion, something feels off
- sadness: grief, loss, loneliness, disappointment
- neutral: flat, blank, or a word that fits none of the above

Answer with the family only."""


class Placement(BaseModel):
    emotion: Emotion


# Per-process counter: enough for one server; resets when it restarts.
_recent: dict[int, deque[float]] = defaultdict(deque)


def check_limit(user_id: int) -> None:
    now, calls = time.monotonic(), _recent[user_id]
    while calls and now - calls[0] > 3600:
        calls.popleft()
    if len(calls) >= HOURLY_LIMIT:
        raise ApiError(429, "too_many_ai_requests", "That's a lot of AI requests for one hour. Pick a color yourself for now.")
    calls.append(now)


def place(word: str) -> Emotion:
    try:
        response = readings.client().beta.messages.parse(
            model=readings.MODEL,
            max_tokens=2000,
            system=PROMPT,
            messages=[{"role": "user", "content": word}],
            output_format=Placement,
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except readings.ReadingFailed as e:
        raise ApiError(503, "ai_unavailable", str(e)) from e
    except anthropic.APIError as e:
        log.warning("placing a feeling failed: %s", type(e).__name__)  # never the word itself
        raise ApiError(503, "ai_unavailable", "Couldn't place that word right now. Pick a color yourself.") from e

    if response.stop_reason != "end_turn" or response.parsed_output is None:
        raise ApiError(503, "ai_unavailable", "Couldn't place that word right now. Pick a color yourself.")
    return response.parsed_output.emotion
