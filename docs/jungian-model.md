# Jungian reading model

*How the app produces a Jungian reading of a dream. This is the plan for the Phase 5 prompt and output schema. The companion glossary is `data/symbols/jung.csv`.*

## Sources

| | book | used for |
|---|---|---|
| **M** | Mary Ann Mattoon, *Applied Dream Analysis: A Jungian Approach* (V. H. Winston & Sons, 1978) | The step-by-step method. Page numbers are the printed pages (PDF page − 20). |
| **W** | Strephon Kaplan Williams, *The Jungian-Senoi Dreamwork Manual* (Journey Press, rev. ed. 1985) | Self-guided dreamwork: key questions, the dream ego, dialogue, nightmares, rewriting. Printed pages (PDF − 2). |
| **S** | Nathan Schwartz-Salant & Murray Stein (eds.), *Dreams in Analysis* (Chiron, 1990) | Clinical essays; used for cautions and a few amplifications. Printed pages (PDF − 6). |

All summaries below are paraphrased. Short quotations are marked and cited.

---

## The core stance

Jungian dream work is **not a dictionary**. Three ideas set it apart from 周公解梦:

1. **The dream is a natural, honest product, not a disguise.** It shows "psychic facts" as they are, rather than hiding a forbidden wish (M 95–96).
2. **The dreamer is the authority on the dream.** The same image means different things to different people, so personal associations come first. Mattoon passes on Jung's advice to learn all you can about symbolism, then "forget it" when facing an actual dream (M 99).
3. **Most dreams compensate.** A dream tends to bring in what the dreamer's waking attitude is missing, to restore balance (M 119–120).

For the app this means: **a Jungian reading is a set of tentative possibilities and good questions**, never a verdict.

---

## The reading, step by step

Each step names what the app already has in the data model (`docs/data-model.md`) and what the AI should do with it.

### 1. Get the dream text right
Separate what was dreamed from what was added while retelling it. Ask about vague parts ("Where did it seem to happen?"). Record the feeling **during** the dream and **after waking**, since they can differ (M 51–52).
*App:* `dreams.text`, `original_text`; `dream_emotions` (in order); `mood_on_waking`.

### 2. Look at the dream's shape
Jung read dreams like a play: a **setting** (place, time, people), a **development**, a **turning point**, and a **resolution** or ending, which may be missing (M 53).
*App:* `narrative`, ordered `places`, `dream_emotions.position`. A dream with no resolution is a natural candidate for the rewriting technique in step 9.

### 3. Personal associations first
For each important image, what does the dreamer connect it with? Associations stay close to the image ("circling" it) rather than drifting away by free association (M 56, 51–60).
*App:* the dreamer's own `insight` ("What do you think it means?"), which the app asks for **before** showing any reading. The AI should ask about one or two key images rather than assume.

### 4. The waking situation
A dream is shaped by what is going on in the dreamer's life, especially the last day or two and anything emotionally charged. The same dream can mean very different things for different people (M 75–76).
*App:* `day_residue`, recent dreams, and anything the dreamer has written in `reality_link`.

### 5. Amplification, only when an image is "big"
Some images go beyond personal experience (dragons, treasure, strange landscapes, cosmic journeys) and call for parallels from myth, religion and folklore. Most dreams mix personal and archetypal material, and reading an archetypal image only personally can mislead (M 65–67).
*App:* the glossary (`jung.csv`) supplies **possibilities**. Amplification must draw on many cultures, not a single tradition.

### 6. Subjective or objective level
Is a dream figure **about the real person** (objective), or **a part of the dreamer** (subjective)? Jung leaned toward the subjective reading, since it gives the dreamer something to work with in themself, but he made room for both (M 111–112).
*App:* for each person in `people`, the reading offers both levels when both are plausible ("This may be about your sister herself, or about a quality of hers that lives in you").

### 7. What does the dream balance?
Compare the dream with the dreamer's conscious attitude: what does it add, exaggerate, or contradict (M 119–120)? Not every dream compensates. Some look ahead and rehearse a coming change (prospective dreams), and some replay a trauma (M 139–140).
*App:* the reading states **one compensation hypothesis, tentatively** ("One possibility is that…"). It never claims the dream predicts events.

### 8. The series
Dreams connect over time. Recurring motifs and the ways they change are often more telling than a single dream (M 81–82).
*App:* `dream_links`, recurring `dream_elements`, the People and Symbols lenses. The reading notes when a motif has appeared before.

