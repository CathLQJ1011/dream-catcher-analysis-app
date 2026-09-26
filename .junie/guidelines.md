# Project rules
- Stack: React + TS + Vite + Tailwind + shadcn/ui (frontend); Python 3.12 + FastAPI + SQLAlchemy + Postgres/pgvector (backend).
- Never add a new library without asking me first.
- Never hard-code colors, font sizes, or spacing. Use the Tailwind theme tokens in tailwind.config / CSS variables only.
- Use shadcn/ui components before writing custom ones.
- Keep changes small: one feature per task. Do not refactor unrelated files.
- Never read, print, or commit .env files or API keys.
- After each task, summarize: files changed, what each change does, and anything I should verify manually.
- Match the design spec in docs/design-spec.md exactly. If something in the spec is ambiguous, ask instead of guessing.