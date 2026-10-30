import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { ApiError } from '@/lib/api'
import { signIn } from '@/lib/session'

// Sign in or create an account with email and password (decision 13).
// For now this comes first; the spec's "capture first, sign in later" flow is a later step.
// Google and Apple sign-in wait on developer accounts.

export default function SignIn() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const creating = mode === 'register'

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (creating && password !== confirm) return setError('Passwords don’t match.')
    setBusy(true)
    setError('')
    try {
      await signIn(mode, email.trim(), password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen bg-night" />
      <div className="relative mx-auto flex w-full max-w-md flex-col px-6 pb-24 pt-24">
        <DreamOrb emotion="lucid" blend="calm" size={96} className="self-center" />
        <h1 className="mt-12 font-serif text-title">
          {creating ? 'Start your dream journal.' : 'Welcome back.'}
          <br />
          <em className="text-fg-secondary">{creating ? 'Only you can read it.' : 'Your dreams are where you left them.'}</em>
        </h1>

        <form onSubmit={submit} className="mt-12 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-label font-normal text-fg-secondary">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-pill bg-raised px-4 text-body text-fg outline-none placeholder:text-fg-muted"
            />
          </label>
          <PasswordField
            label="Password"
            hint={creating ? 'at least 10 characters' : undefined}
            value={password}
            onChange={setPassword}
            autoComplete={creating ? 'new-password' : 'current-password'}
            minLength={creating ? 10 : undefined}
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
          {creating && (
            <PasswordField
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
          )}

          <p className="min-h-6 text-label font-normal text-ember" role="alert">
            {error}
          </p>

          <Button type="submit" disabled={busy}>
            {busy ? '…' : creating ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(creating ? 'login' : 'register')
            setConfirm('')
            setError('')
          }}
          className="mt-6 self-center text-label text-fg-secondary underline-offset-4 hover:text-fg hover:underline"
        >
          {creating ? 'I already have an account' : 'New here? Create an account'}
        </button>
      </div>
    </div>
  )
}

// One show/hide switch covers both password fields, so they can be checked side by side.
function PasswordField({
  label,
  hint,
  value,
  onChange,
  autoComplete,
  minLength,
  visible,
  onToggle,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  minLength?: number
  visible: boolean
  onToggle: () => void
}) {
  const Icon = visible ? EyeOff : Eye
  return (
    <label className="flex flex-col gap-2">
      <span className="text-label font-normal text-fg-secondary">
        {label}
        {hint && <span className="text-fg-muted"> · {hint}</span>}
      </span>
      <span className="flex h-11 items-center rounded-pill bg-raised pl-4 pr-1">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none"
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={onToggle}
          className="flex size-9 shrink-0 items-center justify-center rounded-pill text-fg-muted hover:text-fg"
        >
          <Icon className="size-4" strokeWidth={1.5} />
        </button>
      </span>
    </label>
  )
}
