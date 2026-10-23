import { createContext, useContext, useState, type ReactNode } from 'react'
import { Lock, Share, Sparkle } from 'lucide-react'
import { AppShell, IconButton, PageHeader } from '@/components/app/AppShell'
import { ShareSheet } from '@/components/app/ShareSheet'
import { PillScroller, Segmented } from '@/components/app/Segmented'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { DreamRow } from '@/components/dream/DreamRow'
import { PROTOTYPE_TODAY, SAMPLE_DREAMS, type SampleDream } from '@/data/sampleDreams'
import { EMOTIONS, type Emotion } from '@/lib/emotions'
import { DreamPreview, Tooltip } from '@/components/ui/tooltip'
import { daysBetween, formatShortDate, parseDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

// Patterns (docs/screens.md §4). Every lens renders through <LensLayout>, which
// fixes the six slots of design-spec §7.2 so switching lenses never moves things.

type Lens = 'emotion' | 'symbols' | 'rhythms' | 'colors' | 'people'
type Period = '7d' | '30d' | 'year'

const LENSES: { value: Lens; label: string }[] = [
  { value: 'emotion', label: 'Emotion' },
  { value: 'symbols', label: 'Symbols' },
  { value: 'rhythms', label: 'Rhythms' },
  { value: 'colors', label: 'Colors' },
  { value: 'people', label: 'People' },
]

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, year: 365 }

export default function Patterns() {
  const [lens, setLens] = useState<Lens>('emotion')
  const [period, setPeriod] = useState<Period>('30d')

  const [shareOpen, setShareOpen] = useState(false)

  const dreams = SAMPLE_DREAMS.filter((d) => daysBetween(d.date, PROTOTYPE_TODAY) < PERIOD_DAYS[period])
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
          <span className="font-mono text-meta uppercase text-fg-muted">{dreams.length} dreams</span>
        </div>
      </div>

      {dreams.length < 3 ? (
        <p className="mt-12 font-serif text-dream italic text-fg-secondary">
          Not enough dreams in this period yet. Try a longer one.
        </p>
      ) : (
        <LensView lens={lens} dreams={dreams} />
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
            <Compact.Provider value={true}>
              <LensView lens={lens} dreams={dreams} />
            </Compact.Provider>
            <span className="mt-4 font-mono text-meta uppercase text-fg-muted">Dream Catcher</span>
          </div>
        }
      />
    </AppShell>
  )
}

function LensView({ lens, dreams }: { lens: Lens; dreams: SampleDream[] }) {
  if (lens === 'emotion') return <EmotionLens dreams={dreams} />
  if (lens === 'symbols') return <SymbolsLens dreams={dreams} />
  if (lens === 'rhythms') return <RhythmsLens dreams={dreams} />
  if (lens === 'colors') return <ColorsLens dreams={dreams} />
  return <PeopleLens dreams={dreams} />
}

// Inside a share card, lenses render only their hero and stats.
const Compact = createContext(false)

/* ---------- The fixed template ---------- */

type Stat = { value: string; label: string }

