import type { Emotion } from '@/lib/emotions'

// Talks to the backend (docs/api-contract.md). Requests go to /api on the same
// origin; in development Vite passes them on to FastAPI (vite.config.ts). The
// login lives in an http-only cookie, so nothing here ever touches a token.

const BASE = '/api/v1'

/** The contract's error shape: { error: { code, message, field } }. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly field: string | null

  constructor(status: number, code: string, message: string, field: string | null = null) {
    super(message)
    this.status = status
    this.code = code
    this.field = field
  }
}

let onUnauthorized = () => {}
/** Called when the server says the login has expired, so the app can show sign-in again. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'offline', 'Can’t reach Dream Catcher. Check your connection and try again.')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    const e = data?.error
    throw new ApiError(res.status, e?.code ?? 'error', e?.message ?? 'Something went wrong. Try again.', e?.field ?? null)
  }
  return data as T
}

/* ---------- Shapes ---------- */

export type User = {
  id: number
  email: string
  display_name: string
  capture_with: 'voice' | 'text'
  memories: 'all' | 'gentle' | 'off'
  stats: { dreams: number; since: string | null; shared: number; top_emotions: Emotion[] }
}

export type SymbolRef = { code: string; term_zh: string; term_en: string }

export type ElementKind = 'symbol' | 'person' | 'place' | 'body' | 'media' | 'color'

export type DreamOut = {
  id: number
  number: number
  dreamed_on: string
  text: string
  title: string | null
  valence: number | null
  intensity: number | null
  vividness: number | null
  lucidity: number | null
  dream_type: 'pleasant' | 'nightmare' | 'mixed' | 'neutral' | null
  visibility: 'private' | 'shared'
  top_element_id: number | null
  emotions: { position: number; emotion: Emotion; intensity: number | null; kept: boolean }[]
  elements: {
    id: number
    kind: ElementKind
    value: string
    position: number | null
    kept: boolean
    symbol: SymbolRef | null
  }[]
}

export type DreamSummary = {
  id: number
  number: number
  dreamed_on: string
  title: string | null
  top_symbol: { value: string; term_zh: string | null; term_en: string | null } | null
  emotion: Emotion | null
  blend: Emotion | null
  vividness: number | null
  valence: number | null
  dream_type: DreamOut['dream_type']
  visibility: DreamOut['visibility']
}

export type PatternDream = DreamSummary & { intensity: number | null; lucidity: number | null }
export type Lens = 'emotion' | 'symbols' | 'rhythms' | 'colors' | 'people'
export type Period = '7d' | '30d' | 'year'
export type Named = { name: string; count: number }
export type ColorRow = { name: string; hex: string; dreams: number }
export type StripeColor = { name: string; hex: string; pct: number; warmth: 'warm' | 'cool' | 'neutral' }

/** One Patterns lens (docs/api-contract.md, Patterns). `hero` depends on the lens. */
export type PatternFrame = {
  lens: Lens
  period: Period
  dream_count: number
  based_on: number
  locked: boolean
  hero: {
    points?: PatternDream[]
    trend?: { date: string; valence: number }[]
    map_reading?: string
    top?: Named[]
    weekdays?: number[]
    busiest?: number
    stripes?: { dream: PatternDream; colors: StripeColor[] }[]
    have?: number
    need?: number
  }
  stats: { value: string; label: string }[]
  reading: string
  list_title: string
  list: PatternDream[] | ColorRow[]
}

export type RelatedDream = { dream: DreamSummary; symbols: string[]; people: string[] }

export type DeletedDream = { id: number; number: number; dreamed_on: string; title: string | null; purge_on: string }

export type DreamCreate = {
  dreamed_on: string
  text: string
  source?: 'voice' | 'text'
  title?: string
  valence?: number
  intensity?: number
  vividness?: number
  lucidity?: number
  mood_on_waking?: string
  emotions?: { position: number; emotion: Emotion; ai_suggested: boolean }[]
  elements?: { kind: ElementKind; value: string; position: number; ai_suggested: boolean; kept: boolean }[]
  day_residue?: { note: string }[]
}

/* ---------- Endpoints ---------- */

export const api = {
  register: (email: string, password: string) => request<User>('POST', '/auth/register', { email, password }),
  login: (email: string, password: string) => request<User>('POST', '/auth/login', { email, password }),
  logout: () => request<void>('POST', '/auth/logout'),
  me: () => request<User>('GET', '/me'),

  listDreams: (cursor?: string) =>
    request<{ items: DreamSummary[]; next_cursor: string | null }>(
      'GET',
      `/dreams?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    ),
  getDream: (id: number) => request<DreamOut>('GET', `/dreams/${id}`),
  createDream: (dream: DreamCreate) => request<DreamOut>('POST', '/dreams', dream),
  updateDream: (id: number, changes: { title?: string; text?: string }) =>
    request<DreamOut>('PATCH', `/dreams/${id}`, changes),
  deleteDream: (id: number) => request<void>('DELETE', `/dreams/${id}`),
  restoreDream: (id: number) => request<DreamOut>('POST', `/dreams/${id}/restore`),
  recentlyDeleted: () => request<DeletedDream[]>('GET', '/dreams/deleted'),

  related: (id: number) => request<RelatedDream[]>('GET', `/dreams/${id}/related`),
  pattern: (lens: Lens, period: Period) => request<PatternFrame>('GET', `/patterns/${lens}?period=${period}`),

  previewShare: (id: number) => request<{ text: string; removed: string[] }>('POST', `/dreams/${id}/share/preview`),
  share: (id: number, text: string) => request<unknown>('POST', `/dreams/${id}/share`, { text }),
  unshare: (id: number) => request<void>('DELETE', `/dreams/${id}/share`),
  unshareEverything: () => request<void>('DELETE', '/me/shares'),
}
