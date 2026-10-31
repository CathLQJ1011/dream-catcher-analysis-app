"""The five Patterns lenses (docs/api-contract.md, Patterns; docs/screens.md §4).

Each lens turns the dreams in a period into the same frame: hero chart data, three
stats, a reading sentence and a short list. Readings are calculated sentences for
now; later they can come from the AI. In readings, *asterisks* mark italic words.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, timedelta
from statistics import mean

from app.db.models import Dream
from app.schemas import ColorRow, PatternDream, PatternFrame, Stat
from app.services.dreams import to_summary

PERIOD_DAYS = {"7d": 7, "30d": 30, "year": 365}
WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
PEOPLE_UNLOCK = 10
# The names the app shows for each emotion (frontend/src/lib/emotions.ts).
EMOTION_LABELS = {
    "calm": "Calm", "lucid": "Wonder", "longing": "Longing", "joy": "Joy",
    "fear": "Fear", "unease": "Unease", "sadness": "Sadness", "neutral": "Neutral",
}
# Color words the tag step knows, with how they read (frontend/src/lib/palette.ts).
COLORS = {
    "red": ("#C8381E", "warm"), "gold": ("#E6B84A", "warm"), "blue": ("#4D6FB8", "cool"),
    "green": ("#3E6B3A", "cool"), "violet": ("#7A6BD8", "cool"), "white": ("#EEEBF2", "cool"),
    "black": ("#141218", "cool"),
}
SYMBOL_KINDS = ("symbol", "place", "body", "media")


def period_start(period: str, today: date) -> date:
    return today - timedelta(days=PERIOD_DAYS[period] - 1)


def build(lens: str, period: str, dreams: list[Dream], today: date) -> PatternFrame:
    """`dreams` are the period's dreams, oldest first, with emotions and elements loaded."""
    frame = LENSES[lens](dreams, today)
    frame.update(lens=lens, period=period, dream_count=len(dreams))
    frame.setdefault("based_on", len(dreams))
    return PatternFrame(**frame)


# ---------- Emotion ----------


def emotion_lens(dreams: list[Dream], today: date) -> dict:
    placed = [d for d in dreams if d.valence is not None]
    feelings = [e for d in dreams for e in summary_emotions(d)]
    top = most_common(feelings)
    avg = mean(d.valence for d in placed) if placed else 0
    intensities = [d.intensity for d in dreams if d.intensity is not None]

    half = len(placed) // 2
    early = mean(d.valence for d in placed[:half]) if half else avg
    late = mean(d.valence for d in placed[half:]) if placed else avg
    if abs(late - early) < 0.3:
        drift = "Your dreams have stayed fairly steady across this period. "
    else:
        drift = (f"You might notice the second half of this period sits {'lighter' if late > early else 'heavier'} "
                 f"than the first ({signed(early)} → {signed(late)}). ")
    comes_back = f"*{label(top)}* is the feeling that comes back most." if top else ""

    corners = Counter(q for d in placed if (q := quadrant(d)))
    corner, corner_count = corners.most_common(1)[0] if corners else (None, 0)

    return {
        "hero": {
            "points": [pattern_dream(d).model_dump(mode="json") for d in placed],
            # 3-dream moving average, for the trend line
            "trend": [
                {"date": d.dreamed_on.isoformat(), "valence": round(mean(w.valence for w in placed[max(0, i - 1):i + 2]), 2)}
                for i, d in enumerate(placed)
            ],
            "map_reading": (
                f"{corner_count} of {len(placed)} dreams {'sits' if corner_count == 1 else 'sit'} in the *{corner}* corner "
                f"of the map. {comes_back}"
                if corner else drift + comes_back
            ),
        },
        "stats": [
            Stat(value=signed(avg), label="Avg valence"),
            Stat(value=label(top) if top else "—", label="Most felt"),
            Stat(value=f"{mean(intensities):.1f}" if intensities else "—", label="Intensity"),
        ],
        "reading": drift + comes_back,
        "list_title": "Most intense dreams",
        "list": [pattern_dream(d) for d in sorted(dreams, key=lambda d: -(d.intensity or 0))[:3]],
    }


