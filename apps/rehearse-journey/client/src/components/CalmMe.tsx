import { useCallback, useEffect, useRef, useState } from 'react'
import { HandHeart } from 'lucide-react'

export const CALM_ME_OPEN_EVENT = 'kioo:calm-me-open'

export const DECOMPRESS_AFFIRMATIONS = [
  'Ni sawa tu, muulize tu, ataelewa.',
  'Ni mtu ka mimi.',
  'Vile atajibu tu ni sawa.',
] as const

export const DECOMPRESS_COUNTS = ['Moja.', 'Mbili.', 'Tatu.', 'Nne.', 'Tano.'] as const

type PlaybackStatus = 'speaking-affirmation' | 'counting' | 'waiting-for-next'

function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const tokenRef = useRef(0)

  useEffect(() => {
    if (!supported) return
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [supported])

  const speak = useCallback((text: string, rate: number, done: () => void, token: number) => {
    if (!supported) { done(); return }
    const utterance = new SpeechSynthesisUtterance(text)
    const swahiliVoice = voices.find((voice) => /^sw(-KE)?/i.test(voice.lang))
    utterance.voice = swahiliVoice ?? voices.find((voice) => /^en/i.test(voice.lang)) ?? null
    utterance.lang = swahiliVoice?.lang ?? 'sw-KE'
    utterance.rate = rate
    utterance.volume = 1
    utterance.onend = () => { if (token === tokenRef.current) done() }
    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted' && token === tokenRef.current) done()
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }, [supported, voices])

  const stop = useCallback(() => {
    tokenRef.current += 1
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  return { supported, speak, stop, nextToken: () => ++tokenRef.current }
}

export default function CalmMe() {
  const [open, setOpen] = useState(false)
  const [affirmationIndex, setAffirmationIndex] = useState(0)
  const [countIndex, setCountIndex] = useState<number | null>(null)
  const [status, setStatus] = useState<PlaybackStatus>('waiting-for-next')
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<number | null>(null)
  const sessionRef = useRef(0)
  const speech = useSpeech()

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const endSession = useCallback(() => {
    sessionRef.current += 1
    clearTimer()
    speech.stop()
    setOpen(false)
    setAffirmationIndex(0)
    setCountIndex(null)
    setStatus('waiting-for-next')
    openerRef.current?.focus()
  }, [speech.stop])

  const advanceCount = useCallback((index: number, session: number) => {
    if (session !== sessionRef.current) return
    if (index >= DECOMPRESS_COUNTS.length - 1) {
      setCountIndex(index)
      setStatus('waiting-for-next')
      return
    }
    timerRef.current = window.setTimeout(() => {
      if (session !== sessionRef.current) return
      const next = index + 1
      setCountIndex(next)
        speech.speak(DECOMPRESS_COUNTS[next], 1.1, () => advanceCount(next, session), speech.nextToken())
    }, 600)
  }, [speech])

  const beginSequence = useCallback((index: number) => {
    clearTimer()
    const session = sessionRef.current
    const token = speech.nextToken()
    setAffirmationIndex(index)
    setCountIndex(null)
    setStatus('speaking-affirmation')
    speech.speak(DECOMPRESS_AFFIRMATIONS[index], 0.8, () => {
      if (session !== sessionRef.current) return
      timerRef.current = window.setTimeout(() => {
        if (session !== sessionRef.current) return
        setCountIndex(0)
        setStatus('counting')
        speech.speak(DECOMPRESS_COUNTS[0], 1.1, () => advanceCount(0, session), speech.nextToken())
      }, 600)
    }, token)
  }, [advanceCount, speech])

  const start = () => {
    sessionRef.current += 1
    setOpen(true)
    window.dispatchEvent(new Event(CALM_ME_OPEN_EVENT))
    beginSequence(0)
  }

  const next = () => {
    if (status !== 'waiting-for-next') return
    beginSequence((affirmationIndex + 1) % DECOMPRESS_AFFIRMATIONS.length)
  }

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
  }, [open])

  useEffect(() => () => {
    clearTimer()
    speech.stop()
  }, [speech.stop])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); endSession(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [endSession, open])

  return (
    <>
      <button ref={openerRef} type="button" className="calm-me-button" onClick={start} aria-label="Decompress. Start a calming session.">
        <HandHeart aria-hidden="true" />
        <span>Decompress</span>
      </button>

      {open && (
        <div className="calm-me-backdrop" role="presentation">
          <div ref={dialogRef} className="calm-me-dialog" role="dialog" aria-modal="true" aria-labelledby="calm-me-title" tabIndex={-1}>
            <div className="calm-me-header">
              <div>
                <p className="calm-me-eyebrow">Kioo Companion</p>
                <h2 id="calm-me-title">Take Your Time</h2>
              </div>
            </div>
            <p className="calm-me-intro">You are safe to take a moment. There is no rush.</p>
            <p className="calm-me-progress" aria-live="polite">Affirmation {affirmationIndex + 1} of 3</p>
            <p className="calm-me-current" aria-live="polite">{DECOMPRESS_AFFIRMATIONS[affirmationIndex]}</p>
            <div className="calm-me-counts" aria-label="Swahili count from one to five">
              {DECOMPRESS_COUNTS.map((count, index) => (
                <span key={count} className={countIndex === index ? 'is-current' : ''}>{count}</span>
              ))}
            </div>
            <p className="calm-me-support">{status === 'waiting-for-next' ? 'Choose Next when you are ready.' : 'Listening together, one step at a time.'}</p>
            {!speech.supported && <p className="calm-me-warning" role="status">Speech playback is not available in this browser. The affirmation and count remain visible.</p>}
            <div className="calm-me-controls">
              <button type="button" className="calm-me-secondary" disabled={status !== 'waiting-for-next'} onClick={next}>Next</button>
              <button type="button" className="calm-me-end" onClick={endSession}>End Session</button>
            </div>
            <p className="calm-me-privacy">Decompress only speaks these predefined words. It does not use your microphone, listen, record, or send conversation audio to Pipecat.</p>
          </div>
        </div>
      )}
    </>
  )
}
