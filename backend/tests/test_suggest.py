"""API tests for the Capture pre-fill. Claude is replaced by a fake, so these never call the real API."""

from __future__ import annotations

import pytest

from app.db.models import Person
from app.errors import ApiError
from app.services import ai_limit, suggest
from tests.test_api import db, make_user  # noqa: F401  (pytest fixtures)

READ = suggest._Read.model_validate({
    "title": "The cat on the stairs",
    "emotions": [
        {"emotion": "unease", "intensity": 9, "own_word": " guilty "},  # out of range on purpose
        {"emotion": "longing", "intensity": 2, "own_word": None},
        {"emotion": "calm", "intensity": 1, "own_word": None},  # a third feeling is dropped
    ],
    "valence": -3.5,
    "intensity": 2.5,
    "vividness": 1.4,
    "lucidity": 2,
    "elements": [
        {"kind": "symbol", "value": "stairs"},
        {"kind": "symbol", "value": "a talking cat"},
        {"kind": "person", "value": "Mia"},
        {"kind": "person", "value": "mia"},  # duplicate
        {"kind": "color", "value": "violet"},
    ],
})


@pytest.fixture
def claude(monkeypatch):
    sent: list[str] = []

    def fake(text: str):
        sent.append(text)
        return READ

    monkeypatch.setattr(suggest, "call_claude", fake)
    ai_limit.reset()
    return sent


def test_suggestion_matches_the_contract(make_user, claude, db):  # noqa: F811
    client = make_user()
    me = client.get("/api/v1/me").json()
    db.add(Person(user_id=me["id"], name="Mia"))
    db.commit()

    r = client.post("/api/v1/dreams/suggest", json={"text": "A cat on the stairs.", "dreamed_on": "2026-11-10"})
    assert r.status_code == 200
    s = r.json()
    assert claude == ["A cat on the stairs."]
    assert s["title"] == "The cat on the stairs"
    # Two feelings at most, intensity kept in range, the dreamer's own word trimmed.
    assert s["emotions"] == [
        {"position": 1, "emotion": "unease", "intensity": 5, "label": "guilty"},
        {"position": 2, "emotion": "longing", "intensity": 2, "label": None},
    ]
    assert s["map"] == {"valence": -2, "intensity": 2.5}
    assert s["vividness"] == 1 and s["lucidity"] == 2
    # Dictionary codes come from the matcher, not from Claude; people match by name.
    by_value = {e["value"]: e for e in s["elements"]}
    assert list(by_value) == ["stairs", "a talking cat", "Mia", "violet"]
    assert by_value["stairs"]["symbol_code"] == "zg-022"
    assert by_value["violet"]["symbol_code"] is None  # colors aren't looked up
    assert by_value["Mia"]["person_match"]["name"] == "Mia"


def test_nothing_is_saved(make_user, claude):
    client = make_user()
    client.post("/api/v1/dreams/suggest", json={"text": "A cat on the stairs.", "dreamed_on": "2026-11-10"})
    assert client.get("/api/v1/dreams").json()["items"] == []


def test_empty_dream_is_rejected(make_user, claude):
    r = make_user().post("/api/v1/dreams/suggest", json={"text": "", "dreamed_on": "2026-11-10"})
    assert r.status_code == 422
    assert claude == []


def test_claude_failure_says_fill_it_in(make_user, monkeypatch):
    def broken(text: str):
        raise ApiError(503, "ai_unavailable", suggest.UNAVAILABLE)

    monkeypatch.setattr(suggest, "call_claude", broken)
    ai_limit.reset()
    r = make_user().post("/api/v1/dreams/suggest", json={"text": "A cat.", "dreamed_on": "2026-11-10"})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "ai_unavailable"


def test_hourly_limit(make_user, claude, monkeypatch):
    monkeypatch.setattr(suggest, "HOURLY_LIMIT", 1)
    client = make_user()
    body = {"text": "A cat.", "dreamed_on": "2026-11-10"}
    assert client.post("/api/v1/dreams/suggest", json=body).status_code == 200
    r = client.post("/api/v1/dreams/suggest", json=body)
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "too_many_ai_requests"
