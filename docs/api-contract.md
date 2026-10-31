# API contract (draft)

*Every endpoint the app needs, what it receives and what it returns. Drafted from `screens.md`, `data-model.md` and the prototype. Decisions behind it are 13–17 in `decisions.md`.*

**Phases:** endpoints marked **(v1)** are for the solo app (Capture → Detail → Journal → Patterns → Me). **(AI)** ones arrive in Phase 5, **(later)** ones with Community.

---

## Conventions

- **Base path:** `/api/v1`. Everything is JSON, field names in `snake_case`.
- **Who you are comes from your login, never the URL.** There is no `/users/{id}/dreams`; `GET /dreams` always means *your* dreams. Asking for someone else's dream returns `404`, not `403`, so the API doesn't even reveal that it exists.
- **Dates** are `YYYY-MM-DD` (the night a dream belongs to); **timestamps** are ISO 8601 with time zone.
- **Lists** use cursor pagination: `?limit=30&cursor=…`, and responses include `next_cursor` (null on the last page).
- **Language:** `Accept-Language: zh` or `en` picks which meaning and reading text comes back; both are stored.
- **Errors** always look like this:

```json
{ "error": { "code": "dream_not_found", "message": "That dream doesn't exist.", "field": null } }
```

| status | when |
|---|---|
| `400` | the request is malformed |
| `401` | not logged in |
| `404` | not found, or not yours |
| `409` | conflict, e.g. an email that's already registered |
| `422` | a value breaks a rule, e.g. valence 5 (`field` says which) |
| `429` | too many AI requests, try later |

**Login sessions:** a secure, http-only **cookie** (decision 13). Bearer tokens can be added later if a native iPhone app happens.

---

## Auth (v1)

Decision 8: email + password, Google, Apple.

| method | path | body | returns |
|---|---|---|---|
| `POST` | `/auth/register` | `{ email, password, display_name? }` | `201` + the user; starts a session |
| `POST` | `/auth/login` | `{ email, password }` | the user; starts a session |
| `POST` | `/auth/logout` | | `204` |
| `GET` | `/auth/google/start` | | redirect to Google |
| `GET` | `/auth/google/callback` | (from Google) | redirect into the app, logged in |
| `GET` | `/auth/apple/start`, `/auth/apple/callback` | | same, for Apple (may come after Google) |
| `POST` | `/auth/password/forgot` | `{ email }` | `202` always, so it doesn't reveal which emails exist |
| `POST` | `/auth/password/reset` | `{ token, password }` | `204` |

Passwords: at least 10 characters; stored only as a slow hash.

---

## Me and settings (v1)

| method | path | body | returns |
|---|---|---|---|
| `GET` | `/me` | | the user below |
| `PATCH` | `/me` | any of the fields below | the updated user |
| `DELETE` | `/me` | `{ confirm: "delete my account" }` | `204`; deletes the account and every dream |

```json
{
  "id": 7,
  "email": "you@example.com",
  "display_name": "Moth Keeper",
  "profile_orb": { "mode": "dream", "dream_id": 44 },
  "capture_with": "voice",
  "memories": "gentle",
  "traditions": ["zhougong", "jung"],
  "check_in": "minimal",
  "reminder": { "enabled": true, "time": "07:30" },
  "stats": { "dreams": 21, "since": "2025-10-18", "shared": 3, "top_emotions": ["calm", "longing"] }
}
```

`profile_orb.mode` is `auto`, `mix` (with `emotion`, optional `blend`) or `dream` (with `dream_id`).

`check_in` (Minimal / Full) and `reminder` are columns on `users` (decision 14).

---

## Dreams (v1)

### Create: `POST /dreams`

Only `text` and `dreamed_on` are required (decision 3). Everything else is optional and can be sent now or added later with `PATCH`.

