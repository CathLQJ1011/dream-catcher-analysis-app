import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Lock, Share, Sparkle } from 'lucide-react'
import { AppShell, IconButton, PageHeader } from '@/components/app/AppShell'
import { ShareSheet } from '@/components/app/ShareSheet'
import { PillScroller, Segmented } from '@/components/app/Segmented'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { DreamRow } from '@/components/dream/DreamRow'
import { fromPattern, type JournalDream } from '@/data/journal'
import type { SampleDream } from '@/data/sampleDreams'
import { api, type ColorRow, type Lens, type PatternDream, type PatternFrame, type Period } from '@/lib/api'
import { DreamPreview, Tooltip } from '@/components/ui/tooltip'
import { daysBetween, formatShortDate } from '@/lib/dates'
import { navigate } from '@/lib/router'
import { cn } from '@/lib/utils'

// Patterns (docs/screens.md §4). Every lens renders through <LensLayout>, which
// fixes the six slots of design-spec §7.2 so switching lenses never moves things.
// The server works out each lens (GET /patterns/{lens}); this page only draws it.

const LENSES: { value: Lens; label: string }[] = [
  { value: 'emotion', label: 'Emotion' },
  { value: 'symbols', label: 'Symbols' },
  { value: 'rhythms', label: 'Rhythms' },
  { value: 'colors', label: 'Colors' },
  { value: 'people', label: 'People' },
]

export default function Patterns() {
  const [lens, setLens] = useState<Lens>('emotion')
  const [period, setPeriod] = useState<Period>('30d')

  const [shareOpen, setShareOpen] = useState(false)
  const [frame, setFrame] = useState<PatternFrame | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .pattern(lens, period)
      .then((f) => {
        setFrame(f)
        setError('')
      })
      .catch((e: Error) => setError(e.message))
  }, [lens, period])

  // Until the new lens arrives, the old one isn't shown under the new name.
  const current = frame?.lens === lens && frame.period === period ? frame : null
  const lensLabel = LENSES.find((l) => l.value === lens)!.label
  const periodLabel = { '7d': 'Last 7 days', '30d': 'Last 30 days', year: 'This year' }[period]

  return (
    <AppShell>
      <PageHeader
        title="Patterns"
        actions={
          <IconButton label="Share this pattern" onClick={() => setShareOpen(true)}>
            <Share className="size-5" strokeWidth={1.5} />
          </IconButton>
        }
      />

      <div className="mt-6 flex flex-col gap-4">
        <PillScroller label="Analysis lens" value={lens} onChange={setLens} options={LENSES} />
        <div className="flex items-center justify-between">
          <Segmented
            label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7d', label: '7D' },
              { value: '30d', label: '30D' },
              { value: 'year', label: 'Year' },
            ]}
          />
          {current && (
            <span className="font-mono text-meta uppercase text-fg-muted">
              {current.dream_count} {current.dream_count === 1 ? 'dream' : 'dreams'}
            </span>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-12 font-serif text-dream italic text-fg-secondary">{error}</p>
      ) : !current ? null : current.dream_count < 3 ? (
        <p className="mt-12 font-serif text-dream italic text-fg-secondary">
          Not enough dreams in this period yet. Try a longer one.
        </p>
      ) : (
        <LensView frame={current} />
      )}

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this pattern"
        text={`My dream patterns · ${lensLabel} · ${periodLabel}`}
        preview={
          // The same lens, compact: hero and stats only, not interactive
          <div className="pointer-events-none flex flex-col gap-2 p-6">
            <span className="font-mono text-meta uppercase text-fg-muted">
              {lensLabel} · {periodLabel}
            </span>
            <Compact.Provider value={true}>{current && current.dream_count >= 3 && <LensView frame={current} />}</Compact.Provider>
            <span className="mt-4 font-mono text-meta uppercase text-fg-muted">Dream Catcher</span>
          </div>
        }
      />
    </AppShell>
  )
}

function LensView({ frame }: { frame: PatternFrame }) {
  if (frame.lens === 'emotion') return <EmotionLens frame={frame} />
  if (frame.lens === 'symbols') return <SymbolsLens frame={frame} />
  if (frame.lens === 'rhythms') return <RhythmsLens frame={frame} />
  if (frame.lens === 'colors') return <ColorsLens frame={frame} />
  return <PeopleLens frame={frame} />
}

// Inside a share card, lenses render only their hero and stats.
const Compact = createContext(false)

/* ---------- The fixed template ---------- */

