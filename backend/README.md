# Backend

FastAPI + SQLAlchemy + Postgres (with pgvector). Tables follow `docs/data-model.md`.

## First-time setup

```bash
# from the repo root: start the database (needs Docker Desktop running)
docker compose up -d --wait db

# from backend/: create the tables, then load the dictionaries and test dreams
.venv/bin/alembic upgrade head
.venv/bin/python -m seed.load_symbols
.venv/bin/python -m seed.load_test_dreams
```

Both seed scripts are safe to re-run.

## AI readings

Readings call Claude, so they need an API key from console.anthropic.com in `backend/.env` (git ignores it):

```
ANTHROPIC_API_KEY=sk-ant-…
```

Without it everything else works, and readings fail with a clear message. The prompt is `app/prompts/jung_v1.md`; when you change it meaningfully, copy it to a new version and bump `PROMPT_VERSION` in `app/services/readings.py`, so old and new readings can be compared. Tests never call Claude.

## Running the API

```bash
.venv/bin/uvicorn app.main:app --reload
```

Then open http://localhost:8000/docs for interactive docs where you can try every endpoint. Endpoints live under `/api/v1` (see `docs/api-contract.md`).

## Tests

```bash
.venv/bin/pytest
```

- `tests/test_matching.py`: the test-dream check (expected symbols, false positives, dream types) and dictionary integrity. No database needed.
- `tests/test_api.py`: every auth, Me and dream endpoint, including that one user can never see another's dreams. Needs the database.
- `tests/test_patterns.py`: each Patterns lens on a small set of dreams, period and filters, and related dreams.
- `tests/test_sharing.py`: share preview (who gets replaced with "someone"), share, unshare, unshare everything, and that deleting a dream unshares it.
- `tests/test_seed_db.py`: loads everything into Postgres inside a transaction and rolls it back. Skipped if the database isn't running.

## Changing the tables

Edit `app/db/models.py`, then:

```bash
.venv/bin/alembic revision --autogenerate -m "what changed"
# read the generated file in migrations/versions/ before applying it
.venv/bin/alembic upgrade head
```

## Where things live

| path | what |
|---|---|
| `app/db/models.py` | the tables |
| `app/db/session.py` | database connection (`DATABASE_URL`, defaulting to the docker-compose database) |
| `app/routers/` | the endpoints: `auth`, `me`, `dreams`, `shares`, `patterns` |
| `app/schemas.py` | request and response shapes, with their validation rules |
| `app/services/dreams.py` | dream logic shared by create and update |
| `app/services/patterns.py` | the five Patterns lenses: chart data, stats and reading sentences |
| `app/security.py` | password hashing and login sessions |
| `app/matching.py` | finds dictionary symbols in dream text by alias |
| `app/dream_rules.py` | the dream type rule (decision 9) |
| `seed/` | loaders for `data/symbols/*.csv` and `data/seed/test-dreams.json` |
| `migrations/` | Alembic migrations |
