import { useEffect, useState, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { AppShell } from '@/components/app/AppShell'
import { Segmented } from '@/components/app/Segmented'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { EmotionChip } from '@/components/dream/EmotionChip'
import { MonthGrid } from '@/components/dream/MonthGrid'
import { fromSummary, loadJournal, type JournalDream } from '@/data/journal'
import { ApiError, api, type ProfileOrb, type Tradition, type User } from '@/lib/api'
import { EMOTIONS, type Emotion } from '@/lib/emotions'
import { formatShortDate, parseDate, today } from '@/lib/dates'
import { navigate } from '@/lib/router'
import { setUser, signOut, useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

// Me (docs/screens.md §6): who you are here, and where trust lives.
// Deliberately no streaks or badges.

const FALLBACK_NAME = 'Anonymous dreamer'

export default function Me() {
  const session = useSession()
  const user = typeof session === 'object' ? session : null
  const [first, second] = user?.stats.top_emotions ?? []
  const label = (e?: Emotion) => EMOTIONS.find((x) => x.id === e)?.label

  // Your dreams, for an orb borrowed from one and for choosing it.
  const [dreams, setDreams] = useState<JournalDream[]>([])
  useEffect(() => {
    loadJournal()
      .then(setDreams)
      .catch(() => {}) // the orb falls back to Auto without them
  }, [])

  const [status, setStatus] = useState('')

  // Settings live on your account (decision 14), so they follow you to every device.
  // Each change shows at once and is saved straight away; if saving fails, it goes back.
  async function save(changes: Parameters<typeof api.updateMe>[0]) {
    if (!user) return
    setUser({ ...user, ...changes } as User)
    setStatus('')
    try {
      setUser(await api.updateMe(changes))
    } catch (e) {
      setUser(user)
      setStatus(e instanceof ApiError ? e.message : 'Couldn’t save that. Try again.')
    }
  }
  const traditions = user?.traditions ?? []
  const toggle = (t: Tradition, on: boolean) =>
    save({ traditions: on ? [...traditions.filter((x) => x !== t), t] : traditions.filter((x) => x !== t) })
  const memories = user?.memories ?? 'gentle'
  const depth = user?.check_in ?? 'minimal'
  const reminder = user?.reminder ?? { enabled: false, time: null }
  const [editOpen, setEditOpen] = useState(false)
  const name = user?.display_name || FALLBACK_NAME
  const orb = user?.profile_orb ?? { mode: 'auto' }
  const shown = resolveOrb(orb, dreams, first, second)

  return (
    <AppShell>
      {/* Signature orb: a blend of your most frequent feelings, changing as you do */}
      <header className="flex flex-col items-center gap-6 pt-6 text-center">
        {/* The orb stays whole: no badge on it. Tapping it or the name opens Edit profile. */}
        <button type="button" aria-label="Edit profile" onClick={() => setEditOpen(true)}>
          <DreamOrb emotion={shown.emotion} blend={shown.blend} size={128} seed={shown.seed} />
        </button>
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={() => setEditOpen(true)} className="font-serif text-title">
            {name}
          </button>
          {user && (
            <span className="font-mono text-meta uppercase text-fg-muted">
              {user.stats.dreams === 0
                ? 'No dreams yet'
                : `${user.stats.dreams} ${user.stats.dreams === 1 ? 'dream' : 'dreams'}${user.stats.since ? ` · since ${monthYear(user.stats.since)}` : ''}`}
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="mt-2 h-9 rounded-pill border border-hairline px-4 text-label text-fg-secondary transition hover:border-fg-muted hover:text-fg"
          >
            Edit profile
          </button>
        </div>
        {first && (
          <p className="font-serif text-dream italic text-fg-secondary">
            Lately your dreams lean {label(first)?.toLowerCase()}
            {second && ` and ${label(second)?.toLowerCase()}`}.
          </p>
        )}
      </header>

      <Group title="Your dreams">
        <button
          type="button"
          onClick={() => navigate('/me/dreams')}
          className="flex min-h-14 w-full items-center justify-between gap-4 border-b border-hairline py-3 text-left"
        >
          <div className="flex flex-col gap-1">
            <span className="text-body">Manage dreams</span>
            <span className="text-label font-normal text-fg-muted">View, edit, share or delete, as a list or a calendar</span>
          </div>
          <ChevronRight className="size-4 text-fg-muted" strokeWidth={1.5} />
        </button>
      </Group>

      <ProfileSheet
        key={String(editOpen)} // fresh drafts each time it opens; Cancel discards edits
        open={editOpen}
        onClose={() => setEditOpen(false)}
        currentName={user?.display_name ?? ''}
        currentOrb={orb}
        dreams={dreams}
        auto={{ emotion: first, blend: second }}
        onSave={async (nextName, nextOrb) => {
          setUser(await api.updateMe({ display_name: nextName, profile_orb: nextOrb }))
          setEditOpen(false)
        }}
      />

      <Group title="Readings">
        <Row label="Jungian">
          <Switch label="Jungian readings" checked={traditions.includes('jung')} onChange={(v) => toggle('jung', v)} />
        </Row>
        <Row label="周公解梦 Zhougong">
          <Switch label="Zhougong readings" checked={traditions.includes('zhougong')} onChange={(v) => toggle('zhougong', v)} />
        </Row>
        <Row label="Neuroscience">
          <Switch label="Neuroscience readings" checked={traditions.includes('neuro')} onChange={(v) => toggle('neuro', v)} />
        </Row>
        <Row label="Vedic" hint="Coming later">
          <Switch label="Vedic readings" checked={false} onChange={() => {}} disabled />
        </Row>
      </Group>

      <Group title="Journal">
        <Row
          label="This time last year"
          hint={{ all: 'Every dream, nightmares included', gentle: 'Skips nightmares and intense fear', off: 'Never shown' }[memories]}
        >
          <Segmented
            size="sm"
            label="Show dreams from this time last year"
            value={memories}
            onChange={(v) => save({ memories: v })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'gentle', label: 'Gentle' },
              { value: 'off', label: 'Off' },
            ]}
          />
        </Row>
      </Group>

      <Group title="Capture">
        <Row label="Start with">
          <Segmented
            size="sm"
            label="Start capture with"
            value={user?.capture_with ?? 'voice'}
            onChange={(v) => save({ capture_with: v })} // the Capture button in the tab bar follows this
            options={[
              { value: 'voice', label: 'Voice' },
              { value: 'text', label: 'Text' },
            ]}
          />
        </Row>
        <Row label="Check-in" hint={depth === 'minimal' ? 'Feeling and symbols only' : 'Every field, for deep journaling'}>
          <Segmented size="sm" label="Check-in depth" value={depth} onChange={(v) => save({ check_in: v })} options={[{ value: 'minimal', label: 'Minimal' }, { value: 'full', label: 'Full' }]} />
        </Row>
        <Row label="Morning reminder" hint={reminder.enabled ? `A quiet nudge at ${(reminder.time ?? '07:30').slice(0, 5)}` : 'Off'}>
          <Switch
            label="Morning reminder"
            checked={reminder.enabled}
            onChange={(v) => save({ reminder: { enabled: v, time: reminder.time ?? '07:30' } })}
          />
        </Row>
      </Group>

      <Group title="Your data">
        <Row label="Export as CSV" hint="Every field, one row per dream">
          <button type="button" onClick={() => setStatus('Export comes with the real build.')} className="text-label text-accent-soft">
            Export
          </button>
        </Row>
        <Row label="Delete all dreams" hint="Permanent. Asks twice.">
          <button type="button" onClick={() => setStatus('Deleting is disabled in the prototype.')} className="text-label text-ember">
            Delete
          </button>
        </Row>
      </Group>

      <Group title="Account">
        <Row label="Signed in" hint={typeof session === 'object' && session ? session.email : undefined}>
          <button type="button" onClick={() => signOut()} className="text-label text-accent-soft">
            Sign out
          </button>
        </Row>
      </Group>

      <Group title="Privacy">
        <p className="py-4 text-body text-fg-secondary">
          Your dreams are private unless you share one. When you ask for a reading or tags, the dream text is sent to
          an AI service to produce them. Shared dreams carry no name, date or place.
        </p>
      </Group>

      <p className="mt-6 min-h-6 text-center font-mono text-meta uppercase text-fg-muted" aria-live="polite">
        {status}
      </p>
    </AppShell>
  )
}

// What the profile orb looks like for each mode. A dream that's gone falls back to Auto.
function resolveOrb(orb: ProfileOrb, dreams: JournalDream[], first?: Emotion, second?: Emotion) {
  if (orb.mode === 'mix') return { emotion: orb.emotion, blend: orb.blend, seed: undefined }
  if (orb.mode === 'dream') {
    const d = dreams.find((x) => x.id === orb.dream_id)
    if (d) return { emotion: d.emotion, blend: d.blend, seed: d.number }
  }
  return { emotion: first ?? ('neutral' as Emotion), blend: second, seed: undefined }
}

// One place to edit everything about your profile: name and orb, saved together.
function ProfileSheet({
  open,
  onClose,
  currentName,
  currentOrb: current,
  dreams,
  auto,
  onSave,
}: {
  open: boolean
  onClose: () => void
  currentName: string
  currentOrb: ProfileOrb
  dreams: JournalDream[]
  auto: { emotion?: Emotion; blend?: Emotion }
  onSave: (name: string, orb: ProfileOrb) => Promise<void>
}) {
  const [draftName, setDraftName] = useState(currentName)
  const [mode, setMode] = useState<ProfileOrb['mode']>(current.mode)
  const [mix, setMix] = useState<Emotion[]>(current.mode === 'mix' ? [current.emotion, ...(current.blend ? [current.blend] : [])] : ['lucid'])
  const [dreamId, setDreamId] = useState<number | null>(current.mode === 'dream' ? current.dream_id : null)
  // A dream picked in the search results may not be in the loaded list yet.
  const [picked, setPicked] = useState<JournalDream | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const draft: ProfileOrb | null =
    mode === 'mix'
      ? { mode, emotion: mix[0] ?? 'neutral', blend: mix[1] }
      : mode === 'dream'
        ? dreamId === null
          ? null
          : { mode, dream_id: dreamId }
        : { mode }
  const preview = resolveOrb(draft ?? current, picked ? [picked, ...dreams] : dreams, auto.emotion, auto.blend)

  async function save() {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      await onSave(draftName.trim() || FALLBACK_NAME, draft)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t save. Try again.')
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      <div className="flex flex-col items-center gap-4 py-2">
        <DreamOrb emotion={preview.emotion} blend={preview.blend} size={96} seed={preview.seed} />
        <input
          value={draftName}
          maxLength={32}
          onChange={(e) => setDraftName(e.target.value)}
          aria-label="Your name"
          placeholder={FALLBACK_NAME}
          className="w-full border-b border-hairline bg-transparent pb-2 text-center font-serif text-title text-fg outline-none placeholder:text-fg-muted focus:border-accent-soft/60"
        />
        <span className="text-center text-label font-normal text-fg-muted">Only shown to you. Shared dreams stay anonymous.</span>
      </div>
      <h3 className="font-mono text-meta uppercase text-fg-muted">Your orb</h3>
      <Segmented
        label="Orb source"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'mix', label: 'Mix' },
          { value: 'dream', label: 'From a dream' },
        ]}
      />
      {mode === 'auto' && (
        <p className="text-body text-fg-secondary">
          Blends the feelings that show up most in your last 90 days of dreams, so it slowly changes as you do.
        </p>
      )}
      {mode === 'mix' && (
        <div className="flex flex-col gap-2">
          <span className="text-label font-normal text-fg-muted">Pick one or two feelings.</span>
          <div className="-ml-4 flex flex-wrap gap-1">
            {EMOTIONS.map((e) => (
              <EmotionChip
                key={e.id}
                emotion={e.id}
                label={e.label}
                selected={mix.includes(e.id)}
                onClick={() => setMix((cur) => (cur.includes(e.id) ? cur.filter((x) => x !== e.id) : [...cur, e.id].slice(-2)))}
              />
            ))}
          </div>
        </div>
      )}
      {mode === 'dream' && (
        <DreamPicker
          dreams={dreams}
          value={dreamId}
          onChange={(d) => {
            setDreamId(d.id)
            setPicked(d)
          }}
        />
      )}
      {error && (
        <p className="text-label font-normal text-ember" role="alert">
          {error}
        </p>
      )}
      <Button disabled={!draft || saving} onClick={save}>
        {saving ? 'Saving…' : mode === 'dream' && !draft ? 'Pick a dream' : 'Save'}
      </Button>
    </Sheet>
  )
}