function LensLayout({ frame, hero, reading = frame.reading }: { frame: PatternFrame; hero: ReactNode; reading?: string }) {
  const compact = useContext(Compact)
  const { stats, based_on: basedOn, list_title: listTitle } = frame
  const list =
    frame.lens === 'colors' ? <ColorRows rows={frame.list as ColorRow[]} /> : <Rows dreams={(frame.list as PatternDream[]).map(fromPattern)} />
  return (
    <div key={listTitle} className="animate-enter">
      {/* 3 · Hero: fixed height, drawn on the background */}
      <div className="mt-6 h-56">{hero}</div>

      {/* 4 · Three equal stats, divided by hairlines rather than boxed */}
      <div className="mt-12 grid grid-cols-3 divide-x divide-hairline border-y border-hairline">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 px-4 py-4 first:pl-0">
            {/* Words drop a size so "stranger" fits where "4.5" does */}
            <span className={cn('truncate font-serif', s.value.length > 5 ? 'text-dream leading-[2.3rem]' : 'text-title')}>
              {s.value}
            </span>
            <span className="font-mono text-meta uppercase text-fg-muted">{s.label}</span>
          </div>
        ))}
      </div>

      {!compact && (
        <>
          {/* 5 · Reading */}
          <section className="mt-12 flex flex-col gap-2">
            <h2 className="flex items-center gap-2 font-mono text-meta uppercase text-fg-muted">
              <Sparkle className="size-3 text-accent-soft" strokeWidth={1.5} />
              Reading
            </h2>
            <p className="font-serif text-dream text-fg">
              <Emphasized text={reading} />
            </p>
            <span className="font-mono text-meta uppercase text-fg-muted">
              Based on {basedOn} {basedOn === 1 ? 'dream' : 'dreams'}
            </span>
          </section>

          {/* 6 · Detail list */}
          <section className="mt-12 flex flex-col gap-2">
            <h2 className="font-mono text-meta uppercase text-fg-muted">{listTitle}</h2>
            {list}
          </section>
        </>
      )}
    </div>
  )
}

type LensProps = { frame: PatternFrame }

/* ---------- Emotion ---------- */

function EmotionLens({ frame }: LensProps) {
  const [view, setView] = useState<'timeline' | 'map'>('timeline')
  const compact = useContext(Compact)
  const points = (frame.hero.points ?? []).map(fromPattern)
  const trend = frame.hero.trend ?? []
  const chart =
    points.length === 0 ? (
      <p className="font-serif text-body italic text-fg-secondary">No feelings placed on the map in this period.</p>
    ) : view === 'timeline' ? (
      <ValenceChart dreams={points} trend={trend} />
    ) : (
      <EmotionMap dreams={points} />
    )

  return (
    <LensLayout
      frame={frame}
      reading={view === 'map' ? frame.hero.map_reading : frame.reading}
      hero={
        // The view switch lives inside the hero slot, so the lens template is unchanged
        compact ? (
          <div className="relative h-full">{chart}</div>
        ) : (
          <div className="flex h-full flex-col gap-2">
            <div className="flex justify-end">
              <Segmented
                size="sm"
                label="Emotion view"
                value={view}
                onChange={setView}
                options={[
                  { value: 'timeline', label: 'Timeline' },
                  { value: 'map', label: 'Map' },
                ]}
              />
            </div>
            <div className="relative flex-1">{chart}</div>
          </div>
        )
      }
    />
  )
}

