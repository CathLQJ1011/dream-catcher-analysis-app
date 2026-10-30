"""Database tables, following docs/data-model.md and docs/decisions.md.

Every table except `symbols` belongs to one user, directly or through `dreams`.
Fixed choices (emotions, roles, kinds…) are plain strings guarded by CHECK
constraints, which keep migrations simple when a new value is added.
"""

from __future__ import annotations

from datetime import date, datetime, time

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Identity,
    SmallInteger,
    String,
    Table,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

EMOTIONS = ("calm", "lucid", "longing", "joy", "fear", "unease", "sadness", "neutral")


def one_of(column: str, values: tuple[str, ...], name: str) -> CheckConstraint:
    quoted = ", ".join(f"'{v}'" for v in values)
    return CheckConstraint(f"{column} IN ({quoted})", name=name)


def between(column: str, low: float, high: float, name: str) -> CheckConstraint:
    return CheckConstraint(f"{column} BETWEEN {low} AND {high}", name=name)


class Base(DeclarativeBase):
    pass


def pk() -> Mapped[int]:
    return mapped_column(BigInteger, Identity(), primary_key=True)


def created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class TagFlags:
    """Decision 5: every tag remembers whether the AI suggested it and whether the dreamer kept it."""

    ai_suggested: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    kept: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


# ---------- Users ----------


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        one_of("capture_with", ("voice", "text"), "capture_with_valid"),
        one_of("memories", ("all", "gentle", "off"), "memories_valid"),
        one_of("check_in", ("minimal", "full"), "check_in_valid"),
    )

    id: Mapped[int] = pk()
    email: Mapped[str] = mapped_column(String(320), unique=True)
    # Argon2 hash; empty for accounts that only sign in with Google or Apple.
    password_hash: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(64), default="Anonymous dreamer")
    # {"mode": "auto"} | {"mode": "mix", "emotion": …, "blend": …} | {"mode": "dream", "dream_id": …}
    profile_orb: Mapped[dict] = mapped_column(JSONB, default=lambda: {"mode": "auto"})
    capture_with: Mapped[str] = mapped_column(String(8), default="voice")
    memories: Mapped[str] = mapped_column(String(8), default="gentle")
    traditions: Mapped[list[str]] = mapped_column(ARRAY(String(16)), default=lambda: ["zhougong", "jung"])
    # Decision 14: how much the Capture check-in asks, and the morning reminder.
    check_in: Mapped[str] = mapped_column(String(8), default="minimal", server_default="minimal")
    reminder_at: Mapped[time | None] = mapped_column(Time)  # null means off
    created_at: Mapped[datetime] = created_at()

    dreams: Mapped[list[Dream]] = relationship(back_populates="user", cascade="all, delete-orphan")
    people: Mapped[list[Person]] = relationship(back_populates="user", cascade="all, delete-orphan")


class AuthSession(Base):
    """A logged-in browser (decision 13). Only a hash of the cookie's token is stored,
    so a leaked database can't be used to log in; deleting the row logs that browser out."""

    __tablename__ = "sessions"

    id: Mapped[int] = pk()
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = created_at()
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship()


# ---------- Dreams ----------


