"""API tests for auth, Me and dreams. Each test runs in a rolled-back transaction.

Needs Postgres running and migrated; skipped otherwise.
"""

from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.deps import get_db
from app.main import app
from app.security import SESSION_COOKIE
from seed.load_symbols import load_symbols

PASSWORD = "correct horse battery"


@pytest.fixture
def db():
    try:
        connection = engine.connect()
    except OperationalError:
        pytest.skip("Postgres isn't running")
    transaction = connection.begin()
    # Commits inside endpoints become savepoints, so the outer rollback undoes everything.
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    load_symbols(session)
    app.dependency_overrides[get_db] = lambda: session
    try:
        yield session
    finally:
        app.dependency_overrides.clear()
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def make_user(db):
    """Returns a logged-in client for a new user. Each client keeps its own cookies."""
    count = 0

    def make(name: str = "dreamer") -> TestClient:
        nonlocal count
        count += 1
        client = TestClient(app)
        r = client.post("/api/v1/auth/register", json={"email": f"{name}{count}@example.test", "password": PASSWORD})
        assert r.status_code == 201, r.text
        return client

    return make


def new_dream(client: TestClient, **fields) -> dict:
    body = {"dreamed_on": "2026-10-20", "text": "I was swimming in a clear river at night."} | fields
    r = client.post("/api/v1/dreams", json=body)
    assert r.status_code == 201, r.text
    return r.json()


# ---------- Auth ----------


def test_register_logs_you_in(make_user):
    client = make_user()
    me = client.get("/api/v1/me").json()
    assert me["display_name"] == "Anonymous dreamer"
    assert me["stats"]["dreams"] == 0


def test_session_cookie_is_http_only(db):
    r = TestClient(app).post("/api/v1/auth/register", json={"email": "c@example.test", "password": PASSWORD})
    cookie = r.headers["set-cookie"].lower()
    assert SESSION_COOKIE in cookie and "httponly" in cookie and "samesite=lax" in cookie


def test_duplicate_email(db):
    client = TestClient(app)
    client.post("/api/v1/auth/register", json={"email": "same@example.test", "password": PASSWORD})
    r = client.post("/api/v1/auth/register", json={"email": "SAME@example.test", "password": PASSWORD})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "email_taken"


def test_short_password_is_rejected(db):
    r = TestClient(app).post("/api/v1/auth/register", json={"email": "s@example.test", "password": "short"})
    assert r.status_code == 422
    assert r.json()["error"]["field"] == "password"


def test_login_gives_the_same_error_for_wrong_password_and_unknown_email(db):
    TestClient(app).post("/api/v1/auth/register", json={"email": "l@example.test", "password": PASSWORD})
    wrong_password = TestClient(app).post("/api/v1/auth/login", json={"email": "l@example.test", "password": "nope-nope-nope"})
    unknown_email = TestClient(app).post("/api/v1/auth/login", json={"email": "who@example.test", "password": PASSWORD})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


def test_login_then_logout(db):
    TestClient(app).post("/api/v1/auth/register", json={"email": "o@example.test", "password": PASSWORD})
    client = TestClient(app)
    assert client.post("/api/v1/auth/login", json={"email": "o@example.test", "password": PASSWORD}).status_code == 200
    assert client.get("/api/v1/me").status_code == 200
    assert client.post("/api/v1/auth/logout").status_code == 204
    assert client.get("/api/v1/me").status_code == 401


def test_not_logged_in(db):
    r = TestClient(app).get("/api/v1/dreams")
    assert r.status_code == 401
    assert r.json() == {"error": {"code": "not_logged_in", "message": "Please log in.", "field": None}}


# ---------- Creating dreams ----------


def test_only_text_and_date_are_required(make_user):
    dream = new_dream(make_user())
    assert dream["number"] == 1
    assert dream["source"] == "text"
    assert dream["dream_type"] == "neutral"
    assert dream["elements"] == [] and dream["emotions"] == []


def test_full_dream_links_symbols_and_picks_a_headline(make_user):
    dream = new_dream(
        make_user(),
        valence=0, intensity=4,
        emotions=[{"position": 1, "emotion": "calm"}, {"position": 2, "emotion": "fear", "intensity": 4}],
        elements=[
            {"kind": "symbol", "value": "river", "position": 1, "ai_suggested": True},
            {"kind": "symbol", "value": "lighthouse", "position": 2},
            {"kind": "color", "value": "night blue", "details": {"hex": "#1F2A5C"}},
            {"kind": "symbol", "value": "phone", "ai_suggested": True, "kept": False},
        ],
    )
    by_value = {el["value"]: el for el in dream["elements"]}
    assert by_value["river"]["symbol"]["code"] == "zg-040"  # 水
    assert by_value["lighthouse"]["symbol"] is None or by_value["lighthouse"]["symbol"]["code"] != "zg-021"
    assert by_value["night blue"]["symbol"] is None  # colors are never looked up
    assert by_value["phone"]["kept"] is False  # dropped suggestions are kept for measuring the AI
    assert dream["top_element_id"] == by_value["river"]["id"]
    assert dream["dream_type"] == "mixed"


