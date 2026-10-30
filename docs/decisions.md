# Decisions

*A running log of why the app is built the way it is. Newest decisions go at the bottom. Each entry: what I decided, and why.*

---

## Phase 2: data model (2026-10-27)

### 1. Many users from the start
**Decision:** v1 supports multiple accounts. Every table carries a `user_id`, and each person only ever sees their own dreams.
**Why:** Community is part of the plan, and adding users later would mean redesigning every table. Building it in now costs some extra work in Phase 3 (login), but nothing has to be rebuilt.

### 2. 周公解梦 first, then Jungian
**Decision:** The first interpretation tradition is 周公解梦, followed by Jungian. Neuroscience comes after; Vedic later.
**Why:** The 周公解梦 dictionary is the most original part of the project and the part only I can curate properly, so it should shape the data model from the beginning.

### 3. Only the dream text and date are required
**Decision:** A dream can be saved with just its text and its date (which defaults to last night). Every other field is optional.
**Why:** Dreams fade within minutes of waking. A 30-second, half-asleep entry has to count as a complete entry, or people will skip logging altogether.

### 4. About 20 codebook fields in v1
**Decision:** v1 includes the fields the prototype already uses (feeling, valence, intensity, vividness, lucidity, symbols, colors) plus people, places and day residue. The rest of my original ~70-field codebook is marked "later" or "drop".
**Why:** Those are the fields the screens and the first Patterns lenses actually use. The full codebook stays available through the "Full" check-in setting once the remaining fields are added.

### 5. Every tag records "AI suggested" and "user kept"
**Decision:** Each symbol, person, place or color attached to a dream stores two yes/no values: whether the AI suggested it, and whether I kept it.
**Why:** It powers the ✦ marks on unconfirmed suggestions, and it lets me measure how often the AI is wrong (for example, how often suggested people get dropped), which tells me where to improve the prompts in Phase 5.

### 6. Deleted dreams wait 30 days, then disappear for good
**Decision:** Deleting a dream moves it to "Recently deleted" for 30 days, after which it is permanently removed. If the dream was shared, its Community copy is removed immediately.
**Why:** An undo window protects against accidental deletes, like Photos on a phone. Removing the shared copy right away means deleting always stops other people from seeing it, with no delay.

### 7. One shared table for things in a dream, for now
**Decision:** Symbols, people, places, body parts, media references and colors all live in one `dream_elements` table. Each row has a `kind`, a `value`, an `order`, the "AI suggested / user kept" flags, and the extra details for its kind.
**Why:** One table means one tagging flow and one AI pipeline, which keeps v1 simple. It's reversible: every row already records its `kind`, so splitting into separate tables later is a routine migration. The API returns each kind as its own list either way, so the screens won't change, and each kind's details are validated strictly so the data stays clean.

### 8. Sign-in with email, Google and Apple
**Decision:** Accounts sign in with email + password, Google, or Apple. Built in Phase 3.
**Why:** Most people already have a Google or Apple account, which makes signing up at 7am painless; email covers everyone else. Apple needs a paid developer account, so it may follow the other two.

### 9. Dream type is calculated, but the user has the last word
**Decision:** Nightmare / pleasant / mixed / neutral is worked out from valence and intensity, and the user can change it. A user's choice is never overwritten by a recalculation.
**Why:** Most people won't label dream types themselves, but the app's guess can be wrong about a feeling only the dreamer knows.

### 10. Emotions get an optional finer label
**Decision:** Each emotion in a dream is one of the 8 orb emotions, plus an optional word of the user's own ("nostalgic", "guilty").
**Why:** The 8 keep colors and charts consistent; the label keeps the nuance the dreamer actually felt.

### 11. The same person is the same person across dreams
**Decision:** People get their own table, so "my sister" in 12 dreams is one person; each dream links to her.
**Why:** It's what makes the People lens meaningful (who appears most, alongside which feelings), and it matches how I tracked family members in my original codebook.

### 12. Keep the v1 / later split from the data model draft
**Decision:** The codebook fields stay split as listed in `data-model.md`.
**Why:** It covers every screen in the prototype and the first Patterns lenses; the rest can be added without restructuring.

## Phase 3: API contract (2026-10-29)

### 13. Login sessions use cookies
**Decision:** After login, the browser holds a secure, http-only session cookie. Bearer tokens can be added if a native iPhone app is built.
**Why:** For a web app, a cookie the page's own scripts can't read is the simplest setup and the hardest to steal.

### 14. Check-in depth and the morning reminder are account settings
**Decision:** `users` gains `check_in` (minimal / full) and `reminder_at` (a time, or empty for off).
**Why:** Both appear on the Me screen and should follow the person across devices, not live only in one browser.

### 15. Voice recordings are not kept
**Decision:** Audio is deleted as soon as its transcript exists and is never stored in the database.
**Why:** A recording of someone describing their dream is more personal than the text, and the app doesn't need it once transcribed.

### 16. No public share links for now
**Decision:** Share cards are images the dreamer shares themselves. There are no public URLs that show a dream to people outside the app.
**Why:** A public link can travel anywhere and is hard to take back. It can be designed later with proper privacy controls.

### 17. Limits on AI use, and no dream text in logs
**Decision:** About 30 AI calls (transcription, suggestions, readings) per user per hour. Server logs record requests without the dream text.
**Why:** Keeps API costs predictable and protects against abuse, and keeps dreams out of places like log files that are easy to overlook.

