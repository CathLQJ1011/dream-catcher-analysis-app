import { GlassCard } from '@/components/ui/glass-card'
import { DreamOrb } from '@/components/dream/DreamOrb'
import type { Emotion } from '@/lib/emotions'
import { cn } from '@/lib/utils'

type DreamCardProps = {
  number: number
  date: string
  emotion: Emotion
  blend?: Emotion
  /** 0–1. Sets the orb's size (design-spec §5). */
  vividness?: number
  /** The dream's most salient symbol, in the language it was dreamed in. */
  symbol: string
  /** Short translation or gloss shown under the symbol. */
  gloss?: string
  tag?: string
  traditions: string[]
}

// Catalog plate (design-spec §8, e205). Many dreams share an emotion, so the orb
// alone can't identify one: the top symbol is the card's headline. The orb stays
// centered; only its light direction varies, derived from the dream number.
export function DreamCard({
  number,
  date,
  emotion,
  blend,
  vividness = 0.5,
  symbol,
  gloss,
  tag,
  traditions,
}: DreamCardProps) {
  const orbSize = 64 + Math.min(Math.max(vividness, 0), 1) * 64
  const isHan = /\p{Script=Han}/u.test(symbol)
  // Short symbols get the display size; longer phrases drop to title so they fit one line.
  const isShort = isHan ? symbol.length <= 3 : symbol.length <= 6

  return (
    <GlassCard className="flex aspect-[4/5] w-full flex-col gap-4 overflow-hidden">
      <div className="flex justify-between gap-4 whitespace-nowrap font-mono text-meta uppercase text-fg-muted">
        <span className="text-fg">Dream — {String(number).padStart(3, '0')}</span>
        {tag && <span>[ {tag} ]</span>}
      </div>

      {/* The orb gets its own area so it never sits behind text */}
      <div className="flex flex-1 items-center justify-center">
        <DreamOrb emotion={emotion} blend={blend} size={orbSize} seed={hash(number)} />
      </div>

      <div className="flex flex-col gap-1">
        <span
          className={cn('truncate font-serif', isShort ? 'text-display' : 'text-title')}
          lang={isHan ? 'zh-Hans' : undefined}
        >
          {symbol}
        </span>
        {gloss && <span className="truncate font-serif text-dream italic text-fg-secondary">{gloss}</span>}
      </div>
      <div className="flex justify-between gap-4 whitespace-nowrap border-t border-hairline pt-3 font-mono text-meta uppercase text-fg-muted">
        <span>{date}</span>
        <span className="truncate">{traditions.join(' · ')}</span>
      </div>
    </GlassCard>
  )
}

// Small integer hash so the same dream always gets the same light direction.
function hash(n: number) {
  let h = n * 2654435761
  h = (h ^ (h >>> 15)) >>> 0
  return h
}
