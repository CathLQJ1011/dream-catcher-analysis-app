import { useState, type ReactNode } from 'react'
import { BookOpen, ChartSpline, Mic, Sparkle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { DreamOrb, type OrbState } from '@/components/dream/DreamOrb'
import { EmotionChip } from '@/components/dream/EmotionChip'
import { DreamCard } from '@/components/dream/DreamCard'
import { EMOTIONS, edge, type Emotion } from '@/lib/emotions'
import { cn } from '@/lib/utils'

// Living design system (design-spec §3–§10). Every later screen should be built
// from what this page shows. Being a catalog, it breaks the "one bloom per
// screen" budget on purpose; real screens must not.

const BASE_COLORS = [
  { token: 'bg', className: 'bg-bg', hex: '#0A0810', note: 'App background' },
  { token: 'bg-raised', className: 'bg-raised', hex: '#14101D', note: 'Panels, sheets, nav' },
  { token: 'surface-glass', className: 'bg-glass', hex: 'white 6%', note: 'Floating cards' },
  { token: 'border-hairline', className: 'bg-hairline', hex: 'white 10%', note: '1px rules, outlines' },
  { token: 'text-primary', className: 'bg-fg', hex: '#EDEEF3', note: '17.2 : 1' },
  { token: 'text-secondary', className: 'bg-fg-secondary', hex: '#A3A7B7', note: '8.3 : 1' },
  { token: 'text-muted', className: 'bg-fg-muted', hex: '#7A7F94', note: '5.0 : 1' },
  { token: 'accent', className: 'bg-accent', hex: '#6B3BFF', note: 'Lucid Violet · fills only' },
  { token: 'accent-soft', className: 'bg-accent-soft', hex: '#B49CFF', note: 'Lavender · 8.7 : 1' },
  { token: 'ember', className: 'bg-ember', hex: '#FF5A36', note: 'High arousal, destructive' },
]

const TYPE_SCALE = [
  {
    token: 'display',
    spec: '3.5rem / 1.0 · serif',
    className: 'font-serif text-display',
    en: 'October 6th',
    zh: '十月六日',
  },
  {
    token: 'title',
    spec: '2rem / 1.15 · serif',
    className: 'font-serif text-title',
    en: 'The house with no doors',
    zh: '没有门的房子',
  },
  {
    token: 'dream',
    spec: '1.25rem / 1.75 · serif',
    className: 'font-serif text-dream',
    en: 'I was walking along the shore at night, and every wave that reached my feet was warm, like bathwater left out for hours.',
    zh: '夜里我沿着海边走，每一道涌到脚边的浪都是温的，像放了很久的洗澡水。',
  },
  {
    token: 'body',
    spec: '1rem / 1.6 · sans',
    className: 'font-sans text-body',
    en: 'Water often stands for the unconscious. Its temperature here suggests the feeling is familiar rather than threatening.',
    zh: '水常被看作潜意识的象征。这里的温度说明这种感受是熟悉的，而不是威胁。',
  },
  {
    token: 'label',
    spec: '0.875rem / 1.4 · sans 500',
    className: 'font-sans text-label',
    en: 'Interpret dream',
    zh: '解读梦境',
  },
  {
    token: 'meta',
    spec: '0.75rem / 1.4 · mono, +0.08em',
    className: 'font-mono text-meta uppercase',
    en: 'Dream — 047 · 06.10.2026',
    zh: '周公解梦 · 第 047 号',
  },
]

const ORB_STATES: OrbState[] = ['idle', 'recording', 'interpreting', 'still']

export default function Styleguide() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen bg-night" />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-24 px-4 py-16 sm:px-8">
        <Header />
        <ColorsSection />
        <TypeSection />
        <OrbSection />
        <ComponentsSection />
        <DataSection />
        <OrnamentSection />
      </main>
    </div>
  )
}

function Header() {
  return (
    <header className="flex animate-enter flex-col gap-6">
      <div className="flex justify-between font-mono text-meta uppercase text-fg-muted">
        <span>[ Styleguide ]</span>
        <span>Dream Catcher — v1</span>
      </div>
      <h1 className="font-serif text-display">
        Luminous Nocturne.
        <br />
        <em className="text-fg-secondary">A journal for the night.</em>
      </h1>
      <p className="max-w-reading text-fg-secondary">
        Every token and component the app is built from, in one place. Serif for what you dreamed,
        sans for what the app says, mono for what the app measures.
      </p>
    </header>
  )
}

