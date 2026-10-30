import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { DreamOrb } from '@/components/dream/DreamOrb'
import type { JournalDream } from '@/data/journal'
import { api, ApiError } from '@/lib/api'

// Share to Community, always through a preview: the anonymized text is shown
// (and can be edited) before anything leaves your journal.
// Give it a key that changes when it opens, so each opening starts fresh.
export function CommunityShareSheet({
  dream,
  open,
  onClose,
  onShared,
}: {
  dream: JournalDream
  open: boolean
  onClose: () => void
  onShared: () => void
}) {
  const [text, setText] = useState<string | null>(null)
  const [removed, setRemoved] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    api
      .previewShare(dream.id)
      .then((p) => {
        setText(p.text)
        setRemoved(p.removed)
      })
      .catch((e: Error) => setError(e.message))
  }, [open, dream.id])

  async function share() {
    if (!text?.trim()) return
    setBusy(true)
    try {
      await api.share(dream.id, text.trim())
      onShared()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t share. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="This is what others will see">
      <div className="flex flex-col gap-4 rounded-card border border-hairline bg-bg p-6">
        <div className="flex items-center gap-4">
          <DreamOrb emotion={dream.emotion} blend={dream.blend} size={40} seed={dream.number} />
          <span className="font-serif text-title">{dream.symbol}</span>
        </div>
        {text === null ? (
          <span className="font-mono text-meta uppercase text-fg-muted">{error ? '' : 'Preparing…'}</span>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            aria-label="Shared text"
            className="w-full resize-none bg-transparent font-serif text-dream text-fg outline-none"
          />
        )}
      </div>
      <ul className="flex flex-col gap-2 text-label font-normal text-fg-secondary">
        <li>✦ No name, date or location is shared.</li>
        {removed.length > 0 && (
          <li>
            ✦ Replaced with “someone”: {removed.join(', ')}.
          </li>
        )}
        <li>✦ You can edit the text above, and unshare at any time.</li>
      </ul>
      {error && (
        <p className="text-label font-normal text-ember" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onClose}>
          Keep private
        </Button>
        <Button disabled={busy || !text?.trim()} onClick={share}>
          Share
        </Button>
      </div>
    </Sheet>
  )
}
