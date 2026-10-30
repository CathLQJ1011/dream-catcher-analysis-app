import { useSyncExternalStore } from 'react'
import { api, ApiError, setUnauthorizedHandler, type User } from '@/lib/api'

// Who is signed in. 'loading' until the first /me answers; null means signed out.

type Session = User | null | 'loading'

let current: Session = 'loading'
const listeners = new Set<() => void>()

function set(next: Session) {
  current = next
  listeners.forEach((l) => l())
}

export function useSession() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

export async function loadSession() {
  try {
    set(await api.me())
  } catch (e) {
    // Not signed in is the normal answer; anything else (server down) also lands on sign-in,
    // where the error shows when they try.
    if (!(e instanceof ApiError)) throw e
    set(null)
  }
}

export async function signIn(mode: 'login' | 'register', email: string, password: string) {
  set(await (mode === 'login' ? api.login(email, password) : api.register(email, password)))
}

export async function signOut() {
  await api.logout().catch(() => {}) // signed out locally even if the server can't be reached
  set(null)
}

setUnauthorizedHandler(() => set(null))
