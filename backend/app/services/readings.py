"""AI readings of a dream (Phase 5). Jungian first; docs/jungian-model.md is the method.

A reading starts as a "pending" row. `run_reading` then calls Claude in the background,
after the response has gone out, and fills the row in. Dream text never goes into the logs (decision 17).
"""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

import anthropic
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Dream, Interpretation, Symbol
from app.db.session import SessionLocal
from app.errors import ApiError
from app.schemas import JungReading, ReadingOut, SymbolRef

log = logging.getLogger(__name__)

# Each reading stores both, so prompt versions and models can be compared later.
PROMPT_VERSION = "jung-v1"
MODEL = os.environ.get("READINGS_MODEL", "claude-sonnet-5-5")
PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "jung_v1.md").read_text(encoding="utf-8")

HOURLY_LIMIT = 30  # AI calls per user per hour (decision 17)
EARLIER_DREAMS = 10  # how many earlier dreams the reading can link to

# Replaced in tests: the background task needs its own session, since the request's is closed by then.
open_session = SessionLocal


class ReadingFailed(Exception):
    """A reading couldn't be written. The message is shown to the dreamer."""


# ---------- Starting and showing readings ----------


def start(db: Session, dream: Dream, traditions: list[str]) -> list[Interpretation]:
    hour_ago = datetime.now(UTC) - timedelta(hours=1)
    recent = db.scalar(
        select(func.count(Interpretation.id))
        .join(Dream)
        .where(Dream.user_id == dream.user_id, Interpretation.created_at > hour_ago)
    )
    if recent >= HOURLY_LIMIT:
        raise ApiError(429, "too_many_ai_requests", "That's a lot of readings for one hour. Try again a bit later.")

    started = []
    for tradition in dict.fromkeys(traditions):
        pending = next((r for r in dream.interpretations if r.tradition == tradition and r.status == "pending"), None)
        if not pending:  # asking twice while one is being written doesn't start a second
            pending = Interpretation(tradition=tradition, status="pending", reading="", output={},
                                     model=MODEL, prompt_version=PROMPT_VERSION)
            dream.interpretations.append(pending)
        started.append(pending)
    db.commit()
    return started


def latest(dream: Dream) -> list[Interpretation]:
    """The newest reading per tradition; older ones stay in the database for comparison."""
    newest: dict[str, Interpretation] = {}
    for r in sorted(dream.interpretations, key=lambda r: (r.created_at, r.id)):
        newest[r.tradition] = r
    return list(newest.values())


def to_out(r: Interpretation) -> ReadingOut:
    return ReadingOut(
        id=r.id, tradition=r.tradition, status=r.status, out_of_date=r.out_of_date,
        reading=r.reading, confidence_note=r.confidence_note,
        symbols=[SymbolRef.model_validate(s) for s in sorted(r.symbols, key=lambda s: s.code)],
        details={k: v for k, v in r.output.items() if k != "error"},
        error=r.output.get("error"), resonated=r.resonated, created_at=r.created_at,
    )


# ---------- Writing a reading (background) ----------


def run_reading(reading_id: int) -> None:
    with open_session() as db:
        r = db.get(Interpretation, reading_id)
        if r is None or r.status != "pending":
            return
        try:
            result = call_claude(system_prompt(db), dream_message(db, r.dream))
            fill(db, r, result)
        except ReadingFailed as e:
            r.status, r.output = "failed", {"error": str(e)}
        except Exception:
            log.exception("reading %s failed", reading_id)  # ids only, never the dream text
            r.status, r.output = "failed", {"error": "Something went wrong while writing the reading. Try again."}
        db.commit()


def fill(db: Session, r: Interpretation, result: JungReading) -> None:
    codes = {m.glossary_id for m in result.motifs} | {result.headline.glossary_id}
    r.symbols = list(db.scalars(select(Symbol).where(Symbol.tradition == "jung", Symbol.code.in_(codes - {None}))))
    r.status = "ready"
    r.reading = result.reading
    r.confidence_note = result.confidence_note
    r.output = result.model_dump()


