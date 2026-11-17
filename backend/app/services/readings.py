"""AI readings of a dream (Phase 5): Jungian (docs/jungian-model.md) and 周公解梦 (docs/dictionary-zhougong.md).

A reading starts as a "pending" row. `run_readings` then calls Claude in the background,
after the response has gone out, and fills the rows in, each tradition at the same time.
Dream text never goes into the logs (decision 17).
"""

from __future__ import annotations

import logging
import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

import anthropic
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Dream, Interpretation, Symbol
from app.db.session import SessionLocal
from app.errors import ApiError
from app.matching import find_symbols
from app.schemas import JungReading, ReadingOut, SymbolRef, ZhougongReading
from app.services.dreams import _symbol_index

log = logging.getLogger(__name__)

MODEL = os.environ.get("READINGS_MODEL", "claude-sonnet-5-5")
PROMPTS = Path(__file__).resolve().parents[1] / "prompts"


@dataclass(frozen=True)
class Recipe:
    prompt_version: str  # stored with each reading, so prompt versions and models can be compared later
    prompt: str
    output: type[BaseModel]
    effort: str


RECIPES = {
    # Mostly finding and quoting dictionary lines, so less thinking is needed.
    "zhougong": Recipe("zhougong-v1", (PROMPTS / "zhougong_v1.md").read_text(encoding="utf-8"), ZhougongReading, "low"),
    "jung": Recipe("jung-v1", (PROMPTS / "jung_v1.md").read_text(encoding="utf-8"), JungReading, "medium"),
}

HOURLY_LIMIT = 30  # AI calls per user per hour (decision 17)
EARLIER_DREAMS = 10  # how many earlier dreams the reading can link to

# Replaced in tests: the background task needs its own session, since the request's is closed by then.
open_session = SessionLocal
PARALLEL = True  # tests share one session, so they write readings one after another


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
                                     model=MODEL, prompt_version=RECIPES[tradition].prompt_version)
            dream.interpretations.append(pending)
        started.append(pending)
    db.commit()
    return started


def latest(dream: Dream) -> list[Interpretation]:
    """The newest reading per tradition; older ones stay in the database for comparison."""
    newest: dict[str, Interpretation] = {}
    for r in sorted(dream.interpretations, key=lambda r: (r.created_at, r.id)):
        newest[r.tradition] = r
    order = list(RECIPES)  # 周公 first (decision 2)
    return sorted(newest.values(), key=lambda r: order.index(r.tradition) if r.tradition in order else len(order))


def to_out(r: Interpretation) -> ReadingOut:
    return ReadingOut(
        id=r.id, tradition=r.tradition, status=r.status, out_of_date=r.out_of_date,
        reading=r.reading, confidence_note=r.confidence_note,
        symbols=[SymbolRef.model_validate(s) for s in sorted(r.symbols, key=lambda s: s.code)],
        details={k: v for k, v in r.output.items() if k != "error"},
        error=r.output.get("error"), resonated=r.resonated, created_at=r.created_at,
    )


# ---------- Writing a reading (background) ----------


def run_readings(reading_ids: list[int]) -> None:
    """Each tradition is its own Claude call, so they're written side by side rather than one after another."""
    if PARALLEL and len(reading_ids) > 1:
        with ThreadPoolExecutor(max_workers=len(reading_ids)) as pool:
            list(pool.map(run_reading, reading_ids))
    else:
        for reading_id in reading_ids:
            run_reading(reading_id)


def run_reading(reading_id: int) -> None:
    with open_session() as db:
        r = db.get(Interpretation, reading_id)
        if r is None or r.status != "pending":
            return
        try:
            recipe = RECIPES[r.tradition]
            result = call_claude(system_prompt(db, r.tradition), dream_message(db, r.dream, r.tradition),
                                 recipe.output, recipe.effort)
            fill(db, r, result)
        except ReadingFailed as e:
            r.status, r.output = "failed", {"error": str(e)}
        except Exception:
            log.exception("reading %s failed", reading_id)  # ids only, never the dream text
            r.status, r.output = "failed", {"error": "Something went wrong while writing the reading. Try again."}
        db.commit()


