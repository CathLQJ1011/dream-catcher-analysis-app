import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, Mic, Moon, Plus, Sparkle, Square, X } from 'lucide-react'
import { Popover } from '@base-ui/react/popover'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/app/Segmented'
import { DreamOrb } from '@/components/dream/DreamOrb'
import { EmotionChip } from '@/components/dream/EmotionChip'
import { EmotionMapInput, type MapValue } from '@/components/dream/EmotionMapInput'
import { profile } from '@/data/prototypeState'
import { ApiError, api, type ElementKind } from '@/lib/api'
import { DictationError, canDictate, startDictation, type DictationLanguage } from '@/lib/dictation'
import { parseDate, today } from '@/lib/dates'
import { EMOTIONS, core, edge, type Emotion } from '@/lib/emotions'
import { navigate } from '@/lib/router'
import { cn } from '@/lib/utils'

// Capture (docs/screens.md §1) in three clean steps:
//   1. Tell it: only the dream, spoken or written. Nothing else on screen.
//   2. Tag it: the AI has already filled in feeling, map, vividness, lucidity and
//      symbols from the dream; the dreamer only adjusts what feels off. Saves the dream.
//   3. Your thoughts: an optional first reading of your own, then the AI reading
//      starts and the dream opens on it.

type Step = 'tell' | 'reading' | 'tag' | 'meaning'

export default function Capture() {
  const [step, setStep] = useState<Step>('tell')
  const [text, setText] = useState('')
  const [date, setDate] = useState(today)
  const [savedId, setSavedId] = useState<number | null>(null)

  if (step === 'reading') return <ReadingStep onDone={() => setStep('tag')} />
  if (step === 'meaning' && savedId !== null) return <MeaningStep dreamId={savedId} />
  return step === 'tell' ? (
    <TellStep text={text} setText={setText} date={date} setDate={setDate} onNext={() => setStep('reading')} />
  ) : (
    <TagStep
      text={text}
      date={date}
      onBack={() => setStep('tell')}
      onSaved={(id) => {
        setSavedId(id)
        setStep('meaning')
      }}
    />
  )
}

/* ---------- Between steps: the AI reads the dream ---------- */

function ReadingStep({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 1400)
    return () => window.clearTimeout(id)
  }, [onDone])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-night px-6 text-center">
      <DreamOrb emotion="lucid" size={120} state="interpreting" />
      <p className="flex items-center gap-2 font-mono text-meta uppercase text-fg-muted">
        <Sparkle className="size-3 text-accent-soft" strokeWidth={1.5} />
        Reading your dream…
      </p>
    </div>
  )
}

/* ---------- Step 1: Tell it ---------- */