function LensLayout({
  hero,
  stats,
  reading,
  basedOn,
  listTitle,
  list,
}: {
  hero: ReactNode
  stats: [Stat, Stat, Stat]
  reading: ReactNode
  basedOn: number
  listTitle: string
  list: ReactNode
}) {
  const compact = useContext(Compact)
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
            <p className="font-serif text-dream text-fg">{reading}</p>
            <span className="font-mono text-meta uppercase text-fg-muted">Based on {basedOn} dreams</span>
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

type LensProps = { dreams: SampleDream[] }

/* ---------- Emotion ---------- */

function EmotionLens({ dreams }: LensProps) {
  const [view, setView] = useState<'timeline' | 'map'>('timeline')
  const compact = useContext(Compact)
  const sorted = [...dreams].sort((a, b) => a.date.localeCompare(b.date))
  const avg = sorted.reduce((s, d) => s + d.valence, 0) / sorted.length
  const top = mostCommon(sorted.flatMap((d) => [d.emotion, ...(d.blend ? [d.blend] : [])]))
  const half = Math.floor(sorted.length / 2)
  const early = mean(sorted.slice(0, half).map((d) => d.valence))
  const late = mean(sorted.slice(half).map((d) => d.valence))
  const [corner, cornerCount] = tally(sorted.map(quadrant).filter((q) => q !== null))[0] ?? ['', 0]

  return (
    <LensLayout
      hero={
        // The view switch lives inside the hero slot, so the lens template is unchanged
        compact ? (
          <div className="relative h-full">
            {view === 'timeline' ? <ValenceChart dreams={sorted} /> : <EmotionMap dreams={sorted} />}
          </div>
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
            <div className="relative flex-1">
              {view === 'timeline' ? <ValenceChart dreams={sorted} /> : <EmotionMap dreams={sorted} />}
            </div>
          </div>
        )
      }
      stats={[
        { value: signed(avg), label: 'Avg valence' },
        { value: emotionLabel(top), label: 'Most felt' },
        { value: mean(sorted.map((d) => d.intensity)).toFixed(1), label: 'Intensity' },
      ]}
      reading={
        view === 'map' && corner ? (
          <>
            {cornerCount} of {sorted.length} dreams sit in the <em className="text-fg-secondary">{corner}</em>{' '}
            corner of the map. <em className="text-fg-secondary">{emotionLabel(top)}</em> is the feeling that comes
            back most.
          </>
        ) : (
          <>
            {Math.abs(late - early) < 0.3
              ? 'Your dreams have stayed fairly steady across this period. '
              : `You might notice the second half of this period sits ${late > early ? 'lighter' : 'heavier'} than the first (${signed(early)} → ${signed(late)}). `}
            <em className="text-fg-secondary">{emotionLabel(top)}</em> is the feeling that comes back most.
          </>
        )
      }
      basedOn={sorted.length}
      listTitle="Most intense dreams"
      list={<Rows dreams={[...sorted].sort((a, b) => b.intensity - a.intensity).slice(0, 3)} />}
    />
  )
}

function ValenceChart({ dreams }: { dreams: SampleDream[] }) {
  const first = dreams[0].date
  const span = Math.max(daysBetween(first, dreams[dreams.length - 1].date), 1)
  // x starts at 16% so the Light/Dark labels never sit under a point.
  const xOf = (iso: string) => 16 + (daysBetween(first, iso) / span) * 80
  const yOf = (valence: number) => 50 - valence * 20 // −2..+2 → 90%..10%
  const points = dreams.map((d) => ({ d, x: xOf(d.date), y: yOf(d.valence) }))

  // Trend line: 3-dream moving average, smoothed through segment midpoints.
  const trend = dreams.map((d, i) => {
    const win = dreams.slice(Math.max(0, i - 1), i + 2)
    return { x: xOf(d.date), y: yOf(mean(win.map((w) => w.valence))) }
  })
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
        <ChartPoint key={d.number} dream={d} x={x} y={y} size={8 + d.intensity * 3} />
      ))}
    </div>
  )
}

// Valence (dark → light) across, intensity (quiet → intense) up: the same map
// Capture will use as an input (design-spec §8 "Emotion map").
function EmotionMap({ dreams }: { dreams: SampleDream[] }) {
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
            key={d.number}
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

function quadrant(d: SampleDream) {
  if (d.valence === 0 || d.intensity === 3) return null
  return `${d.intensity > 3 ? 'intense' : 'quiet'}, ${d.valence > 0 ? 'light' : 'dark'}`
}

// An orb placed on a chart, with a 24px+ hit area and a dream preview on hover/focus.
function ChartPoint({ dream: d, x, y, size }: { dream: SampleDream; x: number; y: number; size: number }) {
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
          className="flex min-h-6 min-w-6 items-center justify-center rounded-pill"
        >
          <DreamOrb emotion={d.emotion} blend={d.blend} size={size} glow={false} state="still" />
        </button>
      </Tooltip>
    </div>
  )
}

/* ---------- Symbols ---------- */