// Choosing one dream among many: search everything, or browse a month and narrow to a night.
// Rows show the date and dream number as well as the symbol, so look-alike dreams stay distinct.
function DreamPicker({
  dreams,
  value,
  onChange,
}: {
  dreams: JournalDream[]
  value: number | null
  onChange: (dream: JournalDream) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<JournalDream[]>([])
  const searching = query.trim().length > 0

  // Opens on the month of the chosen dream, else the newest dream's month.
  const anchor = dreams.find((d) => d.id === value)?.date ?? dreams.map((d) => d.date).sort().at(-1) ?? today()
  const [month, setMonth] = useState(() => {
    const d = parseDate(anchor)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [night, setNight] = useState<string | null>(null)

  // The server searches titles, dream text and tags; wait for a pause in typing.
  useEffect(() => {
    const q = query.trim()
    if (!q) return
    const id = window.setTimeout(() => {
      api
        .searchDreams(q)
        .then((r) => setResults(r.items.map(fromSummary)))
        .catch(() => setResults([]))
    }, 300)
    return () => window.clearTimeout(id)
  }, [query])

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const shown = searching
    ? results
    : dreams
        .filter((d) => (night ? d.date === night : d.date.startsWith(monthKey)))
        .sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
  const changeMonth = (n: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
    setNight(null)
  }

  if (dreams.length === 0) {
    return <p className="text-body text-fg-secondary">Once you’ve saved a dream, you can wear its orb here.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="text-label font-normal text-fg-muted">Wear the orb of a dream you love.</span>
      <div className="flex h-10 items-center gap-2 rounded-pill bg-bg pl-4 pr-1">
        <Search className="size-4 shrink-0 text-fg-muted" strokeWidth={1.5} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search your dreams"
          placeholder="Search words, symbols, people…"
          className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted"
        />
        {searching && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery('')}
            className="flex size-8 items-center justify-center rounded-pill text-fg-muted hover:text-fg"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {!searching && (
        <div>
          <div className="flex items-center justify-between">
            <span className="font-serif text-dream">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <div className="flex">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
                className="flex size-10 items-center justify-center rounded-pill text-fg-muted transition hover:text-fg"
              >
                <ChevronLeft className="size-4" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
                className="flex size-10 items-center justify-center rounded-pill text-fg-muted transition hover:text-fg"
              >
                <ChevronRight className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <MonthGrid
            month={month}
            dreams={dreams}
            selected={night ?? ''}
            onSelect={(iso) => setNight((cur) => (cur === iso ? null : iso))}
            visible={new Set(dreams.map((d) => d.id))}
          />
        </div>
      )}

      <span className="font-mono text-meta uppercase text-fg-muted">
        {searching
          ? `${shown.length} ${shown.length === 1 ? 'match' : 'matches'}`
          : night
            ? formatShortDate(night)
            : month.toLocaleDateString('en-US', { month: 'long' })}
      </span>
      {shown.length === 0 ? (
        <p className="font-serif text-dream italic text-fg-secondary">
          {searching ? 'Nothing matches that search.' : night ? 'No dream logged this night.' : 'No dreams this month.'}
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {shown.map((d) => (
            <PickRow key={d.id} dream={d} selected={d.id === value} onPick={() => onChange(d)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PickRow({ dream: d, selected, onPick }: { dream: JournalDream; selected: boolean; onPick: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onPick}
        className={cn('flex w-full items-center gap-4 rounded-card px-2 py-3 text-left transition', selected ? 'bg-glass' : 'hover:bg-glass')}
      >
        <span className="flex size-11 shrink-0 items-center justify-center">
          <DreamOrb emotion={d.emotion} blend={d.blend} size={20 + d.vividness * 24} glow={false} state="still" seed={d.number} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-2">
            <span className="shrink-0 font-serif text-dream" lang={/\p{Script=Han}/u.test(d.symbol) ? 'zh-Hans' : undefined}>
              {d.symbol}
            </span>
            <span className="truncate text-label font-normal text-fg-secondary">{d.title}</span>
          </span>
          <span className="font-mono text-meta uppercase text-fg-muted">
            {formatShortDate(d.date)} · Dream {String(d.number).padStart(3, '0')}
          </span>
        </span>
        {selected && <Check className="size-4 shrink-0 text-accent-soft" strokeWidth={1.5} aria-hidden />}
      </button>
    </li>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 flex flex-col">
      <h2 className="pb-2 font-mono text-meta uppercase text-fg-muted">{title}</h2>
      <div className="border-t border-hairline">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-hairline py-3">
      <div className="flex flex-col gap-1">
        <span className="text-body">{label}</span>
        {hint && <span className="text-label font-normal text-fg-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function monthYear(iso: string) {
  return parseDate(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
