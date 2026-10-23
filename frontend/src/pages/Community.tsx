import { useMemo, useRef, useState } from 'react'
import { Bookmark, ChevronDown, Heart, MessageCircle, Plus, Send, Shuffle, Wind } from 'lucide-react'
import { AppShell, PageHeader } from '@/components/app/AppShell'
import { PillScroller, Segmented } from '@/components/app/Segmented'
import { OrbField, type OrbFieldHandle } from '@/components/community/OrbField'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Sheet } from '@/components/ui/sheet'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { SHARED_DREAMS, WEEK_STATS, type SharedDream } from '@/data/community'
import { community } from '@/data/prototypeState'
import { EMOTIONS, core, edge, type Emotion } from '@/lib/emotions'
import { cn } from '@/lib/utils'

// Community (docs/screens.md §5): stir the field of sealed dreams, open one,
// like it, talk about it, and save the ones you love into folders.

type Tab = 'draw' | 'saved'

export default function Community() {
  const [tab, setTab] = useState<Tab>('draw')
  // Bumped after any change to the shared prototype state, to re-render.
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)

  return (
    <AppShell>
      <PageHeader title="Community" meta="Anonymous dreams from other dreamers" />
      <div className="mt-6">
        <Segmented
          label="Community view"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'draw', label: 'Draw' },
            { value: 'saved', label: 'Saved' },
          ]}
        />
      </div>
      {tab === 'draw' ? <Draw onChange={refresh} /> : <Saved onChange={refresh} />}
    </AppShell>
  )
}

/* ---------- Draw: the blind box ---------- */

const ORB_SIZES = [64, 48, 72, 88, 44, 56, 36, 52]
const MIXED: Emotion[] = ['lucid', 'calm', 'longing', 'unease']

function Draw({ onChange }: { onChange: () => void }) {
  const [feeling, setFeeling] = useState<Emotion | 'any'>('any')
  const [drawn, setDrawn] = useState<SharedDream | null>(null)
  const field = useRef<OrbFieldHandle>(null)

  const pool = SHARED_DREAMS.filter((d) => feeling === 'any' || d.emotion === feeling || d.blend === feeling)
  // Sealed orbs take the chosen feeling's color, or a mix when drawing from any.
  const orbs = useMemo(
    () => ORB_SIZES.map((size, i) => ({ size, emotion: feeling === 'any' ? MIXED[i % MIXED.length] : feeling })),
    [feeling],
  )

  function draw() {
    // Prefer dreams you haven't opened yet.
    const fresh = pool.filter((d) => !community.seen.has(d.id) && d.id !== drawn?.id)
    const from = fresh.length ? fresh : pool.filter((d) => d.id !== drawn?.id)
    const pick = from[Math.floor(Math.random() * from.length)] ?? pool[0]
    if (!pick) return
    community.seen.add(pick.id)
    setDrawn(pick)
  }

  const feelings = EMOTIONS.filter((e) => SHARED_DREAMS.some((d) => d.emotion === e.id || d.blend === e.id))

  return (
    <div className="mt-6 flex flex-col gap-6">
      <PillScroller
        label="Draw by feeling"
        value={feeling}
        onChange={(f) => {
          setFeeling(f)
          setDrawn(null)
        }}
        options={[
          { value: 'any' as const, label: 'Any feeling' },
          ...feelings.map((e) => ({ value: e.id, label: e.label, dot: edge(e.id) })),
        ]}
      />

      {drawn ? (
        <Revealed dream={drawn} onDrawAgain={draw} onClose={() => setDrawn(null)} onChange={onChange} />
      ) : (
        <div className="flex flex-col gap-4">
          <OrbField ref={field} orbs={orbs} onPick={draw} disabled={pool.length === 0} />
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-meta uppercase text-fg-muted">
              {pool.length ? 'Fling them around · tap one to open' : 'No shared dreams with this feeling yet'}
            </span>
            <Button variant="ghost" className="h-10 shrink-0 px-4 py-0" onClick={() => field.current?.stir()}>
              <Wind className="size-4" strokeWidth={1.5} />
              Stir
            </Button>
          </div>
        </div>
      )}

      <WeekStats />
    </div>
  )
}

