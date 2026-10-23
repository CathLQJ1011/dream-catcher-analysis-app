import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Small glass preview shown on hover, or on focus for keyboard and touch users.
// `align` keeps tooltips near the screen edge from running off it.
export function Tooltip({
  content,
  align = 'center',
  children,
  className,
}: {
  content: ReactNode
  align?: 'start' | 'center' | 'end'
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full z-30 mb-2 flex w-max max-w-tooltip translate-y-1 flex-col gap-1 rounded-card border border-hairline bg-raised/90 px-4 py-2 text-left opacity-0 backdrop-blur-glass transition',
          'group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:translate-y-0 group-hover/tip:opacity-100',
          align === 'start' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'end' && 'right-0',
        )}
      >
        {content}
      </span>
    </span>
  )
}

/** Tooltip body for a dream: top symbol, title, optional date. */
export function DreamPreview({ symbol, title, date }: { symbol: string; title: string; date?: string }) {
  return (
    <span className="flex flex-col">
      <span className="font-serif text-dream text-fg" lang={/\p{Script=Han}/u.test(symbol) ? 'zh-Hans' : undefined}>
        {symbol}
      </span>
      <span className="text-label font-normal text-fg-secondary">{title}</span>
      {date && <span className="font-mono text-meta uppercase text-fg-muted">{date}</span>}
    </span>
  )
}
