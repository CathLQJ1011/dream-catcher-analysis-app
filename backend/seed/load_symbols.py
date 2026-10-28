"""Load the curated dictionaries (data/symbols/*.csv) into the `symbols` table.

Safe to re-run: rows are matched by `code` (zg-001, jg-004…) and updated in place.
Run from backend/:  .venv/bin/python -m seed.load_symbols
"""

from __future__ import annotations

import csv
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Symbol
from app.db.session import SessionLocal
from app.matching import SymbolEntry

DATA = Path(__file__).resolve().parents[2] / "data" / "symbols"


def _aliases(raw: str) -> list[str]:
    return [a.strip() for a in raw.split("|") if a.strip()]


def parse_zhougong(path: Path = DATA / "zhougong.csv") -> list[dict]:
    rows = []
    for r in csv.DictReader(path.open(encoding="utf-8")):
        rows.append({
            "code": r["id"], "tradition": "zhougong", "term_zh": r["term_zh"], "term_en": r["term_en"],
            "aliases": _aliases(r["aliases"]), "meaning_zh": r["meaning_zh"], "meaning_en": r["meaning_en"],
            "tone": r["tone"] or None, "source": r["source"], "source_detail": r["source_detail"] or None,
            "inclusive_note": r["inclusive_note"] or None,
            "extra": {
                "classical_lines": [l for l in r["classical_lines"].split("；") if l],
                "source_2": r["source_2"] or None,
                "source_2_detail": r["source_2_detail"] or None,
                "edition_notes": r["edition_notes"] or None,
            },
        })
    return rows


def parse_jung(path: Path = DATA / "jung.csv") -> list[dict]:
    rows = []
    for r in csv.DictReader(path.open(encoding="utf-8")):
        rows.append({
            "code": r["id"], "tradition": "jung", "term_zh": r["term_zh"], "term_en": r["term_en"],
            "aliases": _aliases(r["aliases"]), "meaning_zh": r["possibility_zh"], "meaning_en": r["possibility_en"],
            "tone": None, "source": r["sources"], "source_detail": None,
            "inclusive_note": r["inclusive_note"] or None,
            "extra": {
                "kind": r["kind"],
                "questions_en": [q.strip() for q in r["questions_en"].split("|") if q.strip()],
                "questions_zh": [q.strip() for q in r["questions_zh"].split("|") if q.strip()],
                "avoid": r["avoid"] or None,
            },
        })
    return rows


def all_entries() -> list[dict]:
    return parse_zhougong() + parse_jung()


def as_symbol_entries(rows: list[dict]) -> list[SymbolEntry]:
    """The lightweight form the matcher needs, without touching the database."""
    return [SymbolEntry(r["code"], r["tradition"], r["term_zh"], tuple(r["aliases"])) for r in rows]


def load_symbols(session: Session) -> int:
    existing = {s.code: s for s in session.scalars(select(Symbol))}
    rows = all_entries()
    for row in rows:
        symbol = existing.get(row["code"]) or Symbol(code=row["code"])
        for field, value in row.items():
            setattr(symbol, field, value)
        session.add(symbol)
    session.flush()
    return len(rows)


if __name__ == "__main__":
    with SessionLocal.begin() as session:
        n = load_symbols(session)
    print(f"Loaded {n} symbols.")