def quadrant(d: Dream) -> str | None:
    if not d.valence or d.intensity in (None, 3):
        return None
    return f"{'intense' if d.intensity > 3 else 'quiet'}, {'light' if d.valence > 0 else 'dark'}"


# ---------- Symbols ----------


def symbols_lens(dreams: list[Dream], today: date) -> dict:
    per_dream = {d.id: dream_symbols(d) for d in dreams}
    counts = Counter(s for found in per_dream.values() for s in found)
    if not counts:
        return empty_frame(
            hero={"top": []},
            stats=[("—", "Top symbol"), ("0", "Recurring"), ("0", "Distinct")],
            reading="No symbols tagged in this period yet.",
            list_title="Dreams with symbols",
        )
    top, top_count = counts.most_common(1)[0]
    with_top = [d for d in dreams if top in per_dream[d.id]]
    mood = most_common([summary_emotions(d)[0] for d in with_top if summary_emotions(d)])
    feels = f", most often alongside *{label(mood).lower()}*" if mood else ""
    return {
        "hero": {"top": [{"name": n, "count": c} for n, c in counts.most_common(5)]},
        "stats": [
            Stat(value=top, label="Top symbol"),
            Stat(value=str(sum(1 for c in counts.values() if c > 1)), label="Recurring"),
            Stat(value=str(len(counts)), label="Distinct"),
        ],
        "reading": f"{top} appears in {top_count} of {len(dreams)} dreams{feels}.",
        "list_title": f"Dreams with {top}",
        "list": [pattern_dream(d) for d in newest_first(with_top)[:4]],
    }


def dream_symbols(d: Dream) -> set[str]:
    """A dream's symbols, named by the dictionary term when one matched (so river and sea both count as 水)."""
    return {
        el.symbol.term_zh if el.symbol else el.value.strip().lower()
        for el in d.elements if el.kept and el.kind in SYMBOL_KINDS
    }


# ---------- Rhythms ----------


def rhythms_lens(dreams: list[Dream], today: date) -> dict:
    by_day = [0] * 7
    for d in dreams:
        by_day[d.dreamed_on.weekday()] += 1
    busiest = max(range(7), key=lambda i: by_day[i])
    lucid = [d for d in dreams if (d.lucidity or 0) >= 2]
    span = max((today - dreams[0].dreamed_on).days + 1, 7) if dreams else 7
    return {
        "hero": {"weekdays": by_day, "busiest": busiest},
        "stats": [
            Stat(value=f"{len(dreams) / span * 7:.1f}", label="Per week"),
            Stat(value=WEEKDAYS[busiest] if dreams else "—", label="Busiest"),
            Stat(value=f"{round(len(lucid) / len(dreams) * 100) if dreams else 0}%", label="Lucid"),
        ],
        "reading": (
            f"You remember more dreams on *{WEEKDAYS[busiest]}* nights, and {len(lucid)} of {len(dreams)} were lucid. "
            "Recall often follows sleep and schedule more than the dreams themselves."
        ),
        "list_title": "Lucid dreams",
        "list": [pattern_dream(d) for d in newest_first(lucid)[:4]],
    }


# ---------- Colors ----------


