import { DreamOrb } from '@/components/dream/DreamOrb'
import type { SampleDream } from '@/data/sampleDreams'
import { formatShortDate } from '@/lib/dates'
import { navigate } from '@/lib/router'
import { cn } from '@/lib/utils'

// A dream as a plain list row (design-spec §7.1 rule 4: rows before cards).
export function DreamRow({ dream, highlight = false }: { dream: SampleDream; highlight?: boolean }) {
  const isHan = /\p{Script=Han}/u.test(dream.symbol)

  return (
    <li className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={() => navigate(`/dream/${dream.number}`)}
        className={cn('flex w-full items-center gap-4 py-4 text-left transition hover:bg-glass', highlight && 'animate-enter bg-glass')}
      >
        <div className="flex size-11 shrink-0 items-center justify-center">
          <DreamOrb
            emotion={dream.emotion}
            blend={dream.blend}
            size={20 + dream.vividness * 24}
            glow={false}
            state="still"
            seed={dream.number}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-dream" lang={isHan ? 'zh-Hans' : undefined}>
              {dream.symbol}
            </span>
            <span className="truncate font-serif text-body italic text-fg-secondary">{dream.gloss}</span>
          </div>
          <span className="truncate text-label font-normal text-fg-muted">{dream.title}</span>
        </div>
        <span className="shrink-0 font-mono text-meta uppercase text-fg-muted">{formatShortDate(dream.date)}</span>
      </button>
    </li>
  )
}
