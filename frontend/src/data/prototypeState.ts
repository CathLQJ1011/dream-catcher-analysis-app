import { SAMPLE_COMMENTS, STARTER_FOLDERS, type Comment } from '@/data/community'
import type { Emotion } from '@/lib/emotions'
import type { MemoryPref } from '@/lib/memories'

// In-memory state for the prototype, kept outside components so it survives
// moving between tabs. Resets on reload; the real app stores this server-side.

export const generatedImages = new Set<number>()
// A few of your dreams start out shared so Me has something to list.
export const sharedDreams = new Set<number>([41, 44, 47])

export const community = {
  liked: new Set<string>(),
  comments: new Map<string, Comment[]>(Object.entries(SAMPLE_COMMENTS)),
  /** folder name → shared dream ids */
  folders: new Map<string, string[]>(STARTER_FOLDERS.map((f) => [f, []])),
  seen: new Set<string>(),
}

/** Which orb represents you on Me: automatic, mixed by hand, or borrowed from a dream. */
export type ProfileOrb =
  | { mode: 'auto' }
  | { mode: 'mix'; emotion: Emotion; blend?: Emotion }
  | { mode: 'dream'; number: number }

export const profile: {
  orb: ProfileOrb
  name: string
  captureWith: 'voice' | 'text'
  /** "This time last year" on Journal: all dreams, calm ones only, or off. */
  memories: MemoryPref
  /** The date whose memory card was swiped away, so it stays hidden that day. */
  memoryDismissed: string | null
} = {
  orb: { mode: 'auto' },
  name: 'Anonymous dreamer',
  captureWith: 'voice',
  memories: 'calm',
  memoryDismissed: null,
}
