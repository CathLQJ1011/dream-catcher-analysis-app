"""API tests for the Patterns lenses and related dreams."""

from __future__ import annotations

from datetime import date, timedelta

from tests.test_api import db, make_user, new_dream  # noqa: F401  (pytest fixtures)


def days_ago(n: int) -> str:
    return (date.today() - timedelta(days=n)).isoformat()


def seed(client):
    """Four dreams in the last 30 days and one older one that every 30-day lens must ignore."""
    new_dream(client, dreamed_on=days_ago(1), text="A river at night.", valence=2, intensity=4, lucidity=2,
              emotions=[{"emotion": "calm"}], elements=[{"kind": "symbol", "value": "river"}, {"kind": "color", "value": "blue"}])
    new_dream(client, dreamed_on=days_ago(3), text="The sea rose.", valence=1, intensity=2,
              emotions=[{"emotion": "calm"}], elements=[{"kind": "symbol", "value": "sea"}, {"kind": "person", "value": "Sister"}])
    new_dream(client, dreamed_on=days_ago(5), text="Chased in a mall.", valence=-2, intensity=5,
              emotions=[{"emotion": "fear"}], elements=[{"kind": "person", "value": "sister"}, {"kind": "color", "value": "red"}])
    new_dream(client, dreamed_on=days_ago(8), text="Fragments.")
    new_dream(client, dreamed_on=days_ago(60), text="An old river.", valence=-2, elements=[{"kind": "symbol", "value": "river"}])


def lens(client, name, **params):
    r = client.get(f"/api/v1/patterns/{name}", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def test_emotion_lens(make_user):
    client = make_user()
    seed(client)
    frame = lens(client, "emotion")
    assert frame["dream_count"] == 4  # the 60-day-old dream is outside 30d
    assert len(frame["hero"]["points"]) == 3  # only dreams with a valence are placed
    stats = {s["label"]: s["value"] for s in frame["stats"]}
    assert stats == {"Avg valence": "+0.3", "Most felt": "Calm", "Intensity": "3.7"}
    assert "*Calm*" in frame["reading"]
    assert frame["list"][0]["intensity"] == 5  # most intense first
    assert lens(client, "emotion", period="year")["dream_count"] == 5


def test_symbols_lens_counts_dictionary_terms(make_user):
    client = make_user()
    seed(client)
    frame = lens(client, "symbols")
    # river and sea are both 水 in the dictionary
    assert frame["hero"]["top"][0] == {"name": "水", "count": 2}
    assert frame["stats"][0] == {"value": "水", "label": "Top symbol"}
    assert frame["reading"] == "水 appears in 2 of 4 dreams, most often alongside *calm*."
    assert len(frame["list"]) == 2


def test_rhythms_lens(make_user):
    client = make_user()
    seed(client)
    frame = lens(client, "rhythms")
    assert sum(frame["hero"]["weekdays"]) == 4
    assert {s["label"]: s["value"] for s in frame["stats"]}["Lucid"] == "25%"
    assert [d["intensity"] for d in frame["list"]] == [4]


def test_colors_lens(make_user):
    client = make_user()
    seed(client)
    frame = lens(client, "colors")
    assert len(frame["hero"]["stripes"]) == 2
    assert (frame["hero"]["warm"], frame["hero"]["cool"]) == (50, 50)
    assert {row["name"] for row in frame["list"]} == {"Blue", "Red"}
    assert frame["based_on"] == 2


def test_people_lens_is_locked_until_ten(make_user):
    client = make_user()
    seed(client)
    frame = lens(client, "people")
    assert frame["locked"] is True
    assert frame["hero"] == {"have": 2, "need": 10}
    assert {s["label"]: s["value"] for s in frame["stats"]}["Most seen"] == "sister"  # Sister and sister are one


def test_empty_period_and_filters(make_user):
    client = make_user()
    assert lens(client, "symbols")["dream_count"] == 0
    seed(client)
    assert lens(client, "emotion", emotion="fear")["dream_count"] == 1
    assert lens(client, "emotion", type="nightmare")["dream_count"] == 1


def test_patterns_only_see_your_dreams(make_user):
    me, other = make_user("me"), make_user("other")
    seed(other)
    assert lens(me, "emotion")["dream_count"] == 0


def test_bad_lens_or_period(make_user):
    client = make_user()
    assert client.get("/api/v1/patterns/dreams").status_code == 422
    assert client.get("/api/v1/patterns/emotion?period=2w").status_code == 422


def test_related_dreams(make_user):
    client = make_user()
    river = new_dream(client, text="A river.", elements=[{"kind": "symbol", "value": "river"}, {"kind": "person", "value": "sister"}])
    sea = new_dream(client, text="The sea.", elements=[{"kind": "symbol", "value": "sea"}])
    phone = new_dream(client, text="A phone call.", elements=[{"kind": "person", "value": "Sister"}])
    new_dream(client, text="Nothing in common.", elements=[{"kind": "symbol", "value": "cheese"}])

    related = client.get(f"/api/v1/dreams/{river['id']}/related").json()
    assert {r["dream"]["id"] for r in related} == {sea["id"], phone["id"]}
    by_id = {r["dream"]["id"]: r for r in related}
    assert by_id[sea["id"]]["symbols"] == [river["elements"][0]["symbol"]["code"]]
    assert by_id[phone["id"]]["people"] == ["sister"]

    other = make_user("other")
    assert other.get(f"/api/v1/dreams/{river['id']}/related").status_code == 404
