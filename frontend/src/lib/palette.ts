import type { DreamColor } from '@/data/sampleDreams'

// A dream's palette, built from the color words tagged in it. Dream palettes are
// data recorded per dream, not UI colors.

const COLOR_HEX: Record<string, string> = {
  red: '#C8381E', blue: '#4D6FB8', gold: '#E6B84A', green: '#3E6B3A', violet: '#7A6BD8', white: '#EEEBF2', black: '#141218',
}

// Falls back to a night palette when no known color was named.
export function paletteFrom(words: string[]): DreamColor[] {
  const known = words.map((w) => w.toLowerCase()).filter((w) => COLOR_HEX[w])
  if (known.length === 0) {
    return [
      { name: 'Night', hex: '#1A1230', pct: 60, warmth: 'cool' },
      { name: 'Glow', hex: '#B49CFF', pct: 40, warmth: 'cool' },
    ]
  }
  return [
    ...known.map((w) => ({
      name: w[0].toUpperCase() + w.slice(1),
      hex: COLOR_HEX[w],
      pct: Math.round(60 / known.length),
      warmth: (['red', 'gold'].includes(w) ? 'warm' : 'cool') as DreamColor['warmth'],
    })),
    { name: 'Night', hex: '#1A1230', pct: 40, warmth: 'cool' },
  ]
}
