import { useEffect, useImperativeHandle, useRef, type PointerEvent, type Ref } from 'react'
import { DreamOrb } from '@/components/dream/DreamOrb'
import type { Emotion } from '@/lib/emotions'

// The blind-box field: sealed orbs that drift, bump into each other, and can be
// flung around or stirred before you pick one. Positions are updated directly on
// the DOM each frame, so React never re-renders during the animation.

export type OrbFieldHandle = { stir: () => void }

type Orb = { emotion: Emotion; size: number }

type Body = { x: number; y: number; vx: number; vy: number; r: number } // px, px/frame

const TAP_SLOP = 6 // px a pointer can move and still count as a tap

export function OrbField({
  orbs,
  onPick,
  disabled,
  ref,
}: {
  orbs: Orb[]
  onPick: () => void
  disabled: boolean
  ref?: Ref<OrbFieldHandle>
}) {
  const box = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLButtonElement | null)[]>([])
  const bodies = useRef<Body[]>([])
  const drag = useRef<{ i: number; ox: number; oy: number; lx: number; ly: number; lt: number; moved: number } | null>(null)

  useImperativeHandle(ref, () => ({
    stir() {
      for (const b of bodies.current) {
        const a = Math.random() * Math.PI * 2
        const speed = 6 + Math.random() * 8
        b.vx += Math.cos(a) * speed
        b.vy += Math.sin(a) * speed
      }
    },
  }))

  useEffect(() => {
    const el = box.current!
    const { width: w, height: h } = el.getBoundingClientRect()
    // Spread the orbs out on a loose grid to start.
    bodies.current = orbs.map((o, i) => ({
      x: w * (0.18 + 0.64 * ((i * 0.618) % 1)),
      y: h * (0.2 + 0.6 * ((i * 0.382 + 0.1) % 1)),
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: o.size / 2,
    }))

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0

    const tick = () => {
      const { width: w, height: h } = el.getBoundingClientRect()
      const bs = bodies.current
      bs.forEach((b, i) => {
        if (drag.current?.i === i) return
        if (!still) {
          // Gentle drift so the field never looks frozen, plus friction after a fling.
          b.vx = b.vx * 0.97 + (Math.random() - 0.5) * 0.08
          b.vy = b.vy * 0.97 + (Math.random() - 0.5) * 0.08
          b.x += b.vx
          b.y += b.vy
        }
        if (b.x < b.r) [b.x, b.vx] = [b.r, Math.abs(b.vx) * 0.7]
        if (b.x > w - b.r) [b.x, b.vx] = [w - b.r, -Math.abs(b.vx) * 0.7]
        if (b.y < b.r) [b.y, b.vy] = [b.r, Math.abs(b.vy) * 0.7]
        if (b.y > h - b.r) [b.y, b.vy] = [h - b.r, -Math.abs(b.vy) * 0.7]
      })
      // Soft collisions: overlapping orbs push each other apart.
      for (let i = 0; i < bs.length; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i]
          const b = bs[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.hypot(dx, dy) || 1
          const overlap = a.r * 0.8 + b.r * 0.8 - dist
          if (overlap > 0) {
            const nx = (dx / dist) * overlap * 0.05
            const ny = (dy / dist) * overlap * 0.05
            a.vx -= nx
            a.vy -= ny
            b.vx += nx
            b.vy += ny
          }
        }
      }
      bs.forEach((b, i) => {
        const n = nodes.current[i]
        if (n) n.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px)`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [orbs])

  function local(e: PointerEvent) {
    const r = box.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }

  return (
    <div ref={box} className="relative h-80 w-full touch-none select-none">
      {orbs.map((o, i) => (
        <button
          key={i}
          ref={(n) => {
            nodes.current[i] = n
          }}
          type="button"
          disabled={disabled}
          aria-label="Open a sealed dream"
          className="absolute left-0 top-0 cursor-grab rounded-pill active:cursor-grabbing"
          style={{ width: o.size, height: o.size }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            const [x, y] = local(e)
            const b = bodies.current[i]
            drag.current = { i, ox: x - b.x, oy: y - b.y, lx: x, ly: y, lt: performance.now(), moved: 0 }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d || d.i !== i) return
            const [x, y] = local(e)
            const b = bodies.current[i]
            const now = performance.now()
            const dt = Math.max(now - d.lt, 1) / 16 // in frames
            b.vx = (x - d.lx) / dt
            b.vy = (y - d.ly) / dt
            b.x = x - d.ox
            b.y = y - d.oy
            d.moved += Math.hypot(x - d.lx, y - d.ly)
            d.lx = x
            d.ly = y
            d.lt = now
          }}
          onPointerUp={() => {
            const d = drag.current
            drag.current = null
            if (d && d.moved < TAP_SLOP) onPick() // a tap opens; a drag flings
          }}
          // Keyboard activation (detail 0); pointer taps are handled in onPointerUp.
          onClick={(e) => {
            if (e.detail === 0) onPick()
          }}
        >
          <DreamOrb emotion={o.emotion} blend="neutral" size={o.size} seed={i * 97} className="pointer-events-none opacity-85" />
        </button>
      ))}
    </div>
  )
}
