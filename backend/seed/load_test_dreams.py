"""Load the invented test dreams (data/seed/test-dreams.json) for a test user.

Safe to re-run: the test user and everything they own is replaced each time.
Run after load_symbols, from backend/:  .venv/bin/python -m seed.load_test_dreams
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import (
    DayResidue,
    Dream,
    DreamElement,
    DreamEmotion,
    DreamEvent,
    DreamLink,
    Person,
    Symbol,
    User,
)
from app.db.session import SessionLocal
from app.dream_rules import dream_type
from app.matching import SymbolEntry, find_symbols

TEST_DREAMS = Path(__file__).resolve().parents[2] / "data" / "seed" / "test-dreams.json"


def read_test_dreams(path: Path = TEST_DREAMS) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_test_dreams(session: Session, path: Path = TEST_DREAMS) -> dict[str, Dream]:
    data = read_test_dreams(path)

    # Read the dictionary before creating any new rows, so the query doesn't flush half-built objects.
    symbols = list(session.scalars(select(Symbol)))
    by_code = {s.code: s for s in symbols}
    entries = [SymbolEntry(s.code, s.tradition, s.term_zh, tuple(s.aliases)) for s in symbols]

    session.execute(delete(User).where(User.email == data["user"]["email"]))
    user = User(email=data["user"]["email"], display_name=data["user"]["display_name"])
    session.add(user)

    people = {
        p["key"]: Person(user=user, name=p["name"], role=p["role"], relation=p["relation"])
        for p in data["people"]
    }
    session.add_all(people.values())  # including people no dream element mentions yet

    dreams: dict[str, Dream] = {}
    for number, d in enumerate(data["dreams"], start=1):
        dream = Dream(
            user=user,
            number=number,
            dreamed_on=date.fromisoformat(d["dreamed_on"]),
            text=d["text"],
            source=d["source"],
            title=d.get("title"),
            valence=d.get("valence"),
            intensity=d.get("intensity"),
            vividness=d.get("vividness"),
            lucidity=d.get("lucidity"),
            narrative=d.get("narrative"),
            spoke=d.get("spoke"),
        )
        dream.emotions = [
            DreamEmotion(
                position=e["position"], emotion=e["emotion"], intensity=e.get("intensity"),
                label=e.get("label"), note=e.get("note"),
            )
            for e in d["emotions"]
        ]
        dream.dream_type = dream_type(dream.valence, dream.intensity, [e["emotion"] for e in d["emotions"]])

        for e in d["elements"]:
            element = DreamElement(
                kind=e["kind"], value=e["value"], position=e.get("position"), details=e.get("details", {}),
                person=people.get(e.get("person")),
            )
            # Link to a dictionary entry when one matches: 周公解梦 first, then the Jungian glossary.
            if e["kind"] in ("symbol", "place", "body"):
                found = find_symbols(e["value"], entries, "zhougong") or find_symbols(e["value"], entries, "jung")
                if found:
                    element.symbol = by_code[found[0].code]
            dream.elements.append(element)

        dream.events = [DreamEvent(kind=e["kind"], position=e.get("position"), details=e["details"]) for e in d["events"]]
        dream.day_residue = [
            DayResidue(kind=r["kind"], note=r["note"], days_before=r.get("days_before")) for r in d["day_residue"]
        ]
        session.add(dream)
        dreams[d["key"]] = dream

    session.flush()
    for d in data["dreams"]:
        for link in d.get("links", []):
            session.add(DreamLink(from_dream_id=dreams[d["key"]].id, to_dream_id=dreams[link["to"]].id, reason=link["reason"]))
    session.flush()
    return dreams


if __name__ == "__main__":
    with SessionLocal.begin() as session:
        loaded = load_test_dreams(session)
        print(f"Loaded {len(loaded)} test dreams:")
        for key, dream in loaded.items():
            linked = sorted({el.symbol.code for el in dream.elements if el.symbol})
            print(f"  {dream.number}. {key:<22} {dream.dream_type:<10} symbols: {', '.join(linked)}")