function ValenceChart({ dreams, trend: averages }: { dreams: JournalDream[]; trend: { date: string; valence: number }[] }) {
  const first = dreams[0].date
  const span = Math.max(daysBetween(first, dreams[dreams.length - 1].date), 1)
  // x starts at 16% so the Light/Dark labels never sit under a point.
  const xOf = (iso: string) => 16 + (daysBetween(first, iso) / span) * 80
  const yOf = (valence: number) => 50 - valence * 20 // −2..+2 → 90%..10%
  const points = dreams.map((d) => ({ d, x: xOf(d.date), y: yOf(d.valence) }))

  // Trend line: the server's 3-dream moving average, smoothed through segment midpoints.
  const trend = averages.map((t) => ({ x: xOf(t.date), y: yOf(t.valence) }))
  const path = trend
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`
      const prev = trend[i - 1]
      return `Q${prev.x},${prev.y} ${(prev.x + p.x) / 2},${(prev.y + p.y) / 2}`
    })
    .join(' ')
    .concat(` T${trend[trend.length - 1].x},${trend[trend.length - 1].y}`)

  return (
    <div className="relative h-full">
      <span className="absolute left-0 top-0 font-mono text-meta uppercase text-fg-muted">Light</span>
      <span className="absolute bottom-0 left-0 font-mono text-meta uppercase text-fg-muted">Dark</span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        <line
          x1="0"
          x2="100"
          y1="50"
          y2="50"
          className="stroke-hairline"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
        <path d={path} fill="none" className="stroke-accent-soft/70" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      {points.map(({ d, x, y }) => (
        <ChartPoint key={d.id} dream={d} x={x} y={y} size={8 + d.intensity * 3} />
      ))}
    </div>
  )
}

// Valence (dark → light) across, intensity (quiet → intense) up: the same map
// Capture will use as an input (design-spec §8 "Emotion map").
function EmotionMap({ dreams }: { dreams: JournalDream[] }) {
  return (
    <div className="absolute inset-0">
      {/* Axis lines stop short of the labels instead of running under them */}
      <div className="absolute inset-x-14 top-1/2 border-t border-hairline" />
      <div className="absolute inset-y-6 left-1/2 border-l border-hairline" />
      <span className="absolute left-1/2 top-0 -translate-x-1/2 font-mono text-meta uppercase text-fg-muted">
        Intense
      </span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 font-mono text-meta uppercase text-fg-muted">
        Quiet
      </span>
      <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-meta uppercase text-fg-muted">
        Dark
      </span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-meta uppercase text-fg-muted">
        Light
      </span>
      {dreams.map((d) => {
        // Small fixed nudge per dream so equal scores don't stack exactly
        const jx = ((d.number * 37) % 9) - 4
        const jy = ((d.number * 53) % 9) - 4
        return (
          <ChartPoint
            key={d.id}
            dream={d}
            x={50 + d.valence * 15 + jx} // −2..+2 → 20%..80%, clear of the side labels
            y={50 - (d.intensity - 3) * 16 + jy} // 1..5 → 82%..18%
            size={12 + d.vividness * 16}
          />
        )
      })}
    </div>
  )
}

// An orb placed on a chart, with a 24px+ hit area and a dream preview on hover/focus.
function ChartPoint({ dream: d, x, y, size }: { dream: JournalDream; x: number; y: number; size: number }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 hover:z-20 focus-within:z-20"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <Tooltip
        align={x < 30 ? 'start' : x > 70 ? 'end' : 'center'}
        content={<DreamPreview symbol={d.symbol} title={d.title} date={formatShortDate(d.date)} />}
      >
        <button
          type="button"
          aria-label={d.title}
          onClick={() => navigate(`/dream/${d.id}`)}
          className="flex min-h-6 min-w-6 items-center justify-center rounded-pill"
        >
          <DreamOrb emotion={d.emotion} blend={d.blend} size={size} glow={false} state="still" />
        </button>
      </Tooltip>
    </div>
  )
}

/* ---------- Symbols ---------- */

function SymbolsLens({ frame }: LensProps) {
  return <LensLayout frame={frame} hero={<BarList items={frame.hero.top ?? []} />} />
}

/* ---------- Rhythms ---------- */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function RhythmsLens({ frame }: LensProps) {
  const byDay = frame.hero.weekdays ?? [0, 0, 0, 0, 0, 0, 0]
  const max = Math.max(...byDay, 1)
  const busiest = frame.hero.busiest ?? 0

  return (
    <LensLayout
      frame={frame}
      hero={
        <div className="flex h-full items-end gap-2">
          {byDay.map((count, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="flex w-full flex-1 items-end justify-center">
                {/* Bars are light rising from the floor: brightest at the top, fading to nothing */}
                <div
                  className="w-1/2 rounded-pill"
                  style={{
                    height: `${Math.max((count / max) * 100, 4)}%`,
                    background:
                      i === busiest
                        ? 'linear-gradient(to top, rgb(var(--accent) / 0.05), rgb(var(--accent-soft) / 0.75))'
                        : 'linear-gradient(to top, rgb(var(--accent-soft) / 0.02), rgb(var(--accent-soft) / 0.25))',
                    boxShadow: i === busiest ? '0 -12px 28px -8px rgb(var(--accent) / 0.6)' : undefined,
                  }}
                />
              </div>
              <span className="font-mono text-meta uppercase text-fg-muted">{WEEKDAYS[i][0]}</span>
            </div>
          ))}
        </div>
      }
    />
  )
}

/* ---------- Colors ---------- */

function ColorsLens({ frame }: LensProps) {
  const stripes = frame.hero.stripes ?? []

  return (
    <LensLayout
      frame={frame}
      hero={
        // One stripe per dream, its colors blending into each other in proportion
        stripes.length === 0 ? (
          <p className="font-serif text-body italic text-fg-secondary">No colors tagged in this period.</p>
        ) : (
          <div className="flex h-full gap-1">
            {stripes.map(({ dream, colors }, i) => {
              const d = fromPattern(dream)
              return (
                <Tooltip
                  key={d.id}
                  className="h-full flex-1"
                  align={i < stripes.length / 4 ? 'start' : i > (stripes.length * 3) / 4 ? 'end' : 'center'}
                  content={<DreamPreview symbol={d.symbol} title={d.title} date={formatShortDate(d.date)} />}
                >
                  <button
                    type="button"
                    aria-label={d.title}
                    onClick={() => navigate(`/dream/${d.id}`)}
                    className="relative w-full overflow-hidden rounded-pill opacity-85 transition hover:opacity-100"
                    style={{ background: blendStripe(colors), maskImage: STRIPE_FADE, WebkitMaskImage: STRIPE_FADE }}
                  >
                    <span className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay" />
                  </button>
                </Tooltip>
              )
            })}
          </div>
        )
      }
    />
  )
}

function ColorRows({ rows }: { rows: ColorRow[] }) {
  if (rows.length === 0) return <p className="py-4 font-serif text-dream italic text-fg-secondary">None yet.</p>
  return (
    <ul>
      {rows.map((c) => (
        <li key={c.name} className="flex items-center gap-4 border-b border-hairline py-4 last:border-b-0">
          <span className="size-6 shrink-0 rounded-pill border border-hairline" style={{ background: c.hex }} />
          <span className="flex-1 text-body">{c.name}</span>
          <span className="font-mono text-meta uppercase text-fg-muted">
            {c.hex} · {c.dreams} {c.dreams === 1 ? 'dream' : 'dreams'}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Stripes soften at both ends so they read as light, not as solid blocks.
const STRIPE_FADE = 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'

// Each color holds its middle half solid and blends into its neighbor at the edges.
function blendStripe(colors: SampleDream['colors']) {
  const total = colors.reduce((s, c) => s + c.pct, 0)
  let start = 0
  const stops = colors.flatMap((c) => {
    const len = (c.pct / total) * 100
    const from = start + len * 0.25
    const to = start + len * 0.75
    start += len
    return [`${c.hex} ${from.toFixed(1)}%`, `${c.hex} ${to.toFixed(1)}%`]
  })
  return `linear-gradient(to bottom, ${stops.join(', ')})`
}

/* ---------- People (shows the locked state) ---------- */

function PeopleLens({ frame }: LensProps) {
  const { have = 0, need = 10, top = [] } = frame.hero
  return (
    <LensLayout
      frame={frame}
      hero={
        !frame.locked ? (
          <BarList items={top} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-card border border-dashed border-hairline">
            <Lock className="size-5 text-fg-muted" strokeWidth={1.5} />
            <p className="px-6 text-center text-label font-normal text-fg-secondary">
              The people map unlocks after {need} dreams with people in them.
            </p>
            <span className="font-mono text-meta uppercase text-fg-muted">
              {have} / {need} so far
            </span>
          </div>
        )
      }
    />
  )
}

/* ---------- Helpers ---------- */

// Horizontal count bars, shared by lenses whose hero is "top N of something".
function BarList({ items }: { items: { name: string; count: number }[] }) {
  const max = items[0]?.count ?? 1
  if (items.length === 0) return <p className="font-serif text-body italic text-fg-secondary">Nothing tagged in this period.</p>
  return (
    <ul className="flex h-full flex-col justify-between">
      {items.map(({ name, count: n }) => (
        <li key={name} className="flex items-center gap-4">
          <span className="w-24 truncate font-serif text-dream" lang={isHan(name) ? 'zh-Hans' : undefined}>
            {name}
          </span>
          <span className="h-1 flex-1 rounded-pill bg-hairline">
            <span
              className="block h-full rounded-pill"
              style={{
                width: `${(n / max) * 100}%`,
                background: 'linear-gradient(to right, rgb(var(--accent) / 0.1), rgb(var(--accent-soft) / 0.75))',
              }}
            />
          </span>
          <span className="w-6 text-right font-mono text-meta text-fg-muted">{n}</span>
        </li>
      ))}
    </ul>
  )
}

function Rows({ dreams }: { dreams: JournalDream[] }) {
  if (dreams.length === 0) return <p className="py-4 font-serif text-dream italic text-fg-secondary">None yet.</p>
  return (
    <ul>
      {dreams.map((d) => (
        <DreamRow key={d.id} dream={d} />
      ))}
    </ul>
  )
}

// Readings mark italic words with *asterisks*.
function Emphasized({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/).map((part, i) =>
        part.startsWith('*') && part.endsWith('*') ? (
          <em key={i} className="text-fg-secondary">
            {part.slice(1, -1)}
          </em>
        ) : (
          part
        ),
      )}
    </>
  )
}

function isHan(s: string) {
  return /\p{Script=Han}/u.test(s)
}
