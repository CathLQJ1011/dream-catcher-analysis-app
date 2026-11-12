"""API tests for placing a feeling in your own words. Claude is replaced by a fake."""

from __future__ import annotations

import pytest

from app.errors import ApiError
from app.services import feelings
from tests.test_api import db, make_user  # noqa: F401  (pytest fixtures)


@pytest.fixture
def placed(monkeypatch):
    """A fake Claude that puts every word under unease, and records what it was sent."""
    sent: list[str] = []

    def fake(word: str):
        sent.append(word)
        return "unease"

    monkeypatch.setattr(feelings, "place", fake)
    feelings._recent.clear()
    return sent


def test_word_gets_a_color_and_is_kept_as_typed(make_user, placed):
    client = make_user()
    r = client.post("/api/v1/feelings/place", json={"label": "  guilty "})
    assert r.status_code == 200
    assert r.json() == {"label": "guilty", "emotion": "unease"}
    assert placed == ["guilty"]


def test_blank_word_is_rejected(make_user, placed):
    client = make_user()
    assert client.post("/api/v1/feelings/place", json={"label": "   "}).status_code == 422
    assert placed == []


def test_needs_sign_in(db):  # noqa: F811
    from fastapi.testclient import TestClient

    from app.main import app

    assert TestClient(app).post("/api/v1/feelings/place", json={"label": "guilty"}).status_code == 401


def test_ai_failure_says_pick_yourself(make_user, monkeypatch):
    def broken(word: str):
        raise ApiError(503, "ai_unavailable", "Couldn't place that word right now. Pick a color yourself.")

    monkeypatch.setattr(feelings, "place", broken)
    feelings._recent.clear()
    r = make_user().post("/api/v1/feelings/place", json={"label": "guilty"})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "ai_unavailable"


def test_hourly_limit(make_user, placed, monkeypatch):
    monkeypatch.setattr(feelings, "HOURLY_LIMIT", 2)
    client = make_user()
    for _ in range(2):
        assert client.post("/api/v1/feelings/place", json={"label": "guilty"}).status_code == 200
    r = client.post("/api/v1/feelings/place", json={"label": "guilty"})
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "too_many_ai_requests"
