# Data model (draft)

*A sketch to mark up, not final. It follows the decisions in `decisions.md` (many users, only text and date required, "AI suggested / user kept" on every tag, 30-day delete, one shared `dream_elements` table). Lines starting with ❓ are open questions for you.*

**How to read this:** each section is one table (like one sheet in a spreadsheet). Each bullet is a column. `→ table` means the column points to a row in another table, the way the Dream ID column in your Color Palette sheet points back to a dream.

---

## Overview

```
users
 └── dreams ─────────────┬── dream_emotions     (ordered feelings: mixed + shifts)
                         ├── dream_elements ──→ symbols   (things in the dream)
                         ├── dream_events       (things that happen)
                         ├── day_residue        (waking life before the dream)
                         ├── dream_links ──→ dreams       (this dream connects to that one)
                         └── interpretations ──→ symbols  (one per tradition)

symbols   (the curated dictionary: 周公解梦 first, then Jungian)

later: shared_dreams, likes, comments, folders (Community)
```

Every table except `symbols` belongs to one user, directly or through `dreams`.

---

## users

One row per account.

- `id`
- `email`: for login
- `display_name`: shown only to the user ("Moth Keeper")
- `profile_orb`: auto / mix (with chosen emotions) / a dream's id
- `capture_with`: voice or text
- `memories`: all / gentle / off ("this time last year")
- `traditions`: which interpretation traditions are switched on
- `created_at`

❓ Sign-in method: email + password, or "magic link" by email, or Google? (Decide in Phase 3.)

---

## dreams

One row per dream. Only `text` and `dreamed_on` are required.

| column | example | why |
|---|---|---|
| `id` | 44 | |
| `user_id` → users | | whose dream |
| `number` | 44 | the "DREAM — 044" catalog number, counted per user |
| `dreamed_on` | 2026-10-14 | the night it belongs to (required) |
| `text` | "I stood in a wooden tower…" | the dream itself (required) |
| `original_text` | | the first version, kept when the text is edited |
| `source` | voice / text | how it was captured |
| `title` | "The warm tide in the tower" | short name; AI can suggest |
| `top_symbol` → dream_elements | 水 | the headline on cards; AI picks, user can change |
| `valence` | +1 | overall dark → light, −2 to +2 |
| `intensity` | 3 | overall quiet → intense, 1 to 5 |
| `vividness` | 0.75 | blur → sharp memory, 0 to 1 (sets orb size) |
| `lucidity` | 2 | 0 not aware · 1 hazy · 2 aware · 3 in control |
| `dream_type` | pleasant / nightmare / mixed / neutral | from your codebook |
| `narrative` | linear / fragmented / jumping | from your codebook |
| `spoke` | yes / no | did you speak in the dream |
| `was_heard` | yes / no | was your speech heard or answered |
| `sleep_at`, `woke_at` | 01:30, 07:10 | optional; sleep length is calculated |
| `recorded_soon` | yes | logged within 30 minutes of waking |
| `mood_on_waking` | "rested" | free text |
| `creative_impulse` | yes / no + note | wanted to write, draw, make something |
| `insight` | "Something I can navigate now" | your own reading, written before the AI's |
| `reality_link` | free text | what you think it relates to |
| `image_motif` | waves | which drawing the generated image used |
| `visibility` | private / shared | the Community switch |
| `deleted_at` | | set when deleted; the row is removed for good 30 days later |
| `created_at`, `updated_at` | | |

❓ `dream_type`: keep it as something you pick, or calculate it from valence and intensity (e.g. valence ≤ −2 and intensity ≥ 4 → nightmare)?

---

## dream_emotions

The feelings in a dream, **in order**. One row per feeling.

| column | example | why |
|---|---|---|
| `dream_id` → dreams | 44 | |
| `position` | 1, 2… | when in the dream; rows with the **same** position are felt together (mixed) |
| `emotion` | calm | one of the 8 orb emotions |
| `intensity` | 2 | 1 to 5 |
| `note` | "until the water reached my feet" | optional: what caused the change |
| `ai_suggested`, `kept` | yes, yes | decision 5 |

How the codebook fields map here:
- **Primary / secondary emotion:** the strongest and second-strongest rows.
- **Mixed:** two rows with the same `position`.
- **情绪转折 (shift):** different positions. "Starts calm, ends in fear" is position 1 calm, position 2 fear.

❓ The 8 orb emotions are broad. Do you also want a free-text `label` per row for finer words (e.g. "nostalgic", "guilty") that map onto one of the 8?

---

## dream_elements

**Things in the dream**, one row each: symbols, people, places, body, media, colors. One shared table (decision 7).

Common columns, for every kind:

| column | example | why |
|---|---|---|
| `dream_id` → dreams | 44 | |
| `kind` | symbol / person / place / body / media / color | which kind of thing |
| `value` | 水 | the thing itself, as written |
| `position` | 1 | order of appearance; for places this is the scene order |
| `symbol_id` → symbols | | if it matched a dictionary entry |
| `ai_suggested`, `kept` | yes, yes | decision 5 |
| `details` | see below | extra fields that depend on `kind` |