```json
{
  "dreamed_on": "2026-10-20",
  "text": "I was on a night train by the sea…",
  "source": "voice",
  "title": "A train with no last stop",
  "valence": 0,
  "intensity": 3,
  "vividness": 0.5,
  "lucidity": 0,
  "emotions": [
    { "position": 1, "emotion": "longing", "intensity": 3, "label": "nostalgic", "ai_suggested": true, "kept": true }
  ],
  "elements": [
    { "kind": "symbol", "value": "train", "position": 1, "ai_suggested": true, "kept": true },
    { "kind": "person", "value": "stranger", "person_id": 12, "ai_suggested": true, "kept": true },
    { "kind": "color", "value": "window gold", "details": { "hex": "#E6B84A", "share": 45, "warmth": "warm" } }
  ],
  "events": [],
  "day_residue": [{ "kind": "media", "note": "watched a travel documentary", "days_before": 1 }],
  "mood_on_waking": "a little sad",
  "insight": null
}
```

Returns `201` with the full dream (shape below). The server assigns `number`, calculates `dream_type` (decision 9) and links elements to dictionary symbols.

Dropped suggestions are still sent with `"kept": false` so we can measure how often the AI is wrong (decision 5).

### Read one: `GET /dreams/{id}`

```json
{
  "id": 52,
  "number": 49,
  "dreamed_on": "2026-10-20",
  "text": "…",
  "original_text": "…",
  "source": "voice",
  "title": "A train with no last stop",
  "valence": 0, "intensity": 3, "vividness": 0.5, "lucidity": 0,
  "dream_type": "neutral", "dream_type_set_by": "auto",
  "narrative": "linear",
  "top_element_id": 301,
  "emotions": [ … ],
  "elements": [
    { "id": 301, "kind": "symbol", "value": "train", "position": 1, "ai_suggested": true, "kept": true,
      "symbol": { "code": "zg-028", "term_zh": "车", "term_en": "vehicle / journey" } }
  ],
  "events": [ … ],
  "day_residue": [ … ],
  "links": [{ "dream_id": 48, "number": 45, "reason": "same person: stranger" }],
  "image_motif": "rails",
  "visibility": "private",
  "mood_on_waking": "…", "creative_impulse": null, "insight": null, "reality_link": null,
  "created_at": "…", "updated_at": "…"
}
```

### Update: `PATCH /dreams/{id}`

Send only what changed. Lists (`emotions`, `elements`, `events`, `day_residue`) are **replaced as a whole** when sent, which keeps the client simple. Editing `text` keeps the first version in `original_text`. Setting `dream_type` marks it `dream_type_set_by: "user"`, so it's never recalculated over your choice.

### Delete and restore (decision 6)

| method | path | returns |
|---|---|---|
| `DELETE` | `/dreams/{id}` | `204`; moves it to Recently deleted and immediately removes any shared copy |
| `GET` | `/dreams/deleted` | dreams deleted in the last 30 days |
| `POST` | `/dreams/{id}/restore` | the dream, back in your journal |
| `DELETE` | `/dreams/{id}/forever` | `204`; gone now instead of in 30 days |

### List and search: `GET /dreams`

Powers Journal (calendar and list) and search.

| query | example | meaning |
|---|---|---|
| `from`, `to` | `2026-10-01`, `2026-10-31` | a date range, e.g. the visible month |
| `emotion` | `calm` | has this feeling (primary or blended) |
| `symbol` | `zg-040` | linked to this dictionary entry |
| `person_id` | `12` | this person appears |
| `q` | `train` | text search in text, title and elements |
| `type` | `nightmare` | dream type |
| `lucid` | `true` | lucidity 2 or more |

Returns a light version for lists and calendars:

```json
{
  "items": [
    { "id": 52, "number": 49, "dreamed_on": "2026-10-20", "title": "A train with no last stop",
      "top_symbol": { "value": "train", "term_zh": "车" }, "gloss": "火车",
      "emotion": "longing", "blend": null, "vividness": 0.5, "valence": 0, "dream_type": "neutral",
      "visibility": "private" }
  ],
  "next_cursor": null,
  "counts_by_emotion": { "calm": 7, "longing": 4 }
}
```

`counts_by_emotion` feeds the filter chips ("Calm 7").

