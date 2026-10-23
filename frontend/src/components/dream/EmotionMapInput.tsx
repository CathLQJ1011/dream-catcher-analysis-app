import { useRef } from 'react'
import { DreamOrb } from '@/components/dream/DreamOrb'
import type { Emotion } from '@/lib/emotions'
import { cn } from '@/lib/utils'

// Drag-to-set version of the emotion map (design-spec §8): one gesture sets both
// valence (dark → light) and intensity (quiet → intense).

export type MapValue = { valence: number; intensity: number } // −2..2, 1..5

export function EmotionMapInput({
  value,
  onChange,
  emotion,
  blend,
}: {
  value: MapValue
  onChange: (v: MapValue) => void
  emotion: Emotion
  blend?: Emotion
}) {
  const ref = useRef<HTMLDivElement>(null)

  function place(clientX: number, clientY: number) {
    const r = ref.current!.getBoundingClientRect()
    const x = clamp((clientX - r.left) / r.width)
    const y = clamp((clientY - r.top) / r.height)
    onChange({ valence: (x - 0.5) * 4, intensity: 1 + (1 - y) * 4 })
  }

  const left = 50 + value.valence * 25
  const top = 50 - (value.intensity - 3) * 25

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Where the dream sat: dark to light, quiet to intense"
        aria-valuetext={describe(value)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          place(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => e.buttons && place(e.clientX, e.clientY)}
        onKeyDown={(e) => {
          const step = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, 0.5], ArrowDown: [0, -0.5] }[e.key]
          if (!step) return
          e.preventDefault()
          onChange({
            valence: Math.max(-2, Math.min(2, value.valence + step[0])),
            intensity: Math.max(1, Math.min(5, value.intensity + step[1])),
          })
        }}
        className="relative h-48 cursor-crosshair touch-none rounded-card border border-hairline bg-raised"
      >
        <div className="absolute inset-x-14 top-1/2 border-t border-hairline" />
        <div className="absolute inset-y-8 left-1/2 border-l border-hairline" />
        <Label className="left-1/2 top-3 -translate-x-1/2">Intense</Label>
        <Label className="bottom-3 left-1/2 -translate-x-1/2">Quiet</Label>
        <Label className="left-4 top-1/2 -translate-y-1/2">Dark</Label>
        <Label className="right-4 top-1/2 -translate-y-1/2">Light</Label>
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75"
          style={{ left: `${left}%`, top: `${top}%` }}
        >
          <DreamOrb emotion={emotion} blend={blend} size={40} />
        </div>
      </div>
      <span className="font-mono text-meta uppercase text-fg-muted">{describe(value)}</span>
    </div>
  )
}

function Label({ className, children }: { className: string; children: string }) {
  return (
    <span className={cn('pointer-events-none absolute font-mono text-meta uppercase text-fg-muted', className)}>
      {children}
    </span>
  )
}

function describe({ valence, intensity }: MapValue) {
  const v = valence > 0.6 ? 'Light' : valence < -0.6 ? 'Dark' : 'Neither dark nor light'
  const i = intensity > 3.6 ? 'intense' : intensity < 2.4 ? 'quiet' : 'moderate'
  return `${v} · ${i}`
}

const clamp = (n: number) => Math.max(0, Math.min(1, n))
