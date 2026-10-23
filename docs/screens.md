# Screens — Dream Catcher

*Phase 1c. What each page shows, what matters most on it, and what happens on tap. Visual rules live in `design-spec.md`; this file is about structure and behavior.*

> **Privacy rule for the whole project:** no real dreams from the owner's journal appear anywhere in the app, seed data, tests or screenshots. All sample dreams are invented. The owner's spreadsheet is used only as a *format* reference: which fields to capture and which analyses are worth running.

---

## Navigation

Five tabs, Capture in the center:

```
Journal · Patterns · ( ● Capture ) · Community · Me
```

| Tab | One-line job | Opens how often |
|---|---|---|
| **Journal** | Find and reread your own dreams | Daily |
| **Patterns** | See what your dreams add up to | Weekly |
| **Capture** | Log a dream the moment you wake | Daily, first thing |
| **Community** | Read other people's shared dreams | Occasionally |
| **Me** | Who you are here, privacy, settings | Rarely |

- Capture is a raised orb button, bigger than the others, with the only glow in the nav.
- **The app opens on Capture** in the morning (before 11:00 local time) and on Journal otherwise.
- *Spec change:* design-spec §8 said "3 items max"; this replaces it with 4 tabs + the center Capture button.

### Where the calendar goes
**Journal.** The calendar is a way to *find* a dream ("what did I dream the night before the exam?"), so it belongs with your history. Patterns gets a different, aggregated time view: a **year heatmap** and rhythm charts. Same dates, different jobs: Journal answers *which dream*, Patterns answers *what trend*.

### Why Journal and Me are separate
"Profile with history" splits into two pages because you'll open your history every day but settings almost never. Merging them would bury the archive under account controls. (If you'd rather have 4 tabs, Journal can move into Me as its main content, with settings behind a gear icon.)

---

## 0. Onboarding (first launch only)

**First thing seen:** a single breathing orb and the two-line headline: *"Your dreams remember you. / Write one down."*

Three short steps, each one screen:
1. **Language** for the interface and dream text (中文 / English / both).
2. **Traditions** to interpret with: Jungian, 周公解梦, Neuroscience, (later) Vedic. Pick any; changeable in Me.
3. **Privacy promise:** dreams are private by default, nothing is shared without asking each time. One "Begin" button.

No account wall before the first dream: you can capture immediately and sign in later to sync.

---

## 1. Capture (center tab)

**Most important element:** the mic orb. Logging must take under a minute while half-asleep.

**Flow:**
1. **Record or type.** Big orb with mic in the center; tap to record, tap again to stop. The orb pulses with your voice. Below: "or write it" opens the dream textarea (serif, journal-like).
2. **Edit transcript.** Speech-to-text fills the textarea; you fix fragments. The dream is now saved as a draft, so nothing is lost if you close the app.
3. **Quick check-in** (one screen, all optional except emotion):
   - **Emotion chips**: primary emotion, optional secondary. Two picks = two-tone orb.
   - **Valence slider** (−2 to +2) and **intensity** (1–5), or drag an orb on the emotion map, which sets both at once.
   - **Vividness** (sets orb size) and **lucidity** (0 not aware → 3 in control).
4. **✦ AI pre-fill, you confirm.** The model reads the text and proposes structured tags: people, places, body parts, colors, speech, threats, death/transformation, narrative structure. Shown as chips you can tap to remove or edit. *This is the key idea:* the full codebook has ~70 fields, which no one fills by hand at 7am; the AI does the coding and you only correct it.
5. **Optional "before & after"**, collapsed by default:
   - *Day residue:* "Anything from the last 1–3 days that might be in this?" (shows, classes, news, conversations)
   - *On waking:* mood on waking, creative impulse (did you want to write/draw?), first-reaction insight.
6. **Save.** The orb settles, then opens Dream Detail with interpretations loading (orb shimmer state).

**Morning details:** dimmest possible screen, no notifications or badges visible, and the keyboard never opens automatically (voice first).

---

## 2. Dream Detail

**First thing seen:** the date in large display serif fading into the night gradient, with the dream's orb beside it. **Most important element:** the dream text itself, at reading width, like a book page.

Top to bottom:
1. **Header:** date, `DREAM — 047`, top symbol, orb, tags `[ LUCID ]` `[ NIGHTMARE ]`.
2. **Dream text** (serif). Tap "edit" to revise; edits keep the original transcript.
3. **Generated image** (later phase), with the ✦ mark.
4. **Interpretations:** one glass card per tradition, side by side on desktop, swipeable on mobile. Each shows symbols found (with cited dictionary source), the reading, and a short confidence note. "Interpret again" if you edited the text.
5. **Dream anatomy:** the structured data as a compact, scannable panel:
   - People · Places (indoor/outdoor, public/private, cultural setting, how the space felt)
   - Body (parts, sensations, pain 0–5, intact / wounded / separated)
   - Voice (did you speak, were you heard)
   - Threat (type, source, your role) · Death / transformation
   - **Color palette bar:** the dream's colors as proportional stripes with hex swatches, warm/cool, and a synesthesia flag
   - Narrative structure (linear / fragmented / jumping) · lucidity
