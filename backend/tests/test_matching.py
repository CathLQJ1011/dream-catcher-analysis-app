"""The test-dream check: symbol matching, dream types and dictionary integrity.

No database needed; reads data/symbols/*.csv and data/seed/test-dreams.json directly.
"""

import pytest

from app.dream_rules import dream_type
from app.matching import SymbolEntry, find_symbols
from seed.load_symbols import as_symbol_entries, parse_jung, parse_zhougong
from seed.load_test_dreams import read_test_dreams

ZHOUGONG = parse_zhougong()
JUNG = parse_jung()
ENTRIES = as_symbol_entries(ZHOUGONG + JUNG)
DREAMS = read_test_dreams()["dreams"]


def codes(text: str, tradition: str = "zhougong") -> set[str]:
    return {m.code for m in find_symbols(text, ENTRIES, tradition)}


def code_of(expectation: str) -> str:
    """'zg-040 水 (river)' → 'zg-040'"""
    return expectation.split()[0]


# ---------- The five test dreams ----------


@pytest.mark.parametrize("dream", DREAMS, ids=[d["key"] for d in DREAMS])
def test_expected_symbols_are_found(dream):
    found = codes(dream["text"])
    missing = {code_of(e) for e in dream["expect"].get("matches", [])} - found
    assert not missing, f"not found in the dream text: {missing}"


@pytest.mark.parametrize("dream", DREAMS, ids=[d["key"] for d in DREAMS])
def test_false_positives_are_avoided(dream):
    found = codes(dream["text"])
    wrong = {code_of(e) for e in dream["expect"].get("must_not_match", [])} & found
    assert not wrong, f"matched but shouldn't: {wrong}"


@pytest.mark.parametrize("dream", DREAMS, ids=[d["key"] for d in DREAMS])
def test_unmatched_elements_stay_unmatched(dream):
    """Things with no classical 周公 entry (phone, exam, mall) aren't forced onto one."""
    for value in dream["expect"].get("no_match", []):
        assert not codes(value), f"'{value}' should have no 周公解梦 entry"


@pytest.mark.parametrize("dream", DREAMS, ids=[d["key"] for d in DREAMS])
def test_dream_type_rule(dream):
    emotions = [e["emotion"] for e in dream["emotions"]]
    assert dream_type(dream.get("valence"), dream.get("intensity"), emotions) == dream["expect"]["dream_type"]


# ---------- Matching rules ----------


HOUSE = [SymbolEntry("x-1", "zhougong", "房屋", ("house", "老房子"))]


@pytest.mark.parametrize(
    "text, expected",
    [
        ("an old house by the sea", True),
        ("I saw a lighthouse", False),  # a word inside another word doesn't count
        ("two houses side by side", True),  # plural ending is allowed
        ("HOUSE", True),  # case doesn't matter
        ("我梦见回到一座老房子里", True),  # Chinese matches inside a sentence
    ],
)
def test_word_boundaries(text, expected):
    assert bool(find_symbols(text, HOUSE)) is expected


def test_first_mention_comes_first():
    found = find_symbols("cat catching a mouse", ENTRIES, "zhougong")
    assert found[0].term_zh == "猫"


# ---------- Dictionary integrity ----------


def test_dictionary_sizes():
    assert len(ZHOUGONG) == 73
    assert len(JUNG) == 25


def test_codes_are_unique():
    all_codes = [r["code"] for r in ZHOUGONG + JUNG]
    assert len(all_codes) == len(set(all_codes))


@pytest.mark.parametrize("row", ZHOUGONG + JUNG, ids=lambda r: r["code"])
def test_every_entry_is_complete(row):
    assert row["aliases"], "needs at least one alias to be found"
    assert row["meaning_zh"] and row["meaning_en"], "needs a meaning in both languages"
    assert row["source"], "needs a source"
