import type { Emotion } from '@/lib/emotions'

// Invented dreams for prototyping. None of these are real journal entries
// (see the privacy rule in docs/screens.md). Shaped after the codebook fields
// the real data model will have.

export type DreamColor = { name: string; hex: string; pct: number; warmth: 'warm' | 'cool' | 'neutral' }

export type SampleDream = {
  number: number
  date: string // YYYY-MM-DD
  title: string
  text: string // the dream as written
  symbol: string // top symbol, shown as the headline
  gloss: string
  emotion: Emotion
  blend?: Emotion
  valence: -2 | -1 | 0 | 1 | 2
  intensity: 1 | 2 | 3 | 4 | 5
  vividness: number // 0–1
  lucidity: 0 | 1 | 2 | 3
  symbols: string[]
  people: string[]
  // Dream palettes are data recorded per dream, not UI colors.
  colors: DreamColor[]
}

export const SAMPLE_DREAMS: SampleDream[] = [
  // A year earlier, so "one year ago tonight" has something to show.
  { number: 3, text: 'A lighthouse on a hill made of folded paper. Its light turned pages instead of sweeping the sea, and I read along as it went round.', date: '2025-10-18', title: 'A lighthouse that turned pages', symbol: 'lighthouse', gloss: '灯塔', emotion: 'lucid', blend: 'calm', valence: 2, intensity: 3, vividness: 0.8, lucidity: 1, symbols: ['lighthouse', 'paper', '水'], people: [], colors: [{ name: 'Paper', hex: '#E8E1D0', pct: 50, warmth: 'neutral' }, { name: 'Night sea', hex: '#14203A', pct: 50, warmth: 'cool' }] },
  { number: 4, text: 'Someone kept knocking on every window of the house at once. I could not see who, and the knocking got closer together.', date: '2025-10-19', title: 'Knocking on every window', symbol: 'window', gloss: '窗', emotion: 'fear', valence: -2, intensity: 5, vividness: 0.7, lucidity: 0, symbols: ['window', 'house', 'night'], people: ['stranger'], colors: [{ name: 'Black', hex: '#141218', pct: 70, warmth: 'neutral' }, { name: 'Porch red', hex: '#9C2B22', pct: 30, warmth: 'warm' }] },
  { number: 5, text: 'I was walking home on a long bridge over a river at night, and every streetlamp I passed turned into a small moon.', date: '2025-10-20', title: 'Streetlamps turning into moons', symbol: '月亮', gloss: 'small moons', emotion: 'calm', blend: 'longing', valence: 1, intensity: 2, vividness: 0.65, lucidity: 0, symbols: ['月亮', 'bridge', 'river', 'night'], people: [], colors: [{ name: 'Moon white', hex: '#EEEBF2', pct: 40, warmth: 'cool' }, { name: 'River blue', hex: '#2E3F66', pct: 60, warmth: 'cool' }] },
  { number: 31, text: 'The library had no floor, only tides. Shelves rose and sank with the water, and I read whatever drifted close enough to reach.', date: '2026-09-22', title: 'A library where the shelves were tides', symbol: '水', gloss: 'flooded library', emotion: 'calm', valence: 1, intensity: 2, vividness: 0.6, lucidity: 0, symbols: ['水', 'books', 'stairs'], people: [], colors: [{ name: 'Ink blue', hex: '#1F2A5C', pct: 60, warmth: 'cool' }, { name: 'Paper', hex: '#E8E1D0', pct: 40, warmth: 'neutral' }] },
  { number: 32, text: 'I ran down to the harbor but the last ferry was already a light on the water. A stranger said there would be another one, but not tonight.', date: '2026-09-24', title: 'Missing the last ferry home', symbol: 'ferry', gloss: '渡船', emotion: 'unease', blend: 'longing', valence: -1, intensity: 3, vividness: 0.5, lucidity: 0, symbols: ['ferry', '水', 'night'], people: ['stranger'], colors: [{ name: 'Harbor grey', hex: '#5A6170', pct: 70, warmth: 'cool' }, { name: 'Lamp amber', hex: '#E0A33C', pct: 30, warmth: 'warm' }] },
  { number: 33, text: 'An orchard where every branch held a paper lantern instead of fruit. My friend and I picked them, and each one was warm in our hands.', date: '2026-09-25', title: 'An orchard that grew lanterns', symbol: '灯笼', gloss: 'lantern orchard', emotion: 'joy', valence: 2, intensity: 4, vividness: 0.8, lucidity: 1, symbols: ['灯笼', 'trees'], people: ['friend'], colors: [{ name: 'Lantern red', hex: '#C8381E', pct: 45, warmth: 'warm' }, { name: 'Leaf green', hex: '#3E6B3A', pct: 35, warmth: 'cool' }, { name: 'Gold', hex: '#E6B84A', pct: 20, warmth: 'warm' }] },
  { number: 34, text: 'I smiled in the mirror and my teeth came loose like glass beads. I kept trying to string them back together before anyone noticed.', date: '2026-09-27', title: 'Teeth turning to glass beads', symbol: '掉牙', gloss: 'losing teeth', emotion: 'fear', valence: -2, intensity: 5, vividness: 0.9, lucidity: 0, symbols: ['掉牙', 'mirror'], people: [], colors: [{ name: 'Glass', hex: '#BFD7DE', pct: 50, warmth: 'cool' }, { name: 'Bone', hex: '#E9E2D2', pct: 50, warmth: 'neutral' }] },
  { number: 35, text: 'I was flying low over a white salt flat, so low my shadow kept up with me. I knew I was dreaming and decided to go higher.', date: '2026-09-29', title: 'Flying low over a salt flat', symbol: 'flying', gloss: '飞翔', emotion: 'lucid', valence: 2, intensity: 4, vividness: 0.95, lucidity: 3, symbols: ['flying', 'salt'], people: [], colors: [{ name: 'Salt white', hex: '#F1EFEA', pct: 55, warmth: 'neutral' }, { name: 'Sky violet', hex: '#7A6BD8', pct: 45, warmth: 'cool' }] },
  { number: 36, text: 'A long hallway of doors. Behind every one it was raining, softly, on a different room I almost remembered.', date: '2026-10-01', title: 'A hallway of doors that open onto rain', symbol: '门', gloss: 'doors', emotion: 'calm', blend: 'longing', valence: 1, intensity: 2, vividness: 0.4, lucidity: 0, symbols: ['门', 'rain', '水'], people: [], colors: [{ name: 'Rain grey', hex: '#7D8796', pct: 65, warmth: 'cool' }, { name: 'Door brown', hex: '#6B4A33', pct: 35, warmth: 'warm' }] },
  { number: 37, text: 'A cat sat on the platform bench and spoke only in train announcements. I followed its directions and somehow ended up home.', date: '2026-10-03', title: 'A cat that spoke in train announcements', symbol: 'cat', gloss: '猫', emotion: 'joy', blend: 'unease', valence: 1, intensity: 3, vividness: 0.7, lucidity: 1, symbols: ['cat', 'train'], people: ['stranger'], colors: [{ name: 'Platform yellow', hex: '#E8C547', pct: 40, warmth: 'warm' }, { name: 'Steel', hex: '#6C7380', pct: 60, warmth: 'cool' }] },
  { number: 38, text: 'The exam had started and I could not find my seat. The clock on the wall was red and moved faster every time I looked at it.', date: '2026-10-05', title: 'Searching an exam hall for my seat', symbol: 'exam', gloss: '考试', emotion: 'unease', valence: -1, intensity: 4, vividness: 0.6, lucidity: 0, symbols: ['exam', 'clock'], people: ['teacher', 'classmates'], colors: [{ name: 'Fluorescent', hex: '#E3E8D9', pct: 70, warmth: 'cool' }, { name: 'Clock red', hex: '#B3261E', pct: 30, warmth: 'warm' }] },
  { number: 39, text: 'I found a courtyard behind the old house that I had forgotten existed. Swallows nested in the eaves, and my grandmother was sweeping it as if she had been waiting.', date: '2026-10-06', title: 'An old house with a courtyard I had forgotten', symbol: '祖屋', gloss: 'old house', emotion: 'longing', valence: 0, intensity: 3, vividness: 0.3, lucidity: 0, symbols: ['祖屋', 'courtyard', 'swallows'], people: ['grandmother'], colors: [{ name: 'Faded red', hex: '#9C4A3C', pct: 40, warmth: 'warm' }, { name: 'Moss', hex: '#5C6B45', pct: 35, warmth: 'cool' }, { name: 'Dusk', hex: '#C9A27A', pct: 25, warmth: 'warm' }] },
  { number: 40, text: 'Someone was chasing me through a mall that kept adding new floors. Every escalator led to another identical level lit in pink neon.', date: '2026-10-08', title: 'Chased through a mall that kept extending', symbol: 'chase', gloss: '追逐', emotion: 'fear', blend: 'unease', valence: -2, intensity: 5, vividness: 0.85, lucidity: 0, symbols: ['chase', 'stairs'], people: ['stranger'], colors: [{ name: 'Neon pink', hex: '#E0479E', pct: 35, warmth: 'warm' }, { name: 'Black', hex: '#141218', pct: 65, warmth: 'neutral' }] },
  { number: 41, text: 'Whales were swimming in a sea under the city streets. I swam with them and could breathe, and the water glowed where they passed.', date: '2026-10-09', title: 'Swimming with whales under the city', symbol: '鲸', gloss: 'whales', emotion: 'lucid', blend: 'calm', valence: 2, intensity: 3, vividness: 0.9, lucidity: 2, symbols: ['鲸', '水'], people: [], colors: [{ name: 'Deep indigo', hex: '#1A1230', pct: 50, warmth: 'cool' }, { name: 'Tidal blue', hex: '#7C93F2', pct: 35, warmth: 'cool' }, { name: 'Phosphor', hex: '#FFD08A', pct: 15, warmth: 'warm' }] },
  { number: 42, text: 'I was at a wedding where none of the guests had faces. Everyone was kind, and that made it stranger.', date: '2026-10-11', title: 'A wedding where no one had faces', symbol: 'faces', gloss: '无脸', emotion: 'unease', valence: -1, intensity: 3, vividness: 0.55, lucidity: 0, symbols: ['faces', 'wedding'], people: ['strangers', 'friend'], colors: [{ name: 'Veil white', hex: '#EEEBF2', pct: 60, warmth: 'neutral' }, { name: 'Rose', hex: '#C97A8E', pct: 40, warmth: 'warm' }] },
  { number: 43, text: 'Snow was falling upward from the river into the sky. I stood on the bridge and watched the flakes leave.', date: '2026-10-13', title: 'Snow falling upward from the river', symbol: '雪', gloss: 'upward snow', emotion: 'calm', valence: 1, intensity: 2, vividness: 0.65, lucidity: 1, symbols: ['雪', '水'], people: [], colors: [{ name: 'Snow', hex: '#F2F4F8', pct: 55, warmth: 'cool' }, { name: 'River slate', hex: '#3E4A5C', pct: 45, warmth: 'cool' }] },
  { number: 44, text: 'I stood in a wooden tower with no roof while warm water rose up the spiral stairs. It was the temperature of skin, and I was not afraid of it.', date: '2026-10-14', title: 'The warm tide in the tower', symbol: '水', gloss: 'warm sea', emotion: 'longing', blend: 'calm', valence: 1, intensity: 3, vividness: 0.75, lucidity: 2, symbols: ['水', 'tower', 'stairs'], people: [], colors: [{ name: 'Indigo', hex: '#1A1230', pct: 45, warmth: 'cool' }, { name: 'Tidal', hex: '#7C93F2', pct: 35, warmth: 'cool' }, { name: 'Phosphor', hex: '#FFD08A', pct: 20, warmth: 'warm' }] },
  { number: 45, text: "My phone rang, but only when I held it underwater. My sister's voice came through, slow and far away, and I could not answer.", date: '2026-10-14', title: 'A phone that only rang underwater', symbol: 'phone', gloss: '电话', emotion: 'sadness', valence: -1, intensity: 2, vividness: 0.35, lucidity: 0, symbols: ['phone', '水'], people: ['sister'], colors: [{ name: 'Murk teal', hex: '#234A52', pct: 80, warmth: 'cool' }, { name: 'Screen glow', hex: '#BFE3EA', pct: 20, warmth: 'cool' }] },
  { number: 46, text: 'I was painting the sky, but every stroke dried a different, wrong blue. I kept painting anyway.', date: '2026-10-17', title: 'Painting a sky that kept drying wrong', symbol: 'paint', gloss: '画', emotion: 'neutral', valence: 0, intensity: 2, vividness: 0.45, lucidity: 1, symbols: ['paint', 'sky'], people: [], colors: [{ name: 'Ochre', hex: '#C58A2E', pct: 50, warmth: 'warm' }, { name: 'Wrong blue', hex: '#4D6FB8', pct: 50, warmth: 'cool' }] },
  { number: 47, text: 'The lanterns came back, this time floating on a black sea. My friend and I lit them from a boat, one by one.', date: '2026-10-18', title: 'Lanterns again, this time on the sea', symbol: '灯笼', gloss: 'lanterns on water', emotion: 'joy', blend: 'lucid', valence: 2, intensity: 4, vividness: 0.85, lucidity: 2, symbols: ['灯笼', '水'], people: ['friend'], colors: [{ name: 'Lantern red', hex: '#C8381E', pct: 40, warmth: 'warm' }, { name: 'Night sea', hex: '#14203A', pct: 60, warmth: 'cool' }] },
  { number: 48, text: 'A night train with no last stop. The window showed towns I had never been to, and the stranger across from me kept asking for the time.', date: '2026-10-20', title: 'A train with no last stop', symbol: 'train', gloss: '火车', emotion: 'longing', valence: 0, intensity: 3, vividness: 0.5, lucidity: 0, symbols: ['train', 'night'], people: ['stranger'], colors: [{ name: 'Carriage green', hex: '#3F5E4A', pct: 55, warmth: 'cool' }, { name: 'Window gold', hex: '#E6B84A', pct: 45, warmth: 'warm' }] },
]

/** "Today" for the prototype, so the sample data always looks current. */
export const PROTOTYPE_TODAY = '2026-10-20'

export function findDream(number: number) {
  return SAMPLE_DREAMS.find((d) => d.number === number)
}

/** Prototype-only: keeps a newly captured dream in memory until the page reloads. */
export function addDream(dream: Omit<SampleDream, 'number' | 'date'>, date = PROTOTYPE_TODAY) {
  const number = Math.max(...SAMPLE_DREAMS.map((d) => d.number)) + 1
  SAMPLE_DREAMS.push({ ...dream, number, date })
  return number
}
