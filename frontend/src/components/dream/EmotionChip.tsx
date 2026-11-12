import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { core, edge, type Emotion } from '@/lib/emotions'

type EmotionChipProps = Omit<ComponentProps<'button'>, 'children'> & {
  emotion: Emotion
  label: string
  selected?: boolean
  /** Shown after the label, e.g. a ▾ when the chip opens a menu. */
  trailing?: ReactNode
}

// Check-in chip with a small orb dot in the emotion's color (design-spec §8).
// Other button props pass through, so a popover can use the chip as its trigger.
export function EmotionChip({ emotion, label, selected = false, trailing, className, style, ...button }: EmotionChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...button}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-4 py-2 text-label transition',
        selected
          ? 'border-hairline bg-glass text-fg backdrop-blur-glass'
          : 'border-transparent text-fg-secondary hover:text-fg',
        className,
      )}
      style={selected ? { boxShadow: `0 0 20px ${edge(emotion, 0.45)}`, ...style } : style}
    >
      <span
        className="size-3 rounded-pill"
        style={{ background: `radial-gradient(circle at 35% 30%, ${core(emotion)}, ${edge(emotion)})` }}
      />
      {label}
      {trailing}
    </button>
  )
}