### 9. Active dreamwork (Williams)
Instead of only interpreting, the dreamer works with the dream:
- **Follow the dream ego.** How did *I* act in the dream: passive, fleeing, curious, helping? (W 103–106)
- **Key questions**, for example (W 97–98, paraphrased):
  - How am I acting in this dream?
  - What is the helping or healing force here?
  - What is being wounded, and what is being healed?
  - What does this dream seem to ask of me?
  - What choice could I make after working with it?
- **Dialogue** with a dream figure in writing, as if it could answer (W 113–120).
- **Bring resolution** to an unfinished dream: rewrite the ending, or carry it forward in imagination (W 162–177, 310–311).
- **Nightmares:** stay with the threat in imagination, face or befriend it, and rewrite the dream toward resolution (W 199–203).

*App:* a reading ends with **two or three key questions** and, at most, **one small dreamwork suggestion**.

### 10. Does it ring true?
Jung's tests (M 177–178), in order:
1. Does it "click" with the dreamer?
2. Does it set something moving in their life?
3. Do later dreams confirm or correct it?
4. Do events bear it out?

*App:* a quiet "Does this resonate?" on each reading card. Answers are stored and become the measure of reading quality in Phase 5.

---

## Output shape (draft for Phase 5)

```json
{
  "tradition": "jung",
  "dream_shape": { "setting": "…", "turning_point": "…", "resolution": "none" },
  "dream_ego": "You mostly watch and wait; you act once, at the bridge.",
  "motifs": [
    { "glossary_id": "jg-007", "image": "the river", "possibility": "…", "level": "subjective" }
  ],
  "compensation": "One possibility: …",
  "series_note": "Water has appeared in 3 of your last 10 dreams.",
  "questions": ["What is the helping force in this dream?", "…"],
  "dreamwork": "Try rewriting the ending so you reach the other bank.",
  "confidence_note": "Based only on the dream text; your own associations would change this."
}
```

### Rules for the AI
- **Tentative language only:** "might", "one possibility", "you could ask yourself". No "this means".
- **The dreamer's associations override the glossary.**
- **No diagnoses** (medical or psychological) and **no predictions** about events or people.
- **Nightmares and trauma:** don't push interpretation. Offer grounding, the resolution and rewriting technique, and gently mention professional support if the dreams are distressing or recurring.
- **No assumptions** about the dreamer's gender, sexuality, relationship status, culture or religion.

---

## Inclusive review

The same rubric as the 周公解梦 dictionary: no discrimination in any form, feminist-friendly, LGBTQ+-friendly, not locked to one culture. What was found in these books, and what the app does instead:

| issue in the sources | where | the app's approach |
|---|---|---|
| A Jung anecdote quoted with a racial slur | M 20 | Left out entirely. |
| A dream figure described by race and read as a symbol | M 157 | Never read race as symbolic. A figure's qualities and the dreamer's associations matter, not skin color. |
| "Primitive" used for non-Western peoples (Jung, and M throughout) | M 28, 44, … | Never used. Name the specific culture, or say "traditional and Indigenous cultures". |
| **Anima / animus as a fixed gender binary**: "the unconscious feminine side of the man… the masculine side of the woman" | M 17 | Reframed as **the inner other**: qualities in yourself that feel unfamiliar or undeveloped, which can appear as a figure of **any gender**. No trait is "feminine" or "masculine" by nature. |
| "A male figure in a woman's dream is the animus; a female figure, the shadow" | M 18 | Dropped. It assumes everyone is a cisgender, heterosexual man or woman. A figure's role comes from how it acts and feels, not its gender relative to the dreamer. |
| Gendered readings, e.g. a wolf as "a pursuer of women", marriage as the default frame | M 123, 90, … | Readings are gender-neutral; relationships mean any relationship. |
| Same-sex feelings framed as "latent homosexuality" to be worked through | S 160, 189–192 | Never pathologized. Same-sex attraction or intimacy in a dream is read like any other relationship or feeling. |
| Jung inferring a fatal illness from a dream | M 100 | No medical or death predictions. |
| "Mother" and "father" as fixed symbols (origin of life, authority) | M 100, 67 | Read as **caregiving, nourishing or smothering** and **structure, guidance or control**, which anyone can embody. |
| "Senoi" dreamwork attributed to the Senoi people of Malaysia, from a 1950s account later doubted (Williams calls them "largely a mythic people") | W 301–302 | Techniques are credited to Williams and modern dreamwork, not to the Senoi people. The app doesn't use "Senoi" as a label. |
| Generic "he" for the dreamer | M, W | The app uses "you" and "they". Mattoon herself, writing as a feminist, apologizes for the generic pronoun (M xv). |

## Not from these books

Some common dream images, such as teeth falling out and exams, are barely discussed in these three books. The glossary doesn't invent Jungian readings for them; for those, the reading relies on the dreamer's associations and the general method above.
