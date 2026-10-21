# Design Direction — Dream Catcher

*Written from the 14-image moodboard in `DreamAnalysis/`. Paste into `docs/design-spec.md` and edit freely. Hex values and font names are proposals for you to adjust; the structure and rules are what the coding agent will follow.*

---

## 1. Direction in one line

**Luminous Nocturne.** A dark, editorial interface where each dream shows up as a soft, glowing orb. The type is quiet and literary, and the surfaces carry a slight analog texture, like a half-remembered photograph.

The app should feel like opening a private journal at night, not like opening a productivity dashboard.

**Mood keywords:** nocturnal · luminous · hushed · editorial · tactile · uncanny-but-calm

**Anti-keywords (what it must not feel like):** clinical · gamified · cute · corporate SaaS · neon cyberpunk

---

## 2. What the moodboard has in common

Most of the 14 references share five traits. These five traits are the design language.

| # | Trait | Seen in | What it does for a dream app |
|---|---|---|---|
| 1 | **The glowing orb / aura**: a soft-edged luminous form centered in empty space | 12f6, 6577, 71a3, d69d, e205, fc7e, 7733 | Gives each dream a body. This becomes the signature motif (§5). |
| 2 | **Near-black ground with one saturated light source** | 12f6, 4ad3, 55e7, 6577, 904d, c993 | Calm at night and easy on the eyes on waking. Color reads as *light*, not paint. |
| 3 | **Ultramarine / Klein blue as the hero hue** | 3fae, 4ad3, 4f0c, 7733, c993, 904d | It's the most frequent color on the board, and it reads as dreamlike, deep and introspective. |
| 4 | **Analog imperfection**: grain, halftone, dither, scanlines | 3fae, 55e7, 6577, 7733, 904d, c993, d69d | Suggests memory loss and fading fidelity, the texture of remembering a dream. |
| 5 | **Serif + sans/mono contrast**, often an italic serif accent | 12f6, 904d, d69d, 55e7, e205 | Literary voice for dream content, technical voice for metadata. |

A secondary warm thread (ember red, orange, magenta in 12f6, 55e7, 6577, fc7e) is used only as an emotional accent, never as the base.

### Reference-by-reference takeaways

- **12f6 (meditation app, ember on black):** serif headline with a dimmed *italic* second line; a single glossy object as the focal point; a ghost pill CTA. *Take: onboarding and empty-state composition.*
- **3fae (cyanotype poster):** blueprint blue, white botanical forms, halftone, a dark navy block overlaid on the image, lowercase poetic text with uneven spacing. *Take: image treatment for generated dream images; poetic microcopy.*
- **4ad3 (AI journal, cobalt):** huge light-weight date display fading into the gradient; frosted glass cards; dates as folders; a glowing gradient mic button. *Take: Dream Detail header, Capture screen mic, archive-by-date metaphor.*
- **4f0c (Background Color Theory poster):** grey statuary and lilies with electric ultramarine silhouettes (doves, chess pieces), four-point sparkles, thin orbital lines, text set on curves, mixed Chinese + English. *Take: ornament vocabulary (sparkles, orbits); confidence mixing CJK and Latin.*
- **55e7 (Lauren Mia):** grain, halftone hands, neon red-magenta on black, mono UI labels. *Take: intensity reference for nightmare / high-arousal emotion states only.*
- **6577 (Metamusic):** blurred slate field with one red orb; an XY "select your mood" map; monospace uppercase labels; halftone panels. *Take: emotion map interaction (valence × arousal) for tagging and for Trends.*
- **703b (Prospeer tiles):** conic and radial gradients, light rays, crescent rim light, big stat numerals. *Take: stat tiles on the Trends page.*
- **71a3 (pastel AI app):** white, iridescent pastel blur orbs, soft pill buttons. *Take: light mode ("Morning") reference only.*
- **7733 (periwinkle grain studies):** periwinkle and cornflower forms with heavy grain and symmetrical blur. *Take: generative background textures; orb variety.*
- **904d (Lucid Dream poster):** overexposed glowing figure, VHS scanlines, script/italic + sans mixed, thin outline rectangles, sparkle star. *Take: the app's hero/brand moment; outline-frame motif.*
- **c993 (AKTIVCONSALT):** black/white + ultramarine radial bloom, grain, wide uppercase sans, hairline rules, bracketed numerals `[ 2026 ]`. *Take: grid discipline, hairlines, bracket notation for metadata.*
- **d69d (dithered hand + orb):** 1-bit dither; sans line followed by a serif line. *Take: type pairing pattern; dither for loading/empty states.*
- **e205 (Unlicensed orbs):** off-white field, centered chromatic orb, tiny mono metadata in the corners, catalog numbering (`ULR — 001`). *Take: dream cards as catalog plates (`DREAM — 047`).*
- **fc7e (Nayla health tracker):** glass UI over a warm blurred field; check-in chips; calendar strip; layered translucent area charts. *Take: Calendar strip, emotion check-in chips, Trends chart style.*

