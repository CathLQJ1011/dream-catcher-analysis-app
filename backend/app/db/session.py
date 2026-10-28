import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Settings come from backend/.env when it exists; the default matches docker-compose.yml.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg://dreamcatcher:dreamcatcher-dev@localhost:5432/dreamcatcher",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(engine)