class Dream(Base):
    __tablename__ = "dreams"
    __table_args__ = (
        UniqueConstraint("user_id", "number", name="dream_number_per_user"),
        one_of("source", ("voice", "text"), "source_valid"),
        between("valence", -2, 2, "valence_range"),
        between("intensity", 1, 5, "intensity_range"),
        between("vividness", 0, 1, "vividness_range"),
        between("lucidity", 0, 3, "lucidity_range"),
        one_of("dream_type", ("pleasant", "nightmare", "mixed", "neutral"), "dream_type_valid"),
        one_of("dream_type_set_by", ("auto", "user"), "dream_type_set_by_valid"),
        one_of("narrative", ("linear", "fragmented", "jumping"), "narrative_valid"),
        one_of("visibility", ("private", "shared"), "visibility_valid"),
    )

    id: Mapped[int] = pk()
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column()  # "DREAM — 044", counted per user
    # Decision 3: only these two are required.
    dreamed_on: Mapped[date] = mapped_column(Date, index=True)
    text: Mapped[str] = mapped_column(Text)

    original_text: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(8), default="text")
    title: Mapped[str | None] = mapped_column(String(200))
    top_element_id: Mapped[int | None] = mapped_column(
        ForeignKey("dream_elements.id", ondelete="SET NULL", use_alter=True, name="dreams_top_element_fk")
    )
    valence: Mapped[int | None] = mapped_column(SmallInteger)
    intensity: Mapped[int | None] = mapped_column(SmallInteger)
    vividness: Mapped[float | None] = mapped_column(Float)
    lucidity: Mapped[int | None] = mapped_column(SmallInteger)
    # Decision 9: calculated, but a user's own choice is never overwritten.
    dream_type: Mapped[str | None] = mapped_column(String(10))
    dream_type_set_by: Mapped[str] = mapped_column(String(4), default="auto")
    narrative: Mapped[str | None] = mapped_column(String(12))
    spoke: Mapped[bool | None] = mapped_column(Boolean)
    was_heard: Mapped[bool | None] = mapped_column(Boolean)
    sleep_at: Mapped[time | None] = mapped_column(Time)
    woke_at: Mapped[time | None] = mapped_column(Time)
    recorded_soon: Mapped[bool | None] = mapped_column(Boolean)
    mood_on_waking: Mapped[str | None] = mapped_column(Text)
    creative_impulse: Mapped[str | None] = mapped_column(Text)
    insight: Mapped[str | None] = mapped_column(Text)
    reality_link: Mapped[str | None] = mapped_column(Text)
    image_motif: Mapped[str | None] = mapped_column(String(32))
    visibility: Mapped[str] = mapped_column(String(8), default="private")
    # Decision 6: set on delete; the row is purged for good 30 days later.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship(back_populates="dreams")
    emotions: Mapped[list[DreamEmotion]] = relationship(
        back_populates="dream", cascade="all, delete-orphan", order_by="DreamEmotion.position"
    )
    elements: Mapped[list[DreamElement]] = relationship(
        back_populates="dream", cascade="all, delete-orphan", foreign_keys="DreamElement.dream_id"
    )
    events: Mapped[list[DreamEvent]] = relationship(back_populates="dream", cascade="all, delete-orphan")
    day_residue: Mapped[list[DayResidue]] = relationship(back_populates="dream", cascade="all, delete-orphan")
    interpretations: Mapped[list[Interpretation]] = relationship(back_populates="dream", cascade="all, delete-orphan")
    share: Mapped[SharedDream | None] = relationship(back_populates="dream", cascade="all, delete-orphan")


class DreamEmotion(TagFlags, Base):
    """The feelings in a dream, in order. Same position = felt together (mixed)."""

    __tablename__ = "dream_emotions"
    __table_args__ = (
        one_of("emotion", EMOTIONS, "emotion_valid"),
        between("intensity", 1, 5, "emotion_intensity_range"),
    )

    id: Mapped[int] = pk()
    dream_id: Mapped[int] = mapped_column(ForeignKey("dreams.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(SmallInteger, default=1)
    emotion: Mapped[str] = mapped_column(String(10))
    intensity: Mapped[int | None] = mapped_column(SmallInteger)
    label: Mapped[str | None] = mapped_column(String(64))  # decision 10: the dreamer's own word
    note: Mapped[str | None] = mapped_column(Text)

    dream: Mapped[Dream] = relationship(back_populates="emotions")


class Person(Base):
    """Decision 11: the same person across dreams is one row."""

    __tablename__ = "people"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="person_name_per_user"),
        one_of("role", ("family", "friend", "stranger", "authority", "self", "other"), "role_valid"),
    )

    id: Mapped[int] = pk()
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(10), default="other")
    relation: Mapped[str | None] = mapped_column(String(120))
    note: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="people")