---

## 3. Color system

### 3.1 Base (dark, the default theme)

| Token | Hex | Use | Contrast on bg |
|---|---|---|---|
| `bg` | `#07080C` | App background: near-black with a blue cast, never pure `#000` | — |
| `bg-raised` | `#0F111A` | Panels, sheets, nav bar | — |
| `surface-glass` | `rgba(255,255,255,0.06)` + 24px backdrop blur | Floating cards over orbs/gradients | — |
| `border-hairline` | `rgba(255,255,255,0.10)` | 1px rules, card outlines, outline frames | — |
| `text-primary` | `#EDEEF3` | Dream text, headings | 17.3 : 1 |
| `text-secondary` | `#A3A7B7` | Body support, labels | 8.4 : 1 |
| `text-muted` | `#7A7F94` | Metadata, timestamps (minimum for readable text) | 5.0 : 1 |
| `accent` (Lucid Blue) | `#2A3BFF` | Glows, fills, primary button fill, orbs. **Not for text on dark** | 3.0 : 1 |
| `accent-soft` (Periwinkle) | `#8EA2FF` | Links, active states, blue text on dark | 8.4 : 1 |
| `ember` | `#FF5A36` | Warm accent; high-arousal emotion; destructive actions | 6.5 : 1 |

**Rule:** color arrives as *light*: glows, gradients and orbs on a dark field. Flat, saturated color blocks are rare, used for one hero element per screen at most (the navy block in 3fae, the orange card in 55e7).

### 3.2 Emotion spectrum (orb colors)

Each dream's orb is tinted by its dominant emotion. These are starting proposals, and **your own synesthetic associations should replace them**: this palette is the most personal part of the app.

| Emotion | Proposed hue | Orb gradient (center → edge) |
|---|---|---|
| Calm / peace | Periwinkle | `#C9D3FF → #6F82FF` |
| Longing / nostalgia | Lilac | `#E6D9FF → #9B7BFF` |
| Wonder / lucidity | Lucid Blue + white core | `#FFFFFF → #2A3BFF` |
| Joy / warmth | Amber | `#FFE3A3 → #FF9F2E` |
| Fear / threat | Ember | `#FFB199 → #E8361C` |
| Unease / uncanny | Magenta | `#FFB8F0 → #C03CE0` |
| Sadness / heaviness | Deep teal | `#9FD0D6 → #1F5C66` |
| Neutral / unclear | Ash | `#D7D9E0 → #6B7085` |