def test_numbers_count_up_per_user(make_user):
    a, b = make_user("a"), make_user("b")
    assert [new_dream(a)["number"], new_dream(a)["number"], new_dream(b)["number"]] == [1, 2, 1]


@pytest.mark.parametrize(
    "fields, field",
    [
        ({"valence": 5}, "valence"),
        ({"valance": 1}, "valance"),  # a typo is rejected, not silently ignored
        ({"emotions": [{"emotion": "angry"}]}, "emotions.0.emotion"),
        ({"text": ""}, "text"),
    ],
)
def test_invalid_values_name_the_field(make_user, fields, field):
    r = make_user().post("/api/v1/dreams", json={"dreamed_on": "2026-10-20", "text": "x"} | fields)
    assert r.status_code == 422
    assert r.json()["error"]["field"] == field


# ---------- Privacy ----------


def test_other_peoples_dreams_are_invisible(make_user):
    alice, bob = make_user("alice"), make_user("bob")
    dream = new_dream(alice)
    path = f"/api/v1/dreams/{dream['id']}"
    assert bob.get(path).status_code == 404
    assert bob.patch(path, json={"title": "mine now"}).status_code == 404
    assert bob.delete(path).status_code == 404
    assert bob.get("/api/v1/dreams").json()["items"] == []
    assert alice.get(path).json()["title"] is None  # untouched


def test_cannot_link_someone_elses_person(make_user, db):
    from app.db.models import Person, User

    alice, bob = make_user("alice"), make_user("bob")
    alice_id = alice.get("/api/v1/me").json()["id"]
    person = Person(user_id=alice_id, name="sister", role="family")
    db.add(person)
    db.flush()
    r = bob.post("/api/v1/dreams", json={
        "dreamed_on": "2026-10-20", "text": "x",
        "elements": [{"kind": "person", "value": "sister", "person_id": person.id}],
    })
    assert r.status_code == 422
    assert r.json()["error"]["field"] == "elements.0.person_id"


# ---------- Updating ----------


def test_editing_text_keeps_the_first_version(make_user):
    client = make_user()
    dream = new_dream(client, text="first")
    path = f"/api/v1/dreams/{dream['id']}"
    client.patch(path, json={"text": "second"})
    updated = client.patch(path, json={"text": "third"}).json()
    assert (updated["text"], updated["original_text"]) == ("third", "first")


def test_your_dream_type_is_never_overwritten(make_user):
    client = make_user()
    dream = new_dream(client, valence=2)
    path = f"/api/v1/dreams/{dream['id']}"
    assert dream["dream_type"] == "pleasant"
    chosen = client.patch(path, json={"dream_type": "mixed"}).json()
    assert (chosen["dream_type"], chosen["dream_type_set_by"]) == ("mixed", "user")
    later = client.patch(path, json={"valence": -2, "intensity": 5}).json()
    assert later["dream_type"] == "mixed"  # would be "nightmare" if recalculated


def test_lists_are_replaced_as_a_whole(make_user):
    client = make_user()
    dream = new_dream(client, emotions=[{"emotion": "calm"}, {"emotion": "joy"}])
    updated = client.patch(f"/api/v1/dreams/{dream['id']}", json={"emotions": [{"emotion": "fear"}]}).json()
    assert [e["emotion"] for e in updated["emotions"]] == ["fear"]


# ---------- Listing ----------


def test_list_filters_and_counts(make_user):
    client = make_user()
    new_dream(client, dreamed_on="2026-10-01", text="snow on the bridge", emotions=[{"emotion": "calm"}],
              elements=[{"kind": "symbol", "value": "snow"}])
    new_dream(client, dreamed_on="2026-10-15", text="a snake in the well", emotions=[{"emotion": "fear"}],
              elements=[{"kind": "symbol", "value": "snake"}])
    new_dream(client, dreamed_on="2026-09-20", text="old dream", emotions=[{"emotion": "calm"}])

    october = client.get("/api/v1/dreams", params={"from": "2026-10-01", "to": "2026-10-31"}).json()
    assert [d["dreamed_on"] for d in october["items"]] == ["2026-10-15", "2026-10-01"]  # newest first
    assert october["counts_by_emotion"] == {"calm": 1, "fear": 1}

    def titles(**params):
        return [d["dreamed_on"] for d in client.get("/api/v1/dreams", params=params).json()["items"]]

    assert titles(emotion="calm") == ["2026-10-01", "2026-09-20"]
    assert titles(symbol="zg-058") == ["2026-10-15"]  # 蛇
    assert titles(q="BRIDGE") == ["2026-10-01"]  # text search ignores case
    # No valence was given, so the rule calls the snake dream neutral, not a nightmare.
    assert titles(type="neutral", q="snake") == ["2026-10-15"]
    assert titles(type="nightmare") == []


