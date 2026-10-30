"""API tests for sharing a dream to Community and taking it back."""

from __future__ import annotations

from tests.test_api import db, make_user, new_dream  # noqa: F401  (pytest fixtures)

SISTER = {
    "text": "My sister and I found a lantern. my sister's hands were warm. 奶奶在扫院子。",
    "elements": [
        {"kind": "person", "value": "sister"},
        {"kind": "person", "value": "奶奶"},
        {"kind": "symbol", "value": "lantern"},
    ],
}


def test_preview_replaces_tagged_people(make_user):
    client = make_user()
    dream = new_dream(client, **SISTER)
    r = client.post(f"/api/v1/dreams/{dream['id']}/share/preview")
    assert r.status_code == 200
    preview = r.json()
    assert preview["text"] == "Someone and I found a lantern. Someone's hands were warm. 某人在扫院子。"
    assert sorted(preview["removed"]) == ["sister", "奶奶"]


def test_share_and_unshare(make_user):
    client = make_user()
    dream = new_dream(client, **SISTER, emotions=[{"emotion": "joy"}])
    r = client.post(f"/api/v1/dreams/{dream['id']}/share", json={"text": "Someone and I found a lantern."})
    assert r.status_code == 201
    shared = r.json()
    assert shared["text"] == "Someone and I found a lantern."
    assert shared["emotion"] == "joy" and shared["top_symbol"] == "lantern"
    assert client.get(f"/api/v1/dreams/{dream['id']}").json()["visibility"] == "shared"
    assert client.get("/api/v1/dreams").json()["items"][0]["visibility"] == "shared"
    assert client.get("/api/v1/me").json()["stats"]["shared"] == 1

    # Sharing again replaces the snapshot instead of adding a second one.
    client.post(f"/api/v1/dreams/{dream['id']}/share", json={"text": "A lantern."})
    assert client.get("/api/v1/me").json()["stats"]["shared"] == 1

    assert client.delete(f"/api/v1/dreams/{dream['id']}/share").status_code == 204
    assert client.get(f"/api/v1/dreams/{dream['id']}").json()["visibility"] == "private"


def test_deleting_a_dream_unshares_it(make_user, db):
    from app.db.models import SharedDream

    client = make_user()
    dream = new_dream(client)
    client.post(f"/api/v1/dreams/{dream['id']}/share", json={"text": "A river."})
    client.delete(f"/api/v1/dreams/{dream['id']}")
    assert db.query(SharedDream).filter_by(dream_id=dream["id"]).count() == 0
    restored = client.post(f"/api/v1/dreams/{dream['id']}/restore").json()
    assert restored["visibility"] == "private"  # restoring doesn't quietly share it again


def test_unshare_everything_only_touches_your_dreams(make_user):
    me, other = make_user("me"), make_user("other")
    mine = [new_dream(me) for _ in range(2)]
    theirs = new_dream(other)
    for d in mine:
        me.post(f"/api/v1/dreams/{d['id']}/share", json={"text": "A river."})
    other.post(f"/api/v1/dreams/{theirs['id']}/share", json={"text": "A river."})

    assert me.delete("/api/v1/me/shares").status_code == 204
    assert me.get("/api/v1/me").json()["stats"]["shared"] == 0
    assert other.get("/api/v1/me").json()["stats"]["shared"] == 1


def test_cannot_share_someone_elses_dream(make_user):
    me, other = make_user("me"), make_user("other")
    theirs = new_dream(other)
    assert me.post(f"/api/v1/dreams/{theirs['id']}/share/preview").status_code == 404
    assert me.post(f"/api/v1/dreams/{theirs['id']}/share", json={"text": "x"}).status_code == 404
    assert me.delete(f"/api/v1/dreams/{theirs['id']}/share").status_code == 404