Mixed emotions blend two orb gradients (as in e205's two-tone spheres) instead of picking one.

### 3.3 Gradients

- **Night gradient** (screen backgrounds): vertical, `#2A3BFF` at ~18% opacity at the top fading to `bg` by 60% height (4ad3).
- **Bloom**: a radial accent behind hero content, 40–60% of the viewport, heavily blurred (c993, 703b).
- No multi-stop rainbow gradients on UI chrome. Iridescence lives only *inside* orbs.

---

## 4. Typography

### 4.1 Families (all free on Google Fonts)

| Role | Proposal | Why | CJK partner |
|---|---|---|---|
| **Display / dream text** (serif) | *Instrument Serif* (roman + italic) | Elegant, high-contrast, true italic: the 12f6 / d69d voice | *Noto Serif SC* |
| **UI / body** (sans) | *Inter* or *Geist* | Neutral, legible at small sizes, pairs cleanly with the serif | *Noto Sans SC* |
| **Metadata** (mono) | *Geist Mono* or *JetBrains Mono* | Catalog numbers, timestamps, axis labels (e205, 6577, c993) | *Noto Sans SC* |

**Test every family with real Chinese text** (周公解梦 entries), not only Latin. CJK glyphs render visually larger, so the Chinese text may need ~0.9× size and +0.1 line-height compared with Latin.

### 4.2 Scale (rem, 16px base)

| Token | Size / line-height | Family | Use |
|---|---|---|---|
| `display` | 3.5 / 1.0, weight 300–400 | Serif | Date header on Dream Detail ("October 6th", 4ad3) |
| `title` | 2.0 / 1.15 | Serif | Screen titles, onboarding lines |
| `dream` | 1.25 / 1.75 | Serif | **The dream text itself**: the hero reading experience; max width 36rem |
| `body` | 1.0 / 1.6 | Sans | Interpretations, settings, descriptions |
| `label` | 0.875 / 1.4 | Sans, weight 500 | Buttons, chips, tabs |
| `meta` | 0.75 / 1.4, uppercase, +0.08em tracking | Mono | Catalog numbers, timestamps, chart axes, `[ BRACKETED ]` tags |

### 4.3 Typographic rules

1. **Two-line contrast:** a headline's second line may drop to *italic* and `text-secondary` ("Find your center. *Start today.*", 12f6). This is the signature typographic move; use it sparingly (onboarding, empty states, section intros).
2. **Serif for things the user dreamed, sans for things the app says, mono for things the app measures.** This one rule decides every font choice.
3. **Catalog notation** for metadata: `DREAM — 047`, `06.10.2026`, `[ LUCID ]`, `ZHOUGONG / 周公`.
4. No all-caps serif. No bold serif above weight 500. Never set display text heavier than the body.
5. Large display text may fade into the background gradient (opacity mask at its base, 4ad3). Decorative use only, never for information the user needs to read.

---

## 5. Signature motif: the Dream Orb

Every dream is represented by a soft, glowing orb. It's the app's logo-in-use, the calendar thumbnail, the loading state, and the data point in charts.

- **Form:** a circle with a radial gradient (bright core → saturated mid → transparent edge) plus a 40–80px outer blur glow. Optional inner highlight offset toward the top-left for depth (12f6's glossy pill, e205's spheres).
- **Color:** from the emotion spectrum (§3.2). Two emotions → two-tone orb.
- **Size encodes something**, e.g. dream length or vividness, so the calendar reads at a glance.
- **Texture:** a 4–6% film-grain overlay on the orb so it looks photographic, not vector-flat (7733, 904d).
- **States:** idle = slow "breathing" (scale 1.00 → 1.03, 6s loop); recording = brightens and pulses with mic input; interpreting = slowly rotating conic shimmer.
- **Where it appears:** Capture (behind the mic), Dream Detail header, Calendar day cells, Trends scatter/emotion map, loading and empty states.

---

## 6. Texture & effects

Use them in this priority order. Stacking all of them on one screen turns into noise.

| Effect | Where | Rule |
|---|---|---|
| **Film grain** | Global overlay on `bg` + inside orbs | 3–5% opacity, static SVG noise; never animated |
| **Glow / bloom** | Orbs, primary button, active mic | One bloom source per screen |
| **Frosted glass** | Cards and sheets floating over orbs/gradients | Blur 20–28px, `surface-glass` fill, hairline border. Never glass on glass |
| **Halftone / cyanotype** | Treatment for *generated dream images* (optional filter), and illustration accents | Images only; never on UI text or controls |
| **Dither (1-bit)** | Loading screens, empty states, 404 | Monochrome only |
| **Scanlines / VHS** | Brand moments only (splash, about page) | Never in daily-use screens |

---

## 7. Layout & composition

- **Generous negative space.** One focal element per screen, usually centered (12f6, e205, d69d). If a screen has two heroes, split it.
- **Editorial asymmetry for text:** headlines left-aligned on a 4-column mobile / 12-column desktop grid; metadata pinned to corners (e205, c993).
- **Hairline structure:** 1px `border-hairline` rules and thin **outline frames** (open rectangles around a word or image, 904d) instead of heavy boxes and drop shadows.
- **Spacing scale:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 px. Default card padding 24; section gap 48 on mobile, 96 on desktop.
- **Radius:** 24px cards, 999px pills (buttons, chips, inputs), 12px images. Glass cards may use 28px (4ad3).
- **Reading width:** dream text is max 36rem wide and centered on desktop. It should read like a page in a book, not a chat bubble.

---

## 8. Components

| Component | Spec | Reference |
|---|---|---|
| **Primary button** | Pill, `accent` fill with inner gradient toward `accent-soft`, soft outer glow, `label` type in white | 4ad3 send / mic |
| **Ghost button** | Pill, transparent, hairline border, `text-secondary` → `text-primary` on hover | 12f6 "Begin Now" |
| **Mic button (Capture)** | 72px pill/circle with the Dream Orb glow behind it; pulses with audio level | 4ad3 |
| **Glass card** | `surface-glass`, 24px radius, hairline border, 24px padding | 4ad3, fc7e |
| **Dream card** (archive/list) | Catalog plate: orb centered, `DREAM — 047` top-left mono, date bottom-left, tradition tags bottom-right | e205 |
| **Emotion chips** | Pill chips, each with a small orb dot in its emotion color; selected = glass fill + glow | fc7e check-in |
| **Emotion map** | 2D field (valence × arousal), labeled axes in `meta` mono at the four edges; drag an orb to tag | 6577 |
| **Calendar** | Month grid on `bg`; each day = small orb (size = vividness, color = emotion); today = hairline ring | fc7e strip, e205 |
| **Interpretation panels** | One glass card per tradition, side by side on desktop, swipeable on mobile; tradition name in `meta` mono, reading in `body` sans, quoted symbols in serif italic | — |
| **Inputs / textarea** | Borderless on `bg-raised`; dream textarea uses the `dream` serif style so writing feels like journaling | — |
| **Bottom nav (mobile)** | 3 items max (Journal · Capture · Patterns), line icons, active item gets a small glow dot | 6577 |

### Charts (Trends page)

- **Layered translucent area charts** for emotion over time, each emotion its own spectrum color at 35–50% opacity with a soft top edge (fc7e).
- **Stat tiles** with a large numeral in light serif or sans over a subtle conic/radial gradient (703b): "47 dreams", "31% lucid".
- **Orb scatter** on the emotion map for a period's dreams.
- Axes and gridlines are hairlines; labels are `meta` mono. No chart borders, no heavy legends.

---

## 9. Iconography & ornament

- **Icons:** 1.5px-stroke line icons (e.g. Lucide, which ships with shadcn/ui), rounded caps. Never filled, never duotone.
- **Ornaments** (from 4f0c / 904d / 12f6), at most one or two per screen, purely decorative:
  - Four-point sparkle star ✦ marks AI-generated content (interpretations, generated images). It doubles as a functional signifier.
  - Thin orbital arcs/circles behind hero orbs
  - Open outline rectangles framing a word or an image
- Botanical/statuary imagery (lilies, doves, angels) is mood inspiration for the **image-generation style prompt**, not UI decoration.

---

## 10. Motion

- **Tempo:** slow and soft. Default 400ms, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint). Orb loops 4–8s.
- **Enter:** fade + 8px rise + blur 8px → 0. Content seems to come into focus like waking up.
- **Page transitions:** cross-fade with a brief blur. No sliding carousels or bouncy springs.
- **Respect `prefers-reduced-motion`:** orbs become static, blurs become plain fades.

