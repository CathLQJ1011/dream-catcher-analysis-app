import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/app/AppShell'
import { Segmented } from '@/components/app/Segmented'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { EmotionChip } from '@/components/dream/EmotionChip'
import { profile, type ProfileOrb } from '@/data/prototypeState'
import { PROTOTYPE_TODAY, SAMPLE_DREAMS, findDream } from '@/data/sampleDreams'
import { EMOTIONS, type Emotion } from '@/lib/emotions'
import { daysBetween, parseDate } from '@/lib/dates'
import { navigate } from '@/lib/router'
import { signOut, useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

// Me (docs/screens.md §6): who you are here, and where trust lives.
// Deliberately no streaks or badges.

export default function Me() {
  const recent = SAMPLE_DREAMS.filter((d) => daysBetween(d.date, PROTOTYPE_TODAY) < 90)
  const [first, second] = topEmotions(recent)
  const label = (e?: Emotion) => EMOTIONS.find((x) => x.id === e)?.label

  const [traditions, setTraditions] = useState({ jung: true, zhougong: true, neuro: true })
  const [depth, setDepth] = useState<'minimal' | 'full'>('minimal')
  const [start, setStart] = useState(profile.captureWith)
  const [name, setName] = useState(profile.name)
  const [memories, setMemories] = useState(profile.memories)
  const [reminder, setReminder] = useState(true)
  const [status, setStatus] = useState('')
  const [orb, setOrb] = useState<ProfileOrb>(profile.orb)
  const [editOpen, setEditOpen] = useState(false)
  const shown = resolveOrb(orb, first, second)
  const session = useSession()

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
          <span className="font-mono text-meta uppercase text-fg-muted">
            {SAMPLE_DREAMS.length} dreams · since {firstMonth()}
          </span>
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
        currentName={name}
        currentOrb={orb}
        auto={{ emotion: first ?? 'neutral', blend: second }}
        onSave={(nextName, nextOrb) => {
          profile.name = nextName
          profile.orb = nextOrb
          setName(nextName)
          setOrb(nextOrb)
          setEditOpen(false)
        }}
      />

      <Group title="Readings">
        <Row label="Jungian">
          <Switch label="Jungian readings" checked={traditions.jung} onChange={(v) => setTraditions({ ...traditions, jung: v })} />
        </Row>
        <Row label="周公解梦 Zhougong">
          <Switch label="Zhougong readings" checked={traditions.zhougong} onChange={(v) => setTraditions({ ...traditions, zhougong: v })} />
        </Row>
        <Row label="Neuroscience">
          <Switch label="Neuroscience readings" checked={traditions.neuro} onChange={(v) => setTraditions({ ...traditions, neuro: v })} />
        </Row>
        <Row label="Vedic" hint="Coming later">
          <Switch label="Vedic readings" checked={false} onChange={() => {}} disabled />
        </Row>
      </Group>

      <Group title="Journal">
        <Row
          label="This time last year"
          hint={{ on: 'Every dream, nightmares included', calm: 'Skips nightmares and intense fear', off: 'Never shown' }[memories]}
        >
          <Segmented
            size="sm"
            label="Show dreams from this time last year"
            value={memories}
            onChange={(v) => {
              profile.memories = v
              setMemories(v)
            }}
            options={[
              { value: 'on', label: 'All' },
              { value: 'calm', label: 'Gentle' },
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
            value={start}
            onChange={(v) => {
              profile.captureWith = v // the Capture button in the tab bar follows this
              setStart(v)
            }}
            options={[
              { value: 'voice', label: 'Voice' },
              { value: 'text', label: 'Text' },
            ]}
          />
        </Row>
        <Row label="Check-in" hint={depth === 'minimal' ? 'Feeling and symbols only' : 'Every field, for deep journaling'}>
          <Segmented size="sm" label="Check-in depth" value={depth} onChange={setDepth} options={[{ value: 'minimal', label: 'Minimal' }, { value: 'full', label: 'Full' }]} />
        </Row>
        <Row label="Morning reminder" hint={reminder ? 'A quiet nudge at 7:30' : 'Off'}>
          <Switch label="Morning reminder" checked={reminder} onChange={setReminder} />
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

// What the profile orb looks like for each mode.
function resolveOrb(orb: ProfileOrb, first?: Emotion, second?: Emotion) {
  if (orb.mode === 'mix') return { emotion: orb.emotion, blend: orb.blend, seed: undefined }
  if (orb.mode === 'dream') {
    const d = findDream(orb.number)
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
  auto,
  onSave,
}: {
  open: boolean
  onClose: () => void
  currentName: string
  currentOrb: ProfileOrb
  auto: { emotion: Emotion; blend?: Emotion }
  onSave: (name: string, orb: ProfileOrb) => void
}) {
  const [draftName, setDraftName] = useState(currentName)
  const [mode, setMode] = useState<ProfileOrb['mode']>(current.mode)
  const [mix, setMix] = useState<Emotion[]>(current.mode === 'mix' ? [current.emotion, ...(current.blend ? [current.blend] : [])] : ['lucid'])
  const [dreamNo, setDreamNo] = useState(current.mode === 'dream' ? current.number : SAMPLE_DREAMS[0].number)

  const draft: ProfileOrb =
    mode === 'mix' ? { mode, emotion: mix[0] ?? 'neutral', blend: mix[1] } : mode === 'dream' ? { mode, number: dreamNo } : { mode }
  const preview = resolveOrb(draft, auto.emotion, auto.blend)

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      <div className="flex flex-col items-center gap-4 py-2">
        <DreamOrb emotion={preview.emotion} blend={preview.blend} size={96} seed={preview.seed} />
        <input
          value={draftName}
          maxLength={32}
          onChange={(e) => setDraftName(e.target.value)}
          aria-label="Your name"
          placeholder="Anonymous dreamer"
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
        <div className="flex flex-col gap-2">
          <span className="text-label font-normal text-fg-muted">Wear the orb of a dream you love.</span>
          <div className="grid grid-cols-4 gap-2">
            {[...SAMPLE_DREAMS].reverse().map((d) => (
              <button
                key={d.number}
                type="button"
                aria-pressed={dreamNo === d.number}
                aria-label={d.title}
                onClick={() => setDreamNo(d.number)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-card border py-3 transition',
                  dreamNo === d.number ? 'border-accent-soft/60 bg-glass' : 'border-transparent hover:bg-glass',
                )}
              >
                <DreamOrb emotion={d.emotion} blend={d.blend} size={36} glow={false} state="still" seed={d.number} />
                <span className="max-w-full truncate px-1 font-serif text-label font-normal" lang={/\p{Script=Han}/u.test(d.symbol) ? 'zh-Hans' : undefined}>
                  {d.symbol}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Button onClick={() => onSave(draftName.trim() || 'Anonymous dreamer', draft)}>Save</Button>
    </Sheet>
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

function firstMonth() {
  const first = SAMPLE_DREAMS.reduce((min, d) => (d.date < min ? d.date : min), SAMPLE_DREAMS[0].date)
  return parseDate(first).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function topEmotions(dreams: typeof SAMPLE_DREAMS): [Emotion?, Emotion?] {
  const counts = new Map<Emotion, number>()
  for (const d of dreams) for (const e of [d.emotion, d.blend]) if (e) counts.set(e, (counts.get(e) ?? 0) + 1)
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e)
  return [ranked[0], ranked[1]]
}
