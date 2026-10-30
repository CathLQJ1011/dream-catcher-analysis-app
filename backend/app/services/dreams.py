"""Dream logic shared by the create and update endpoints."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import DayResidue, Dream, DreamElement, DreamEmotion, DreamEvent, DreamLink, Person, Symbol, User
from app.dream_rules import dream_type
from app.errors import ApiError
from app.matching import SymbolEntry, find_symbols
from app.schemas import DreamFields, DreamOut, DreamSummary, LinkOut, TopSymbol

# Scalar fields copied straight from the request onto the dream.
SCALARS = (
    "source", "title", "valence", "intensity", "vividness", "lucidity", "narrative", "spoke", "was_heard",
    "sleep_at", "woke_at", "recorded_soon", "mood_on_waking", "creative_impulse", "insight", "reality_link",
    "image_motif",
)
# Kinds of element that can be a dictionary symbol (people and colors are never looked up).
LOOKUP_KINDS = ("symbol", "place", "body", "media")


def next_number(db: Session, user: User) -> int:
    """'DREAM — 049': counted per user, including deleted dreams so numbers are never reused."""
    return (db.scalar(select(func.max(Dream.number)).where(Dream.user_id == user.id)) or 0) + 1


def apply_fields(db: Session, user: User, dream: Dream, fields: DreamFields) -> None:
    sent = fields.model_dump(exclude_unset=True)

    for name in SCALARS:
        if name in sent:
            setattr(dream, name, sent[name])

    if fields.emotions is not None:
        dream.emotions = [DreamEmotion(**e.model_dump()) for e in fields.emotions]

    if fields.elements is not None:
        entries, id_by_code = _symbol_index(db)
        own_people = set(db.scalars(select(Person.id).where(Person.user_id == user.id)))
        elements = []
        for i, e in enumerate(fields.elements):
            if e.person_id is not None and e.person_id not in own_people:
                raise ApiError(422, "person_not_found", "That person doesn't exist.", f"elements.{i}.person_id")
            element = DreamElement(**e.model_dump())
            if e.kind in LOOKUP_KINDS:
                # 周公解梦 first, then the Jungian glossary (same order as the seed loader).
                found = find_symbols(e.value, entries, "zhougong") or find_symbols(e.value, entries, "jung")
                if found:
                    element.symbol_id = id_by_code[found[0].code]
            elements.append(element)
        dream.elements = elements
        dream.top_element_id = None  # re-chosen below once the new elements have ids

    if fields.events is not None:
        dream.events = [DreamEvent(**e.model_dump()) for e in fields.events]
    if fields.day_residue is not None:
        dream.day_residue = [DayResidue(**r.model_dump()) for r in fields.day_residue]

    # Decision 9: recalculate unless the dreamer chose the type themself.
    if dream.dream_type_set_by != "user":
        dream.dream_type = dream_type(dream.valence, dream.intensity, [e.emotion for e in dream.emotions if e.kept])


def choose_top_element(dream: Dream) -> None:
    """The headline symbol on cards: the first kept element that matched the dictionary."""
    if dream.top_element_id is not None:
        return
    for el in sorted(dream.elements, key=lambda e: (e.position or 99, e.id)):
        if el.kept and el.symbol_id is not None:
            dream.top_element_id = el.id
            return


def links_of(db: Session, dream: Dream) -> list[LinkOut]:
    rows = db.execute(
        select(DreamLink, Dream)
        .join(Dream, or_(
            (DreamLink.from_dream_id == dream.id) & (Dream.id == DreamLink.to_dream_id),
            (DreamLink.to_dream_id == dream.id) & (Dream.id == DreamLink.from_dream_id),
        ))
        .where(Dream.deleted_at.is_(None))
    ).all()
    return [LinkOut(dream_id=other.id, number=other.number, reason=link.reason) for link, other in rows]


def to_out(db: Session, dream: Dream) -> DreamOut:
    out = DreamOut.model_validate(dream)
    out.links = links_of(db, dream)
    return out


def to_summary(dream: Dream) -> DreamSummary:
    kept = [e for e in dream.emotions if e.kept]
    ranked = sorted(kept, key=lambda e: (-(e.intensity or 0), e.position))
    top = next((el for el in dream.elements if el.id == dream.top_element_id), None)
    return DreamSummary(
        id=dream.id, number=dream.number, dreamed_on=dream.dreamed_on, title=dream.title,
        top_symbol=TopSymbol(
            value=top.value,
            term_zh=top.symbol.term_zh if top.symbol else None,
            term_en=top.symbol.term_en if top.symbol else None,
        ) if top else None,
        emotion=ranked[0].emotion if ranked else None,
        blend=next((e.emotion for e in ranked[1:] if e.emotion != ranked[0].emotion), None) if ranked else None,
        vividness=dream.vividness, valence=dream.valence, dream_type=dream.dream_type,
        visibility=dream.visibility,
    )


def _symbol_index(db: Session) -> tuple[list[SymbolEntry], dict[str, int]]:
    rows = db.execute(select(Symbol.id, Symbol.code, Symbol.tradition, Symbol.term_zh, Symbol.aliases)).all()
    entries = [SymbolEntry(code, tradition, term_zh, tuple(aliases)) for _, code, tradition, term_zh, aliases in rows]
    return entries, {code: id_ for id_, code, *_ in rows}
