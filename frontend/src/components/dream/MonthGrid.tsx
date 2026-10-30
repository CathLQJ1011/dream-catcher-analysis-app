import { DreamOrb } from '@/components/dream/DreamOrb'
import { DreamPreview, Tooltip } from '@/components/ui/tooltip'
import type { JournalDream } from '@/data/journal'
import { toIso, today } from '@/lib/dates'
import { cn } from '@/lib/utils'

// A month of nights, each with the orbs of the dreams logged on it. Used by
// Journal and by Manage dreams on Me. Dreams not in `visible` are dimmed.

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function MonthGrid({
  month,
  dreams: all,
  selected,
  onSelect,
  visible,
}: {
  month: Date
  dreams: JournalDream[]
  selected: string
  onSelect: (iso: string) => void
  visible: Set<number>
}) {
  const byDate = new Map<string, JournalDream[]>()
  for (const d of all) byDate.set(d.date, [...(byDate.get(d.date) ?? []), d])

  // Weeks start on Monday.
  const lead = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ]

  return (
    <div className="mt-6 grid grid-cols-7 gap-y-2">
      {WEEKDAYS.map((d, i) => (
        <span key={i} className="pb-2 text-center font-mono text-meta text-fg-muted">
          {d}
        </span>
      ))}
      {cells.map((date, i) => {
        if (!date) return <span key={i} />
        const iso = toIso(date)
        const dreams = byDate.get(iso) ?? []
        const lit = dreams.filter((d) => visible.has(d.id))
        const isToday = iso === today()
        const isSelected = iso === selected
        const col = (lead + date.getDate() - 1) % 7
        const cell = (
          <button
            type="button"
            onClick={() => onSelect(iso)}
            aria-label={`${date.toDateString()}, ${dreams.length} dreams`}
            aria-pressed={isSelected}
            className="flex flex-col items-center gap-1 py-1"
          >
            <span
              className={cn(
                'flex size-11 items-center justify-center rounded-pill transition',
                isSelected && 'bg-glass',
                isToday && 'border border-fg-muted',
              )}
            >
              {dreams.length === 0 ? (
                <span className="size-1 rounded-pill bg-hairline" />
              ) : (
                <span className={cn('flex -space-x-2 transition', lit.length === 0 && 'opacity-20')}>
                  {dreams.map((d) => (
                    <DreamOrb
                      key={d.id}
                      emotion={d.emotion}
                      blend={d.blend}
                      size={14 + d.vividness * 18}
                      glow={false}
                      state="still"
                      seed={d.number}
                    />
                  ))}
                </span>
              )}
            </span>
            <span className={cn('font-mono text-meta', isSelected || isToday ? 'text-fg' : 'text-fg-muted')}>
              {date.getDate()}
            </span>
          </button>
        )
        if (dreams.length === 0) return <div key={iso}>{cell}</div>
        return (
          <Tooltip
            key={iso}
            align={col < 2 ? 'start' : col > 4 ? 'end' : 'center'}
            className="justify-center"
            content={dreams.map((d) => (
              <DreamPreview key={d.id} symbol={d.symbol} title={d.title} />
            ))}
          >
            {cell}
          </Tooltip>
        )
      })}
    </div>
  )
}
