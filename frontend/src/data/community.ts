import type { Emotion } from '@/lib/emotions'

// Invented "shared by others" dreams for the Community prototype. Anonymous by design:
// no names or handles, only a wanderer number.

export type SharedDream = {
  id: string
  wanderer: number
  symbol: string
  gloss: string
  text: string
  emotion: Emotion
  blend?: Emotion
  likes: number
}

export const SHARED_DREAMS: SharedDream[] = [
  { id: 's1', wanderer: 214, symbol: 'elevator', gloss: '电梯', emotion: 'unease', text: 'The elevator only went sideways. Every floor was the same corridor, but the paintings changed.', likes: 41 },
  { id: 's2', wanderer: 88, symbol: '鱼', gloss: 'fish in the sky', emotion: 'lucid', blend: 'joy', text: 'Fish were swimming through the air above the market. I realized I was dreaming and caught one with my hands; it was cold and laughing.', likes: 63 },
  { id: 's3', wanderer: 1302, symbol: 'school', gloss: '学校', emotion: 'fear', text: 'Back in high school, but I was my current age and nobody recognized me. The bell would not stop ringing.', likes: 112 },
  { id: 's4', wanderer: 57, symbol: 'piano', gloss: '钢琴', emotion: 'calm', text: 'A piano in an empty field playing itself, very slowly. I lay in the grass until the song ended.', likes: 29 },
  { id: 's5', wanderer: 976, symbol: '月亮', gloss: 'two moons', emotion: 'longing', blend: 'calm', text: 'There were two moons and one of them was closer every night. Nobody else seemed to mind.', likes: 54 },
  { id: 's6', wanderer: 431, symbol: 'teeth', gloss: '掉牙', emotion: 'fear', blend: 'unease', text: 'My teeth turned into tiny white flowers and fell into my soup. I kept eating anyway.', likes: 208 },
  { id: 's7', wanderer: 12, symbol: 'bakery', gloss: '面包店', emotion: 'joy', text: 'A bakery that sold bread shaped like my old friends. Each one tasted like a memory of them.', likes: 37 },
  { id: 's8', wanderer: 660, symbol: '雨', gloss: 'indoor rain', emotion: 'sadness', text: 'It rained only inside my childhood bedroom. I put out bowls, but they were already full.', likes: 75 },
  { id: 's9', wanderer: 305, symbol: 'flying', gloss: '飞翔', emotion: 'lucid', text: 'I flew by swimming through the air, breaststroke, over rooftops. It was harder than it looks.', likes: 96 },
  { id: 's10', wanderer: 1188, symbol: 'mirror', gloss: '镜子', emotion: 'unease', text: 'My reflection blinked a second after I did. When I left the room it stayed.', likes: 151 },
]

export const STARTER_FOLDERS = ['Strange & funny', 'Water dreams', 'Comforting']

export type Comment = { wanderer: number | 'you'; text: string }

// Invented comments, kept short and kind.
export const SAMPLE_COMMENTS: Record<string, Comment[]> = {
  s2: [
    { wanderer: 540, text: 'Cold and laughing is such a specific detail. I love it.' },
    { wanderer: 77, text: 'I get flying-fish dreams before exams, weirdly.' },
  ],
  s3: [{ wanderer: 1021, text: 'The bell that never stops. Same.' }],
  s6: [
    { wanderer: 18, text: 'Flowers instead of teeth is a much nicer version of this dream.' },
    { wanderer: 902, text: 'Eating anyway is the most dream-logic thing ever.' },
    { wanderer: 333, text: 'Saving this one.' },
  ],
  s10: [{ wanderer: 245, text: 'This gave me chills.' }],
}

// Aggregate numbers for the "This week" strip (invented for the prototype).
export const WEEK_STATS = { shared: 210, topSymbol: '水', topSymbolShare: '1 in 5', comments: 486 }