function TellStep({
  text,
  setText,
  date,
  setDate,
  onNext,
}: {
  text: string
  setText: (t: string) => void
  date: string
  setDate: (d: string) => void
  onNext: () => void
}) {
  // Starts the way you chose on Me (voice or text), unless there's already text.
  // Voice needs the iPhone app; a browser always writes.
  const [mode, setMode] = useState<'voice' | 'write'>(text || profile.captureWith === 'text' || !canDictate ? 'write' : 'voice')
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [language, setLanguage] = useState<DictationLanguage>(() => (navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'))
  const [problem, setProblem] = useState('')
  const stop = useRef<(() => Promise<void>) | null>(null)
  const loudest = useRef(0)

  // A timer runs while listening.
  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [recording])

  // iOS hands over silence, not an error, when the microphone can't hear: say so.
  useEffect(() => {
    if (recording && seconds === 4 && loudest.current < 0.05) {
      setProblem('Your microphone isn’t picking anything up. Check that nothing covers it, or try Voice Memos.')
    }
  }, [recording, seconds])

  // Leaving Capture stops the microphone.
  useEffect(() => () => void stop.current?.(), [])

  async function toggleRecording() {
    if (recording) {
      await stop.current?.()
      return
    }
    // Each recording continues the transcript, so you can pause and keep talking.
    const before = text.trim()
    setProblem('')
    setSeconds(0)
    loudest.current = 0
    setRecording(true)
    try {
      stop.current = await startDictation(language, {
        onText: (t) => setText(before && t ? `${before} ${t}` : before || t),
        onLevel: (l) => {
          loudest.current = Math.max(loudest.current, l)
          setLevel(l)
        },
        onEnd: (p) => {
          setRecording(false)
          stop.current = null
          if (p) setProblem(p)
        },
      })
    } catch (e) {
      setRecording(false)
      setProblem(e instanceof DictationError ? e.message : 'Couldn’t start listening. You can write the dream instead.')
    }
  }

  const heard = text.trim().length > 0

  return (
    <CaptureFrame
      left={<IconLink label="Close" onClick={() => navigate('/journal')} icon={<X className="size-5" strokeWidth={1.5} />} />}
      step="1 / 3"
      action={
        <Button className="w-full" disabled={!heard || recording} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <h1 className="font-serif text-title">
        What did you dream?
        <br />
        <em className="text-fg-secondary">Say it before it fades.</em>
      </h1>
      <NightPicker date={date} setDate={setDate} />

      {mode === 'voice' ? (
        <div className="mt-12 flex flex-col items-center gap-6">
          <button
            type="button"
            aria-label={recording ? 'Stop recording' : 'Start recording'}
            onClick={toggleRecording}
            className="relative flex size-44 items-center justify-center"
          >
            {/* The orb swells with your voice. */}
            <span className="pointer-events-none absolute transition-transform" style={{ transform: `scale(${1 + level * 0.25})` }}>
              <DreamOrb emotion="lucid" size={heard && !recording ? 120 : 176} state={recording ? 'recording' : 'idle'} className="transition-all" />
            </span>
            <span className="relative flex size-16 items-center justify-center rounded-pill border border-fg/20 bg-bg/30 text-fg backdrop-blur-glass">
              {recording ? <Square className="size-5" strokeWidth={1.5} /> : <Mic className="size-6" strokeWidth={1.5} />}
            </span>
          </button>
          <span className="font-mono text-meta uppercase text-fg-muted">
            {recording ? `${formatTime(seconds)} · tap to stop` : heard ? 'Tap to keep talking' : 'Tap to record'}
          </span>
          {!recording && (
            <Segmented
              size="sm"
              label="Language you'll speak"
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'en-US', label: 'English' },
                { value: 'zh-CN', label: '中文' },
              ]}
            />
          )}
          {problem && (
            <p className="text-center text-label font-normal text-ember" role="alert">
              {problem}
            </p>
          )}

          {heard && (
            <div className="flex w-full flex-col gap-2">
              <span className="font-mono text-meta uppercase text-fg-muted">
                {recording ? 'Listening…' : 'Transcript · fix anything that’s off'}
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                readOnly={recording}
                rows={6}
                className={cn(
                  'w-full resize-none bg-transparent font-serif text-dream text-fg outline-none',
                  recording && 'text-fg-secondary',
                )}
              />
            </div>
          )}

          {!heard && (
            <button type="button" onClick={() => setMode('write')} className="text-label text-fg-secondary underline-offset-4 hover:text-fg hover:underline">
              Write it instead
            </button>
          )}
        </div>
      ) : (
        <div className="mt-12 flex flex-col gap-4">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start anywhere. Fragments are fine."
            rows={10}
            className="w-full resize-none rounded-card bg-raised p-6 font-serif text-dream text-fg outline-none placeholder:text-fg-muted"
          />
          {canDictate && (
            <button type="button" onClick={() => setMode('voice')} className="flex items-center gap-2 self-start text-label text-fg-secondary hover:text-fg">
              <Mic className="size-4" strokeWidth={1.5} />
              Speak instead
            </button>
          )}
        </div>
      )}
    </CaptureFrame>
  )
}

/* ---------- Step 2: Tag it ---------- */

type Proposed = { term: string; kind: string; on: boolean }

