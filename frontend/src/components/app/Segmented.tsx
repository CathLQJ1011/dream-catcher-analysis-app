import { cn } from '@/lib/utils'

// Compact segmented control: only as wide as its labels (design-spec §7.1 rule 3).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  /** `sm` is for switches that sit inside a chart rather than above it. */
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-pill border border-hairline p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-pill transition',
            size === 'sm' ? 'h-6 px-3 font-mono text-meta uppercase' : 'h-8 px-4 text-label',
            value === o.value ? 'bg-glass text-fg' : 'text-fg-muted hover:text-fg-secondary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Horizontal pill row that bleeds to the screen edge but starts on the 24px margin.
export function PillScroller<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number; dot?: string }[]
  value: T | null
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="-mx-6 overflow-x-auto [scrollbar-width:none]">
      <div role="radiogroup" aria-label={label} className="flex w-max gap-2 px-6">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-pill border px-4 text-label transition',
              value === o.value
                ? 'border-accent-soft/40 bg-accent/20 text-fg'
                : 'border-hairline text-fg-secondary hover:text-fg',
            )}
          >
            {o.dot && <span className="size-2 rounded-pill" style={{ background: o.dot }} />}
            {o.label}
            {o.count !== undefined && <span className="font-mono text-meta text-fg-muted">{o.count}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
