"""Request and response shapes, following docs/api-contract.md."""

from __future__ import annotations

from datetime import date, datetime
from datetime import time as TimeOfDay  # renamed: Reminder has a field called `time`
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Emotion = Literal["calm", "lucid", "longing", "joy", "fear", "unease", "sadness", "neutral"]
DreamType = Literal["pleasant", "nightmare", "mixed", "neutral"]
# A light shape check; the real proof an address works comes from emails it receives later.
Email = Annotated[str, Field(max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]


class Strict(BaseModel):
    # Unknown fields are rejected, so a typo like "valance" fails loudly instead of being ignored.
    model_config = ConfigDict(extra="forbid")


# ---------- Auth and Me ----------


class Register(Strict):
    email: Email
    password: Annotated[str, Field(min_length=10, max_length=200)]
    display_name: Annotated[str, Field(min_length=1, max_length=64)] | None = None


class Login(Strict):
    email: Email
    password: Annotated[str, Field(max_length=200)]


class ProfileOrb(Strict):
    mode: Literal["auto", "mix", "dream"]
    emotion: Emotion | None = None
    blend: Emotion | None = None
    dream_id: int | None = None


class Reminder(Strict):
    enabled: bool
    time: TimeOfDay | None = None


class Stats(BaseModel):
    dreams: int
    since: date | None
    shared: int
    top_emotions: list[Emotion]


class UserOut(BaseModel):
    id: int
    email: str
    display_name: str
    profile_orb: dict
    capture_with: Literal["voice", "text"]
    memories: Literal["all", "gentle", "off"]
    traditions: list[str]
    check_in: Literal["minimal", "full"]
    reminder: Reminder
    stats: Stats


class UserPatch(Strict):
    display_name: Annotated[str, Field(min_length=1, max_length=64)] | None = None
    profile_orb: ProfileOrb | None = None
    capture_with: Literal["voice", "text"] | None = None
    memories: Literal["all", "gentle", "off"] | None = None
    traditions: list[Literal["zhougong", "jung", "neuro"]] | None = None
    check_in: Literal["minimal", "full"] | None = None
    reminder: Reminder | None = None


class DeleteAccount(Strict):
    confirm: Literal["delete my account"]


# ---------- Dreams: parts ----------


class EmotionIn(Strict):
    position: Annotated[int, Field(ge=1, le=20)] = 1
    emotion: Emotion
    intensity: Annotated[int, Field(ge=1, le=5)] | None = None
    label: Annotated[str, Field(max_length=64)] | None = None
    note: str | None = None
    ai_suggested: bool = False
    kept: bool = True


class ElementIn(Strict):
    kind: Literal["symbol", "person", "place", "body", "media", "color"]
    value: Annotated[str, Field(min_length=1, max_length=500)]
    position: Annotated[int, Field(ge=1, le=50)] | None = None
    person_id: int | None = None
    details: dict = {}
    ai_suggested: bool = False
    kept: bool = True


class EventIn(Strict):
    kind: Literal["violence", "death", "transformation"]
    position: Annotated[int, Field(ge=1, le=50)] | None = None
    details: dict = {}
    ai_suggested: bool = False
    kept: bool = True


class ResidueIn(Strict):
    kind: Literal["media", "academic", "social", "family_contact", "news", "other"] = "other"
    note: Annotated[str, Field(min_length=1, max_length=2000)]
    days_before: Annotated[int, Field(ge=0, le=30)] | None = None


class DreamFields(Strict):
    """Everything optional about a dream; shared by create and update."""

    source: Literal["voice", "text"] | None = None
    title: Annotated[str, Field(max_length=200)] | None = None
    valence: Annotated[int, Field(ge=-2, le=2)] | None = None
    intensity: Annotated[int, Field(ge=1, le=5)] | None = None
    vividness: Annotated[float, Field(ge=0, le=1)] | None = None
    lucidity: Annotated[int, Field(ge=0, le=3)] | None = None
    narrative: Literal["linear", "fragmented", "jumping"] | None = None
    spoke: bool | None = None
    was_heard: bool | None = None
    sleep_at: TimeOfDay | None = None
    woke_at: TimeOfDay | None = None
    recorded_soon: bool | None = None
    mood_on_waking: str | None = None
    creative_impulse: str | None = None
    insight: str | None = None
    reality_link: str | None = None
    image_motif: Annotated[str, Field(max_length=32)] | None = None
    emotions: list[EmotionIn] | None = None
    elements: list[ElementIn] | None = None
    events: list[EventIn] | None = None
    day_residue: list[ResidueIn] | None = None


DreamText = Annotated[str, Field(min_length=1, max_length=20_000)]


class DreamCreate(DreamFields):
    # Decision 3: the only two required fields.
    dreamed_on: date
    text: DreamText


class DreamPatch(DreamFields):
    dreamed_on: date | None = None
    text: DreamText | None = None
    dream_type: DreamType | None = None  # setting it marks the type as the dreamer's own choice
    top_element_id: int | None = None


# ---------- Dreams: responses ----------


class SymbolRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    term_zh: str
    term_en: str


class EmotionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    position: int
    emotion: Emotion
    intensity: int | None
    label: str | None
    note: str | None
    ai_suggested: bool
    kept: bool


class ElementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    kind: str
    value: str
    position: int | None
    person_id: int | None
    details: dict
    ai_suggested: bool
    kept: bool
    symbol: SymbolRef | None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    kind: str
    position: int | None
    details: dict
    ai_suggested: bool
    kept: bool


class ResidueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    kind: str
    note: str
    days_before: int | None


class LinkOut(BaseModel):
    dream_id: int
    number: int
    reason: str | None


class DreamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    number: int
    dreamed_on: date
    text: str
    original_text: str | None
    source: str
    title: str | None
    valence: int | None
    intensity: int | None
    vividness: float | None
    lucidity: int | None
    dream_type: DreamType | None
    dream_type_set_by: Literal["auto", "user"]
    narrative: str | None
    spoke: bool | None
    was_heard: bool | None
    sleep_at: TimeOfDay | None
    woke_at: TimeOfDay | None
    recorded_soon: bool | None
    mood_on_waking: str | None
    creative_impulse: str | None
    insight: str | None
    reality_link: str | None
    image_motif: str | None
    visibility: Literal["private", "shared"]
    top_element_id: int | None
    emotions: list[EmotionOut]
    elements: list[ElementOut]
    events: list[EventOut]
    day_residue: list[ResidueOut]
    links: list[LinkOut] = []
    created_at: datetime
    updated_at: datetime


class TopSymbol(BaseModel):
    value: str
    term_zh: str | None
    term_en: str | None


class DreamSummary(BaseModel):
    """The light version used by Journal's calendar and lists."""

    id: int
    number: int
    dreamed_on: date
    title: str | None
    top_symbol: TopSymbol | None
    emotion: Emotion | None
    blend: Emotion | None
    vividness: float | None
    valence: int | None
    dream_type: DreamType | None
    visibility: Literal["private", "shared"]


class DreamList(BaseModel):
    items: list[DreamSummary]
    next_cursor: str | None
    counts_by_emotion: dict[str, int]


class DeletedDream(BaseModel):
    id: int
    number: int
    dreamed_on: date
    title: str | None
    deleted_at: datetime
    purge_on: date


# ---------- Sharing (Community) ----------


class SharePreview(BaseModel):
    """What others would see, before anything is shared."""

    text: str
    removed: list[str]  # the names and relations that were replaced with "someone"


class ShareCreate(Strict):
    text: DreamText  # the previewed text, possibly edited further by the dreamer
    include_readings: bool = False
    include_image: bool = False


class SharedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    emotion: Emotion | None
    blend: Emotion | None
    top_symbol: str | None
    include_readings: bool
    include_image: bool
    created_at: datetime