---

## 11. Light mode — "Morning"

The moodboard leans dark, but e205 and 71a3 give a clean light counterpart:

- `bg` off-white `#F5F3EE` (warm paper, not pure white), `text-primary` `#14151C` (16.4 : 1), `text-muted` `#5B5F6E` (5.7 : 1).
- Orbs keep their spectrum colors but drop the outer glow in favor of a soft chromatic halo (e205).
- Lucid Blue `#2A3BFF` *is* legible as text on this background (6.0 : 1).
- Grain stays; glass becomes `rgba(255,255,255,0.6)` with blur.

**Recommendation:** ship dark only for v1 and treat Morning as a polish item.

---

## 12. Guardrails

1. **Contrast:** all readable text ≥ 4.5 : 1. The references often use low-contrast grey-on-black (12f6's italic line, 4ad3's faded date). That's fine for *decorative* display text and never for information.
2. **One hero per screen.** Orb *or* image *or* display headline leads, never all three equally.
3. **Effects budget:** max one bloom, one glass layer, and the global grain per screen.
4. **Blur is expensive.** Limit `backdrop-filter` to ≤ 3 elements on screen; pre-render orb glows as CSS radial gradients rather than stacking filters.
5. **Never pure black `#000` or pure white `#FFF`** as large surfaces.
6. **Ember and magenta are emotional signals**, not decoration. If they appear, it should mean something (a nightmare, a destructive action).
7. **No emoji in UI.** Emotion is shown with orbs and color, not 😊.

---

## 13. Decisions still yours to make

- [ ] Replace the emotion spectrum (§3.2) with your own color associations
- [ ] Choose the serif: Instrument Serif vs. alternatives (Fraunces, Cormorant Garamond); test with Chinese
- [ ] Decide what orb **size** encodes (length? vividness? hours slept?)
- [ ] Pick the default image-generation style: cyanotype/halftone (3fae), soft-focus photographic (904d), or painterly
- [ ] Confirm dark-only for v1
- [ ] App name and wordmark (the moodboard suggests a small pixel/geometric mark, as in d69d and 6577)

---

### How to use this with the coding agent

1. Paste this file into `docs/design-spec.md` and adjust the open decisions.
2. Junie's first Phase 1 task: *"Read docs/design-spec.md §3–§8. Implement the color, type, spacing and radius tokens as CSS variables + Tailwind theme extensions, load the fonts, and build a `/styleguide` page showing every token, the type scale in English and Chinese, a Dream Orb in each emotion color, and each component in §8 — using only these tokens."*
3. Iterate on `/styleguide` until it feels right before building any real screen.
