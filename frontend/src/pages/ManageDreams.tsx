import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, EyeOff, List, Pencil, Trash2, Users } from 'lucide-react'
import { IconButton } from '@/components/app/AppShell'
import { PillScroller } from '@/components/app/Segmented'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { CommunityShareSheet } from '@/components/dream/CommunityShareSheet'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { EditDreamSheet } from '@/components/dream/EditDreamSheet'
import { MonthGrid } from '@/components/dream/MonthGrid'
import { loadJournal, type JournalDream } from '@/data/journal'
import { api, type DeletedDream } from '@/lib/api'
import { formatShortDate, parseDate, today } from '@/lib/dates'
import { navigate } from '@/lib/router'
import { cn } from '@/lib/utils'

// Manage dreams (Me → Your dreams): every dream as a list or a calendar, and
// for each one: open, edit, share or unshare, delete. Recently deleted lives
// here too, so a deleted dream can be brought back for 30 days.

type View = 'list' | 'calendar'
type Show = 'all' | 'shared'

export default function ManageDreams() {
  const [dreams, setDreams] = useState<JournalDream[] | null>(null)
  const [deleted, setDeleted] = useState<DeletedDream[]>([])
  const [view, setView] = useState<View>('list')
  const [show, setShow] = useState<Show>('all')
  const [month, setMonth] = useState(() => {
    const d = parseDate(today())
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState(today)
  const [status, setStatus] = useState<{ text: string; undo?: () => void } | null>(null)
  const [error, setError] = useState('')

  const [actionsFor, setActionsFor] = useState<JournalDream | null>(null)
  const [editing, setEditing] = useState<JournalDream | null>(null)
  const [sharing, setSharing] = useState<JournalDream | null>(null)

  const reload = useCallback(async () => {
    try {
      const [all, gone] = await Promise.all([loadJournal(), api.recentlyDeleted()])
      setDreams(all)
      setDeleted(gone)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading on arrival
    reload()
  }, [reload])

  // Runs a change, reloads, and says what happened (with Undo when there is one).
  async function act(change: () => Promise<unknown>, text: string, undo?: () => Promise<unknown>) {
    setError('')
    try {
      await change()
      await reload()
      setStatus({
        text,
        undo: undo && (() => act(undo, 'Restored.')),
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const all = dreams ?? []
  const shared = all.filter((d) => d.shared)
  const shown = show === 'shared' ? shared : all

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen bg-night" />
      <div className="relative mx-auto w-full max-w-md px-6 pb-24 pt-6">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/me')}
            className="-ml-2 flex h-10 items-center gap-1 rounded-pill pr-3 text-label text-fg-secondary hover:text-fg"
          >
            <ChevronLeft className="size-5" strokeWidth={1.5} />
            Me
          </button>
          <div className="flex items-center gap-2">
            <IconButton label="List view" active={view === 'list'} onClick={() => setView('list')}>
              <List className="size-5" strokeWidth={1.5} />
            </IconButton>
            <IconButton label="Calendar view" active={view === 'calendar'} onClick={() => setView('calendar')}>
              <CalendarDays className="size-5" strokeWidth={1.5} />
            </IconButton>
          </div>
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-title">Your dreams</h1>
          {dreams && (
            <span className="font-mono text-meta uppercase text-fg-muted">
              {all.length} {all.length === 1 ? 'dream' : 'dreams'} · {shared.length} shared
            </span>
          )}
        </header>

        <div className="mt-6">
          <PillScroller
            label="Which dreams"
            value={show}
            onChange={setShow}
            options={[
              { value: 'all' as const, label: 'All', count: all.length },
              { value: 'shared' as const, label: 'Shared', count: shared.length },
            ]}
          />
        </div>

        {status && (
          <div role="status" className="mt-4 flex animate-enter items-center gap-4 rounded-card border border-hairline bg-raised py-2 pl-4 pr-2">
            <span className="flex-1 text-label">{status.text}</span>
            {status.undo && (
              <button type="button" onClick={status.undo} className="h-9 rounded-pill px-4 text-label text-accent-soft hover:text-fg">
                Undo
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="mt-4 text-label font-normal text-ember" role="alert">
            {error}
          </p>
        )}

        {view === 'calendar' && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <span className="font-serif text-dream">
                {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex">
                <IconButton label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
                  <ChevronLeft className="size-4" strokeWidth={1.5} />
                </IconButton>
                <IconButton label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight className="size-4" strokeWidth={1.5} />
                </IconButton>
              </div>
            </div>
            <MonthGrid
              month={month}
              dreams={all}
              selected={selected}
              onSelect={setSelected}
              visible={new Set(shown.map((d) => d.id))}
            />
          </>
        )}

        <section className="mt-12 flex flex-col gap-2">
          <h2 className="font-mono text-meta uppercase text-fg-muted">
            {view === 'calendar'
              ? parseDate(selected).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : show === 'shared'
                ? 'Shared, newest first'
                : 'Newest first'}
          </h2>
          {dreams && (
            <ManageList
              dreams={view === 'calendar' ? shown.filter((d) => d.date === selected) : shown}
              empty={
                view === 'calendar'
                  ? 'No dream logged this night.'
                  : show === 'shared'
                    ? 'Nothing shared yet.'
                    : 'No dreams yet.'
              }
              onPick={setActionsFor}
            />
          )}
        </section>

        <Group title="Sharing">
          <UnshareEverything
            count={shared.length}
            onConfirm={() => act(() => api.unshareEverything(), 'All your dreams are private again.')}
          />
        </Group>

        <Group title="Recently deleted">
          {deleted.length === 0 ? (
            <p className="py-4 text-label font-normal text-fg-muted">Nothing here. Deleted dreams stay for 30 days.</p>
          ) : (
            <ul>
              {deleted.map((d) => (
                <li key={d.id} className="flex min-h-14 items-center justify-between gap-4 border-b border-hairline py-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-body">{d.title || `Dream ${String(d.number).padStart(3, '0')}`}</span>
                    <span className="font-mono text-meta uppercase text-fg-muted">
                      Gone for good {formatShortDate(d.purge_on)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => act(() => api.restoreDream(d.id), 'Dream restored.')}
                    className="shrink-0 text-label text-accent-soft"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Group>
      </div>

      {actionsFor && (
        <DreamActions
          dream={actionsFor}
          onClose={() => setActionsFor(null)}
          onEdit={() => setEditing(actionsFor)}
          onShare={() => setSharing(actionsFor)}
          onUnshare={() => act(() => api.unshare(actionsFor.id), 'Unshared. Only you can see it now.')}
          onDelete={() =>
            act(
              () => api.deleteDream(actionsFor.id),
              'Moved to Recently deleted.',
              () => api.restoreDream(actionsFor.id),
            )
          }
        />
      )}
      {editing && (
        <EditDreamSheet
          dreamId={editing.id}
          open
          onClose={() => setEditing(null)}
          onSaved={() => act(async () => {}, 'Changes saved.')}
        />
      )}
      {sharing && (
        <CommunityShareSheet
          dream={sharing}
          open
          onClose={() => setSharing(null)}
          onShared={() => act(async () => {}, 'Shared anonymously.')}
        />
      )}
    </div>
  )
}

function ManageList({
  dreams,
  empty,
  onPick,
}: {
  dreams: JournalDream[]
  empty: string
  onPick: (d: JournalDream) => void
}) {
  if (dreams.length === 0) return <p className="py-4 font-serif text-dream italic text-fg-secondary">{empty}</p>
  return (
    <ul>
      {dreams.map((d) => {
        const isHan = /\p{Script=Han}/u.test(d.symbol)
        return (
          <li key={d.id} className="border-b border-hairline last:border-b-0">
            <button
              type="button"
              onClick={() => onPick(d)}
              className="flex w-full items-center gap-4 py-4 text-left transition hover:bg-glass"
            >
              <div className="flex size-11 shrink-0 items-center justify-center">
                <DreamOrb emotion={d.emotion} blend={d.blend} size={20 + d.vividness * 24} glow={false} state="still" seed={d.number} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-dream" lang={isHan ? 'zh-Hans' : undefined}>
                    {d.symbol}
                  </span>
                  <span className="truncate font-serif text-body italic text-fg-secondary">{d.gloss}</span>
                </div>
                <span className="truncate text-label font-normal text-fg-muted">{d.title}</span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 font-mono text-meta uppercase">
                <span className="text-fg-muted">{formatShortDate(d.date)}</span>
                {d.shared && <span className="text-accent-soft">Shared</span>}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// What you can do with one dream. Delete asks once more before moving it to Recently deleted.
function DreamActions({
  dream,
  onClose,
  onEdit,
  onShare,
  onUnshare,
  onDelete,
}: {
  dream: JournalDream
  onClose: () => void
  onEdit: () => void
  onShare: () => void
  onUnshare: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const then = (fn: () => void) => () => {
    onClose()
    fn()
  }

  return (
    <Sheet open onClose={onClose} title={dream.title || dream.symbol}>
      {confirming ? (
        <>
          <p className="text-body text-fg-secondary">
            Move this dream to Recently deleted? You can restore it for 30 days.
            {dream.shared && ' It leaves Community right away.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={then(onDelete)}>
              Delete
            </Button>
          </div>
        </>
      ) : (
        <ul className="-mt-2">
          <Action icon={<BookOpen className="size-5" strokeWidth={1.5} />} onClick={then(() => navigate(`/dream/${dream.id}`))}>
            Open
          </Action>
          <Action icon={<Pencil className="size-5" strokeWidth={1.5} />} onClick={then(onEdit)}>
            Edit title and text
          </Action>
          {dream.shared ? (
            <Action icon={<EyeOff className="size-5" strokeWidth={1.5} />} onClick={then(onUnshare)}>
              Unshare from Community
            </Action>
          ) : (
            <Action icon={<Users className="size-5" strokeWidth={1.5} />} onClick={then(onShare)}>
              Share to Community
            </Action>
          )}
          <Action danger icon={<Trash2 className="size-5" strokeWidth={1.5} />} onClick={() => setConfirming(true)}>
            Delete
          </Action>
        </ul>
      )}
    </Sheet>
  )
}

function Action({
  icon,
  danger = false,
  onClick,
  children,
}: {
  icon: ReactNode
  danger?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <li className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        className={cn('flex min-h-14 w-full items-center gap-4 text-left text-body', danger ? 'text-ember' : 'text-fg hover:text-fg-secondary')}
      >
        <span className={danger ? 'text-ember' : 'text-fg-muted'}>{icon}</span>
        {children}
      </button>
    </li>
  )
}

// Two taps, so a stray one can't undo every share at once.
function UnshareEverything({ count, onConfirm }: { count: number; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-hairline py-3">
      <div className="flex flex-col gap-1">
        <span className="text-body">Unshare everything</span>
        <span className="text-label font-normal text-fg-muted">
          {armed ? `Tap again to make all ${count} private` : 'Removes all your dreams from Community'}
        </span>
      </div>
      <button
        type="button"
        disabled={count === 0}
        onClick={() => {
          if (!armed) return setArmed(true)
          setArmed(false)
          onConfirm()
        }}
        className="text-label text-ember disabled:text-fg-muted"
      >
        {armed ? 'Confirm' : 'Unshare'}
      </button>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 flex flex-col">
      <h2 className="font-mono text-meta uppercase text-fg-muted">{title}</h2>
      {children}
    </section>
  )
}

function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}
