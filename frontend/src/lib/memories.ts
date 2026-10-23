import { SAMPLE_DREAMS, type SampleDream } from '@/data/sampleDreams'
import { daysBetween, parseDate, toIso } from '@/lib/dates'

// "One year ago tonight": the dream from this night last year, or the closest one
// within a few days. Heavy dreams are skipped unless the dreamer asks for all.

export type MemoryPref = 'on' | 'calm' | 'off'

const WINDOW_DAYS = 3

export function memoryFor(today: string, pref: MemoryPref): { dream: SampleDream; exact: boolean } | null {
  if (pref === 'off') return null
  const target = sameDayLastYear(today)
  const near = SAMPLE_DREAMS.map((d) => ({ d, gap: Math.abs(daysBetween(d.date, target)) }))
    .filter(({ d, gap }) => gap <= WINDOW_DAYS && (pref === 'on' || !isHeavy(d)))
    .sort((a, b) => a.gap - b.gap || b.d.vividness - a.d.vividness)
  return near[0] ? { dream: near[0].d, exact: near[0].gap === 0 } : null
}

/** Nightmares and intense fear: not something to surprise someone with. */
function isHeavy(d: SampleDream) {
  return d.valence <= -2 || (d.emotion === 'fear' && d.intensity >= 4)
}

function sameDayLastYear(iso: string) {
  const d = parseDate(iso)
  const last = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate())
  // Feb 29 has no twin last year; JS rolls it to Mar 1, so step back to Feb 28.
  if (last.getMonth() !== d.getMonth()) last.setDate(0)
  return toIso(last)
}
