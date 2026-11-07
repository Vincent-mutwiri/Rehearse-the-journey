import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Browser SpeechRecognition for the gemini_text path.
 *
 * The Lovable proxy carries REST (generateContent) but not the Gemini Live
 * WebSocket, so the bot has no server-side STT. This hook transcribes the
 * person's speech in the browser and hands the transcript to the caller via
 * onFinal, which sends it as RTVI sendText — the same path as the typed input.
 *
 * Falls back gracefully: if SpeechRecognition is unavailable (Firefox, older
 * Safari), the hook reports `supported: false` and the caller keeps the typed
 * path as the guaranteed alternative.
 */

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

export interface UseBrowserSTTOptions {
  lang?: string
  onFinal: (transcript: string) => void
  onError?: (errorCode: string) => void
}

export interface UseBrowserSTTReturn {
  supported: boolean
  listening: boolean
  interim: string
  start: () => void
  stop: () => void
}

export function useBrowserSTT({ lang = 'en-US', onFinal, onError }: UseBrowserSTTOptions): UseBrowserSTTReturn {
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return false
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
  })
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal // always call the latest callback
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  // Synchronous flag — the onend handler reads this, not the async state,
  // so stop() can suppress the auto-restart before the state propagates.
  const shouldListenRef = useRef(false)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!supported) return
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (event) => {
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i] as unknown as { 0: { transcript: string }, isFinal?: boolean }
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          const trimmed = transcript.trim()
          if (trimmed) {
            onFinalRef.current(trimmed)
          }
        } else {
          interimText += transcript
        }
      }
      setInterim(interimText)
    }
    rec.onerror = (event) => {
      // "no-speech", "aborted", and headless Chromium's "network" are non-permission events.
      // Permission/device errors ("not-allowed", "service-not-allowed", "audio-capture")
      // stop listening and synchronize the displayed mic state with the caller.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        shouldListenRef.current = false
        clearRestartTimer()
        setListening(false)
        setInterim('')
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture'
        ) {
          onErrorRef.current?.(event.error)
        }
      }
    }
    // SpeechRecognition stops after each final result even with continuous:true.
    // Restart it only if shouldListenRef is true — this is the synchronous
    // source of truth, so stop() can suppress the restart before the React
    // state update propagates.
    rec.onend = () => {
      clearRestartTimer()
      if (shouldListenRef.current) {
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null
          if (shouldListenRef.current && recognitionRef.current) {
            try { recognitionRef.current.start() } catch { /* still releasing; onend will fire again */ }
          }
        }, 100)
      } else {
        setListening(false)
      }
    }
    recognitionRef.current = rec
    return () => {
      shouldListenRef.current = false
      clearRestartTimer()
      try { rec.abort() } catch { /* already dead */ }
      recognitionRef.current = null
    }
  }, [supported, lang, clearRestartTimer])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    clearRestartTimer()
    shouldListenRef.current = true
    try {
      recognitionRef.current.start()
      setListening(true)
      setInterim('')
    } catch { /* already started */ }
  }, [clearRestartTimer])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    clearRestartTimer()
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch { /* already stopped */ }
    setListening(false)
    setInterim('')
  }, [clearRestartTimer])

  return { supported, listening, interim, start, stop }
}