def colors_lens(dreams: list[Dream], today: date) -> dict:
    stripes = []
    for d in dreams:
        words = [el.value.strip().lower() for el in d.elements if el.kept and el.kind == "color"]
        known = [w for w in dict.fromkeys(words) if w in COLORS]
        if known:
            pct = round(100 / len(known))
            colors = [{"name": w.capitalize(), "hex": COLORS[w][0], "pct": pct, "warmth": COLORS[w][1]} for w in known]
            stripes.append({"dream": pattern_dream(d).model_dump(mode="json"), "colors": colors})
    if not stripes:
        return empty_frame(
            hero={"stripes": [], "warm": 0, "cool": 0},
            stats=[("0%", "Cool"), ("0%", "Warm"), ("0", "Colors")],
            reading="No colors tagged in this period yet. Color words in a dream show up here.",
            list_title="Most frequent colors",
        )

    all_colors = [c for s in stripes for c in s["colors"]]
    total = sum(c["pct"] for c in all_colors)
    share = {w: round(sum(c["pct"] for c in all_colors if c["warmth"] == w) / total * 100) for w in ("warm", "cool")}
    leaning = "cool" if share["cool"] >= share["warm"] else "warm"
    warm_by_emotion = Counter()
    for s, d in ((s, next(x for x in dreams if x.id == s["dream"]["id"])) for s in stripes):
        if feelings := summary_emotions(d):
            warm_by_emotion[feelings[0]] += sum(c["pct"] for c in s["colors"] if c["warmth"] == "warm")
    warmest = warm_by_emotion.most_common(1)[0][0] if warm_by_emotion and max(warm_by_emotion.values()) else None
    named = Counter(c["name"] for s in stripes for c in s["colors"])
    hex_of = {c["name"]: c["hex"] for c in all_colors}

    return {
        "hero": {"stripes": stripes, **share},
        "stats": [
            Stat(value=f"{share['cool']}%", label="Cool"),
            Stat(value=f"{share['warm']}%", label="Warm"),
            Stat(value=str(len(named)), label="Colors"),
        ],
        "reading": (
            f"Your dreams run {leaning}: {share[leaning]}% of their color is "
            f"{'blue, grey or green' if leaning == 'cool' else 'red, orange or gold'}."
            + (f" Warm color is strongest in *{label(warmest).lower()}* dreams." if warmest else "")
        ),
        "based_on": len(stripes),
        "list_title": "Most frequent colors",
        "list": [ColorRow(name=n, hex=hex_of[n], dreams=c) for n, c in named.most_common(4)],
    }


# ---------- People ----------


def people_lens(dreams: list[Dream], today: date) -> dict:
    per_dream = {d.id: {el.value.strip().lower() for el in d.elements if el.kept and el.kind == "person"} for d in dreams}
    with_people = [d for d in dreams if per_dream[d.id]]
    counts = Counter(p for d in with_people for p in per_dream[d.id])
    locked = len(with_people) < PEOPLE_UNLOCK
    most_seen = counts.most_common(1)[0][0] if counts else None
    return {
        "locked": locked,
        "hero": (
            {"have": len(with_people), "need": PEOPLE_UNLOCK} if locked
            else {"top": [{"name": n, "count": c} for n, c in counts.most_common(5)]}
        ),
        "stats": [
            Stat(value=str(len(with_people)), label="With people"),
            Stat(value=str(len(counts)), label="Distinct"),
            Stat(value=most_seen or "—", label="Most seen"),
        ],
        "reading": (
            "A people map needs more nights to be meaningful. Until then, here are the dreams where someone else appeared."
            if locked else
            f"Someone else appears in {len(with_people)} of {len(dreams)} dreams; {most_seen} most often."
        ),
        "based_on": len(with_people),
        "list_title": "Dreams with people",
        "list": [pattern_dream(d) for d in newest_first(with_people)[:4]],
    }


LENSES = {
    "emotion": emotion_lens, "symbols": symbols_lens, "rhythms": rhythms_lens,
    "colors": colors_lens, "people": people_lens,
}


# ---------- Helpers ----------


def pattern_dream(d: Dream) -> PatternDream:
    return PatternDream(**to_summary(d).model_dump(), intensity=d.intensity, lucidity=d.lucidity)


def summary_emotions(d: Dream) -> list[str]:
    """The dream's kept feelings, strongest first (same order as its orb)."""
    s = to_summary(d)
    return [e for e in (s.emotion, s.blend) if e]


def empty_frame(*, hero: dict, stats: list[tuple[str, str]], reading: str, list_title: str) -> dict:
    return {
        "hero": hero,
        "stats": [Stat(value=v, label=lbl) for v, lbl in stats],
        "reading": reading,
        "list_title": list_title,
        "list": [],
    }


def most_common(items: list[str]) -> str | None:
    return Counter(items).most_common(1)[0][0] if items else None


def newest_first(dreams: list[Dream]) -> list[Dream]:
    return sorted(dreams, key=lambda d: (d.dreamed_on, d.number), reverse=True)


def label(emotion: str | None) -> str:
    return EMOTION_LABELS.get(emotion or "", emotion or "")


def signed(n: float) -> str:
    return f"{'+' if n > 0.05 else '−' if n < -0.05 else ''}{abs(n):.1f}"
