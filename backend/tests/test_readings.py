"""API tests for AI readings. Claude is replaced by a fake, so these never call the real API."""

from __future__ import annotations

from contextlib import nullcontext

import pytest

from app.schemas import JungReading
from app.services import readings
from tests.test_api import db, make_user, new_dream  # noqa: F401  (pytest fixtures)

FAKE = JungReading.model_validate({
    "headline": {"image": "river", "glossary_id": None},
    "dream_shape": {"setting": "A river at night.", "turning_point": "You start swimming.", "resolution": "none"},
    "dream_ego": "You act: you swim rather than watch.",
    "motifs": [
        {"image": "river", "glossary_id": None, "possibility": "Something flowing on its own.", "level": "subjective"},
        {"image": "stranger", "glossary_id": "jg-002", "possibility": "A quality you keep at a distance.", "level": "both"},
    ],
    "compensation": "One possibility: the dream adds ease to a tense week.",
    "series_note": None,
    "questions": ["What was the water like?", "What happened the day before?"],
    "dreamwork": None,
    "reading": "You might notice that you chose to swim.",
    "confidence_note": "Based only on the dream text.",
})


@pytest.fixture
def claude(db, monkeypatch):
    """A fake Claude that records what it was sent. Set `.fail` to make it fail."""

    class Fake:
        def __init__(self):
            self.calls: list[tuple[str, str]] = []
            self.fail: str | None = None

        def __call__(self, system: str, message: str) -> JungReading:
            self.calls.append((system, message))
            if self.fail:
                raise readings.ReadingFailed(self.fail)
            return FAKE

    fake = Fake()
    monkeypatch.setattr(readings, "call_claude", fake)
    monkeypatch.setattr(readings, "open_session", lambda: nullcontext(db))
    return fake


def test_reading_is_written_and_cites_the_glossary(make_user, claude):
    client = make_user()
    new_dream(client, dreamed_on="2026-10-18", text="A lantern in the hallway.")
    dream = new_dream(client, insight="Maybe I need a rest.", elements=[{"kind": "person", "value": "stranger"}])

    r = client.post(f"/api/v1/dreams/{dream['id']}/readings")
    assert r.status_code == 202
    assert [x["status"] for x in r.json()] == ["pending"]

    [reading] = client.get(f"/api/v1/dreams/{dream['id']}/readings").json()
    assert reading["status"] == "ready" and reading["tradition"] == "jung"
    assert reading["reading"] == "You might notice that you chose to swim."
    assert [s["code"] for s in reading["symbols"]] == ["jg-002"]  # the open reading of "river" cites nothing
    assert reading["details"]["headline"]["image"] == "river"

    system, message = claude.calls[0]
    assert "jg-002" in system and "swimming in a clear river" not in system  # dream text stays out of the cached part
    assert "swimming in a clear river" in message
    assert "A lantern in the hallway." in message  # earlier dreams, for the series
    assert "Maybe I need a rest." in message and "stranger" in message


def test_failed_reading_says_why(make_user, claude):
    claude.fail = "Claude is busy right now. Try again in a minute."
    client = make_user()
    dream = new_dream(client)
    client.post(f"/api/v1/dreams/{dream['id']}/readings")
    [reading] = client.get(f"/api/v1/dreams/{dream['id']}/readings").json()
    assert reading["status"] == "failed"
    assert reading["error"] == "Claude is busy right now. Try again in a minute."

    # Trying again starts a fresh reading, and the newest one is what you see.
    claude.fail = None
    client.post(f"/api/v1/dreams/{dream['id']}/readings")
    [reading] = client.get(f"/api/v1/dreams/{dream['id']}/readings").json()
    assert reading["status"] == "ready" and reading["error"] is None


def test_editing_the_text_marks_readings_out_of_date(make_user, claude):
    client = make_user()
    dream = new_dream(client)
    client.post(f"/api/v1/dreams/{dream['id']}/readings")
    client.patch(f"/api/v1/dreams/{dream['id']}", json={"title": "River"})
    assert client.get(f"/api/v1/dreams/{dream['id']}/readings").json()[0]["out_of_date"] is False
    client.patch(f"/api/v1/dreams/{dream['id']}", json={"text": "I was swimming in a cold river."})
    assert client.get(f"/api/v1/dreams/{dream['id']}/readings").json()[0]["out_of_date"] is True


def test_zhougong_is_not_ready_yet(make_user, claude):
    client = make_user()
    dream = new_dream(client)
    r = client.post(f"/api/v1/dreams/{dream['id']}/readings", json={"traditions": ["zhougong"]})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "tradition_not_ready"


def test_other_peoples_readings_are_hidden(make_user, claude):
    me, other = make_user("me"), make_user("other")
    dream = new_dream(me)
    [reading] = me.post(f"/api/v1/dreams/{dream['id']}/readings").json()
    assert other.post(f"/api/v1/dreams/{dream['id']}/readings").status_code == 404
    assert other.get(f"/api/v1/dreams/{dream['id']}/readings").status_code == 404
    assert other.post(f"/api/v1/readings/{reading['id']}/feedback", json={"resonated": True}).status_code == 404

    assert me.post(f"/api/v1/readings/{reading['id']}/feedback", json={"resonated": True}).status_code == 204
    assert me.get(f"/api/v1/dreams/{dream['id']}/readings").json()[0]["resonated"] is True


def test_hourly_limit(make_user, claude, db):
    from app.db.models import Dream, Interpretation

    client = make_user()
    dream = new_dream(client)
    row = db.get(Dream, dream["id"])
    row.interpretations += [Interpretation(tradition="jung", reading="", output={}) for _ in range(readings.HOURLY_LIMIT)]
    db.commit()
    r = client.post(f"/api/v1/dreams/{dream['id']}/readings")
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "too_many_ai_requests"
