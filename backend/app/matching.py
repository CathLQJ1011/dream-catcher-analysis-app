"""Find dictionary symbols in dream text by their term and aliases.

This is the simple first pass (Phase 2). Embedding search and the AI step come
later and refine it, but the rules here already avoid the classic mistakes:

- Latin words must stand alone: "house" matches "the house" but not "lighthouse".
  A plural or verb ending (-s, -es) is allowed: "rivers", "flies".
- Chinese has no spaces, so CJK terms match as substrings: 老房子 inside 回到一座老房子里.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache

_LATIN = re.compile(r"[A-Za-z]")


@dataclass(frozen=True)
class SymbolEntry:
    code: str
    tradition: str
    term_zh: str
    aliases: tuple[str, ...]


@dataclass(frozen=True)
class Match:
    code: str
    tradition: str
    term_zh: str
    found: str  # the alias that matched, as it appears in the dictionary
    at: int  # where in the text it first appears


@lru_cache(maxsize=4096)
def _pattern(term: str) -> re.Pattern[str]:
    if _LATIN.search(term):
        return re.compile(rf"(?<![A-Za-z]){re.escape(term)}(?:e?s)?(?![A-Za-z])", re.IGNORECASE)
    return re.compile(re.escape(term))


def find_symbols(text: str, symbols: list[SymbolEntry], tradition: str | None = None) -> list[Match]:
    """Every symbol whose term or alias appears in `text`, once per symbol, in order of appearance.

    Order matters for short phrases: in "cat catching a mouse" the cat comes first,
    so it is the element's main symbol.
    """
    matches = []
    for s in symbols:
        if tradition and s.tradition != tradition:
            continue
        hits = [(m.start(), term) for term in (s.term_zh, *s.aliases) if term and (m := _pattern(term).search(text))]
        if hits:
            at, term = min(hits)
            matches.append(Match(s.code, s.tradition, s.term_zh, term, at))
    return sorted(matches, key=lambda m: m.at)
