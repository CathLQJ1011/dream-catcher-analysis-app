"""Loads the dictionaries and test dreams into the real database, then rolls back.

Needs Postgres running (docker compose up -d db) and migrated (alembic upgrade head);
skipped otherwise. Nothing is left behind: everything runs inside one transaction.
"""

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.db.models import Dream, DreamElement, DreamLink, Person, Symbol
from app.db.session import engine
from seed.load_symbols import load_symbols
from seed.load_test_dreams import load_test_dreams


@pytest.fixture
def session():
    try:
        connection = engine.connect()
    except OperationalError:
        pytest.skip("Postgres isn't running")
    transaction = connection.begin()
    db = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def seeded(session):
    load_symbols(session)
    dreams = load_test_dreams(session)
    return session, dreams


def test_symbols_load(seeded):
    db, _ = seeded
    count = lambda t: db.scalar(select(func.count()).select_from(Symbol).where(Symbol.tradition == t))
    assert count("zhougong") == 73
    assert count("jung") == 25


def test_symbols_reload_without_duplicates(seeded):
    db, _ = seeded
    load_symbols(db)  # running the loader again updates rows in place
    assert db.scalar(select(func.count()).select_from(Symbol)) == 98


def test_five_dreams_with_types(seeded):
    _, dreams = seeded
    assert len(dreams) == 5
    assert dreams["snake-well"].dream_type == "nightmare"
    assert dreams["river-teeth"].dream_type == "mixed"


def test_sister_is_one_person_across_dreams(seeded):
    db, dreams = seeded
    sister = db.scalars(select(Person).where(Person.name == "sister")).one()
    dream_ids = set(db.scalars(select(DreamElement.dream_id).where(DreamElement.person_id == sister.id)))
    assert dream_ids == {dreams["old-house-snow"].id, dreams["snake-well"].id}


def test_people_without_elements_are_saved(seeded):
    db, _ = seeded
    assert db.scalars(select(Person).where(Person.name == "stranger on the train")).one()


def test_dreams_link(seeded):
    db, dreams = seeded
    link = db.scalars(select(DreamLink)).one()
    assert (link.from_dream_id, link.to_dream_id) == (dreams["snake-well"].id, dreams["old-house-snow"].id)


def test_elements_link_to_the_right_symbols(seeded):
    db, dreams = seeded
    by_value = {el.value: el for el in dreams["exam-cat-lighthouse"].elements}
    assert by_value["cat catching a mouse"].symbol.code == "zg-073"  # 猫, not 老鼠
    lighthouse = by_value["lighthouse"].symbol
    assert lighthouse is None or lighthouse.code != "zg-021"  # never 房屋
    assert by_value["phone call"].symbol is None
