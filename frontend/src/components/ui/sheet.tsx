import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

// Bottom sheet for short, focused tasks (share, save to folder, share preview).
// Closes on backdrop tap and Escape.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-bg/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90vh] w-full max-w-md animate-enter flex-col gap-6 overflow-y-auto rounded-t-glass border-t border-hairline bg-raised px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-3"
      >
        <span className="mx-auto h-1 w-10 shrink-0 rounded-pill bg-hairline" />
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-dream">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-pill text-fg-muted hover:text-fg"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