class DreamElement(TagFlags, Base):
    """Things in a dream (decision 7: one shared table). Kind-specific fields live in `details`."""

    __tablename__ = "dream_elements"
    __table_args__ = (one_of("kind", ("symbol", "person", "place", "body", "media", "color"), "element_kind_valid"),)

    id: Mapped[int] = pk()
    dream_id: Mapped[int] = mapped_column(ForeignKey("dreams.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(8), index=True)
    value: Mapped[str] = mapped_column(Text)
    position: Mapped[int | None] = mapped_column(SmallInteger)  # for places: scene order
    symbol_id: Mapped[int | None] = mapped_column(ForeignKey("symbols.id", ondelete="SET NULL"), index=True)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id", ondelete="SET NULL"), index=True)
    details: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")

    dream: Mapped[Dream] = relationship(back_populates="elements", foreign_keys=[dream_id])
    symbol: Mapped[Symbol | None] = relationship()
    person: Mapped[Person | None] = relationship()


class DreamEvent(TagFlags, Base):
    """Things that happen in a dream: violence, death, transformation."""

    __tablename__ = "dream_events"
    __table_args__ = (one_of("kind", ("violence", "death", "transformation"), "event_kind_valid"),)

    id: Mapped[int] = pk()
    dream_id: Mapped[int] = mapped_column(ForeignKey("dreams.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    position: Mapped[int | None] = mapped_column(SmallInteger)
    details: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")

    dream: Mapped[Dream] = relationship(back_populates="events")


class DayResidue(Base):
    """Waking life in the 1–3 days before the dream."""

    __tablename__ = "day_residue"
    __table_args__ = (
        one_of("kind", ("media", "academic", "social", "family_contact", "news", "other"), "residue_kind_valid"),
    )

    id: Mapped[int] = pk()
    dream_id: Mapped[int] = mapped_column(ForeignKey("dreams.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(16), default="other")
    note: Mapped[str] = mapped_column(Text)
    days_before: Mapped[int | None] = mapped_column(SmallInteger)

    dream: Mapped[Dream] = relationship(back_populates="day_residue")


class DreamLink(TagFlags, Base):
    """'This dream connects to that one.' Recurrence itself is counted, not stored."""

    __tablename__ = "dream_links"
    __table_args__ = (
        UniqueConstraint("from_dream_id", "to_dream_id", name="dream_link_once"),
        CheckConstraint("from_dream_id <> to_dream_id", name="dream_link_not_self"),
    )

    id: Mapped[int] = pk()
    from_dream_id: Mapped[int] = mapped_column(ForeignKey("dreams.id", ondelete="CASCADE"), index=True)
    to_dream_id: Mapped[int] = mapped_column(ForeignKey("dreams.id", ondelete="CASCADE"), index=True)
    reason: Mapped[str | None] = mapped_column(Text)


# ---------- Community ----------


class SharedDream(Base):
    """An anonymized snapshot of a dream in the Community blind box (docs/data-model.md, later tables).

    Never holds the dreamer's name or the dream's date. Unsharing or deleting the dream
    removes it right away (decision 6). Likes, comments and folders will point here.
    """

    __tablename__ = "shared_dreams"
    __table_args__ = (
        one_of("emotion", EMOTIONS, "shared_emotion_valid"),
        one_of("blend", EMOTIONS, "shared_blend_valid"),
    )

    id: Mapped[int] = pk()
    dream_id: Mapped[int] = mapped_column(ForeignKey("dreams.id", ondelete="CASCADE"), unique=True)
    text: Mapped[str] = mapped_column(Text)  # the anonymized text the dreamer approved
    emotion: Mapped[str | None] = mapped_column(String(10))
    blend: Mapped[str | None] = mapped_column(String(10))
    top_symbol: Mapped[str | None] = mapped_column(String(500))
    include_readings: Mapped[bool] = mapped_column(Boolean, default=False)
    include_image: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = created_at()

    dream: Mapped[Dream] = relationship(back_populates="share")


# ---------- Dictionaries and readings ----------


class Symbol(Base):
    """A curated dictionary entry (data/symbols/*.csv). Shared by all users."""

    __tablename__ = "symbols"
    __table_args__ = (one_of("tradition", ("zhougong", "jung", "neuro"), "tradition_valid"),)

    id: Mapped[int] = pk()
    code: Mapped[str] = mapped_column(String(16), unique=True)  # zg-001, jg-004…
    tradition: Mapped[str] = mapped_column(String(16), index=True)
    term_zh: Mapped[str] = mapped_column(String(64))
    term_en: Mapped[str] = mapped_column(String(120))
    aliases: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    meaning_zh: Mapped[str] = mapped_column(Text)
    meaning_en: Mapped[str] = mapped_column(Text)
    tone: Mapped[str | None] = mapped_column(String(16))
    source: Mapped[str] = mapped_column(Text)
    source_detail: Mapped[str | None] = mapped_column(Text)
    inclusive_note: Mapped[str | None] = mapped_column(Text)
    # Tradition-specific fields: classical lines and edition notes (周公), questions and cautions (Jung).
    extra: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")
    # Filled later by an embedding script; dimension left open until the model is chosen.
    embedding = mapped_column(Vector(), nullable=True)


interpretation_symbols = Table(
    "interpretation_symbols",
    Base.metadata,
    Column("interpretation_id", ForeignKey("interpretations.id", ondelete="CASCADE"), primary_key=True),
    Column("symbol_id", ForeignKey("symbols.id", ondelete="CASCADE"), primary_key=True),
)


class Interpretation(Base):
    """One reading per dream per tradition (Phase 5)."""

    __tablename__ = "interpretations"
    __table_args__ = (one_of("tradition", ("zhougong", "jung", "neuro"), "interpretation_tradition_valid"),)

    id: Mapped[int] = pk()
    dream_id: Mapped[int] = mapped_column(ForeignKey("dreams.id", ondelete="CASCADE"), index=True)
    tradition: Mapped[str] = mapped_column(String(16))
    reading: Mapped[str] = mapped_column(Text)
    output: Mapped[dict] = mapped_column(JSONB, default=dict)  # the full structured reading
    confidence_note: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(String(64))
    prompt_version: Mapped[str | None] = mapped_column(String(32))
    resonated: Mapped[bool | None] = mapped_column(Boolean)  # "Does this resonate?"
    created_at: Mapped[datetime] = created_at()

    dream: Mapped[Dream] = relationship(back_populates="interpretations")
    symbols: Mapped[list[Symbol]] = relationship(secondary=interpretation_symbols)