6. **Before & after:** day residue, mood on waking, your own insight, and "connected to" links to earlier dreams with a shared recurring element.
7. **Share to Community** toggle (off by default). Turning it on opens a preview of exactly what will be shared (see §5).

---

## 3. Journal

**First thing seen:** this month's calendar. **Most important element:** the orbs on the calendar. One glance tells you how the month felt.

- **Month calendar:** each day with a dream shows its orb (color = emotion, size = vividness); several dreams in one night = a small cluster. Today has a hairline ring. Swipe for previous months. Tap a day → that night's dream(s).
- **Toggle: Calendar / Archive.** Archive is a grid of dream cards (catalog plates with the top symbol as headline), newest first.
- **Search and filter**, shared by both views: free text, emotion, symbol, person, place, tradition, lucid only, nightmares only.
- **Empty state:** dithered orb + "No dreams yet. / *The first one is the hardest.*" + a button to Capture.

---

## 4. Patterns

**First thing seen:** the current lens's main chart for the selected period, with 2–3 stat tiles above it. **Most important element:** the lens switcher. This page is a set of *modes*, not one dashboard.

**Controls (top):**
- **Lens switcher:** horizontal pill tabs.
- **Period:** Week · Month · Year · All.
- **Filters:** emotion, symbol, person, tradition, lucidity. They apply to every lens ("show the Colors lens, only for nightmares").

**Lenses**, adapted from the analysis directions in the owner's spreadsheet:

| Lens | Main view | Question it answers | v1? |
|---|---|---|---|
| **Emotion** | Valence over time, moving average; intensity as point size | Are my dreams getting darker or lighter? | ✓ |
| **Symbols** | Top recurring symbols, recurring-element timeline | What keeps coming back? | ✓ |
| **Rhythms** | Year heatmap (dream frequency, colored by valence) + weekday / monthly cycles | Is there a cycle? Do bad weeks show up in dreams? | ✓ |
| **Colors** | Palette mosaic of all dreams, warm/cool split, color × emotion | What color is fear for me? | ✓ |
| **People** | Co-occurrence network: who appears with whom, edge = shared dreams | Who is at the center of my dream world? | ✓ |
| **Places** | Location type × emotion, cultural setting × valence | Which places feel safe, which feel threatening? | later |
| **Body** | Body silhouette heatmap × emotion | Which body parts carry which feelings? | later |
| **Voice** | Expression spectrum: silent → spoke, unheard → heard | Am I heard in my dreams? | later |
| **Threat & change** | Violence type, your role, death/transformation over time | How do threats show up, and what follows them? | later |
| **Day residue** | What you logged before a dream → what appeared (lag 1–3 days) | What feeds my dreams? | later |
| **Waking effects** | Dream features → creative impulse / mood on waking | Which dreams make me want to create? | later |

- Each lens ends with a short ✦ **reading** of the pattern, written carefully ("you might notice…", never diagnostic), with the number of dreams it's based on.
- **Minimum data:** a lens shows a gentle locked state until it has enough dreams (e.g. "People unlocks after 10 dreams with people in them"), so nobody sees a misleading chart from 3 data points.

---

## 5. Community

*Secondary feature. Build after the single-user loop (Capture → Detail → Journal → Patterns) works. Requires accounts, moderation and an anonymization step.*

**First thing seen:** a field of sealed orbs drifting slowly. **Most important element:** the **blind box**: tap one to open a stranger's dream.

- **Draw a dream (blind box):** tap a sealed orb → it blooms open → one shared dream: text, orb, top symbol, and (if the sharer allowed) the interpretations. "Draw another" below. Unseen dreams are favored so you rarely draw the same one twice.
- **Draw by filter:** choose an emotion and/or symbol before drawing ("a calm dream with water in it"). The sealed orbs re-tint to match the filter.
- **Resonance, not likes:** one gentle reaction, *"I've dreamed this too."* Its count is shown only to the dreamer. No comments in v1: comments need moderation and can hurt.
- **Collective weather:** a small panel: "This week, shared dreams leaned uneasy; water appeared in 1 of 5." Aggregates only, never individuals.

**Sharing safeguards** (the sharing preview from Dream Detail):
1. Shows *exactly* what others will see, nothing hidden.
2. **✦ Anonymizer:** removes names, places specific enough to identify you, and family details; you approve the redacted version.
3. Choose what to include: text only · + interpretations · + image.
4. **Content notes** are added automatically from the threat/death flags, so readers can choose whether to open.
5. Shared copies are snapshots and can be unshared anytime. Report button on every shared dream.

---

## 6. Me

**First thing seen:** your **signature orb**, a blend of your most frequent emotions over the past 90 days, which slowly changes as you do. **Most important element:** the privacy controls. This page is where trust lives.