function TagStep({
  text,
  date,
  onBack,
  onSaved,
}: {
  text: string
  date: string
  onBack: () => void
  onSaved: (id: number) => void
}) {
  // Everything starts from the AI's read of the dream (prototype: keyword cues).
  const [guess] = useState(() => inferTags(text))
  // Up to two feelings: one of the 8 orb colors, plus the dreamer's own word if they typed one (decision 10).
  const [feelings, setFeelings] = useState<Feeling[]>(() => guess.emotions.map((emotion) => ({ emotion })))
  const emotions = feelings.map((f) => f.emotion)
  const [map, setMap] = useState<MapValue>(guess.map)
  const [vividness, setVividness] = useState(guess.vividness)
  const [lucidity, setLucidity] = useState<'0' | '1' | '2' | '3'>(guess.lucidity)
  const [symbols, setSymbols] = useState<Proposed[]>(() => proposeSymbols(text))
  // Which fields still show the AI's suggestion, untouched by the dreamer.
  const [title, setTitle] = useState(() => firstSentence(text))
  const [suggested, setSuggested] = useState({ title: true, feeling: true, map: true, vividness: true, lucidity: true })
  const touch = (k: keyof typeof suggested) => setSuggested((s) => ({ ...s, [k]: false }))
  const [adding, setAdding] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [residue, setResidue] = useState('')
  const [waking, setWaking] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleEmotion = (e: Emotion) => {
    touch('feeling')
    setFeelings((cur) =>
      cur.some((f) => f.emotion === e && !f.label)
        ? cur.filter((f) => f.emotion !== e || f.label)
        : [...cur, { emotion: e }].slice(-2),
    )
  }
  const addOwn = (f: Feeling) => {
    touch('feeling')
    setFeelings((cur) => [...cur, f].slice(-2))
  }
  const recolorOwn = (label: string, emotion: Emotion) =>
    setFeelings((cur) => cur.map((f) => (f.label === label ? { ...f, emotion } : f)))
  const removeOwn = (label: string) => setFeelings((cur) => cur.filter((f) => f.label !== label))

  async function save() {
    setSaving(true)
    setError('')
    try {
      const dream = await api.createDream({
        dreamed_on: date,
        text,
        title: title.trim() || firstSentence(text),
        valence: Math.round(map.valence),
        intensity: Math.round(map.intensity),
        vividness,
        lucidity: Number(lucidity),
        emotions: feelings.map((f, i) => ({
          position: i + 1,
          emotion: f.emotion,
          ...(f.label && { label: f.label }),
          ai_suggested: suggested.feeling && !f.label,
        })),
        // Dropped suggestions are sent too (kept: false), so we learn which ones missed.
        elements: symbols
          .filter((s) => s.on || s.kind !== 'yours')
          .map((s, i) => ({
            kind: ELEMENT_KIND[s.kind] ?? 'symbol',
            value: s.term,
            position: i + 1,
            ai_suggested: s.kind !== 'yours',
            kept: s.on,
          })),
        ...(residue.trim() && { day_residue: [{ note: residue.trim() }] }),
        ...(waking.trim() && { mood_on_waking: waking.trim() }),
      })
      // Saved now, so nothing is lost if the app closes during step 3.
      onSaved(dream.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t save. Try again.')
      setSaving(false)
    }
  }

  return (
    <CaptureFrame
      left={<IconLink label="Back to the dream" onClick={onBack} icon={<ChevronLeft className="size-5" strokeWidth={1.5} />} />}
      step="2 / 3"
      action={
        <>
          {error && (
            <p className="mb-2 text-center text-label font-normal text-ember" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save dream'}
          </Button>
        </>
      }
    >
      <h1 className="font-serif text-title">
        Here’s what we picked up.
        <br />
        <em className="text-fg-secondary">Adjust what’s off.</em>
      </h1>
      <p className="mt-4 flex items-start gap-2 text-label font-normal text-fg-secondary">
        <Sparkle className="mt-1 size-3 shrink-0 text-accent-soft" strokeWidth={1.5} />
        Filled in from your dream. You know how it felt better than we do, so adjust freely. Nothing is required.
      </p>

      <Field term="Title" def="a name to find it by; change it to anything" suggested={suggested.title}>
        <input
          value={title}
          maxLength={200}
          onChange={(e) => {
            touch('title')
            setTitle(e.target.value)
          }}
          aria-label="Title"
          className="h-11 rounded-pill bg-raised px-4 font-serif text-body text-fg outline-none"
        />
      </Field>

      <Field term="Feeling" def="the emotions that stayed with you, up to two" suggested={suggested.feeling}>
        <FeelingPicker
          feelings={feelings}
          onToggle={toggleEmotion}
          onAdd={addOwn}
          onRecolor={recolorOwn}
          onRemove={removeOwn}
        />
      </Field>

      <Field term="Where it sat" def="drag the orb: how dark or light, how quiet or intense" suggested={suggested.map}>
        <EmotionMapInput
          value={map}
          onChange={(v) => {
            touch('map')
            setMap(v)
          }}
          emotion={emotions[0] ?? 'neutral'}
          blend={emotions[1]}
        />
      </Field>

      <Field
        term="Vividness"
        def="how clear and detailed the dream felt, from a blur to as sharp as a real memory"
        value={`${Math.round(vividness * 100)}%`}
        suggested={suggested.vividness}
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vividness}
          onChange={(e) => {
            touch('vividness')
            setVividness(Number(e.target.value))
          }}
          aria-label="Vividness"
          className="w-full accent-accent"
        />
      </Field>

      <Field term="Lucidity" def="whether you knew you were dreaming, and if you could steer it" suggested={suggested.lucidity}>
        <Segmented
          size="sm"
          label="Lucidity"
          value={lucidity}
          onChange={(v) => {
            touch('lucidity')
            setLucidity(v)
          }}
          options={[
            { value: '0', label: 'No' },
            { value: '1', label: 'Hazy' },
            { value: '2', label: 'Aware' },
            { value: '3', label: 'In control' },
          ]}
        />
      </Field>

      <Field term="Symbols" def="places, people and images we noticed; tap to keep or drop" suggested>
        <div className="flex flex-wrap gap-2">
          {symbols.map((s, i) => (
            <button
              key={s.term}
              type="button"
              aria-pressed={s.on}
              onClick={() => setSymbols((cur) => cur.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-pill border px-4 text-label transition',
                s.on ? 'border-accent-soft/40 bg-accent/20 text-fg' : 'border-hairline text-fg-muted',
              )}
            >
              <span lang={/\p{Script=Han}/u.test(s.term) ? 'zh-Hans' : undefined} className={cn(!s.on && 'line-through')}>
                {s.term}
              </span>
              <span className="font-mono text-meta uppercase text-fg-muted">{s.kind}</span>
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const term = adding.trim()
              if (term && !symbols.some((s) => s.term === term)) setSymbols((cur) => [...cur, { term, kind: 'yours', on: true }])
              setAdding('')
            }}
            className="inline-flex h-9 items-center gap-1 rounded-pill border border-dashed border-hairline pl-3 pr-1"
          >
            <Plus className="size-4 text-fg-muted" strokeWidth={1.5} />
            <input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Add"
              aria-label="Add your own symbol"
              className="w-20 bg-transparent text-label text-fg outline-none placeholder:text-fg-muted"
            />
          </form>
        </div>
      </Field>

      <section className="mt-12 border-t border-hairline">
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
          className="flex w-full items-center justify-between py-4 font-mono text-meta uppercase text-fg-muted hover:text-fg"
        >
          Before & after · optional
          <ChevronDown className={cn('size-4 transition', moreOpen && 'rotate-180')} strokeWidth={1.5} />
        </button>
        {moreOpen && (
          <div className="flex animate-enter flex-col gap-6 pb-4">
            <SmallField
              label="Anything from the last few days that might be in it?"
              placeholder="A show, a class, a conversation…"
              value={residue}
              onChange={setResidue}
            />
            <SmallField
              label="How did you feel waking up?"
              placeholder="Rested, shaken, wanting to draw it…"
              value={waking}
              onChange={setWaking}
            />
          </div>
        )}
      </section>
    </CaptureFrame>
  )
}

/* ---------- Feelings in your own words ---------- */

type Feeling = { emotion: Emotion; label?: string }

// The feeling chips: the 8 orb emotions, then any feelings in the dreamer's own words.
// "+ Your own word" asks Claude for the closest orb color; tapping the word's chip opens a
// small popup to move it to another color or remove it (decision 22).
function FeelingPicker({
  feelings,
  onToggle,
  onAdd,
  onRecolor,
  onRemove,
}: {
  feelings: Feeling[]
  onToggle: (e: Emotion) => void
  onAdd: (f: Required<Feeling>) => void
  onRecolor: (label: string, emotion: Emotion) => void
  onRemove: (label: string) => void
}) {
  const own = feelings.filter((f): f is Required<Feeling> => Boolean(f.label))
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [placing, setPlacing] = useState(false)
  const [problem, setProblem] = useState('')

  async function add() {
    const typed = word.trim()
    if (!typed || placing) return
    setProblem('')
    if (!own.some((f) => f.label.toLowerCase() === typed.toLowerCase())) {
      setPlacing(true)
      try {
        const placed = await api.placeFeeling(typed)
        onAdd({ emotion: placed.emotion, label: placed.label })
      } catch (e) {
        // Still keep the word; it starts gray and the dreamer picks its color from its chip.
        onAdd({ emotion: 'neutral', label: typed })
        setProblem(e instanceof ApiError ? e.message : 'Couldn’t pick a color. Tap the word to choose one.')
      }
      setPlacing(false)
    }
    setWord('')
    setOpen(false)
  }

  return (
    <>
      <div className="-ml-4 flex flex-wrap gap-1">
        {EMOTIONS.map((e) => (
          <EmotionChip
            key={e.id}
            emotion={e.id}
            label={e.label}
            selected={feelings.some((f) => f.emotion === e.id && !f.label)}
            onClick={() => onToggle(e.id)}
          />
        ))}
        {own.map((f) => (
          <OwnFeelingChip key={f.label} feeling={f} onRecolor={onRecolor} onRemove={onRemove} />
        ))}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-pill border border-dashed border-hairline px-4 py-2 text-label text-fg-secondary transition hover:text-fg"
          >
            <Plus className="size-3" strokeWidth={1.5} />
            Your own word
          </button>
        )}
      </div>
      {open && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input
            autoFocus
            value={word}
            maxLength={64}
            onChange={(e) => setWord(e.target.value)}
            aria-label="Your own word for the feeling"
            placeholder="guilty, 怀旧, floaty…"
            className="h-11 min-w-0 flex-1 rounded-pill bg-raised px-4 text-body text-fg outline-none placeholder:text-fg-muted"
          />
          <Button type="submit" variant="ghost" disabled={!word.trim() || placing}>
            {placing ? 'Placing…' : 'Add'}
          </Button>
        </form>
      )}
      {problem && (
        <p className="text-label font-normal text-ember" role="alert">
          {problem}
        </p>
      )}
    </>
  )
}

