import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { core, edge, type Emotion } from '@/lib/emotions'

// The signature motif (design-spec §5): a glowing orb tinted by the dream's emotion.
// The glow is a plain radial gradient rather than a CSS blur filter, so dozens of
// orbs (calendar, charts) stay cheap to render.

export type OrbState = 'idle' | 'recording' | 'interpreting' | 'still'

type DreamOrbProps = {
  emotion: Emotion
  /** Second emotion for a mixed dream; renders a two-tone orb. */
  blend?: Emotion
  /** Diameter in px. Encodes vividness in calendar and charts. */
  size?: number
  state?: OrbState
  /** Hide the outer glow, e.g. in dense grids. */
  glow?: boolean
  /** Varies the light direction so same-emotion orbs differ. Pass something stable, like a hash of the dream id. */
  seed?: number
  className?: string
}

// Soft edge for the orb body, so it reads as light rather than a hard disc.
const softEdge = 'radial-gradient(circle, black 58%, transparent 71%)'

// Point on a circle around the orb's center, as CSS percentages.
function around(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return `${50 + radius * Math.cos(rad)}% ${50 + radius * Math.sin(rad)}%`
}

// `angle` is where the light comes from; a seed varies it so orbs of the same
// emotion still look like different objects. 225° is the default top-left light.
function bodyGradient(a: Emotion, b: Emotion | undefined, angle: number) {
  const highlight = `radial-gradient(circle at ${around(angle, 22)}, rgb(var(--text-primary) / 0.35) 0%, transparent 24%)`
  if (!b) {
    return `${highlight}, radial-gradient(circle at ${around(angle, 15)}, ${core(a)} 0%, ${edge(a)} 52%, ${edge(a, 0.9)} 100%)`
  }
  return [
    highlight,
    `radial-gradient(circle at ${around(angle, 28)}, ${core(a)} 0%, ${edge(a)} 38%, ${edge(a, 0)} 70%)`,
    `radial-gradient(circle at ${around(angle + 180, 31)}, ${core(b)} 0%, ${edge(b)} 40%, ${edge(b, 0)} 75%)`,
    `linear-gradient(${angle - 90}deg, ${edge(a)} 0%, ${edge(b)} 100%)`,
  ].join(', ')
}

export function DreamOrb({
  emotion,
  blend,
  size = 120,
  state = 'idle',
  glow = true,
  seed,
  className,
}: DreamOrbProps) {
  // Light stays in the upper half (180°–360°) so orbs never look lit from below.
  const angle = seed === undefined ? 225 : 180 + (seed % 180)
  const body: CSSProperties = {
    background: bodyGradient(emotion, blend, angle),
    maskImage: softEdge,
    WebkitMaskImage: softEdge,
  }

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {glow && (
        <div
          className={cn(
            'absolute -inset-1/2 rounded-pill',
            state === 'recording' && 'motion-safe:animate-pulse',
          )}
          style={{
            background: `radial-gradient(circle, ${edge(emotion, 0.6)} 0%, ${edge(blend ?? emotion, 0.22)} 32%, transparent 62%)`,
          }}
        />
      )}
      <div
        className={cn(
          'absolute inset-0 rounded-pill',
          state === 'idle' && 'motion-safe:animate-breathe',
          state === 'recording' && 'motion-safe:animate-pulse',
        )}
      >
        <div className="absolute inset-0 rounded-pill" style={body} />
        {/* Grain inside the orb so it looks photographic, not vector-flat */}
        <div
          className="absolute inset-0 rounded-pill bg-grain opacity-[0.18] mix-blend-overlay"
          style={{ maskImage: softEdge, WebkitMaskImage: softEdge }}
        />
        {state === 'interpreting' && (
          <div
            className="absolute inset-0 rounded-pill mix-blend-soft-light motion-safe:animate-shimmer"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0%, rgb(var(--text-primary) / 0.7) 12%, transparent 30%, transparent 55%, rgb(var(--text-primary) / 0.5) 68%, transparent 85%)',
              maskImage: softEdge,
              WebkitMaskImage: softEdge,
            }}
          />
        )}
      </div>
    </div>
  )
}
