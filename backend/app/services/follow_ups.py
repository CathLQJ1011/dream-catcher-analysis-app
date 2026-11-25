"""Follow-up questions about a reading (decision 26).

The dreamer asks under a reading card ("why the bridge?") and Claude answers in that card's
tradition, with the same instructions and dictionary as the reading itself, so the cached prompt
is reused. Dream text and questions never go into the logs (decision 17).
"""

from __future__ import annotations

import json
import logging
import re
from difflib import SequenceMatcher

import anthropic
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import FollowUp, Interpretation, Symbol
from app.errors import ApiError
from app.services import ai_limit, readings

log = logging.getLogger(__name__)

HOURLY_LIMIT = 30  # decision 17
PER_READING = 10  # keeps each conversation, and what's sent to Claude, short
UNAVAILABLE = "Couldn't answer right now. Try asking again in a minute."

RULES = """## Follow-up questions

You already wrote the reading in the assistant turn below. The dreamer is now asking about it.
Answer the latest question in the same tradition, with every rule above still in force.

- Answer what was asked, in at most about 120 words, in plain words. No headings or lists.
- Write in the language of the question; if it mixes Chinese and English, mirror that.
- Stay tentative and build on what the dreamer tells you. If they add context or disagree,
  take it seriously: say what it changes, and don't defend the reading for its own sake.
- If the question is about something outside dream reading (medical, legal, a crisis), say
  kindly that it's beyond what a dream reading can answer, and suggest someone who can help.
- For 周公: put any classical line in 「」 and copy it exactly from the dictionary. Never write
  a line that isn't there; for anything the classical text doesn't cover, say so plainly."""


class _Answer(BaseModel):
    answer: str


def check_limit(user_id: int) -> None:
    ai_limit.check(user_id, "follow_ups", HOURLY_LIMIT, "That's a lot of questions for one hour. Try again a bit later.")


def ask(db: Session, r: Interpretation, question: str) -> FollowUp:
    if r.status != "ready":
        raise ApiError(409, "reading_not_ready", "Wait for the reading to finish, then ask.")
    if len(r.follow_ups) >= PER_READING:
        raise ApiError(409, "too_many_follow_ups", "That's the most questions for one reading. Try interpreting it again.")
    check_limit(r.dream.user_id)

    answer = call_claude(readings.system_prompt(db, r.tradition), conversation(db, r, question)).strip()
    if r.tradition == "zhougong":
        answer = keep_real_lines(db, answer)
    follow_up = FollowUp(question=question, answer=answer, model=readings.MODEL)
    r.follow_ups.append(follow_up)
    db.commit()
    return follow_up


def conversation(db: Session, r: Interpretation, question: str) -> list[dict]:
    """The dream, the reading as Claude's own turn, then each earlier question and answer."""
    messages = [
        {"role": "user", "content": readings.dream_message(db, r.dream, r.tradition)},
        {"role": "assistant", "content": json.dumps(own_words(r.output), ensure_ascii=False)},
    ]
    for f in r.follow_ups:
        messages += [{"role": "user", "content": f.question}, {"role": "assistant", "content": f.answer}]
    messages.append({"role": "user", "content": question})
    return messages


def own_words(output: dict) -> dict:
    """The reading as Claude wrote it. The term and printed source on each 周公 image were added by the app,
    and Claude, seeing them as its own, would otherwise second-guess them."""
    if "images" not in output:
        return output
    keep = ("image", "symbol_code", "classical_line", "meaning")
    return {**output, "images": [{k: img.get(k) for k in keep} for img in output["images"]]}


_QUOTED = re.compile(r"「([^」]*)」")
NEAR = 0.8  # how close a quote must be to a real line to be corrected to it, rather than removed


def keep_real_lines(db: Session, answer: str) -> str:
    """Every 「quoted」 line must be a real 周公 line. A slightly-off copy is replaced by the dictionary's own
    wording; anything else is removed rather than shown as classical text."""
    lines = [
        line
        for extra in db.scalars(select(Symbol.extra).where(Symbol.tradition == "zhougong"))
        for line in extra.get("classical_lines", [])
    ]

    def check(m: re.Match[str]) -> str:
        quoted = readings._bare(m.group(1))
        best = max(lines, key=lambda line: SequenceMatcher(None, quoted, readings._bare(line)).ratio(), default=None)
        if best is None:
            return ""
        if readings._bare(best) == quoted:
            return m.group(0)
        return f"「{best}」" if SequenceMatcher(None, quoted, readings._bare(best)).ratio() >= NEAR else ""

    return _QUOTED.sub(check, answer)


def call_claude(system: str, messages: list[dict]) -> str:
    try:
        response = readings.client().beta.messages.parse(
            model=readings.MODEL,
            max_tokens=4000,
            # The first block is the reading's own cached prompt; the follow-up rules come after it.
            system=[
                {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}},
                {"type": "text", "text": RULES},
            ],
            messages=messages,
            output_format=_Answer,
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except readings.ReadingFailed as e:
        raise ApiError(503, "ai_unavailable", str(e)) from e
    except anthropic.APIError as e:
        log.warning("follow-up failed: %s", type(e).__name__)  # never the question or the dream
        raise ApiError(503, "ai_unavailable", UNAVAILABLE) from e

    if response.stop_reason != "end_turn" or response.parsed_output is None:
        raise ApiError(503, "ai_unavailable", UNAVAILABLE)
    return response.parsed_output.answer