### This time last year: `GET /dreams/memory?date=2026-10-20`

Returns `{ dream, exact }` or `204` if nothing matches, using the user's `memories` setting (gentle skips nightmares and intense fear). Dismissing it for the day is stored on the device, not the server.

---

## Capture helpers

| method | path | body | returns |
|---|---|---|---|
| `POST` | `/transcribe` **(AI)** | audio file (`multipart/form-data`, up to 10 minutes) | `{ text, language, seconds }` |
| `POST` | `/dreams/suggest` **(AI)** | `{ text, dreamed_on }` | the step-2 pre-fill below |

```json
{
  "emotions": [{ "position": 1, "emotion": "longing", "intensity": 3 }],
  "map": { "valence": 0.2, "intensity": 2.6 },
  "vividness": 0.6,
  "lucidity": 0,
  "elements": [
    { "kind": "symbol", "value": "train", "symbol_code": "zg-028" },
    { "kind": "person", "value": "stranger", "person_match": null }
  ],
  "title": "A train with no last stop"
}
```

`/dreams/suggest` saves nothing. The client shows it in step 2 with ✦ marks, then sends the final version with `POST /dreams`. `person_match` suggests an existing person ("the same sister as before?").

**Audio is not kept** (decision 15): it is deleted as soon as the transcript exists, and never stored in the database.

---

## People (v1)

| method | path | body | returns |
|---|---|---|---|
| `GET` | `/people` | | your people, each with `dream_count` |
| `POST` | `/people` | `{ name, role, relation?, note? }` | `201` + the person |
| `PATCH` | `/people/{id}` | any field | the person |
| `POST` | `/people/{id}/merge` | `{ into_id }` | merges two rows that turned out to be the same person |
| `DELETE` | `/people/{id}` | | `204`; dream elements keep their text but lose the link |

---

## Dream links (v1)

| method | path | body | returns |
|---|---|---|---|
| `GET` | `/dreams/{id}/related` | | `[{ dream, symbols, people }]`: your other dreams sharing a dictionary symbol (by code) or a person, most shared first. For "Connected dreams" and the Recurring tag |
| `POST` | `/dreams/{id}/links` | `{ to_dream_id, reason? }` | `201` |
| `DELETE` | `/dreams/{id}/links/{to_dream_id}` | | `204` |

---

## Dictionary (v1)

| method | path | returns |
|---|---|---|
| `GET` | `/symbols?tradition=zhougong&q=水` | matching entries |
| `GET` | `/symbols/{code}` | one entry with its classical lines or Jungian questions |

Read-only for users. Entries are changed only by editing `data/symbols/*.csv` and re-running the loader.

---

## Readings (AI)

| method | path | body | returns |
|---|---|---|---|
| `POST` | `/dreams/{id}/readings` | `{ traditions?: ["zhougong", "jung"] }` | `202` + readings in progress |
| `GET` | `/dreams/{id}/readings` | | each tradition's reading (shape below), or `status: "pending"` |
| `POST` | `/readings/{id}/feedback` | `{ resonated: true }` | `204`; the "Does this resonate?" answer |

A Jungian reading follows the output shape in `jungian-model.md`. A 周公 reading:

```json
{
  "id": 88, "tradition": "zhougong", "status": "ready",
  "symbols": [{ "code": "zg-028", "term_zh": "车", "classical_lines": ["车行主百事顺和"] }],
  "reading": "…",
  "confidence_note": "Only one symbol matched the classical text.",
  "created_at": "…"
}
```

Readings take several seconds, hence `202` and polling. Changing the dream text marks old readings as out of date rather than deleting them.

---

## Dream image (v1)

The image is drawn in the browser from the dream's own data (design-spec §5.1), so there's no image API. The only server part is remembering it was generated:

`PATCH /dreams/{id}` with `{ "image_motif": "rails" }`.

---

## Patterns (v1)

`GET /patterns/{lens}?period=30d` where `lens` is `emotion`, `symbols`, `rhythms`, `colors` or `people` and `period` is `7d`, `30d` or `year`. Optional filters: `emotion`, `symbol`, `type`.

