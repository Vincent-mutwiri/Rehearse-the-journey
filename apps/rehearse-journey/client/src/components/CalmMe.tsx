import { useCallback, useEffect, useRef, useState } from 'react'
import { HandHeart, Pause, Play, RotateCcw, Volume2, X } from 'lucide-react'

export const CALM_ME_OPEN_EVENT = 'kioo:calm-me-open'

const CALM_ME_LINES = [
  'I need a break.',
  'Ni sawa tu, muulize tu, ataelewa.',
  'Ni mtu kama mimi.',
  'Vile atajibu tu ni sawa.',
]

type CalmMeSpeech = {
  supported: boolean
  voices: SpeechSynthesisVoice[]
  speak: (index: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
}

function useCalmMeSpeech(
  rate: number,
  volume: number,
  voiceName: string,
  onDone: () => void,
): CalmMeSpeech {
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const onDoneRef = useRef(onDone)
  const generationRef = useRef(0)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!supported) return
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [supported])

  const speak = useCallback((index: number) => {
    if (!supported) return
    const generation = ++generationRef.current
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(CALM_ME_LINES[index])
    const selectedVoice = voices.find((voice) => voice.name === voiceName)
    const swahiliVoice = voices.find((voice) => /^sw(-KE)?/i.test(voice.lang))
    utterance.voice = selectedVoice ?? swahiliVoice ?? voices.find((voice) => /^en/i.test(voice.lang)) ?? null
    utterance.lang = swahiliVoice?.lang ?? 'sw-KE'
    utterance.rate = rate
    utterance.volume = volume
    utterance.onend = () => {
      if (generation === generationRef.current) onDoneRef.current()
    }
    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted' && generation === generationRef.current) {
        onDoneRef.current()
      }
    }
    window.speechSynthesis.speak(utterance)
  }, [rate, supported, voiceName, voices, volume])

  const pause = useCallback(() => window.speechSynthesis?.pause(), [])
  const resume = useCallback(() => window.speechSynthesis?.resume(), [])
  const stop = useCallback(() => {
    generationRef.current += 1
    window.speechSynthesis?.cancel()
  }, [])

  return { supported, voices, speak, pause, resume, stop }
}

export default function CalmMe() {
  const [open, setOpen] = useState(false)
  const [lineIndex, setLineIndex] = useState(0)
  const [replayToken, setReplayToken] = useState(0)
  const [paused, setPaused] = useState(false)
  const [rate, setRate] = useState(0.9)
  const [volume, setVolume] = useState(1)
  const [voiceName, setVoiceName] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const speechRef = useRef<CalmMeSpeech | null>(null)
  const nextTimerRef = useRef<number | null>(null)

  const finishLine = useCallback(() => {
    if (nextTimerRef.current !== null) window.clearTimeout(nextTimerRef.current)
    if (lineIndex >= CALM_ME_LINES.length - 1) return
    nextTimerRef.current = window.setTimeout(() => setLineIndex((index) => index + 1), 2000)
  }, [lineIndex])

  const speech = useCalmMeSpeech(rate, volume, voiceName, finishLine)
  speechRef.current = speech

  const close = useCallback(() => {
    speech.stop()
    if (nextTimerRef.current !== null) window.clearTimeout(nextTimerRef.current)
    setOpen(false)
    setPaused(false)
    openerRef.current?.focus()
  }, [speech.stop])

  const start = useCallback(() => {
    setOpen(true)
    setLineIndex(0)
    setReplayToken((token) => token + 1)
    setPaused(false)
    window.dispatchEvent(new Event(CALM_ME_OPEN_EVENT))
  }, [])

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    speech.speak(lineIndex)
    return () => speech.stop()
  }, [open, replayToken]) // The sequence advances through the speech completion callback below.

  useEffect(() => {
    if (!open || lineIndex === 0) return
    speech.speak(lineIndex)
  }, [lineIndex, open, speech.speak])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, select, input'))
        .filter((element) => !element.hasAttribute('disabled'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, open])

  useEffect(() => () => speech.stop(), [speech.stop])

  const togglePause = () => {
    if (paused) { speech.resume(); setPaused(false) }
    else { speech.pause(); setPaused(true) }
  }

  const repeat = () => {
    speech.stop()
    setLineIndex(0)
    setReplayToken((token) => token + 1)
    setPaused(false)
  }

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="calm-me-button"
        onClick={start}
        aria-label="Calm Me. Start a calming session."
      >
        <HandHeart aria-hidden="true" />
        <span>Calm Me</span>
      </button>

      {open && (
        <div className="calm-me-backdrop" role="presentation">
          <div
            ref={dialogRef}
            className="calm-me-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calm-me-title"
            tabIndex={-1}
          >
            <div className="calm-me-header">
              <div>
                <p className="calm-me-eyebrow">Kioo Companion</p>
                <h2 id="calm-me-title">Take Your Time</h2>
              </div>
              <button type="button" className="calm-me-icon-button" onClick={close} aria-label="End calming session">
                <X aria-hidden="true" />
              </button>
            </div>
            <p className="calm-me-intro">You are safe to take a moment. There is no rush.</p>
            <p className="calm-me-current" aria-live="polite">{CALM_ME_LINES[lineIndex]}</p>
            <p className="calm-me-support">Take your time. You can continue when you are ready.</p>

            {!speech.supported && <p className="calm-me-warning" role="status">Speech playback is not available here. You can still read the affirmations and move through them manually.</p>}

            <div className="calm-me-controls">
              <button type="button" className="calm-me-end" onClick={close}>End Session</button>
              <button type="button" className="calm-me-secondary" onClick={togglePause} disabled={!speech.supported}>
                {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                {paused ? 'Continue Voice' : 'Pause Voice'}
              </button>
              <button type="button" className="calm-me-secondary" onClick={repeat}>
                <RotateCcw aria-hidden="true" /> Repeat Affirmations
              </button>
              {!speech.supported && <button type="button" className="calm-me-secondary" onClick={() => setLineIndex((index) => Math.min(index + 1, CALM_ME_LINES.length - 1))}>Next</button>}
            </div>

            <div className="calm-me-settings">
              <label><Volume2 aria-hidden="true" /> Volume
                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
              </label>
              <label>Speaking speed
                <input type="range" min="0.5" max="1.2" step="0.05" value={rate} onChange={(event) => setRate(Number(event.target.value))} />
              </label>
              {speech.voices.length > 0 && <label>Voice
                <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)}>
                  <option value="">Automatic</option>
                  {speech.voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}
                </select>
              </label>}
            </div>
            <p className="calm-me-privacy">Calm Me only speaks these predefined words. It does not use your microphone, listen, record, or send conversation audio to Pipecat.</p>
          </div>
        </div>
      )}
    </>
  )
}