`details` per kind:

| kind | details | example |
|---|---|---|
| **symbol** | none | 水 |
| **person** | `role` (family / friend / stranger / authority / self), `relation`, `description` | role family, relation grandmother |
| **place** | `indoor` (yes/no), `public` (yes/no), `cultural_setting`, `feeling` | tower · indoor · private · "safe, like a lighthouse" |
| **body** | `part`, `sensation`, `pain` 0–5, `integrity` (intact / wounded / separated) | hand · warm · 0 · intact |
| **media** | `work`, `media_type` (film, game, novel…), `origin` | *Blade Runner 2049* · film |
| **color** | `hex`, `share` (% of the dream), `warmth` (warm / cool / neutral), `synesthesia` (yes/no), `emotion_link` | #7C93F2 · 35% · cool |

- **空间转折 (spatial shift)** is simply more than one `place` row, in `position` order. No separate field needed.
- **Recurring elements** are not stored; they're counted across dreams (水 in 8 dreams = recurring).

❓ Should **people** in different dreams link to the same "person" (so "my sister" across 12 dreams is one person you can follow), or stay as text per dream for v1? Linking is better for the People lens but adds a small `people` table.

---

## dream_events

**Things that happen** in a dream, one row each.

| column | example | why |
|---|---|---|
| `dream_id` → dreams | 40 | |
| `kind` | violence / death / transformation | |
| `position` | 1 | order in the dream |
| `details` | see below | |
| `ai_suggested`, `kept` | | |

- **violence:** `type` (interpersonal / institutional / other), `source`, `your_role` (target / witness / actor), `demeanor` (how the other side behaved), `intensity`
- **death:** `who`, `type`, `aftermath`
- **transformation:** `what`, `into`

These flags also drive the content notes when a dream is shared.

---

## day_residue

What happened in waking life in the 1–3 days before, one row each.

| column | example |
|---|---|
| `dream_id` → dreams | 44 |
| `kind` | media / academic / social / family_contact / news / other |
| `note` | "watched a documentary about whales" |
| `days_before` | 1 |

---

## dream_links

"This dream connects to that one." One row per connection.

| column | example |
|---|---|
| `from_dream_id` → dreams | 44 |
| `to_dream_id` → dreams | 31 |
| `reason` | shared symbol 水 / same place / continuation |
| `ai_suggested`, `kept` | |

---

## symbols (the dictionary)

Your curated entries. Shared by all users; you are the editor.

| column | example |
|---|---|
| `id` | |
| `tradition` | zhougong / jung / neuro |
| `term_zh` | 掉牙 |
| `term_en` | losing teeth |
| `aliases` | 牙齿脱落, teeth falling out, lost a tooth |
| `meaning` | *(from your source)* |
| `tone` | auspicious / inauspicious / neutral (周公) |
| `source` | book or site |
| `source_detail` | edition, chapter, page |
| `embedding` | numbers used to find similar dreams (pgvector, filled in by a script) |

---

## interpretations

One reading per dream per tradition.

| column | example |
|---|---|
| `dream_id` → dreams | |
| `tradition` | zhougong |
| `symbols_used` → symbols | which dictionary entries it drew on |
| `reading` | the text shown on the card |
| `confidence_note` | e.g. "only one symbol matched" |
| `model`, `prompt_version` | which AI model and prompt produced it, for comparing prompt versions in Phase 5 |
| `created_at` | |

---

## Later: Community

Sketched only; built after the solo app works.

- **shared_dreams:** an anonymized snapshot of a dream (redacted text, emotion, top symbol), its own id, and a link back that is removed on delete
- **likes:** user + shared dream
- **comments:** user + shared dream + text + created_at (+ report status)
- **folders** and **folder_items:** a user's saved shared dreams

---

## Codebook fields: v1, later, drop

| codebook group | v1 | later |
|---|---|---|
| 基础信息 | date, text, sleep / wake time, recorded soon, title | |
| 情绪 | valence, emotions (ordered), intensity, shift | |
| 人物 | people with role and relation | linked "same person" across dreams |
| 地点 | places with indoor, public, setting, feeling | |
| 身体 | body part, sensation, pain, integrity | |
| 语言/表达 | spoke, was heard | speech quality, language used |
| 暴力 | violence events | |
| 颜色 | colors with hex, share, warmth, synesthesia | |
| 文化符号 | media references | tradition vs modern, game/fiction flag |
| 日间残余 | day residue items | |
| 死亡/转化 | death and transformation events | |
| 梦境类型 | dream type, lucidity, narrative, links to earlier dreams | |
| 梦后 | mood on waking, creative impulse, insight, reality link | social behavior after waking |

❓ Anything here you'd move between v1 and later, or drop?
