import type { ReactNode } from 'react'
import { BookOpen, ChartSpline, CircleUser, Feather, Mic, Users } from 'lucide-react'
import { profile } from '@/data/prototypeState'
import { navigate, usePath } from '@/lib/router'
import { cn } from '@/lib/utils'

// Mobile screen frame (design-spec §7.1): one 24px side margin, content capped
// at phone width, and bottom padding so the fixed nav never covers the last row.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen bg-night" />
      <div className="relative mx-auto w-full max-w-md px-6 pb-32 pt-12">{children}</div>
      <BottomNav />
    </div>
  )
}

const TABS = [
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/patterns', label: 'Patterns', icon: ChartSpline },
  { path: '/capture', label: 'Capture', icon: Mic, center: true },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/me', label: 'Me', icon: CircleUser },
]

function BottomNav() {
  const path = usePath()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-raised/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-glass">
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
        {TABS.map(({ path: to, label, icon: Icon, center }) => {
          const active = path === to
          if (center) {
            // The Capture button shows how you'll start: a mic for voice, a quill for writing.
            const CaptureIcon = profile.captureWith === 'text' ? Feather : Icon
            return (
              <li key={to} className="flex justify-center">
                <button
                  type="button"
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => navigate(to)}
                  className="group relative -mt-6 flex size-16 items-center justify-center"
                >
                  {/* Soft breathing halo behind a see-through glass button */}
                  <span
                    className="absolute -inset-3 rounded-pill motion-safe:animate-breathe"
                    style={{ background: 'radial-gradient(circle, rgb(var(--accent) / 0.45) 0%, transparent 65%)' }}
                  />
                  <span
                    className="absolute inset-1 rounded-pill border border-accent-soft/40 backdrop-blur-glass transition group-hover:border-accent-soft/70"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 30%, rgb(var(--accent-soft) / 0.35) 0%, rgb(var(--accent) / 0.12) 60%, rgb(var(--bg) / 0.4) 100%)',
                      boxShadow: 'inset 0 1px 0 rgb(var(--text-primary) / 0.15)',
                    }}
                  />
                  <CaptureIcon className="relative size-6 text-fg" strokeWidth={1.5} />
                </button>
              </li>
            )
          }
          return (
            <li key={to}>
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(to)}
                className={cn(
                  'flex min-h-16 w-full flex-col items-center justify-center gap-1 text-meta transition',
                  active ? 'text-fg' : 'text-fg-muted hover:text-fg-secondary',
                )}
              >
                <Icon className="size-5" strokeWidth={1.5} />
                <span>{label}</span>
                <span className={cn('size-1 rounded-pill', active ? 'bg-accent-soft shadow-glow' : 'bg-transparent')} />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

type PageHeaderProps = {
  title: string
  meta?: string
  actions?: ReactNode
}

// Title in serif, one meta line at most, 40px icon actions on the right (§7.1 rule 6).
export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className="flex min-h-10 items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-title">{title}</h1>
        {meta && <span className="font-mono text-meta uppercase text-fg-muted">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}

export function IconButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex size-10 items-center justify-center rounded-pill border transition',
        active ? 'border-hairline bg-glass text-fg' : 'border-transparent text-fg-secondary hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
