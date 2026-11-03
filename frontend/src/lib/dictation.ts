import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition'

// Speaking a dream on Capture (decision 21). Apple's speech recognition, through the
// iPhone app only; in a browser Capture offers writing instead. Audio never reaches
// our server: only the text the recognizer returns is kept (decision 15).

export const canDictate = Capacitor.isNativePlatform()

export type DictationLanguage = 'en-US' | 'zh-CN'

export class DictationError extends Error {}

/**
 * Starts listening. `onText` gets the whole transcript of this session so far, each time
 * it changes. `onEnd` runs once when listening stops for any reason, with a message if
 * it stopped because of a problem. Returns a function that stops listening.
 */
export async function startDictation(
  language: DictationLanguage,
  handlers: { onText: (text: string) => void; onLevel: (level: number) => void; onEnd: (problem?: string) => void },
): Promise<() => Promise<void>> {
  const { speechRecognition } = await SpeechRecognition.requestPermissions()
  if (speechRecognition !== 'granted') {
    throw new DictationError('Dream Catcher needs the microphone and speech recognition. Turn them on in Settings → Dream Catcher.')
  }
  if (!(await SpeechRecognition.available()).available) {
    throw new DictationError('Speech recognition isn’t available right now. You can write the dream instead.')
  }

  let ended = false
  const end = (problem?: string) => {
    if (ended) return
    ended = true
    handlers.onLevel(0)
    void SpeechRecognition.removeAllListeners()
    handlers.onEnd(problem)
  }

  await SpeechRecognition.removeAllListeners()
  await SpeechRecognition.addListener('partialResults', (e) => {
    const text = e.matches?.[0]
    if (text !== undefined) handlers.onText(text)
  })
  await SpeechRecognition.addListener('audioLevel', (e) => handlers.onLevel(e.level))
  await SpeechRecognition.addListener('error', () => end('Couldn’t catch that. Tap to try again.'))
  await SpeechRecognition.addListener('listeningState', (e) => {
    if (e.state === 'stopped' || e.status === 'stopped') end()
  })

  // Not awaited: with partial results, start() can stay open until listening ends.
  SpeechRecognition.start({
    language,
    partialResults: true,
    addPunctuation: true,
    // Apple's standard recognition. Forcing on-device fails whenever the iPhone hasn't
    // downloaded its speech model yet (and always in the simulator).
    useOnDeviceRecognition: false,
    preferLegacyRecognizer: true, // the newer iOS path may never send partial results
  }).catch(() => end('Couldn’t start listening. Tap to try again.'))

  return async () => {
    await SpeechRecognition.stop().catch(() => {})
    // The last words can land after stop(); take them before the listeners go.
    const last = await SpeechRecognition.getLastPartialResult().catch(() => null)
    if (!ended && last?.available && last.text) handlers.onText(last.text)
    end()
  }
}
