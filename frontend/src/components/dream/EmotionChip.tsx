import { cn } from '@/lib/utils'
import { core, edge, type Emotion } from '@/lib/emotions'

type EmotionChipProps = {
  emotion: Emotion
  label: string
  selected?: boolean
  onClick?: () => void
}

// Check-in chip with a small orb dot in the emotion's color (design-spec §8).
export function EmotionChip({ emotion, label, selected = false, onClick }: EmotionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-4 py-2 text-label transition',
        selected
          ? 'border-hairline bg-glass text-fg backdrop-blur-glass'
          : 'border-transparent text-fg-secondary hover:text-fg',
      )}
      style={selected ? { boxShadow: `0 0 20px ${edge(emotion, 0.45)}` } : undefined}
    >
      <span
        className="size-3 rounded-pill"
        style={{ background: `radial-gradient(circle at 35% 30%, ${core(emotion)}, ${edge(emotion)})` }}
      />
      {label}
    </button>
  )
}
