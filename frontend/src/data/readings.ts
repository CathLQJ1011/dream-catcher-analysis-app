import { EMOTIONS } from '@/lib/emotions'
import type { SampleDream } from '@/data/sampleDreams'

// Placeholder interpretations so Dream Detail has something to lay out.
// Real readings come from the Phase 5 engine; 周公解梦 readings must cite the
// curated dictionary, so this file never pretends to quote it.

export type Reading = { tradition: string; symbol: string; reading: string }

export function sampleReadings(d: SampleDream): Reading[] {
  const feeling = EMOTIONS.find((e) => e.id === d.emotion)?.label.toLowerCase() ?? 'mixed'
  return [
    {
      tradition: 'Jungian',
      symbol: d.symbol,
      reading: `A recurring image met with ${feeling}. Read as a message from the unconscious, it may point to something you are approaching rather than avoiding.`,
    },
    {
      tradition: 'Zhougong · 周公',
      symbol: d.symbol,
      reading: 'Sample placeholder. Real readings will quote and cite your curated 周公解梦 entries for this symbol.',
    },
    {
      tradition: 'Neuroscience',
      symbol: d.gloss,
      reading: `Dreams often recombine recent memories with strong feeling. A ${d.intensity >= 4 ? 'vivid, intense' : 'quiet'} dream like this one may reflect what the brain was consolidating that night.`,
    },
  ]
}
