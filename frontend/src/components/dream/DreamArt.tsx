import { useId, type ReactNode } from 'react'
import type { SampleDream } from '@/data/sampleDreams'
import { cn } from '@/lib/utils'

// The dream's representative image (design-spec §5.1). It draws the dream's key
// symbol (water becomes waves, a moon becomes a crescent, a house a glowing
// window) as soft silhouettes lit in the colors of the dream's emotion. The dream
// number seeds small variations, so the same dream always gives the same image.

type DreamArtProps = {
  dream: Pick<SampleDream, 'number' | 'symbol' | 'symbols' | 'emotion' | 'blend'>
  className?: string
}

// Motifs are drawn in a 400 × 500 box (4:5).
const W = 400
const H = 500

type Paint = { core: string; edge: string; blend: string; glow: string; rand: () => number }

export function DreamArt({ dream, className }: DreamArtProps) {
  const id = useId().replace(/:/g, '')
  const rand = seeded(dream.number)
  const motif = pickMotif([dream.symbol, ...dream.symbols])
  const p: Paint = {
    core: `rgb(var(--emo-${dream.emotion}-core))`,
    edge: `rgb(var(--emo-${dream.emotion}-edge))`,
    blend: `rgb(var(--emo-${dream.blend ?? dream.emotion}-edge))`,
    glow: `url(#${id}-glow)`,
    rand,
  }

  return (
    <div className={cn('relative aspect-[4/5] overflow-hidden rounded-image bg-bg', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
        <defs>
          {/* Sky: the emotion as light, brightest near the horizon */}
          <radialGradient id={`${id}-sky`} cx="50%" cy="62%" r="75%">
            <stop offset="0%" stopColor={p.edge} stopOpacity="0.55" />
            <stop offset="45%" stopColor={p.blend} stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(var(--bg))" stopOpacity="1" />
          </radialGradient>
          {/* Fill for the motif: light core fading into the emotion's edge color */}
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.core} stopOpacity="0.95" />
            <stop offset="100%" stopColor={p.edge} stopOpacity="0.55" />
          </linearGradient>
          {/* Ground and deep water: a dim edge of the emotion's color fading into night */}
          <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.edge} stopOpacity="0.3" />
            <stop offset="35%" stopColor={p.edge} stopOpacity="0.12" />
            <stop offset="100%" stopColor="rgb(var(--bg))" stopOpacity="0.95" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id={`${id}-soft`}>
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}-sky)`} />
        <g filter={`url(#${id}-soft)`}>{MOTIFS[motif]({ ...p, fill: `url(#${id}-fill)`, dark: `url(#${id}-dark)` })}</g>
      </svg>
      <div className="absolute inset-0 bg-grain opacity-30 mix-blend-overlay" />
    </div>
  )
}

/* ---------- Which motif a dream gets ---------- */

type Motif = keyof typeof MOTIFS

const CUES: [RegExp, Motif][] = [
  [/雪|snow/i, 'snow'],
  [/鲸|鱼|whale|fish/i, 'whale'],
  [/灯笼|lantern/i, 'lanterns'],
  [/牙|teeth|tooth|bead/i, 'beads'],
  [/飞|fly|flying|bird|鸟/i, 'birds'],
  [/门|door/i, 'door'],
  [/stairs|楼梯|escalator|chase|追逐|mall/i, 'stairs'],
  [/train|火车|ferry|渡船|bus|journey/i, 'rails'],
  [/屋|房|house|home|courtyard|room|library|tower|greenhouse/i, 'house'],
  [/镜|mirror|faces|无脸/i, 'mirror'],
  [/考试|exam|clock|school/i, 'clock'],
  [/猫|cat/i, 'cat'],
  [/月|moon|night/i, 'moon'],
  [/水|海|雨|sea|water|tide|rain|river|lake|ocean|wave|phone/i, 'waves'],
]