function OwnFeelingChip({
  feeling: f,
  onRecolor,
  onRemove,
}: {
  feeling: Required<Feeling>
  onRecolor: (label: string, emotion: Emotion) => void
  onRemove: (label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = EMOTIONS.find((e) => e.id === f.emotion)?.label

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <EmotionChip
            emotion={f.emotion}
            label={f.label}
            selected
            aria-label={`${f.label}, ${current}. Change color or remove`}
            trailing={<ChevronDown className="size-3 text-fg-muted" strokeWidth={1.5} />}
          />
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={16} className="z-50">
          <Popover.Popup className="flex flex-col gap-2 rounded-card border border-hairline bg-raised/90 p-4 backdrop-blur-glass">
            <div className="flex gap-1">
              {EMOTIONS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  aria-label={e.label}
                  aria-pressed={f.emotion === e.id}
                  onClick={() => {
                    onRecolor(f.label, e.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-pill border transition',
                    f.emotion === e.id ? 'border-fg-muted' : 'border-transparent hover:border-hairline',
                  )}
                >
                  <span
                    className="size-4 rounded-pill"
                    style={{ background: `radial-gradient(circle at 35% 30%, ${core(e.id)}, ${edge(e.id)})` }}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 px-2">
              <span className="text-label font-normal text-fg-secondary">{current}</span>
              <button type="button" onClick={() => onRemove(f.label)} className="text-label text-ember">
                Remove
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ---------- Step 3: Your thoughts, then the reading ---------- */

function MeaningStep({ dreamId }: { dreamId: number }) {
  const [insight, setInsight] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  // The dream is already saved, so leaving goes to it rather than back into the form.
  const openDream = (hash = '') => navigate(`/dream/${dreamId}${hash}`, { replace: true })

  async function read(withInsight: boolean) {
    setStarting(true)
    setError('')
    try {
      // Your own reading is saved first, so the AI can build on it.
      if (withInsight && insight.trim()) await api.updateDream(dreamId, { insight: insight.trim() })
      await api.startReadings(dreamId)
      openDream('#readings')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t start the reading. Try again.')
      setStarting(false)
    }
  }

  return (
    <CaptureFrame
      left={<IconLink label="Open the dream" onClick={() => openDream()} icon={<X className="size-5" strokeWidth={1.5} />} />}
      step="3 / 3"
      action={
        <>
          {error && (
            <p className="mb-2 text-center text-label font-normal text-ember" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={starting} onClick={() => read(true)}>
            {starting ? 'Starting…' : 'Read my dream'}
          </Button>
          <Button variant="ghost" className="mt-2 w-full" disabled={starting} onClick={() => read(false)}>
            Skip
          </Button>
        </>
      }
    >
      <h1 className="font-serif text-title">
        What do you think it means?
        <br />
        <em className="text-fg-secondary">Your first thought, before anyone else’s.</em>
      </h1>
      <p className="mt-4 flex items-start gap-2 text-label font-normal text-fg-secondary">
        <Sparkle className="mt-1 size-3 shrink-0 text-accent-soft" strokeWidth={1.5} />
        Optional. The reading starts from what you write here.
      </p>
      <textarea
        value={insight}
        onChange={(e) => setInsight(e.target.value)}
        aria-label="What do you think it means?"
        placeholder="Maybe it’s about…"
        rows={6}
        className="mt-12 w-full resize-none rounded-card bg-raised p-6 font-serif text-dream text-fg outline-none placeholder:text-fg-muted"
      />
    </CaptureFrame>
  )
}

/* ---------- Layout pieces ---------- */

// Full-screen frame without the tab bar: capture is a focused task.
function CaptureFrame({
  left,
  step,
  action,
  children,
}: {
  left: ReactNode
  step: string
  action: ReactNode
  children: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen bg-night" />
      <div className="relative mx-auto w-full max-w-md px-6 pb-40 pt-6">
        <div className="mb-8 flex items-center justify-between">
          {left}
          <span className="font-mono text-meta uppercase text-fg-muted">{step}</span>
        </div>
        {children}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg/90 to-transparent pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-12">
        <div className="mx-auto max-w-md px-6">{action}</div>
      </div>
    </div>
  )
}

function IconLink({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="-ml-2 flex size-10 items-center justify-center rounded-pill text-fg-secondary hover:text-fg"
    >
      {icon}
    </button>
  )
}

// A field label that defines its term: the term is a touch heavier so it reads as
// "this word means…", and the definition sits right after it in plain text.
function Field({
  term,
  def,
  value,
  suggested = false,
  children,
}: {
  term: string
  def: string
  value?: string
  suggested?: boolean
  children: ReactNode
}) {
  return (
    <section className="mt-12 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-label font-normal text-fg-muted">
          <span className="font-semibold text-fg">{term}</span> · {def}
        </h2>
        <span className="flex shrink-0 items-center gap-2 font-mono text-meta uppercase text-fg-muted">
          {value}
          {suggested && <Sparkle className="size-3 text-accent-soft" strokeWidth={1.5} aria-label="Suggested" />}
        </span>
      </div>
      {children}
    </section>
  )
}

// Which night the dream belongs to. Defaults to last night; a native date picker opens on tap.
function NightPicker({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const label =
    date === today()
      ? 'Last night'
      : parseDate(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <label className="relative mt-6 inline-flex h-9 cursor-pointer items-center gap-2 rounded-pill border border-hairline px-4 text-label text-fg-secondary transition hover:text-fg">
      <Moon className="size-4" strokeWidth={1.5} />
      Night of · <span className="text-fg">{label}</span>
      <ChevronDown className="size-4" strokeWidth={1.5} />
      <input
        type="date"
        value={date}
        max={today()}
        onChange={(e) => e.target.value && setDate(e.target.value)}
        aria-label="Which night was this dream?"
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  )
}

function SmallField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-label font-normal text-fg-secondary">{label}</span>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-pill bg-bg px-4 text-body text-fg outline-none placeholder:text-fg-muted"
      />
    </label>
  )
}

/* ---------- Prototype helpers ---------- */

// Stand-in for the AI's first read of the dream: emotion cues by keyword, then
// valence/intensity from those emotions, vividness from detail, lucidity from phrasing.
const EMOTION_CUES: [RegExp, Emotion][] = [
  [/\b(afraid|scared|chas\w*|blood|scream\w*|fear)\b/gi, 'fear'],
  [/\b(strange|wrong|uneasy|faceless|lost|couldn'?t)\b/gi, 'unease'],
  [/\b(grandmother|grandfather|old house|childhood|remember\w*|forgot\w*)\b/gi, 'longing'],
  [/\b(rain|lake|water|quiet|slow\w*|soft\w*|calm|still|never touched)\b/gi, 'calm'],
  [/\b(fly\w*|flew|glow\w*|realized|wonder\w*)\b/gi, 'lucid'],
  [/\b(laugh\w*|happy|bright|lantern\w*|danc\w*)\b/gi, 'joy'],
  [/\b(cry\w*|tears|alone|sad|grief)\b/gi, 'sadness'],
]
const FEEL: Record<Emotion, [number, number]> = {
  // [valence −2..2, intensity 1..5]
  calm: [1, 2], lucid: [1.5, 3.5], joy: [1.5, 3.5], longing: [0, 2.5],
  neutral: [0, 2.5], unease: [-1, 3], fear: [-1.5, 4.5], sadness: [-1, 2.5],
}

function inferTags(text: string) {
  const scored = EMOTION_CUES.map(([re, e]) => [e, text.match(re)?.length ?? 0] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const emotions = scored.slice(0, 2).map(([e]) => e)
  const feel = (emotions.length ? emotions : (['neutral'] as Emotion[])).map((e) => FEEL[e])
  const sentences = text.split(/[.!?。！？]/).filter((x) => x.trim()).length
  const colorWords = text.match(/\b(red|blue|gold|green|violet|white|black|glow\w*)\b/gi)?.length ?? 0
  return {
    emotions,
    map: {
      valence: feel.reduce((s, f) => s + f[0], 0) / feel.length,
      intensity: feel.reduce((s, f) => s + f[1], 0) / feel.length,
    },
    vividness: Math.min(0.95, 0.35 + sentences * 0.08 + colorWords * 0.1),
    lucidity: (/in control|steer/i.test(text) ? '3' : /realized|knew i was dreaming/i.test(text) ? '2' : '0') as
      | '0'
      | '1'
      | '2'
      | '3',
  }
}

// Stand-in for the AI tagging step: spots a few common dream elements by keyword.
const KEYWORDS: [RegExp, string | null, string][] = [
  [/\b(water|sea|ocean|tide|river|lake|rain)\b|水|海|雨/i, '水', 'symbol'],
  [/\b(greenhouse|house|home|room|courtyard|school|library|tower)\b/i, null, 'place'],
  [/\b(stairs|staircase|door|doors|window)\b/i, null, 'symbol'],
  [/\b(teeth|tooth)\b|牙/i, '掉牙', 'symbol'],
  [/\b(fly|flying|flew)\b/i, 'flying', 'symbol'],
  [/\b(moths?|birds?|cats?|whales?|fish)\b/i, null, 'creature'],
  [/\b(night|moon)\b/i, null, 'symbol'],
  [/\b(mother|father|grandmother|grandfather|sister|brother|friend|stranger)\b/i, null, 'person'],
  [/\b(red|blue|gold|green|violet|white|black)\b/i, null, 'color'],
]

function proposeSymbols(text: string): Proposed[] {
  const found: Proposed[] = []
  for (const [re, term, kind] of KEYWORDS) {
    const m = text.match(re)
    if (!m) continue
    const t = term ?? m[0].toLowerCase()
    if (!found.some((f) => f.term === t)) found.push({ term: t, kind, on: true })
  }
  return found
}

// The tag step's kinds, as the API names them. Creatures are symbols there.
const ELEMENT_KIND: Record<string, ElementKind> = {
  symbol: 'symbol', place: 'place', creature: 'symbol', person: 'person', color: 'color', yours: 'symbol',
}

function firstSentence(text: string) {
  const s = text.split(/(?<=[.!?。！？])\s*/)[0].trim()
  return s.length > 60 ? `${s.slice(0, 57)}…` : s
}

function formatTime(s: number) {
  const whole = Math.floor(s)
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}