// "This week" as a small statistics strip: three numbers and the week's mood mix.
function WeekStats() {
  const counts = EMOTIONS.map((e) => ({
    ...e,
    n: SHARED_DREAMS.filter((d) => d.emotion === e.id).length,
  }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.n - a.n)
  const total = counts.reduce((s, e) => s + e.n, 0)

  return (
    <section className="mt-6 flex flex-col gap-4">
      <h2 className="font-mono text-meta uppercase text-fg-muted">This week in Community</h2>
      <div className="grid grid-cols-3 divide-x divide-hairline border-y border-hairline">
        <Stat value={String(WEEK_STATS.shared)} label="Dreams shared" />
        <Stat value={WEEK_STATS.topSymbol} label={`In ${WEEK_STATS.topSymbolShare.replace(' in ', ' of ')} dreams`} />
        <Stat value={String(WEEK_STATS.comments)} label="Comments" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex h-2 gap-1">
          {counts.map((e) => (
            <span
              key={e.id}
              className="rounded-pill"
              style={{ flexGrow: e.n, background: `linear-gradient(to right, ${core(e.id, 0.9)}, ${edge(e.id)})` }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-meta uppercase text-fg-muted">
          {counts.slice(0, 4).map((e) => (
            <span key={e.id} className="flex items-center gap-2">
              <span className="size-2 rounded-pill" style={{ background: edge(e.id) }} />
              {e.label} {Math.round((e.n / total) * 100)}%
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-4 first:pl-0">
      <span className="font-serif text-title" lang={/\p{Script=Han}/u.test(value) ? 'zh-Hans' : undefined}>
        {value}
      </span>
      <span className="font-mono text-meta uppercase text-fg-muted">{label}</span>
    </div>
  )
}

function Revealed({
  dream,
  onDrawAgain,
  onClose,
  onChange,
}: {
  dream: SharedDream
  onDrawAgain: () => void
  onClose: () => void
  onChange: () => void
}) {
  const [saveOpen, setSaveOpen] = useState(false)
  const liked = community.liked.has(dream.id)
  const saved = [...community.folders.values()].some((ids) => ids.includes(dream.id))
  const comments = community.comments.get(dream.id) ?? []

  return (
    <div key={dream.id} className="flex animate-enter flex-col gap-4">
      <GlassCard className="relative flex flex-col gap-6 overflow-hidden">
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-pill"
          style={{ background: `radial-gradient(circle, ${edge(dream.emotion, 0.45)}, transparent 70%)` }}
        />
        <div className="relative flex items-center justify-between font-mono text-meta uppercase text-fg-muted">
          <span>Wanderer #{String(dream.wanderer).padStart(3, '0')}</span>
          <span>{EMOTIONS.find((e) => e.id === dream.emotion)?.label}</span>
        </div>
        <div className="relative flex items-center gap-4">
          <DreamOrb emotion={dream.emotion} blend={dream.blend} size={48} />
          <div className="flex flex-col">
            <span className="font-serif text-title" lang={/\p{Script=Han}/u.test(dream.symbol) ? 'zh-Hans' : undefined}>
              {dream.symbol}
            </span>
            <span className="font-serif text-body italic text-fg-secondary">{dream.gloss}</span>
          </div>
        </div>
        <p className="relative font-serif text-dream">{dream.text}</p>
        <div className="relative flex items-center gap-1 border-t border-hairline pt-4">
          <button
            type="button"
            aria-pressed={liked}
            aria-label={liked ? 'Unlike' : 'Like'}
            onClick={() => {
              if (liked) community.liked.delete(dream.id)
              else community.liked.add(dream.id)
              onChange()
            }}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-pill px-3 font-mono text-meta transition',
              liked ? 'text-accent-soft' : 'text-fg-secondary hover:text-fg',
            )}
          >
            <Heart className={cn('size-5', liked && 'fill-accent-soft')} strokeWidth={1.5} />
            {dream.likes + (liked ? 1 : 0)}
          </button>
          <span className="inline-flex h-10 items-center gap-2 px-3 font-mono text-meta text-fg-secondary">
            <MessageCircle className="size-5" strokeWidth={1.5} />
            {comments.length}
          </span>
          <button
            type="button"
            aria-label="Save to a folder"
            onClick={() => setSaveOpen(true)}
            className={cn(
              'ml-auto flex size-10 items-center justify-center rounded-pill transition',
              saved ? 'text-accent-soft' : 'text-fg-secondary hover:text-fg',
            )}
          >
            <Bookmark className={cn('size-5', saved && 'fill-accent-soft')} strokeWidth={1.5} />
          </button>
        </div>
      </GlassCard>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onDrawAgain}>
          <Shuffle className="size-4" strokeWidth={1.5} />
          Draw another
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Back
        </Button>
      </div>

      <Comments dream={dream} comments={comments} onChange={onChange} />
      <SaveSheet open={saveOpen} onClose={() => setSaveOpen(false)} dream={dream} onChange={onChange} />
    </div>
  )
}

function Comments({
  dream,
  comments,
  onChange,
}: {
  dream: SharedDream
  comments: { wanderer: number | 'you'; text: string }[]
  onChange: () => void
}) {
  const [draft, setDraft] = useState('')

  return (
    <section className="mt-6 flex flex-col gap-2">
      <h2 className="font-mono text-meta uppercase text-fg-muted">
        {comments.length ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : 'No comments yet'}
      </h2>
      <ul>
        {comments.map((c, i) => (
          <li key={i} className="flex flex-col gap-1 border-b border-hairline py-4">
            <span className="font-mono text-meta uppercase text-fg-muted">
              {c.wanderer === 'you' ? 'You' : `Wanderer #${String(c.wanderer).padStart(3, '0')}`}
            </span>
            <span className="text-body">{c.text}</span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const text = draft.trim()
          if (!text) return
          community.comments.set(dream.id, [...comments, { wanderer: 'you', text }])
          setDraft('')
          onChange()
        }}
        className="mt-2 flex h-11 items-center gap-2 rounded-pill bg-raised pl-4 pr-1"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something kind…"
          aria-label="Write a comment"
          className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted"
        />
        <button
          type="submit"
          aria-label="Post comment"
          disabled={!draft.trim()}
          className="flex size-9 items-center justify-center rounded-pill text-accent-soft disabled:text-fg-muted"
        >
          <Send className="size-4" strokeWidth={1.5} />
        </button>
      </form>
    </section>
  )
}

function SaveSheet({
  open,
  onClose,
  dream,
  onChange,
}: {
  open: boolean
  onClose: () => void
  dream: SharedDream
  onChange: () => void
}) {
  const [name, setName] = useState('')

  function toggle(folder: string) {
    const ids = community.folders.get(folder) ?? []
    community.folders.set(folder, ids.includes(dream.id) ? ids.filter((i) => i !== dream.id) : [...ids, dream.id])
    onChange()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Save to a folder">
      <ul>
        {[...community.folders.entries()].map(([folder, ids]) => {
          const inside = ids.includes(dream.id)
          return (
            <li key={folder} className="border-b border-hairline last:border-b-0">
              <button type="button" aria-pressed={inside} onClick={() => toggle(folder)} className="flex w-full items-center justify-between py-4 text-left">
                <span className="text-body">{folder}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-pill border', inside ? 'border-accent-soft bg-accent' : 'border-hairline')}>
                  {inside && <span className="size-2 rounded-pill bg-fg" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const folder = name.trim()
          if (!folder || community.folders.has(folder)) return
          community.folders.set(folder, [dream.id])
          setName('')
          onChange()
        }}
        className="flex h-11 items-center gap-2 rounded-pill bg-bg pl-4 pr-1"
      >
        <Plus className="size-4 text-fg-muted" strokeWidth={1.5} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New folder"
          aria-label="New folder name"
          className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted"
        />
        <Button type="submit" variant="ghost" className="h-9 px-4 py-0">
          Create
        </Button>
      </form>
      <Button onClick={onClose}>Done</Button>
    </Sheet>
  )
}

/* ---------- Saved: folders ---------- */

function Saved({ onChange }: { onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [name, setName] = useState('')

  return (
    <div className="mt-6 flex flex-col gap-6">
      <ul>
        {[...community.folders.entries()].map(([folder, ids]) => {
          const dreams = ids.map((id) => SHARED_DREAMS.find((d) => d.id === id)!).filter(Boolean)
          const isOpen = open === folder
          return (
            <li key={folder} className="border-b border-hairline">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : folder)}
                className="flex w-full items-center gap-4 py-4 text-left"
              >
                <span className="flex w-16 shrink-0 -space-x-3">
                  {dreams.length === 0 ? (
                    <span className="size-6 rounded-pill border border-dashed border-hairline" />
                  ) : (
                    dreams.slice(0, 3).map((d) => <DreamOrb key={d.id} emotion={d.emotion} blend={d.blend} size={24} glow={false} state="still" />)
                  )}
                </span>
                <span className="flex-1 text-body">{folder}</span>
                <span className="font-mono text-meta uppercase text-fg-muted">{dreams.length}</span>
                <ChevronDown className={cn('size-4 text-fg-muted transition', isOpen && 'rotate-180')} strokeWidth={1.5} />
              </button>
              {isOpen && (
                <ul className="animate-enter pb-4">
                  {dreams.length === 0 && (
                    <li className="py-2 font-serif text-body italic text-fg-secondary">Nothing here yet. Save dreams from Draw.</li>
                  )}
                  {dreams.map((d) => (
                    <li key={d.id} className="flex items-start gap-4 py-2">
                      <DreamOrb emotion={d.emotion} blend={d.blend} size={20} glow={false} state="still" className="mt-1" />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-serif text-dream">{d.symbol}</span>
                        <span className="line-clamp-2 text-label font-normal text-fg-secondary">{d.text}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const folder = name.trim()
          if (!folder || community.folders.has(folder)) return
          community.folders.set(folder, [])
          setName('')
          onChange()
        }}
        className="flex h-11 items-center gap-2 rounded-pill bg-raised pl-4 pr-1"
      >
        <Plus className="size-4 text-fg-muted" strokeWidth={1.5} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New folder"
          aria-label="New folder name"
          className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted"
        />
      </form>
    </div>
  )
}