function pickMotif(symbols: string[]): Motif {
  for (const s of symbols) for (const [re, m] of CUES) if (re.test(s)) return m
  return 'light'
}

/* ---------- Motifs ---------- */

type Ink = Paint & { fill: string; dark: string }

// A glowing copy behind each shape gives the soft-light look.
function Glow({ glow, children }: { glow: string; children: ReactNode }) {
  return (
    <>
      <g filter={glow} opacity="0.8">
        {children}
      </g>
      {children}
    </>
  )
}

function wavePath(y: number, amp: number, freq: number, phase: number) {
  let d = `M0 ${H}`
  for (let x = 0; x <= W; x += 8) d += ` L${x} ${y + Math.sin(x * freq + phase) * amp}`
  return `${d} L${W} ${H} Z`
}

function horizon(p: Ink, y = 380) {
  return <rect x="0" y={y} width={W} height={H - y} fill={p.dark} />
}

const MOTIFS = {
  waves: (p: Ink) => {
    const phase = p.rand() * 6
    return (
      <>
        <circle cx={120 + p.rand() * 160} cy="150" r="42" fill={p.core} opacity="0.5" filter={p.glow} />
        {[0, 1, 2, 3].map((i) => (
          <Glow key={i} glow={p.glow}>
            <path
              d={wavePath(290 + i * 48, 16 - i * 2, 0.022 + i * 0.006, phase + i * 1.7)}
              fill={i === 0 ? p.fill : p.dark}
              opacity={0.85 - i * 0.12}
            />
          </Glow>
        ))}
      </>
    )
  },

  moon: (p: Ink) => {
    const cx = 150 + p.rand() * 120
    return (
      <>
        {Array.from({ length: 28 }, (_, i) => (
          <circle key={i} cx={p.rand() * W} cy={p.rand() * 300} r={0.8 + p.rand() * 1.6} fill={p.core} opacity={0.3 + p.rand() * 0.6} />
        ))}
        <Glow glow={p.glow}>
          <path d={`M${cx} 110 a70 70 0 1 0 60 115 a56 56 0 1 1 -60 -115 Z`} fill={p.fill} />
        </Glow>
        {horizon(p, 400)}
        <rect x={cx - 10} y="410" width="70" height="3" rx="1.5" fill={p.core} opacity="0.4" />
        <rect x={cx} y="428" width="44" height="3" rx="1.5" fill={p.core} opacity="0.25" />
      </>
    )
  },

  house: (p: Ink) => (
    <>
      <circle cx="300" cy="120" r="30" fill={p.core} opacity="0.35" filter={p.glow} />
      {horizon(p)}
      <path d="M110 380 V270 L200 200 L290 270 V380 Z" fill={p.dark} stroke={p.core} strokeOpacity="0.35" strokeWidth="1.5" />
      <Glow glow={p.glow}>
        <rect x="172" y="285" width="56" height="52" rx="4" fill={p.fill} />
      </Glow>
      <rect x="198" y="285" width="2" height="52" fill="rgb(var(--bg))" opacity="0.6" />
      <path d="M172 380 L228 380 L280 470 L120 470 Z" fill={p.core} opacity="0.12" />
    </>
  ),

  door: (p: Ink) => (
    <>
      {horizon(p, 400)}
      <path d="M200 400 L150 400 L40 500 L360 500 L250 400 Z" fill={p.core} opacity="0.18" />
      <Glow glow={p.glow}>
        <path d="M150 400 V220 A50 50 0 0 1 250 220 V400 Z" fill={p.fill} />
      </Glow>
      <path d="M150 400 V220 A50 50 0 0 1 250 220 V400" fill="none" stroke={p.core} strokeOpacity="0.6" strokeWidth="2" />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={160 + p.rand() * 80} y={150 + p.rand() * 70} width="1.2" height={10 + p.rand() * 14} fill={p.core} opacity="0.35" />
      ))}
    </>
  ),

  stairs: (p: Ink) => (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <Glow key={i} glow={p.glow}>
          <rect x={60 + i * 32} y={430 - i * 36} width={W} height="10" rx="3" fill={i % 2 ? p.dark : p.fill} opacity={0.4 + i * 0.07} />
        </Glow>
      ))}
      <circle cx="340" cy="90" r="36" fill={p.core} opacity="0.4" filter={p.glow} />
    </>
  ),

  lanterns: (p: Ink) => {
    const xs = [60, 130, 205, 275, 345]
    return (
      <>
        <path d="M0 110 Q200 190 400 120" fill="none" stroke={p.core} strokeOpacity="0.3" strokeWidth="1.5" />
        {xs.map((x, i) => {
          const y = 150 + Math.sin(i * 1.3) * 18 + 30 + p.rand() * 40
          const s = 0.8 + p.rand() * 0.5
          return (
            <g key={i}>
              <line x1={x} y1={130 + Math.sin(i) * 6} x2={x} y2={y - 26 * s} stroke={p.core} strokeOpacity="0.3" />
              <Glow glow={p.glow}>
                <rect x={x - 18 * s} y={y - 26 * s} width={36 * s} height={52 * s} rx={16 * s} fill={p.fill} />
              </Glow>
            </g>
          )
        })}
        {horizon(p, 420)}
        {xs.map((x, i) => (
          <rect key={i} x={x - 10} y={440 + (i % 2) * 12} width="20" height="3" rx="1.5" fill={p.core} opacity="0.25" />
        ))}
      </>
    )
  },

  birds: (p: Ink) => (
    <>
      <Glow glow={p.glow}>
        <path d={wavePath(400, 4, 0.01, p.rand() * 6)} fill={p.fill} opacity="0.5" />
      </Glow>
      {Array.from({ length: 7 }, (_, i) => {
        const x = 60 + p.rand() * 280
        const y = 110 + p.rand() * 210
        const s = 0.6 + p.rand() * 1.1
        return (
          <path
            key={i}
            d={`M${x - 22 * s} ${y} Q${x - 10 * s} ${y - 14 * s} ${x} ${y} Q${x + 10 * s} ${y - 14 * s} ${x + 22 * s} ${y}`}
            fill="none"
            stroke={p.core}
            strokeWidth={2.2}
            strokeLinecap="round"
            opacity={0.5 + p.rand() * 0.5}
          />
        )
      })}
    </>
  ),

  rails: (p: Ink) => (
    <>
      {horizon(p, 260)}
      <circle cx="200" cy="255" r="22" fill={p.core} opacity="0.7" filter={p.glow} />
      <Glow glow={p.glow}>
        <path d="M196 262 L60 500 M204 262 L340 500" stroke={p.fill} strokeWidth="3" fill="none" />
      </Glow>
      {Array.from({ length: 10 }, (_, i) => {
        const t = (i + 1) / 10
        const y = 262 + t * t * 238
        const half = 4 + t * t * 140
        return <rect key={i} x={200 - half} y={y} width={half * 2} height={1 + t * 4} fill={p.core} opacity={0.15 + t * 0.3} />
      })}
    </>
  ),

  whale: (p: Ink) => (
    <>
      <path d={wavePath(170, 6, 0.03, p.rand() * 6)} fill={p.dark} opacity="0.9" />
      <Glow glow={p.glow}>
        <path
          d="M70 330 C110 270 230 260 300 300 C320 280 345 262 372 258 C360 282 352 300 352 318 C352 336 362 352 376 372 C344 366 320 352 302 336 C240 380 120 382 70 330 Z"
          fill={p.fill}
          opacity="0.85"
        />
      </Glow>
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i} cx={90 + p.rand() * 80} cy={200 + p.rand() * 110} r={1.5 + p.rand() * 4} fill="none" stroke={p.core} strokeOpacity="0.5" />
      ))}
    </>
  ),

  snow: (p: Ink) => (
    <>
      {Array.from({ length: 70 }, (_, i) => (
        <circle key={i} cx={p.rand() * W} cy={p.rand() * 400} r={1 + p.rand() * 3} fill={p.core} opacity={0.25 + p.rand() * 0.7} />
      ))}
      <Glow glow={p.glow}>
        <path d={wavePath(410, 3, 0.015, 1)} fill={p.fill} opacity="0.45" />
      </Glow>
    </>
  ),

  beads: (p: Ink) => (
    <>
      {Array.from({ length: 16 }, (_, i) => {
        const r = 6 + p.rand() * 12
        const cx = 60 + p.rand() * 280
        const cy = 80 + p.rand() * 360
        return (
          <g key={i}>
            <Glow glow={p.glow}>
              <circle cx={cx} cy={cy} r={r} fill={p.fill} opacity={0.5 + p.rand() * 0.4} />
            </Glow>
            <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.25} fill="rgb(var(--text-primary))" opacity="0.6" />
          </g>
        )
      })}
    </>
  ),

  mirror: (p: Ink) => (
    <>
      <Glow glow={p.glow}>
        <ellipse cx="200" cy="230" rx="96" ry="140" fill={p.dark} stroke={p.fill} strokeWidth="6" />
      </Glow>
      <ellipse cx="200" cy="230" rx="80" ry="122" fill={p.core} opacity="0.1" />
      <ellipse cx="200" cy="200" rx="34" ry="44" fill={p.core} opacity="0.25" filter={p.glow} />
      <path d="M150 140 L175 120 M140 175 L190 128" stroke={p.core} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      {horizon(p, 430)}
    </>
  ),

  clock: (p: Ink) => {
    const a = p.rand() * Math.PI * 2
    return (
      <>
        <Glow glow={p.glow}>
          <circle cx="200" cy="230" r="110" fill="none" stroke={p.fill} strokeWidth="5" />
        </Glow>
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i / 12) * Math.PI * 2
          return <circle key={i} cx={200 + Math.cos(t) * 92} cy={230 + Math.sin(t) * 92} r="3" fill={p.core} opacity="0.7" />
        })}
        <line x1="200" y1="230" x2={200 + Math.cos(a) * 70} y2={230 + Math.sin(a) * 70} stroke={p.core} strokeWidth="4" strokeLinecap="round" />
        <line x1="200" y1="230" x2={200 + Math.cos(a * 3) * 50} y2={230 + Math.sin(a * 3) * 50} stroke={p.core} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
        {horizon(p, 420)}
      </>
    )
  },

  cat: (p: Ink) => (
    <>
      <circle cx="290" cy="140" r="40" fill={p.core} opacity="0.4" filter={p.glow} />
      {horizon(p, 400)}
      <Glow glow={p.glow}>
        <path
          d="M170 400 C150 360 150 300 172 270 L166 228 L188 252 C196 249 208 249 216 252 L238 228 L232 270 C254 300 256 360 236 400 Z"
          fill={p.fill}
        />
      </Glow>
      <path d="M236 396 C276 396 290 372 276 352" fill="none" stroke={p.core} strokeWidth="6" strokeLinecap="round" opacity="0.8" />
    </>
  ),

  // Fallback when no symbol has a motif yet: soft rays of the dream's light.
  light: (p: Ink) => (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <Glow key={i} glow={p.glow}>
          <path d={`M200 520 L${-40 + i * 80} -20 L${-10 + i * 80} -20 Z`} fill={p.fill} opacity={0.12 + p.rand() * 0.15} />
        </Glow>
      ))}
      <circle cx="200" cy="420" r="60" fill={p.core} opacity="0.5" filter={p.glow} />
    </>
  ),
}

// Small deterministic random generator (mulberry32).
function seeded(seed: number) {
  let a = seed * 2654435761
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
