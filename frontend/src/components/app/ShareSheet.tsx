import { useState, type ReactNode } from 'react'
import { Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'

// One share flow for every screen (docs/screens.md "Sharing"): a clean preview
// card designed for sharing, instead of a raw screenshot of the app.
export function ShareSheet({
  open,
  onClose,
  title,
  text,
  preview,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** Text passed to the system share menu alongside the link. */
  text: string
  preview: ReactNode
}) {
  const [status, setStatus] = useState('')

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setStatus('Link copied.')
      }
    } catch {
      // The user closed the share menu; nothing to report.
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        setStatus('')
        onClose()
      }}
      title={title}
    >
      <div className="overflow-hidden rounded-card border border-hairline bg-bg">{preview}</div>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setStatus('Saving as an image comes with the real build.')}>
            <Download className="size-4" strokeWidth={1.5} />
            Save image
          </Button>
          <Button onClick={share}>
            <Share className="size-4" strokeWidth={1.5} />
            Share…
          </Button>
        </div>
        <p className="min-h-6 text-center font-mono text-meta uppercase text-fg-muted" aria-live="polite">
          {status}
        </p>
      </div>
    </Sheet>
  )
}
