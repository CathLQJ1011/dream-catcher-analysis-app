import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, Pencil, Share, Sparkle } from 'lucide-react'
import { IconButton } from '@/components/app/AppShell'
import { ShareSheet } from '@/components/app/ShareSheet'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Switch } from '@/components/ui/switch'
import { CommunityShareSheet } from '@/components/dream/CommunityShareSheet'
import { DreamArt } from '@/components/dream/DreamArt'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { DreamRow } from '@/components/dream/DreamRow'
import { generatedImages } from '@/data/prototypeState'
import { fromDream, fromSummary, type JournalDream } from '@/data/journal'
import type { SampleDream } from '@/data/sampleDreams'
import { api, ApiError, type Reading, type RelatedDream } from '@/lib/api'
import { EMOTIONS } from '@/lib/emotions'
import { parseDate } from '@/lib/dates'
import { navigate } from '@/lib/router'

// Dream Detail (docs/screens.md §2). The dream text is the hero; everything else
// is quieter and below it. Your own reading comes before the AI's.

export default function DreamDetail({ id }: { id: number }) {
  const [dream, setDream] = useState<JournalDream | null | 'loading'>('loading')
  const [problem, setProblem] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [related, setRelated] = useState<RelatedDream[]>([])

  useEffect(() => {
    api
      .related(id)
      .then(setRelated)
      .catch(() => {}) // connections are extra; the dream still shows without them
    api
      .getDream(id)
      .then((d) => setDream(fromDream(d)))
      .catch((e: Error) => {
        // Someone else's dream and a missing one look the same: not here.
        if (!(e instanceof ApiError && e.status === 404)) setProblem(e.message)
        setDream(null)
      })
  }, [id])

  if (dream === 'loading') return <Frame onShare={() => {}} />

  if (!dream) {
    if (problem) {
      return (
        <Frame onShare={() => {}}>
          <p className="mt-24 font-serif text-dream italic text-fg-secondary">{problem}</p>
        </Frame>
      )
    }
    return (
      <Frame onShare={() => {}}>
        <p className="mt-24 font-serif text-title">
          This dream isn’t here.
          <br />
          <em className="text-fg-secondary">It may have faded.</em>
        </p>
      </Frame>
    )
  }

  const date = parseDate(dream.date)
  const isHan = /\p{Script=Han}/u.test(dream.symbol)

  return (
    <Frame onShare={() => setShareOpen(true)}>
      {/* Header: catalog line, symbol as headline, orb */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-meta uppercase text-fg-muted">
            Dream — {String(dream.number).padStart(3, '0')} · {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <h1 className="font-serif text-display" lang={isHan ? 'zh-Hans' : undefined}>
            {dream.symbol}
          </h1>
          {dream.gloss && <span className="font-serif text-dream italic text-fg-secondary">{dream.gloss}</span>}
          <EditableTitle dream={dream} onSaved={(title) => setDream({ ...dream, title })} />
          <Tags dream={dream} related={related} />
        </div>
        <DreamOrb emotion={dream.emotion} blend={dream.blend} size={64 + dream.vividness * 40} seed={dream.number} className="mt-6" />
      </header>

      {/* The dream itself */}
      <p className="mt-12 font-serif text-dream text-fg">{dream.text}</p>

      <DreamImage dream={dream} />
      <Readings dream={dream} />
      <Anatomy dream={dream} />
      <Connected related={related} />
      <ShareToCommunity dream={dream} onChange={(shared) => setDream({ ...dream, shared })} />

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this dream"
        text={`${dream.symbol} — ${dream.title}`}
        preview={<DreamShareCard dream={dream} />}
      />
    </Frame>
  )
}

function Frame({ onShare, children }: { onShare: () => void; children?: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen bg-night" />
      <div className="relative mx-auto w-full max-w-md px-6 pb-24 pt-screen">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/journal'))}
            className="-ml-2 flex h-10 items-center gap-1 rounded-pill pr-3 text-label text-fg-secondary hover:text-fg"
          >
            <ChevronLeft className="size-5" strokeWidth={1.5} />
            Back
          </button>
          <IconButton label="Share" onClick={onShare}>
            <Share className="size-5" strokeWidth={1.5} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

// The dream's title: tap to rename. Saves on Enter or when you tap away; Escape cancels.
function EditableTitle({ dream, onSaved }: { dream: JournalDream; onSaved: (title: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(dream.title)
  const [error, setError] = useState('')

  async function save() {
    const title = draft.trim()
    setEditing(false)
    if (!title || title === dream.title) return setDraft(dream.title)
    try {
      await api.updateDream(dream.id, { title })
      onSaved(title)
      setError('')
    } catch (e) {
      setDraft(dream.title)
      setError(e instanceof ApiError ? e.message : 'Couldn’t rename. Try again.')
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={200}
        aria-label="Title"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(dream.title)
            setEditing(false)
          }
        }}
        className="h-9 w-full rounded-pill bg-raised px-4 text-label font-normal text-fg outline-none"
      />
    )
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex items-center gap-2 self-start text-left text-label font-normal text-fg-muted hover:text-fg-secondary"
      >
        {dream.title || 'Add a title'}
        <Pencil className="size-3 shrink-0 opacity-60 group-hover:opacity-100" strokeWidth={1.5} aria-label="Rename" />
      </button>
      {error && <span className="text-label font-normal text-ember">{error}</span>}
    </>
  )
}

function Tags({ dream, related }: { dream: JournalDream; related: RelatedDream[] }) {
  // Recurring: the headline symbol shows up in at least two other dreams.
  const recurring = dream.topCode && related.filter((r) => r.symbols.includes(dream.topCode!)).length >= 2
  const tags = [
    dream.lucidity >= 2 && 'Lucid',
    dream.intensity >= 5 && 'Intense',
    dream.valence <= -2 && 'Nightmare',
    recurring && 'Recurring',
  ].filter(Boolean)
  if (tags.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2 font-mono text-meta uppercase text-fg-muted">
      {tags.map((t) => (
        <span key={t as string}>[ {t} ]</span>
      ))}
    </div>
  )
}

/* ---------- Image ---------- */

function DreamImage({ dream }: { dream: SampleDream }) {
  const [state, setState] = useState<'none' | 'making' | 'done'>(generatedImages.has(dream.number) ? 'done' : 'none')

  function generate() {
    setState('making')
    window.setTimeout(() => {
      generatedImages.add(dream.number)
      setState('done')
    }, 1600)
  }

  return (
    <Section title="Image">
      {state === 'done' ? (
        <div className="flex animate-enter flex-col gap-2">
          <DreamArt dream={dream} />
          <span className="flex items-center gap-2 font-mono text-meta uppercase text-fg-muted">
            <Sparkle className="size-3 text-accent-soft" strokeWidth={1.5} />
            Made from this dream’s colors and feeling
          </span>
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-6 rounded-image border border-dashed border-hairline">
          <DreamOrb emotion={dream.emotion} blend={dream.blend} size={56} state={state === 'making' ? 'interpreting' : 'still'} glow={state === 'making'} />
          {state === 'making' ? (
            <span className="font-mono text-meta uppercase text-fg-muted">Composing…</span>
          ) : (
            <Button variant="ghost" onClick={generate}>
              <Sparkle className="size-4" strokeWidth={1.5} />
              Generate image
            </Button>
          )}
        </div>
      )}
    </Section>
  )
}

/* ---------- Readings: yours first ---------- */

const TRADITION_NAMES: Record<Reading['tradition'], string> = { jung: 'Jungian', zhougong: 'Zhougong · 周公' }

function Readings({ dream }: { dream: JournalDream }) {
  const [insight, setInsight] = useState(dream.insight ?? '')
  const [readings, setReadings] = useState<Reading[] | null>(null)
  const [error, setError] = useState('')
  const pending = readings?.some((r) => r.status === 'pending') ?? false

  useEffect(() => {
    api
      .readings(dream.id)
      .then(setReadings)
      .catch(() => setReadings([]))
  }, [dream.id])

  // Arriving from Capture (/dream/12#readings): bring the reading being written into view.
  useEffect(() => {
    if (readings !== null && window.location.hash === '#readings') {
      document.getElementById('readings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [readings === null]) // eslint-disable-line react-hooks/exhaustive-deps

  // A reading takes several seconds; check back until it's written.
  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => {
      api
        .readings(dream.id)
        .then(setReadings)
        .catch(() => {})
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [pending, readings, dream.id])

  async function interpret() {
    setError('')
    try {
      // Your own reading is saved first, so the AI can build on it.
      if (insight.trim() !== (dream.insight ?? '')) await api.updateDream(dream.id, { insight: insight.trim() || null })
      const started = await api.startReadings(dream.id)
      setReadings((old) => [...(old ?? []).filter((r) => !started.some((s) => s.tradition === r.tradition)), ...started])
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t start the reading. Try again.')
    }
  }

  const revealed = (readings?.length ?? 0) > 0

  return (
    <Section title="Readings" id="readings">
      <label className="flex flex-col gap-2">
        <span className="font-serif text-dream italic text-fg-secondary">What do you think it means?</span>
        <textarea
          value={insight}
          onChange={(e) => setInsight(e.target.value)}
          rows={3}
          placeholder="Your first thought, before anyone else’s."
          className="w-full resize-none rounded-card bg-raised p-6 font-serif text-dream text-fg outline-none placeholder:text-fg-muted"
        />
      </label>

      {revealed ? (
        <div className="-mx-6 mt-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none]">
          {readings!.map((r) => (
            <ReadingCard key={r.tradition} dream={dream} reading={r} wide={readings!.length === 1} onAgain={interpret} />
          ))}
        </div>
      ) : (
        readings !== null && (
          <Button variant="ghost" className="self-start" onClick={interpret}>
            {insight.trim() ? 'Compare with the readings' : 'Skip to the readings'}
          </Button>
        )
      )}
      {error && (
        <p className="text-label font-normal text-ember" role="alert">
          {error}
        </p>
      )}
    </Section>
  )
}

function ReadingCard({
  dream,
  reading: r,
  wide,
  onAgain,
}: {
  dream: JournalDream
  reading: Reading
  wide: boolean
  onAgain: () => void
}) {
  const [resonated, setResonated] = useState(r.resonated)
  const d = r.details
  const cited = (code: string | null) => r.symbols.find((s) => s.code === code)

  function answer(value: boolean) {
    setResonated(value)
    api.readingFeedback(r.id, value).catch(() => setResonated(r.resonated))
  }

  return (
    <GlassCard className={`flex shrink-0 snap-start flex-col gap-4 ${wide ? 'w-full' : 'w-[85%]'}`}>
      <span className="flex items-center gap-2 font-mono text-meta uppercase text-fg-muted">
        <Sparkle className="size-3 text-accent-soft" strokeWidth={1.5} />
        {TRADITION_NAMES[r.tradition]}
      </span>

      {r.status === 'pending' && (
        <div className="flex items-center gap-4 py-4">
          <DreamOrb emotion={dream.emotion} blend={dream.blend} size={32} state="interpreting" glow />
          <span className="font-mono text-meta uppercase text-fg-muted">Reading your dream…</span>
        </div>
      )}

      {r.status === 'failed' && (
        <>
          <p className="text-fg-secondary">{r.error}</p>
          <Button variant="ghost" className="self-start" onClick={onAgain}>
            Try again
          </Button>
        </>
      )}

      {r.status === 'ready' && (
        <>
          {d.headline && <span className="font-serif text-dream italic">“{d.headline.image}”</span>}
          <p className="text-fg-secondary">{r.reading}</p>

          {d.motifs && d.motifs.length > 0 && (
            <ul className="flex flex-col gap-4">
              {d.motifs.map((m) => (
                <li key={m.image} className="flex flex-col gap-1">
                  <span className="font-serif text-body italic">{m.image}</span>
                  <span className="text-label font-normal text-fg-secondary">{m.possibility}</span>
                  {/* Says where each idea comes from: the curated glossary, or read from the dream itself. */}
                  <span className="font-mono text-meta uppercase text-fg-muted">
                    {cited(m.glossary_id) ? `Jung glossary · ${cited(m.glossary_id)!.term_en}` : 'Open reading'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {d.series_note && <p className="text-label font-normal text-fg-secondary">{d.series_note}</p>}

          {d.questions && d.questions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-meta uppercase text-fg-muted">To sit with</span>
              <ul className="flex flex-col gap-2 text-label font-normal text-fg-secondary">
                {d.questions.map((q) => (
                  <li key={q}>✦ {q}</li>
                ))}
              </ul>
            </div>
          )}

          {d.dreamwork && <p className="text-label font-normal italic text-fg-secondary">{d.dreamwork}</p>}
          {r.confidence_note && <p className="text-label font-normal text-fg-muted">{r.confidence_note}</p>}

          {r.out_of_date ? (
            <div className="flex flex-col gap-2">
              <span className="text-label font-normal text-fg-muted">You edited the dream after this reading.</span>
              <Button variant="ghost" className="self-start" onClick={onAgain}>
                Interpret again
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-label font-normal text-fg-muted">
              <span>Does this resonate?</span>
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => answer(value)}
                  aria-pressed={resonated === value}
                  className={`h-8 rounded-pill px-3 ${resonated === value ? 'bg-raised text-fg' : 'hover:text-fg'}`}
                >
                  {value ? 'Yes' : 'Not really'}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </GlassCard>
  )
}

/* ---------- Anatomy ---------- */

function Anatomy({ dream }: { dream: JournalDream }) {
  const label = (id: string) => EMOTIONS.find((e) => e.id === id)?.label
  // Your own word leads when you gave one: "guilty · Unease".
  const felt = dream.feelings?.length
    ? dream.feelings.slice(0, 2).map((f) => (f.label ? `${f.label} · ${label(f.emotion)}` : label(f.emotion)))
    : [label(dream.emotion), dream.blend && label(dream.blend)]
  const rows: [string, ReactNode][] = [
    ['Feeling', felt.filter(Boolean).join(' + ')],
    ['Where it sat', `${['Very dark', 'Dark', 'Neither', 'Light', 'Very light'][dream.valence + 2]} · intensity ${dream.intensity}/5`],
    ['Vividness', `${Math.round(dream.vividness * 100)}%`],
    ['Lucidity', ['Not aware', 'Hazy', 'Aware', 'In control'][dream.lucidity]],
    ['Symbols', dream.symbols.join(' · ')],
    ['People', dream.people.length ? dream.people.join(' · ') : 'No one else'],
  ]

  return (
    <Section title="Dream anatomy">
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-hairline py-4">
            <dt className="font-mono text-meta uppercase text-fg-muted">{k}</dt>
            <dd className="text-right text-body">{v}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-2 py-4">
          <dt className="font-mono text-meta uppercase text-fg-muted">Palette</dt>
          <dd className="flex h-3 overflow-hidden rounded-pill">
            {dream.colors.map((c) => (
              <span key={c.name} style={{ flexGrow: c.pct, background: c.hex }} title={c.name} />
            ))}
          </dd>
          <dd className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-meta uppercase text-fg-muted">
            {dream.colors.map((c) => (
              <span key={c.name}>
                {c.name} {c.pct}%
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </Section>
  )
}

/* ---------- Connected dreams ---------- */

function Connected({ related }: { related: RelatedDream[] }) {
  if (related.length === 0) return null
  return (
    <Section title="Connected dreams">
      <ul>
        {related.slice(0, 3).map((r) => (
          <DreamRow key={r.dream.id} dream={fromSummary(r.dream)} />
        ))}
      </ul>
    </Section>
  )
}

/* ---------- Share to Community ---------- */

function ShareToCommunity({ dream, onChange }: { dream: JournalDream; onChange: (shared: boolean) => void }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState('')

  return (
    <Section title="Community">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-body">{dream.shared ? 'Shared anonymously' : 'Private'}</span>
          <span className="text-label font-normal text-fg-muted">
            {dream.shared ? 'Others can draw it from the blind box.' : 'Only you can see this dream.'}
          </span>
        </div>
        <Switch
          label="Share to Community"
          checked={dream.shared}
          onChange={(on) => {
            if (on) return setPreviewOpen(true) // always preview before sharing
            setError('')
            api
              .unshare(dream.id)
              .then(() => onChange(false))
              .catch((e: Error) => setError(e.message))
          }}
        />
      </div>
      {error && <span className="text-label font-normal text-ember">{error}</span>}
      <CommunityShareSheet key={String(previewOpen)} dream={dream} open={previewOpen} onClose={() => setPreviewOpen(false)} onShared={() => onChange(true)} />
    </Section>
  )
}

/* ---------- Share card ---------- */

export function DreamShareCard({ dream }: { dream: SampleDream }) {
  return (
    <div className="relative">
      <DreamArt dream={dream} className="rounded-none" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-bg via-bg/80 to-transparent p-6 pt-16">
        <span className="font-serif text-title">{dream.symbol}</span>
        <span className="font-serif text-body italic text-fg-secondary">{dream.title}</span>
        <span className="mt-2 font-mono text-meta uppercase text-fg-muted">Dream Catcher · Dream — {String(dream.number).padStart(3, '0')}</span>
      </div>
    </div>
  )
}

function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-12 flex scroll-mt-6 flex-col gap-4">
      <h2 className="font-mono text-meta uppercase text-fg-muted">{title}</h2>
      {children}
    </section>
  )
}