function SymbolsLens({ dreams }: LensProps) {
  const counts = tally(dreams.flatMap((d) => d.symbols))
  const top = counts.slice(0, 5)
  const [topSymbol, topCount] = top[0] ?? ['—', 0]
  const withTop = dreams.filter((d) => d.symbols.includes(topSymbol))
  const companion = mostCommon(withTop.map((d) => d.emotion))

  return (
    <LensLayout
      hero={<BarList items={top} />}
      stats={[
        { value: topSymbol, label: 'Top symbol' },
        { value: String(counts.filter(([, n]) => n > 1).length), label: 'Recurring' },
        { value: String(counts.length), label: 'Distinct' },
      ]}
      reading={
        <>
          <span lang={isHan(topSymbol) ? 'zh-Hans' : undefined}>{topSymbol}</span> appears in {topCount} of{' '}
          {dreams.length} dreams, most often when the dream feels{' '}
          <em className="text-fg-secondary">{emotionLabel(companion).toLowerCase()}</em>.
        </>
      }
      basedOn={dreams.length}
      listTitle={`Dreams with ${topSymbol}`}
      list={<Rows dreams={newestFirst(withTop).slice(0, 4)} />}
    />
  )
}

/* ---------- Rhythms ---------- */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function RhythmsLens({ dreams }: LensProps) {
  const byDay = WEEKDAYS.map((_, i) => dreams.filter((d) => (parseDate(d.date).getDay() + 6) % 7 === i))
  const max = Math.max(...byDay.map((d) => d.length), 1)
  const busiest = byDay.reduce((best, d, i) => (d.length > byDay[best].length ? i : best), 0)
  const lucid = dreams.filter((d) => d.lucidity >= 2)
  const span = Math.max(daysBetween(newestFirst(dreams).at(-1)!.date, PROTOTYPE_TODAY), 7)

  return (
    <LensLayout
      hero={
        <div className="flex h-full items-end gap-2">
          {byDay.map((list, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="flex w-full flex-1 items-end justify-center">
                {/* Bars are light rising from the floor: brightest at the top, fading to nothing */}
                <div
                  className="w-1/2 rounded-pill"
                  style={{
                    height: `${Math.max((list.length / max) * 100, 4)}%`,
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
      stats={[
        { value: ((dreams.length / span) * 7).toFixed(1), label: 'Per week' },
        { value: WEEKDAYS[busiest], label: 'Busiest' },
        { value: `${Math.round((lucid.length / dreams.length) * 100)}%`, label: 'Lucid' },
      ]}
      reading={
        <>
          You remember more dreams on <em className="text-fg-secondary">{WEEKDAYS[busiest]}</em> nights, and{' '}
          {lucid.length} of {dreams.length} were lucid. Recall often follows sleep and schedule more than the
          dreams themselves.
        </>
      }
      basedOn={dreams.length}
      listTitle="Lucid dreams"
      list={<Rows dreams={newestFirst(lucid).slice(0, 4)} />}
    />
  )
}

/* ---------- Colors ---------- */

function ColorsLens({ dreams }: LensProps) {
  const sorted = [...dreams].sort((a, b) => a.date.localeCompare(b.date))
  const all = sorted.flatMap((d) => d.colors)
  const total = all.reduce((s, c) => s + c.pct, 0)
  const share = (w: string) => Math.round((all.filter((c) => c.warmth === w).reduce((s, c) => s + c.pct, 0) / total) * 100)
  const named = tally(all.map((c) => c.name))
  const warmest = EMOTIONS.map((e) => e.id)
    .map((id) => {
      const cs = sorted.filter((d) => d.emotion === id).flatMap((d) => d.colors)
      const t = cs.reduce((s, c) => s + c.pct, 0)
      return { id, warm: t ? cs.filter((c) => c.warmth === 'warm').reduce((s, c) => s + c.pct, 0) / t : -1 }
    })
    .sort((a, b) => b.warm - a.warm)[0].id
  const topColors = named.slice(0, 4).map(([name, n]) => ({ ...all.find((c) => c.name === name)!, n }))

  return (
    <LensLayout
      hero={
        // One stripe per dream, its colors blending into each other in proportion
        <div className="flex h-full gap-1">
          {sorted.map((d, i) => (
            <Tooltip
              key={d.number}
              className="h-full flex-1"
              align={i < sorted.length / 4 ? 'start' : i > (sorted.length * 3) / 4 ? 'end' : 'center'}
              content={<DreamPreview symbol={d.symbol} title={d.title} date={formatShortDate(d.date)} />}
            >
              <button
                type="button"
                aria-label={d.title}
                className="relative w-full overflow-hidden rounded-pill opacity-85 transition hover:opacity-100"
                style={{ background: blendStripe(d.colors), maskImage: STRIPE_FADE, WebkitMaskImage: STRIPE_FADE }}
              >
                <span className="absolute inset-0 bg-grain opacity-20 mix-blend-overlay" />
              </button>
            </Tooltip>
          ))}
        </div>
      }
      stats={[
        { value: `${share('cool')}%`, label: 'Cool' },
        { value: `${share('warm')}%`, label: 'Warm' },
        { value: String(new Set(all.map((c) => c.name)).size), label: 'Colors' },
      ]}
      reading={
        <>
          Your dreams run {share('cool') >= share('warm') ? 'cool' : 'warm'}: {Math.max(share('cool'), share('warm'))}%
          of their color is {share('cool') >= share('warm') ? 'blue, grey or green' : 'red, orange or gold'}. Warm
          color is strongest in <em className="text-fg-secondary">{emotionLabel(warmest).toLowerCase()}</em>{' '}
          dreams.
        </>
      }
      basedOn={sorted.length}
      listTitle="Most frequent colors"
      list={
        <ul>
          {topColors.map((c) => (
            <li key={c.name} className="flex items-center gap-4 border-b border-hairline py-4 last:border-b-0">
              <span className="size-6 shrink-0 rounded-pill border border-hairline" style={{ background: c.hex }} />
              <span className="flex-1 text-body">{c.name}</span>
              <span className="font-mono text-meta uppercase text-fg-muted">
                {c.hex} · {c.n} {c.n === 1 ? 'dream' : 'dreams'}
              </span>
            </li>
          ))}
        </ul>
      }
    />
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

const PEOPLE_UNLOCK = 10

function PeopleLens({ dreams }: LensProps) {
  const withPeople = dreams.filter((d) => d.people.length > 0)
  const people = tally(withPeople.flatMap((d) => d.people))

  return (
    <LensLayout
      hero={
        withPeople.length >= PEOPLE_UNLOCK ? (
          <BarList items={people.slice(0, 5)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-card border border-dashed border-hairline">
            <Lock className="size-5 text-fg-muted" strokeWidth={1.5} />
            <p className="px-6 text-center text-label font-normal text-fg-secondary">
              The people map unlocks after {PEOPLE_UNLOCK} dreams with people in them.
            </p>
            <span className="font-mono text-meta uppercase text-fg-muted">
              {withPeople.length} / {PEOPLE_UNLOCK} so far
            </span>
          </div>
        )
      }
      stats={[
        { value: String(withPeople.length), label: 'With people' },
        { value: String(people.length), label: 'Distinct' },
        { value: people[0]?.[0] ?? '—', label: 'Most seen' },
      ]}
      reading={
        <>
          {withPeople.length >= PEOPLE_UNLOCK
            ? `Someone else appears in ${withPeople.length} of ${dreams.length} dreams; ${people[0]?.[0] ?? 'no one'} most often. Most of them are unnamed: dreams often cast strangers.`
            : 'A people map needs more nights to be meaningful. Until then, here are the dreams where someone else appeared.'}
        </>
      }
      basedOn={withPeople.length}
      listTitle="Dreams with people"
      list={<Rows dreams={newestFirst(withPeople).slice(0, 4)} />}
    />
  )
}

/* ---------- Helpers ---------- */

// Horizontal count bars, shared by lenses whose hero is "top N of something".
function BarList({ items }: { items: [string, number][] }) {
  const max = items[0]?.[1] ?? 1
  return (
    <ul className="flex h-full flex-col justify-between">
      {items.map(([name, n]) => (
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

function Rows({ dreams }: { dreams: SampleDream[] }) {
  if (dreams.length === 0) return <p className="py-4 font-serif text-dream italic text-fg-secondary">None yet.</p>
  return (
    <ul>
      {dreams.map((d) => (
        <DreamRow key={d.number} dream={d} />
      ))}
    </ul>
  )
}

function tally(items: string[]) {
  const m = new Map<string, number>()
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function mostCommon<T extends string>(items: T[]) {
  return (tally(items)[0]?.[0] ?? items[0]) as T
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
}

function signed(n: number) {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}`
}

function emotionLabel(e: Emotion) {
  return EMOTIONS.find((x) => x.id === e)?.label ?? e
}

function isHan(s: string) {
  return /\p{Script=Han}/u.test(s)
}

function newestFirst(dreams: SampleDream[]) {
  return [...dreams].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
}
