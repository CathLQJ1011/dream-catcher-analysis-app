// Emotion spectrum from docs/design-spec.md §3.2. The colors themselves live in
// src/index.css as --emo-<id>-core / --emo-<id>-edge; this file only names them.

export const EMOTIONS = [
  { id: 'calm', label: 'Calm', zh: '平静' },
  { id: 'lucid', label: 'Wonder', zh: '清醒' },
  { id: 'longing', label: 'Longing', zh: '怀念' },
  { id: 'joy', label: 'Joy', zh: '喜悦' },
  { id: 'fear', label: 'Fear', zh: '恐惧' },
  { id: 'unease', label: 'Unease', zh: '不安' },
  { id: 'sadness', label: 'Sadness', zh: '悲伤' },
  { id: 'neutral', label: 'Neutral', zh: '模糊' },
] as const

export type Emotion = (typeof EMOTIONS)[number]['id']

export const core = (e: Emotion, alpha = 1) => `rgb(var(--emo-${e}-core) / ${alpha})`
export const edge = (e: Emotion, alpha = 1) => `rgb(var(--emo-${e}-edge) / ${alpha})`