function Section({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-8 border-t border-hairline pt-6">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-meta uppercase text-fg-muted">{index}</span>
        <h2 className="font-serif text-title">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ColorsSection() {
  return (
    <Section index="§3" title="Color">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {BASE_COLORS.map((c) => (
          <div key={c.token} className="flex flex-col gap-3">
            <div className={cn('h-20 rounded-image border border-hairline', c.className)} />
            <div className="flex flex-col">
              <span className="font-mono text-meta text-fg">{c.token}</span>
              <span className="font-mono text-meta text-fg-muted">{c.hex}</span>
              <span className="text-label font-normal text-fg-secondary">{c.note}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function TypeSection() {
  return (
    <Section index="§4" title="Type">
      <div className="flex flex-col">
        {TYPE_SCALE.map((t) => (
          <div
            key={t.token}
            className="grid gap-4 border-b border-hairline py-8 last:border-b-0 lg:grid-cols-[10rem_1fr_1fr]"
          >
            <div className="flex flex-col gap-1">
              <span className="font-mono text-meta uppercase text-fg">{t.token}</span>
              <span className="font-mono text-meta text-fg-muted">{t.spec}</span>
            </div>
            <p className={t.className}>{t.en}</p>
            <p className={t.className} lang="zh-Hans">
              {t.zh}
            </p>
          </div>
        ))}
      </div>
      <GlassCard className="flex max-w-reading flex-col gap-2">
        <span className="font-mono text-meta uppercase text-fg-muted">Two-line contrast</span>
        <p className="font-serif text-title">
          Your dreams remember you.
          <br />
          <em className="text-fg-secondary">Write one down.</em>
        </p>
      </GlassCard>
    </Section>
  )
}

function OrbSection() {
  return (
    <Section index="§5" title="The Dream Orb">
      <div className="grid grid-cols-2 gap-y-12 sm:grid-cols-4">
        {EMOTIONS.map((e) => (
          <div key={e.id} className="flex flex-col items-center gap-6">
            <DreamOrb emotion={e.id} size={112} />
            <div className="flex flex-col items-center">
              <span className="text-label">{e.label}</span>
              <span className="font-mono text-meta uppercase text-fg-muted">
                {e.id} · {e.zh}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <GlassCard className="flex flex-col gap-6">
          <span className="font-mono text-meta uppercase text-fg-muted">Mixed emotions · two-tone</span>
          <div className="flex flex-wrap items-center justify-around gap-6">
            <DreamOrb emotion="longing" blend="calm" size={96} />
            <DreamOrb emotion="fear" blend="unease" size={96} />
            <DreamOrb emotion="lucid" blend="joy" size={96} />
          </div>
        </GlassCard>
        <GlassCard className="flex flex-col gap-6">
          <span className="font-mono text-meta uppercase text-fg-muted">States</span>
          <div className="flex flex-wrap items-center justify-around gap-6">
            {ORB_STATES.map((s) => (
              <div key={s} className="flex flex-col items-center gap-4">
                <DreamOrb emotion="lucid" size={72} state={s} />
                <span className="font-mono text-meta uppercase text-fg-muted">{s}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="flex flex-col gap-4">
        <span className="font-mono text-meta uppercase text-fg-muted">Size encodes vividness</span>
        <div className="flex items-end gap-6">
          {[16, 24, 36, 52, 72].map((s) => (
            <DreamOrb key={s} emotion="calm" size={s} />
          ))}
        </div>
      </div>
    </Section>
  )
}

function ComponentsSection() {
  const [selected, setSelected] = useState<Emotion[]>(['longing'])
  const toggle = (e: Emotion) =>
    setSelected((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]))

  return (
    <Section index="§8" title="Components">
      <div className="grid gap-12 lg:grid-cols-2">
        <Specimen label="Buttons">
          <div className="flex flex-wrap items-center gap-4">
            <Button>Interpret dream</Button>
            <Button variant="ghost">Begin now</Button>
            <Button variant="danger">Delete</Button>
          </div>
        </Specimen>

        <Specimen label="Mic button · Capture">
          <div className="flex items-center gap-12">
            <MicButton />
            <MicButton recording />
          </div>
        </Specimen>

        <Specimen label="Emotion chips · tap to select">
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((e) => (
              <EmotionChip
                key={e.id}
                emotion={e.id}
                label={e.label}
                selected={selected.includes(e.id)}
                onClick={() => toggle(e.id)}
              />
            ))}
          </div>
        </Specimen>

        <Specimen label="Dream textarea">
          <textarea
            rows={4}
            placeholder="What did you dream?"
            className="w-full resize-none rounded-card bg-raised p-6 font-serif text-dream text-fg placeholder:text-fg-muted focus-visible:outline-accent-soft"
          />
        </Specimen>

        <Specimen label="Bottom nav · mobile">
          <BottomNav />
        </Specimen>
      </div>

      <Specimen label="Dream cards · same emotion, told apart by top symbol · orb size = vividness">
        <div className="grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DreamCard
            number={47}
            date="06.10.2026"
            emotion="longing"
            blend="calm"
            vividness={0.9}
            symbol="掉牙"
            gloss="losing teeth"
            tag="Lucid"
            traditions={['Jung', '周公']}
          />
          <DreamCard
            number={48}
            date="09.10.2026"
            emotion="longing"
            vividness={0.3}
            symbol="old house"
            gloss="祖屋"
            traditions={['Jung']}
          />
          <DreamCard
            number={52}
            date="14.10.2026"
            emotion="longing"
            blend="sadness"
            vividness={0.6}
            symbol="水"
            gloss="warm sea"
            traditions={['周公', 'Neuro']}
          />
        </div>
      </Specimen>

      <Specimen label="Interpretation panels · one per tradition">
        <div className="grid gap-4 md:grid-cols-3">
          <InterpretationPanel
            tradition="Jungian"
            symbol="warm water"
            reading="The sea as the unconscious, met without fear. Warmth suggests something long kept at a distance is becoming approachable."
          />
          <InterpretationPanel
            tradition="Zhougong / 周公"
            symbol="海水"
            reading="Sample reading. Real entries will come from your curated, cited 周公解梦 dictionary, not from the model."
          />
          <InterpretationPanel
            tradition="Neuroscience"
            symbol="body temperature"
            reading="Thermal sensations in dreams can be incorporated from the sleeping body's actual state, such as a warm room."
          />
        </div>
      </Specimen>
    </Section>
  )
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-meta uppercase text-fg-muted">{label}</span>
      {children}
    </div>
  )
}

function MicButton({ recording = false }: { recording?: boolean }) {
  return (
    <div className="relative flex size-24 items-center justify-center">
      <DreamOrb
        emotion="lucid"
        size={96}
        state={recording ? 'recording' : 'idle'}
        className="absolute inset-0 opacity-70"
      />
      <button
        type="button"
        aria-label={recording ? 'Stop recording' : 'Record a dream'}
        className="relative flex size-[72px] items-center justify-center rounded-pill border border-hairline bg-glass text-fg backdrop-blur-glass"
      >
        <Mic className="size-6" strokeWidth={1.5} />
      </button>
    </div>
  )
}

function BottomNav() {
  const items = [
    { label: 'Journal', icon: BookOpen },
    { label: 'Capture', icon: Mic, active: true },
    { label: 'Patterns', icon: ChartSpline },
  ]
  return (
    <nav className="flex max-w-xs justify-around rounded-pill border border-hairline bg-raised px-4 py-3">
      {items.map(({ label, icon: Icon, active }) => (
        <button
          key={label}
          type="button"
          className={cn(
            'flex flex-col items-center gap-1 px-3 text-meta',
            active ? 'text-fg' : 'text-fg-muted hover:text-fg-secondary',
          )}
        >
          <Icon className="size-5" strokeWidth={1.5} />
          <span>{label}</span>
          <span className={cn('size-1 rounded-pill', active ? 'bg-accent-soft shadow-glow' : 'bg-transparent')} />
        </button>
      ))}
    </nav>
  )
}

function InterpretationPanel({
  tradition,
  symbol,
  reading,
}: {
  tradition: string
  symbol: string
  reading: string
}) {
  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center gap-2 font-mono text-meta uppercase text-fg-muted">
        <Sparkle className="size-3 text-accent-soft" strokeWidth={1.5} />
        <span>{tradition}</span>
      </div>
      <p className="font-serif text-dream italic text-fg">“{symbol}”</p>
      <p className="text-fg-secondary">{reading}</p>
    </GlassCard>
  )
}

// Sample data for the data-display specimens. Fake on purpose.
const WEEK: { day: string; date: number; emotion?: Emotion; vividness?: number; today?: boolean }[] = [
  { day: 'M', date: 14, emotion: 'calm', vividness: 0.5 },
  { day: 'T', date: 15, emotion: 'fear', vividness: 0.9 },
  { day: 'W', date: 16 },
  { day: 'T', date: 17, emotion: 'longing', vividness: 0.7 },
  { day: 'F', date: 18, emotion: 'lucid', vividness: 1 },
  { day: 'S', date: 19, emotion: 'sadness', vividness: 0.4 },
  { day: 'S', date: 20, emotion: 'joy', vividness: 0.6, today: true },
]

const MAP_DREAMS: { emotion: Emotion; x: number; y: number }[] = [
  { emotion: 'calm', x: 72, y: 70 },
  { emotion: 'joy', x: 80, y: 30 },
  { emotion: 'fear', x: 18, y: 18 },
  { emotion: 'unease', x: 30, y: 36 },
  { emotion: 'sadness', x: 22, y: 76 },
  { emotion: 'longing', x: 44, y: 62 },
  { emotion: 'lucid', x: 64, y: 22 },
]

function DataSection() {
  const [pin, setPin] = useState({ x: 55, y: 50 })

  return (
    <Section index="§8" title="Calendar, map & stats">
      <div className="grid gap-12 lg:grid-cols-2">
        <Specimen label="Calendar strip · size = vividness, color = emotion">
          <div className="grid grid-cols-7 gap-2">
            {WEEK.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-3">
                <span className="font-mono text-meta text-fg-muted">{d.day}</span>
                <div
                  className={cn(
                    'flex size-12 items-center justify-center rounded-pill',
                    d.today && 'border border-fg-secondary',
                  )}
                >
                  {d.emotion ? (
                    <DreamOrb emotion={d.emotion} size={14 + (d.vividness ?? 0) * 26} glow={false} state="still" />
                  ) : (
                    <span className="size-1 rounded-pill bg-hairline" />
                  )}
                </div>
                <span className={cn('font-mono text-meta', d.today ? 'text-fg' : 'text-fg-muted')}>{d.date}</span>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen label="Emotion map · click to place this dream">
          <div
            className="relative aspect-square max-w-sm cursor-crosshair rounded-card border border-hairline bg-raised"
            onClick={(ev) => {
              const r = ev.currentTarget.getBoundingClientRect()
              setPin({
                x: ((ev.clientX - r.left) / r.width) * 100,
                y: ((ev.clientY - r.top) / r.height) * 100,
              })
            }}
          >
            <div className="absolute inset-x-0 top-1/2 border-t border-hairline" />
            <div className="absolute inset-y-0 left-1/2 border-l border-hairline" />
            <span className="absolute left-1/2 top-3 -translate-x-1/2 font-mono text-meta uppercase text-fg-muted">
              Intense
            </span>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-meta uppercase text-fg-muted">
              Quiet
            </span>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-meta uppercase text-fg-muted">
              Dark
            </span>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-meta uppercase text-fg-muted">
              Light
            </span>
            {MAP_DREAMS.map((d, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
              >
                <DreamOrb emotion={d.emotion} size={18} glow={false} state="still" />
              </div>
            ))}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all ease-dream"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              <DreamOrb emotion="lucid" size={44} />
            </div>
          </div>
        </Specimen>
      </div>

      <Specimen label="Stat tiles">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile value="47" unit="dreams" sub="this year" emotion="lucid" />
          <StatTile value="31%" unit="lucid" sub="up from 18%" emotion="calm" />
          <StatTile value="水" unit="top symbol" sub="appears in 12 dreams" emotion="sadness" />
        </div>
      </Specimen>
    </Section>
  )
}

function StatTile({ value, unit, sub, emotion }: { value: string; unit: string; sub: string; emotion: Emotion }) {
  return (
    <div
      className="flex aspect-[4/3] flex-col justify-end gap-1 overflow-hidden rounded-card border border-hairline p-6"
      style={{
        background: `radial-gradient(circle at 80% 0%, ${edge(emotion, 0.45)} 0%, transparent 60%), rgb(var(--bg-raised))`,
      }}
    >
      <span className="font-serif text-display">{value}</span>
      <span className="text-label">{unit}</span>
      <span className="font-mono text-meta uppercase text-fg-muted">{sub}</span>
    </div>
  )
}

function OrnamentSection() {
  return (
    <Section index="§9" title="Ornament">
      <div className="grid gap-12 sm:grid-cols-3">
        <Specimen label="✦ marks AI-generated content">
          <div className="flex items-center gap-2 text-fg-secondary">
            <Sparkle className="size-4 text-accent-soft" strokeWidth={1.5} />
            <span className="text-label">Generated interpretation</span>
          </div>
        </Specimen>
        <Specimen label="Outline frame">
          <p className="font-serif text-title">
            the <span className="border border-fg-secondary px-2">lucid</span> feeling
          </p>
        </Specimen>
        <Specimen label="Orbit behind a hero orb">
          <div className="relative flex size-40 items-center justify-center">
            <div className="absolute inset-0 rounded-pill border border-hairline" />
            <div className="absolute inset-6 rounded-pill border border-hairline" />
            <DreamOrb emotion="lucid" size={64} />
          </div>
        </Specimen>
      </div>
    </Section>
  )
}