def call_claude(system: str, message: str) -> JungReading:
    try:
        response = client().beta.messages.parse(
            model=MODEL,
            max_tokens=16000,
            # The prompt and glossary are the same for every reading, so they're cached.
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": message}],
            output_format=JungReading,
            output_config={"effort": "medium"},
            # If a safety check declines (dreams can be violent or sexual), Anthropic retries on a fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError as e:
        raise ReadingFailed("AI readings aren't set up correctly on this server.") from e
    except anthropic.RateLimitError as e:
        raise ReadingFailed("Claude is busy right now. Try again in a minute.") from e
    except anthropic.APIConnectionError as e:
        raise ReadingFailed("Couldn't reach Claude. Check the connection and try again.") from e
    except anthropic.APIStatusError as e:
        log.warning("Claude returned %s", e.status_code)
        raise ReadingFailed("Claude couldn't write this reading. Try again.") from e

    if response.stop_reason == "refusal":
        raise ReadingFailed("Claude declined to read this dream. You can still write your own reading.")
    if response.stop_reason == "max_tokens" or response.parsed_output is None:
        raise ReadingFailed("The reading came back incomplete. Try again.")
    return response.parsed_output


_client: anthropic.Anthropic | None = None


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not os.environ.get("ANTHROPIC_API_KEY"):
            raise ReadingFailed("AI readings aren't set up on this server yet.")
        _client = anthropic.Anthropic(timeout=180.0)
    return _client


# ---------- The prompt ----------


def system_prompt(db: Session) -> str:
    """The instructions plus the glossary. Kept byte-for-byte stable so it can be cached."""
    entries = db.scalars(select(Symbol).where(Symbol.tradition == "jung").order_by(Symbol.code))
    lines = []
    for s in entries:
        line = f"- {s.code} · {s.term_en} ({s.term_zh}): {s.meaning_en}"
        if questions := s.extra.get("questions_en"):
            line += " Questions: " + " / ".join(questions)
        if avoid := s.extra.get("avoid"):
            line += f" Avoid: {avoid}"
        lines.append(line)
    glossary = "\n".join(lines)
    return f"{PROMPT}\n\n## Glossary\n\nPossibilities, not definitions. Cite an id only when the entry genuinely fits.\n\n{glossary}\n"


def dream_message(db: Session, dream: Dream) -> str:
    parts = [f"<dream date=\"{dream.dreamed_on.isoformat()}\">"]
    if dream.title:
        parts.append(f"Title: {dream.title}")
    parts.append(dream.text)
    parts.append("</dream>")

    about = []
    if feelings := [e.label or e.emotion for e in dream.emotions if e.kept]:
        about.append("Feelings during the dream, in order: " + ", ".join(feelings))
    if dream.mood_on_waking:
        about.append(f"Mood on waking: {dream.mood_on_waking}")
    for kind, label in (("person", "People"), ("symbol", "Images they tagged"), ("place", "Places")):
        if values := [el.value for el in dream.elements if el.kind == kind and el.kept]:
            about.append(f"{label}: " + ", ".join(values))
    if dream.day_residue:
        about.append("The day before: " + "; ".join(d.note for d in dream.day_residue))
    if dream.reality_link:
        about.append(f"How they connect it to waking life: {dream.reality_link}")
    if dream.insight:
        about.append(f"Their own reading, written before yours: {dream.insight}")
    if about:
        parts += ["", "What the dreamer added:", *about]

    earlier = db.scalars(
        select(Dream)
        .where(Dream.user_id == dream.user_id, Dream.id != dream.id, Dream.deleted_at.is_(None),
               Dream.dreamed_on <= dream.dreamed_on)
        .order_by(Dream.dreamed_on.desc(), Dream.id.desc())
        .limit(EARLIER_DREAMS)
    ).all()
    if earlier:
        parts += ["", "Their earlier dreams, newest first:"]
        for d in earlier:
            title = f"Title: {d.title}\n" if d.title else ""
            parts.append(f"<earlier_dream date=\"{d.dreamed_on.isoformat()}\">\n{title}{d.text}\n</earlier_dream>")
    else:
        parts += ["", "This is the first dream in their journal, so there's no series yet."]
    return "\n".join(parts)
