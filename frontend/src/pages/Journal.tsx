import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, History, List, Search, Share, X } from 'lucide-react'
import { AppShell, IconButton, PageHeader } from '@/components/app/AppShell'
import { ShareSheet } from '@/components/app/ShareSheet'
import { PillScroller } from '@/components/app/Segmented'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { DreamRow } from '@/components/dream/DreamRow'
import { DreamPreview, Tooltip } from '@/components/ui/tooltip'
import { PROTOTYPE_TODAY, SAMPLE_DREAMS, findDream, type SampleDream } from '@/data/sampleDreams'
import { EMOTIONS, edge, type Emotion } from '@/lib/emotions'
import { parseDate, toIso } from '@/lib/dates'
import { navigate } from '@/lib/router'
import { memoryFor } from '@/lib/memories'
import { profile } from '@/data/prototypeState'
import { cn } from '@/lib/utils'

// Journal (docs/screens.md §3): find and reread your own dreams.
// Calendar answers "which night", List is the archive.

type View = 'calendar' | 'list'
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Journal() {
  // Arriving from Capture (?saved=49): open on that night and confirm the save.
  const [justSaved] = useState(() => findDream(Number(new URLSearchParams(window.location.search).get('saved'))))
  const start = parseDate(justSaved?.date ?? PROTOTYPE_TODAY)
  const [month, setMonth] = useState(new Date(start.getFullYear(), start.getMonth(), 1))
  const [view, setView] = useState<View>('calendar')
  const [selected, setSelected] = useState(justSaved?.date ?? PROTOTYPE_TODAY)
  const [toast, setToast] = useState(Boolean(justSaved))

  useEffect(() => {
    if (!justSaved) return
    window.history.replaceState(null, '', '/journal') // a reload shouldn't confirm again
    const id = window.setTimeout(() => setToast(false), 6000)
    return () => window.clearTimeout(id)
  }, [justSaved])
  const [emotion, setEmotion] = useState<Emotion | 'all'>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SAMPLE_DREAMS.filter(
      (d) =>
        (emotion === 'all' || d.emotion === emotion || d.blend === emotion) &&
        (!q || [d.title, d.symbol, d.gloss, ...d.symbols].some((s) => s.toLowerCase().includes(q))),
    )
  }, [emotion, query])

  const emotionCounts = EMOTIONS.map((e) => ({
    ...e,
    count: SAMPLE_DREAMS.filter((d) => d.emotion === e.id || d.blend === e.id).length,
  })).filter((e) => e.count > 0)

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const searching = query.trim().length > 0

  return (
    <AppShell>
      <PageHeader
        title="Journal"
        meta={`${SAMPLE_DREAMS.length} dreams`}
        actions={
          <>
            <IconButton label="Calendar view" active={view === 'calendar'} onClick={() => setView('calendar')}>
              <CalendarDays className="size-5" strokeWidth={1.5} />
            </IconButton>
            <IconButton label="List view" active={view === 'list'} onClick={() => setView('list')}>
              <List className="size-5" strokeWidth={1.5} />
            </IconButton>
            <IconButton label="Search dreams" active={searchOpen} onClick={() => setSearchOpen((o) => !o)}>
              <Search className="size-5" strokeWidth={1.5} />
            </IconButton>
          </>
        }
      />

      {toast && justSaved && (
        <div role="status" className="mt-4 flex animate-enter items-center gap-4 rounded-card border border-hairline bg-raised py-2 pl-4 pr-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-accent">
            <Check className="size-4" strokeWidth={2} />
          </span>
          <span className="flex-1 text-label">Dream saved</span>
          <button
            type="button"
            onClick={() => navigate(`/dream/${justSaved.number}`)}
            className="h-9 rounded-pill px-4 text-label text-accent-soft hover:text-fg"
          >
            Open
          </button>
        </div>
      )}

      <MemoryCard />

      {searchOpen && (
        <div className="mt-4 flex h-10 animate-enter items-center gap-2 rounded-pill bg-raised pl-4 pr-1">
          <Search className="size-4 shrink-0 text-fg-muted" strokeWidth={1.5} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Symbol, place, person…"
            className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted"
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={() => {
              setQuery('')
              setSearchOpen(false)
            }}
            className="flex size-8 items-center justify-center rounded-pill text-fg-muted hover:text-fg"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {view === 'calendar' && (
          <div className="flex items-center justify-between">
            <span className="font-serif text-dream">{monthLabel}</span>
            <div className="flex">
              <MonthButton label="Share this month" onClick={() => setShareOpen(true)}>
                <Share className="size-4" strokeWidth={1.5} />
              </MonthButton>
              <MonthButton label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
                <ChevronLeft className="size-4" strokeWidth={1.5} />
              </MonthButton>
              <MonthButton label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
                <ChevronRight className="size-4" strokeWidth={1.5} />
              </MonthButton>
            </div>
          </div>
        )}

        <PillScroller
          label="Filter by emotion"
          value={emotion}
          onChange={setEmotion}
          options={[
            { value: 'all' as const, label: 'All', count: SAMPLE_DREAMS.length },
            ...emotionCounts.map((e) => ({ value: e.id, label: e.label, count: e.count, dot: edge(e.id) })),
          ]}
        />
      </div>

      {view === 'calendar' && (
        <MonthGrid
          month={month}
          selected={selected}
          onSelect={setSelected}
          visible={new Set(matches.map((d) => d.number))}
        />
      )}

      <section className="mt-12 flex flex-col gap-2">
        {searching || view === 'list' ? (
          <ListHeading text={searching ? `${matches.length} matches` : `${matches.length} dreams`} />
        ) : (
          <ListHeading
            text={parseDate(selected).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          />
        )}
        <DreamList
          highlight={justSaved?.number}
          dreams={searching || view === 'list' ? newestFirst(matches) : matches.filter((d) => d.date === selected)}
          empty={searching ? 'Nothing matches that search.' : 'No dream logged this night.'}
        />
      </section>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this month"
        text={`My dreams in ${monthLabel}`}
        preview={<MonthShareCard month={month} label={monthLabel} />}
      />
    </AppShell>
  )
}

function MonthGrid({
  month,
  selected,
  onSelect,
  visible,
}: {
  month: Date
  selected: string
  onSelect: (iso: string) => void
  visible: Set<number>
}) {
  const byDate = new Map<string, SampleDream[]>()
  for (const d of SAMPLE_DREAMS) byDate.set(d.date, [...(byDate.get(d.date) ?? []), d])

  // Weeks start on Monday.
  const lead = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ]

  return (
    <div className="mt-6 grid grid-cols-7 gap-y-2">
      {WEEKDAYS.map((d, i) => (
        <span key={i} className="pb-2 text-center font-mono text-meta text-fg-muted">
          {d}
        </span>
      ))}
      {cells.map((date, i) => {
        if (!date) return <span key={i} />
        const iso = toIso(date)
        const dreams = byDate.get(iso) ?? []
        const lit = dreams.filter((d) => visible.has(d.number))
        const isToday = iso === PROTOTYPE_TODAY
        const isSelected = iso === selected
        const col = (lead + date.getDate() - 1) % 7
        const cell = (
          <button
            type="button"
            onClick={() => onSelect(iso)}
            aria-label={`${date.toDateString()}, ${dreams.length} dreams`}
            aria-pressed={isSelected}
            className="flex flex-col items-center gap-1 py-1"
          >
            <span
              className={cn(
                'flex size-11 items-center justify-center rounded-pill transition',
                isSelected && 'bg-glass',
                isToday && 'border border-fg-muted',
              )}
            >
              {dreams.length === 0 ? (
                <span className="size-1 rounded-pill bg-hairline" />
              ) : (
                <span className={cn('flex -space-x-2 transition', lit.length === 0 && 'opacity-20')}>
                  {dreams.map((d) => (
                    <DreamOrb
                      key={d.number}
                      emotion={d.emotion}
                      blend={d.blend}
                      size={14 + d.vividness * 18}
                      glow={false}
                      state="still"
                      seed={d.number}
                    />
                  ))}
                </span>
              )}
            </span>
            <span className={cn('font-mono text-meta', isSelected || isToday ? 'text-fg' : 'text-fg-muted')}>
              {date.getDate()}
            </span>
          </button>
        )
        if (dreams.length === 0) return <div key={iso}>{cell}</div>
        return (
          <Tooltip
            key={iso}
            align={col < 2 ? 'start' : col > 4 ? 'end' : 'center'}
            className="justify-center"
            content={dreams.map((d) => (
              <DreamPreview key={d.number} symbol={d.symbol} title={d.title} />
            ))}
          >
            {cell}
          </Tooltip>
        )
      })}
    </div>
  )
}

// "One year ago tonight": only shown when there is a dream to remember.
function MemoryCard() {
  const [hidden, setHidden] = useState(profile.memoryDismissed === PROTOTYPE_TODAY)
  const memory = memoryFor(PROTOTYPE_TODAY, profile.memories)
  if (!memory || hidden) return null
  const { dream, exact } = memory
  const isHan = /\p{Script=Han}/u.test(dream.symbol)

  return (
    <div className="relative mt-6 animate-enter overflow-hidden rounded-card border border-hairline bg-raised">
      <div
        className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-pill"
        style={{ background: `radial-gradient(circle, ${edge(dream.emotion, 0.4)}, transparent 70%)` }}
      />
      <button
        type="button"
        onClick={() => navigate(`/dream/${dream.number}`)}
        className="relative flex w-full items-center gap-4 p-4 pr-12 text-left"
      >
        <DreamOrb emotion={dream.emotion} blend={dream.blend} size={44} seed={dream.number} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2 font-mono text-meta uppercase text-fg-muted">
            <History className="size-3" strokeWidth={1.5} />
            {exact ? 'One year ago tonight' : 'Around this time last year'}
          </span>
          <span className="truncate">
            <span className="font-serif text-dream" lang={isHan ? 'zh-Hans' : undefined}>
              {dream.symbol}
            </span>{' '}
            <span className="font-serif text-body italic text-fg-secondary">{dream.title}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Hide for today"
        onClick={() => {
          profile.memoryDismissed = PROTOTYPE_TODAY
          setHidden(true)
        }}
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-pill text-fg-muted hover:text-fg"
      >
        <X className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  )
}

// The month as a clean share card: just the orbs, no controls.
function MonthShareCard({ month, label }: { month: Date; label: string }) {
  const lead = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const inMonth = SAMPLE_DREAMS.filter((d) => {
    const date = parseDate(d.date)
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
  })

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-night" />
      <div className="relative flex flex-col gap-1">
        <span className="font-serif text-title">{label}</span>
        <span className="font-mono text-meta uppercase text-fg-muted">{inMonth.length} dreams</span>
      </div>
      <div className="relative grid grid-cols-7 gap-y-3">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const iso = toIso(new Date(month.getFullYear(), month.getMonth(), i + 1))
          const d = inMonth.find((x) => x.date === iso)
          return (
            <span key={iso} className="flex h-7 items-center justify-center">
              {d ? (
                <DreamOrb emotion={d.emotion} blend={d.blend} size={10 + d.vividness * 16} glow={false} state="still" seed={d.number} />
              ) : (
                <span className="size-1 rounded-pill bg-hairline" />
              )}
            </span>
          )
        })}
      </div>
      <span className="relative font-mono text-meta uppercase text-fg-muted">Dream Catcher</span>
    </div>
  )
}

function MonthButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-pill text-fg-muted transition hover:text-fg"
    >
      {children}
    </button>
  )
}

function ListHeading({ text }: { text: string }) {
  return <h2 className="font-mono text-meta uppercase text-fg-muted">{text}</h2>
}

function DreamList({ dreams, empty, highlight }: { dreams: SampleDream[]; empty: string; highlight?: number }) {
  if (dreams.length === 0) {
    return <p className="py-4 font-serif text-dream italic text-fg-secondary">{empty}</p>
  }
  return (
    <ul>
      {dreams.map((d) => (
        <DreamRow key={d.number} dream={d} highlight={d.number === highlight} />
      ))}
    </ul>
  )
}

function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

function newestFirst(dreams: SampleDream[]) {
  return [...dreams].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
}