Every lens returns the same frame (the six-slot template from design-spec §7.2):

```json
{
  "lens": "emotion",
  "period": "30d",
  "dream_count": 18,
  "based_on": 18,
  "locked": false,
  "hero": { … lens-specific chart data … },
  "stats": [
    { "value": "+0.3", "label": "Avg valence" },
    { "value": "Calm", "label": "Most felt" },
    { "value": "3.2", "label": "Intensity" }
  ],
  "reading": "Your dreams have stayed fairly steady across this period. *Calm* is the feeling that comes back most.",
  "list_title": "Most intense dreams",
  "list": [ … pattern dreams, or color rows … ]
}
```

A **pattern dream** is a list summary (see `GET /dreams`) plus `intensity` and `lucidity`. `based_on` is how many dreams the reading draws on (People: only dreams with people; Colors: only dreams with colors). In `reading`, `*asterisks*` mark the words shown in italics.

`hero` per lens:
- **emotion:** `points` (pattern dreams that have a valence, oldest first; used by both the Timeline and the Map), `trend` (`{ date, valence }`, a 3-dream moving average), and `map_reading` (the reading to show while the Map view is open).
- **symbols:** `top`: up to five `{ name, count }`. A symbol that matched the dictionary is named by its term, so "river" and "sea" both count as 水.
- **rhythms:** `weekdays` (seven counts, Monday first) and `busiest` (its index).
- **colors:** `stripes` (`{ dream, colors: [{ name, hex, pct, warmth }] }` for each dream with known color words) plus `warm` and `cool` percentages. The list is color rows `{ name, hex, dreams }`.
- **people:** `top` (`{ name, count }`), or `locked: true` with `{ have, need }` (e.g. 7 of 10).

`reading` starts as a calculated sentence; later it can come from the AI.

---

## Sharing a card (v1)

Share cards (a dream, a month, a lens) are drawn in the browser, so there's no server part in v1.

Public **share links** for people without the app are **not planned for now** (decision 16).

---

## Sharing (built)

| method | path | body | returns |
|---|---|---|---|
| `POST` | `/dreams/{id}/share/preview` | | `{ text, removed }`: the anonymized text and which tagged people were replaced |
| `POST` | `/dreams/{id}/share` | `{ text, include_readings, include_image }` | `201`; the shared copy. Sharing again updates it |
| `DELETE` | `/dreams/{id}/share` | | `204`; unshared |
| `DELETE` | `/me/shares` | | `204`; unshare everything |

The v1 preview replaces the people tagged in the dream with "someone" (某人 for Chinese names); the AI version in Phase 5 also catches untagged names. Deleting a dream removes its shared copy at once, and restoring it does not share it again.

## Community (later)

| method | path | body | returns |
|---|---|---|---|
| `GET` | `/community/draw?emotion=calm` | | one shared dream you haven't opened yet |
| `GET` | `/community/week` | | the "This week in Community" numbers |
| `POST` / `DELETE` | `/community/{share_id}/like` | | the new like count |
| `GET` | `/community/{share_id}/comments` | | comments, oldest first |
| `POST` | `/community/{share_id}/comments` | `{ text }` | `201` + the comment |
| `POST` | `/community/{share_id}/report` | `{ reason }` | `202` |
| `GET` / `POST` | `/folders` | `{ name }` | your folders |
| `POST` / `DELETE` | `/folders/{id}/items/{share_id}` | | `204` |

Shared dreams never include your name, user id, or dream date. Comment authors appear as "Wanderer #088".

---

## Your data (v1)

| method | path | returns |
|---|---|---|
| `GET` | `/export?format=csv` | every dream and its tags as a CSV download |
| `GET` | `/export?format=json` | the same as JSON |

---

## Limits (decision 17)

- AI endpoints (`/transcribe`, `/dreams/suggest`, readings): about 30 calls per user per hour, then `429`.
- Dream text: up to 20,000 characters.
- Requests are logged without dream text, to keep dreams out of server logs.
