import { api, type DreamOut, type DreamSummary } from '@/lib/api'
import type { Emotion } from '@/lib/emotions'
import { paletteFrom } from '@/lib/palette'
import type { SampleDream } from '@/data/sampleDreams'

// Your real dreams from the API, in the same shape the prototype's components
// already draw (SampleDream), plus the database id used in links.
//
// Fields a dream can leave blank get a quiet middle value so the orb still draws:
// no feeling reads as neutral, no vividness as half.

export type JournalDream = SampleDream & { id: number }

const isHan = (s: string) => /\p{Script=Han}/u.test(s)

/** The headline symbol and its gloss: your word up top, the dictionary term beneath. */
function headline(value: string | undefined, zh: string | null | undefined, en: string | null | undefined) {
  if (!value) return { symbol: 'dream', gloss: '' }
  const gloss = isHan(value) ? en : zh
  return { symbol: value, gloss: gloss && gloss !== value ? gloss : '' }
}

function base(d: DreamSummary | DreamOut) {
  return {
    id: d.id,
    number: d.number,
    date: d.dreamed_on,
    title: d.title ?? '',
    valence: (d.valence ?? 0) as SampleDream['valence'],
    vividness: d.vividness ?? 0.5,
  }
}

/** From a list row (Journal). Lists don't carry text or every tag, only what rows and orbs need. */
export function fromSummary(d: DreamSummary): JournalDream {
  const top = d.top_symbol
  return {
    ...base(d),
    ...headline(top?.value, top?.term_zh, top?.term_en),
    text: '',
    emotion: d.emotion ?? 'neutral',
    blend: d.blend ?? undefined,
    intensity: 3,
    lucidity: 0,
    symbols: top ? [top.value] : [],
    people: [],
    colors: paletteFrom([]),
  }
}

/** From a whole dream (Dream detail). */
export function fromDream(d: DreamOut): JournalDream {
  const kept = d.elements.filter((e) => e.kept)
  const top = kept.find((e) => e.id === d.top_element_id)
  // Strongest feeling first, then the next different one, as the API's lists do.
  const feelings = d.emotions
    .filter((e) => e.kept)
    .sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0) || a.position - b.position)
    .map((e) => e.emotion)
  const emotion: Emotion = feelings[0] ?? 'neutral'
  const of = (...kinds: string[]) => kept.filter((e) => kinds.includes(e.kind)).map((e) => e.value)

  return {
    ...base(d),
    ...headline(top?.value, top?.symbol?.term_zh, top?.symbol?.term_en),
    text: d.text,
    emotion,
    blend: feelings.find((e) => e !== emotion),
    intensity: (d.intensity ?? 3) as SampleDream['intensity'],
    lucidity: (d.lucidity ?? 0) as SampleDream['lucidity'],
    symbols: of('symbol', 'place', 'body', 'media'),
    people: of('person'),
    colors: paletteFrom(of('color')),
  }
}

/** Every dream in the journal, newest first, following the API's pages to the end. */
export async function loadJournal(): Promise<JournalDream[]> {
  const all: JournalDream[] = []
  let cursor: string | undefined
  do {
    const page = await api.listDreams(cursor)
    all.push(...page.items.map(fromSummary))
    cursor = page.next_cursor ?? undefined
  } while (cursor)
  return all
}
