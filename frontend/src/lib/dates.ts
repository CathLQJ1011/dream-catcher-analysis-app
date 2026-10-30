// Date helpers for YYYY-MM-DD strings. Parsed as local dates so a dream logged
// on the 14th never shows up on the 13th because of a timezone offset.

export function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIso(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function formatShortDate(iso: string) {
  return parseDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)
}

/** Today on this device, as YYYY-MM-DD. */
export function today() {
  return toIso(new Date())
}