def test_list_pages_with_a_cursor(make_user):
    client = make_user()
    for day in ("2026-10-01", "2026-10-02", "2026-10-03"):
        new_dream(client, dreamed_on=day)
    seen, cursor = [], None
    while True:
        page = client.get("/api/v1/dreams", params={"limit": 2} | ({"cursor": cursor} if cursor else {})).json()
        seen += [d["dreamed_on"] for d in page["items"]]
        if not (cursor := page["next_cursor"]):
            break
    assert seen == ["2026-10-03", "2026-10-02", "2026-10-01"]


def test_summary_shows_the_headline_symbol(make_user):
    client = make_user()
    new_dream(client, emotions=[{"emotion": "longing", "intensity": 3}, {"emotion": "calm", "intensity": 2}],
              elements=[{"kind": "place", "value": "老房子", "position": 1}])
    item = client.get("/api/v1/dreams").json()["items"][0]
    assert item["top_symbol"] == {"value": "老房子", "term_zh": "房屋", "term_en": "house"}
    assert (item["emotion"], item["blend"]) == ("longing", "calm")


# ---------- Deleting (decision 6) ----------


def test_delete_restore_and_forever(make_user):
    client = make_user()
    dream = new_dream(client)
    path = f"/api/v1/dreams/{dream['id']}"

    assert client.delete(f"{path}/forever").status_code == 404  # only from Recently deleted
    assert client.delete(path).status_code == 204
    assert client.get(path).status_code == 404
    assert client.get("/api/v1/dreams").json()["items"] == []
    deleted = client.get("/api/v1/dreams/deleted").json()
    assert [d["id"] for d in deleted] == [dream["id"]]
    deleted_on = date.fromisoformat(deleted[0]["deleted_at"][:10])  # in UTC, like purge_on
    assert (date.fromisoformat(deleted[0]["purge_on"]) - deleted_on).days == 30

    assert client.post(f"{path}/restore").status_code == 200
    assert client.get(path).status_code == 200

    client.delete(path)
    assert client.delete(f"{path}/forever").status_code == 204
    assert client.get("/api/v1/dreams/deleted").json() == []


def test_deleting_unshares(make_user, db):
    from app.db.models import Dream

    client = make_user()
    dream = new_dream(client)
    db.get(Dream, dream["id"]).visibility = "shared"
    db.flush()
    client.delete(f"/api/v1/dreams/{dream['id']}")
    assert db.get(Dream, dream["id"]).visibility == "private"


# ---------- Me ----------


def test_update_settings(make_user):
    client = make_user()
    me = client.patch("/api/v1/me", json={
        "display_name": "Moth Keeper", "capture_with": "text", "check_in": "full",
        "reminder": {"enabled": True}, "memories": "off",
    }).json()
    assert me["display_name"] == "Moth Keeper"
    assert (me["capture_with"], me["check_in"], me["memories"]) == ("text", "full", "off")
    assert me["reminder"] == {"enabled": True, "time": "07:30:00"}  # default time
    off = client.patch("/api/v1/me", json={"reminder": {"enabled": False}}).json()
    assert off["reminder"]["enabled"] is False


def test_profile_orb_must_use_your_own_dream(make_user):
    alice, bob = make_user("alice"), make_user("bob")
    dream = new_dream(alice)
    r = bob.patch("/api/v1/me", json={"profile_orb": {"mode": "dream", "dream_id": dream["id"]}})
    assert r.status_code == 422
    ok = alice.patch("/api/v1/me", json={"profile_orb": {"mode": "dream", "dream_id": dream["id"]}})
    assert ok.json()["profile_orb"] == {"mode": "dream", "dream_id": dream["id"]}


def test_stats(make_user):
    client = make_user()
    new_dream(client, dreamed_on=date.today().isoformat(), emotions=[{"emotion": "calm"}])
    new_dream(client, dreamed_on=date.today().isoformat(), emotions=[{"emotion": "calm"}, {"emotion": "joy"}])
    stats = client.get("/api/v1/me").json()["stats"]
    assert stats["dreams"] == 2
    assert stats["top_emotions"][0] == "calm"


def test_delete_account_needs_confirmation(make_user):
    client = make_user()
    new_dream(client)
    assert client.request("DELETE", "/api/v1/me", json={"confirm": "yes"}).status_code == 422
    assert client.request("DELETE", "/api/v1/me", json={"confirm": "delete my account"}).status_code == 204
    assert client.get("/api/v1/me").status_code == 401
