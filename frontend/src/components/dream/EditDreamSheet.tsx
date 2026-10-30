import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'

// Edit a dream's title and text. The server keeps the very first version of the
// text, so editing never loses what you wrote that morning.
// Give it a key that changes when it opens, so each opening starts fresh.
export function EditDreamSheet({
  dreamId,
  open,
  onClose,
  onSaved,
}: {
  dreamId: number
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Lists don't carry the full text, so it's loaded when the sheet opens.
  useEffect(() => {
    if (!open) return
    api
      .getDream(dreamId)
      .then((d) => {
        setTitle(d.title ?? '')
        setText(d.text)
      })
      .catch((e: Error) => setError(e.message))
  }, [open, dreamId])

  async function save() {
    if (!text?.trim()) return setError('The dream can’t be empty.')
    setBusy(true)
    try {
      await api.updateDream(dreamId, { title: title.trim(), text: text.trim() })
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit dream">
      {text === null ? (
        <span className="font-mono text-meta uppercase text-fg-muted">{error ? '' : 'Loading…'}</span>
      ) : (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-label font-normal text-fg-secondary">Title</span>
            <input
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-pill bg-bg px-4 font-serif text-body text-fg outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label font-normal text-fg-secondary">The dream</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full resize-none rounded-card bg-bg p-4 font-serif text-dream text-fg outline-none"
            />
          </label>
        </>
      )}
      {error && (
        <p className="text-label font-normal text-ember" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy || text === null} onClick={save}>
          Save
        </Button>
      </div>
    </Sheet>
  )
}
