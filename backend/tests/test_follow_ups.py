"""API tests for follow-up questions on a reading. Claude is replaced by fakes, so these never call the real API."""

from __future__ import annotations

import pytest

from app.errors import ApiError
from app.services import ai_limit, follow_ups
from tests.test_api import db, make_user, new_dream  # noqa: F401  (pytest fixtures)
from tests.test_readings import claude  # noqa: F401  (the fake that writes readings)


@pytest.fixture
def answers(monkeypatch):
    """A fake Claude for follow-ups. Set `.reply` to choose what it says; `.calls` records what it was sent."""

    class Fake:
        def __init__(self):
            self.calls: list[tuple[str, list[dict]]] = []
            self.reply = "One possibility is that the river is your week."

        def __call__(self, system: str, messages: list[dict]) -> str:
            self.calls.append((system, messages))
            return self.reply

    fake = Fake()
    monkeypatch.setattr(follow_ups, "call_claude", fake)
    ai_limit.reset()
    return fake


def read(client, tradition="jung"):
    dream = new_dream(client, text="I was flying over a river at night.")
    [reading] = client.post(f"/api/v1/dreams/{dream['id']}/readings", json={"traditions": [tradition]}).json()
    return dream, reading


def test_ask_and_the_thread_is_kept(make_user, claude, answers):  # noqa: F811
    client = make_user()
    dream, reading = read(client)

    r = client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "  Why the river? "})
    assert r.status_code == 201
    assert r.json()["question"] == "Why the river?" and r.json()["answer"] == answers.reply

    answers.reply = "Then the water might be calmer than you thought."
    client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "It was warm water."})

    [out] = client.get(f"/api/v1/dreams/{dream['id']}/readings").json()
    assert [f["question"] for f in out["follow_ups"]] == ["Why the river?", "It was warm water."]

    # The second call carries the dream, the reading as Claude's turn, and the first exchange.
    system, messages = answers.calls[1]
    assert "Jungian dream readings" in system
    assert [m["role"] for m in messages] == ["user", "assistant", "user", "assistant", "user"]
    assert "flying over a river" in messages[0]["content"]
    assert "You might notice that you chose to swim." in messages[1]["content"]
    assert messages[2:] == [
        {"role": "user", "content": "Why the river?"},
        {"role": "assistant", "content": "One possibility is that the river is your week."},
        {"role": "user", "content": "It was warm water."},
    ]


def test_zhougong_answers_keep_only_real_classical_lines(make_user, claude, answers):  # noqa: F811
    client = make_user()
    _, reading = read(client, "zhougong")
    # A real line (punctuation aside), a near copy of 「封书信者主通达」, and a line no entry has.
    answers.reply = "「飞上天，富贵大安」. Letters: 「封书信者通达」. Rivers: 「河水长流万事兴」."
    r = client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "河呢？"})
    assert r.json()["answer"] == "「飞上天，富贵大安」. Letters: 「封书信者主通达」. Rivers: ."
    system, messages = answers.calls[0]
    assert "飞上天富贵大安" in system  # the 周公 prompt and dictionary
    # Claude sees only what it wrote, not the source the app added to each image.
    assert "1995版" not in messages[1]["content"] and "飞上天富贵大安" in messages[1]["content"]


def test_blank_question_is_rejected(make_user, claude, answers):  # noqa: F811
    client = make_user()
    _, reading = read(client)
    assert client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "   "}).status_code == 422
    assert answers.calls == []


def test_only_your_own_readings(make_user, claude, answers):  # noqa: F811
    me, other = make_user("me"), make_user("other")
    _, reading = read(me)
    assert other.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "Why?"}).status_code == 404


def test_at_most_ten_per_reading(make_user, claude, answers, monkeypatch):  # noqa: F811
    monkeypatch.setattr(follow_ups, "PER_READING", 2)
    client = make_user()
    _, reading = read(client)
    for _ in range(2):
        assert client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "Why?"}).status_code == 201
    r = client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "Why?"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "too_many_follow_ups"


def test_not_while_the_reading_is_failed(make_user, claude, answers):  # noqa: F811
    claude.fail = "Claude is busy right now. Try again in a minute."
    client = make_user()
    _, reading = read(client)
    r = client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "Why?"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "reading_not_ready"


def test_hourly_limit(make_user, claude, answers, monkeypatch):  # noqa: F811
    monkeypatch.setattr(follow_ups, "HOURLY_LIMIT", 1)
    client = make_user()
    _, reading = read(client)
    assert client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "Why?"}).status_code == 201
    r = client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "Why?"})
    assert r.status_code == 429


def test_claude_failure_saves_nothing(make_user, claude, monkeypatch):  # noqa: F811
    def broken(system, messages):
        raise ApiError(503, "ai_unavailable", follow_ups.UNAVAILABLE)

    monkeypatch.setattr(follow_ups, "call_claude", broken)
    ai_limit.reset()
    client = make_user()
    dream, reading = read(client)
    r = client.post(f"/api/v1/readings/{reading['id']}/follow-ups", json={"question": "Why?"})
    assert r.status_code == 503
    assert client.get(f"/api/v1/dreams/{dream['id']}/readings").json()[0]["follow_ups"] == []