- Header: signature orb, display name (or anonymous), member since, total dreams. Deliberately **no streaks**: missing a night isn't a failure (design-spec anti-keyword: gamified).
- **Shared dreams:** what you've shared, resonance counts, unshare.
- **Traditions & interpretation:** which lenses, language of readings.
- **Capture settings:** morning reminder time, voice vs. text default, which check-in fields to show.
- **Data:** export everything as CSV (same shape as a research spreadsheet) or JSON; delete a dream; delete account.
- About / privacy policy.

---

## Other suggestions

1. **Recurring dream threads.** When the AI notices a recurring element across dreams, offer to group them into a named thread ("the flooded library") with its own mini timeline. Recurring dreams are among the most meaningful things people track, and your log already has a "connected to previous" field.
2. **Morning-only capture mode.** Keep the morning screen as minimal as possible: one orb, one button. Every extra field is a reason to skip logging.
3. **Your own insight first.** On Dream Detail, prompt "What do you think it means?" *before* revealing the AI interpretations, so the app supports reflection rather than replacing it.
4. **Codebook as data model.** The spreadsheet's ~70 fields map almost one-to-one to Phase 2 tables. Group them: core `dreams` row; `dream_people`, `dream_places`, `dream_colors` (name, hex, proportion), `dream_body`, `dream_events` (threat/death/transformation); `day_residue`. Keep the "AI proposed vs. user confirmed" state on each tag. That's both a UX feature and a great interview story.

## Build order

Capture → Dream Detail → Journal → Patterns (Emotion, Symbols, Rhythms first) → Me → Community.

---

## Decisions from the prototype

*Added after building clickable versions of every page.*

### Capture is two steps
1. **Tell it.** Only the dream on screen: the record orb, or "Write it instead", plus a small **"Night of · Last night"** pill to change the date. The transcript appears as you speak and stays editable.
2. **Tag it, already filled in.** After a short "Reading your dream…" moment, the AI has pre-filled feeling, map position, vividness, lucidity and symbols. A ✦ marks each suggestion until you change it, and one line says to adjust freely to match how it felt. Each field label defines its own term, with the term itself slightly bolder ("**Vividness** · how clear and detailed the dream felt…").

### Sharing
- **A share icon wherever there's something worth showing:** Dream Detail (top right), Patterns (header, shares the current lens and period), Journal (next to the month arrows, shares the month as orbs).
- **Share opens a preview card designed for sharing**, not a raw screenshot: no buttons or nav, just the content and a small "Dream Catcher" mark. Then "Share…" (system share menu) or "Save image".
- **Screenshot trigger:** a web app can't detect screenshots. If the app later ships as a native iOS app, it could offer "Share a cleaner version?" after a screenshot. Until then, the share icon is the way.

### Dream image
- "Generate image" on Dream Detail draws the dream's **key symbol** (waves for water, a crescent for the moon, a lit window for a house…) as glowing silhouettes in the **colors of the dream's emotion**. See design-spec §5.1 and the gallery on `/styleguide`.
- No image API needed, and every image stays in the app's style. A later option is an AI image model with a strict style prompt for symbols that have no hand-drawn motif.

### Community
- **Draw** tab: sealed orbs drift in a small physics field. Fling them around or tap **Stir**, then tap one to open a stranger's dream. Like it (heart + count), comment on it, bookmark it into a folder, or "Draw another". Unopened dreams are drawn first.
- **This week in Community:** three stats (dreams shared, top symbol, comments) and a mood-mix bar of the week's shared dreams.
- **Comments** are short and anonymous ("Wanderer #088"), prompted with "Say something kind…". Before launch they need moderation: report, filters, and rate limits.
- **Saved** tab: folders you create ("Strange & funny", "Water dreams"…). Tap a folder to open it.
- Sharing your own dream always goes through a preview that shows exactly what others will see, with people's names replaced by "someone".

### Saving a dream
- "Save dream" at the end of Capture lands on **Journal**, opened to that night, with the new dream highlighted and a "Dream saved · Open" confirmation. Back doesn't return to the capture form.

### One year ago tonight (Journal)
- A small card above the calendar shows the dream from this exact night last year, or the closest one within 3 days. Tap to open it, × to hide it for the day. No match, no card.
- Lives in Journal because it's about one specific dream. A future Patterns lens, *Then vs now*, compares whole periods (this October vs last October).
- Me → Journal → **This time last year**: *All*, *Gentle* (default: skips nightmares and intense fear), or *Off*.

### Me
- **Edit profile:** one sheet for name and orb, saved together. Opened by the "Edit profile" button, or by tapping the orb or name. No badges sit on the orb. The name is only shown to you; shared dreams stay anonymous.
- **Start with Voice / Text** also changes the Capture button in the tab bar: a mic for voice, a quill for writing, and Capture opens in that mode.
- **Profile orb:** tap it to choose **Auto** (your recent feelings), **Mix** (pick one or two emotions), or **From a dream** (wear the orb of a dream you love).
- **Shared dreams** opens into a list in the same row format as Patterns' lists.