def fill(db: Session, r: Interpretation, result: BaseModel) -> None:
    if isinstance(result, ZhougongReading):
        output, codes = check_zhougong(db, result)
    else:
        output = result.model_dump()
        codes = {m.glossary_id for m in result.motifs} | {result.headline.glossary_id}
    r.symbols = list(db.scalars(select(Symbol).where(Symbol.tradition == r.tradition, Symbol.code.in_(codes - {None}))))
    r.status = "ready"
    r.reading = result.reading
    r.confidence_note = result.confidence_note
    r.output = output


def _bare(line: str) -> str:
    return "".join(ch for ch in line if ch.isalnum())


def check_zhougong(db: Session, result: ZhougongReading) -> tuple[dict, set[str | None]]:
    """Keep only real dictionary entries and their real classical lines; the rest becomes an open reading.

    Each cited image also gets the entry's term and printed source, from the dictionary rather than from Claude.
    """
    entries = {s.code: s for s in db.scalars(select(Symbol).where(Symbol.tradition == "zhougong"))}
    images = []
    for img in result.images[:6]:
        entry = entries.get(img.symbol_code or "")
        line = None
        if entry:
            lines = entry.extra.get("classical_lines", [])
            # Small differences in punctuation are forgiven; a line that isn't in the entry is dropped.
            line = next((ln for ln in lines if _bare(ln) == _bare(img.classical_line or "")), None)
        images.append({
            "image": img.image,
            "symbol_code": entry.code if entry else None,
            "classical_line": line,
            "meaning": img.meaning,
            "term_zh": entry.term_zh if entry else None,
            "source": f"《{entry.source.split('（')[0]}》{entry.source_detail}" if entry and entry.source_detail else None,
        })
    headline_code = result.headline.symbol_code if result.headline.symbol_code in entries else None
    output = result.model_dump()
    output["headline"]["symbol_code"] = headline_code
    output["images"] = images
    return output, {i["symbol_code"] for i in images} | {headline_code}


def call_claude(system: str, message: str, output_format: type[BaseModel], effort: str) -> BaseModel:
    try:
        response = client().beta.messages.parse(
            model=MODEL,
            max_tokens=16000,
            # The prompt and dictionary are the same for every reading, so they're cached.
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": message}],
            output_format=output_format,
            output_config={"effort": effort},
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


def system_prompt(db: Session, tradition: str = "jung") -> str:
    """The instructions plus the dictionary. Kept byte-for-byte stable so it can be cached."""
    if tradition == "zhougong":
        return zhougong_prompt(db)
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
    return (f"{RECIPES['jung'].prompt}\n\n## Glossary\n\n"
            f"Possibilities, not definitions. Cite an id only when the entry genuinely fits.\n\n{glossary}\n")


def zhougong_prompt(db: Session) -> str:
    lines = []
    for s in db.scalars(select(Symbol).where(Symbol.tradition == "zhougong").order_by(Symbol.code)):
        line = f"- {s.code} · {s.term_zh} ({s.term_en})"
        if s.aliases:
            line += " · also: " + ", ".join(s.aliases)
        line += " · classical lines: " + "；".join(s.extra.get("classical_lines", []))
        line += f" · meaning: {s.meaning_en} / {s.meaning_zh}"
        if s.tone:
            line += f" · tone: {s.tone}"
        if s.inclusive_note:
            line += f" · left out or reframed: {s.inclusive_note}"
        lines.append(line)
    return f"{RECIPES['zhougong'].prompt}\n\n## Dictionary\n\n" + "\n".join(lines) + "\n"


def dream_message(db: Session, dream: Dream, tradition: str = "jung") -> str:
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

    if tradition == "zhougong":
        # The word matcher's hits are a hint; the prompt asks Claude to judge them. 周公 doesn't read a series.
        entries, _ = _symbol_index(db)
        tagged = " ".join(el.value for el in dream.elements if el.kept)
        found = {m.code: m for m in find_symbols(f"{dream.title or ''} {dream.text} {tagged}", entries, "zhougong")}
        hits = ", ".join(f"{m.code} ({m.term_zh}, from \"{m.found}\")" for m in found.values())
        parts += ["", f"The app's word matcher found: {hits}" if hits else "The app's word matcher found no entries."]
        return "\n".join(parts)

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
