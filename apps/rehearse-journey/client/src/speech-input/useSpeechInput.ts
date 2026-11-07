import { useCallback, useEffect, useRef, useState } from 'react'
import type { PipecatClient } from '@pipecat-ai/client-js'
import { useBrowserSTT } from '@/lib/useBrowserSTT'

export interface UseSpeechInputOptions {
  client: PipecatClient | undefined
  isActiveRef: React.MutableRefObject<boolean>
  isListeningState: boolean
  usesBrowserStt: boolean
  audioEnabled: boolean
  onSpokenTurn: (transcript: string) => void
  onError: (msg: string) => void
}

export interface UseSpeechInputReturn {
  micEnabled: boolean
  interimSpoken: string
  toggleMic: () => void
  disableMic: () => void
  onBotStartedSpeaking: () => void
  onBotStoppedSpeaking: () => void
}

/**
 * Speech-input module (`src/speech-input/useSpeechInput.ts`).
 *
 * Routes microphone capture to either:
 *   - Browser SpeechRecognition (`useBrowserSTT`) when `usesBrowserStt === true`
 *     (e.g. `gemini_proxy` / `gemini_direct` REST + TTS stacks), or
 *   - Pipecat WebRTC microphone capture (`client.enableMic`) when
 *     `usesBrowserStt === false` (server-side STT / Gemini Live / OpenAI stacks).
 *
 * Synchronizes permission/device errors with `micEnabled` and cancels any
 * delayed restart timers immediately on mic-off, pause, or exit.
 */
export function useSpeechInput({
  client,
  isActiveRef,
  isListeningState,
  usesBrowserStt,
  audioEnabled,
  onSpokenTurn,
  onError,
}: UseSpeechInputOptions): UseSpeechInputReturn {
  const [micEnabled, setMicEnabled] = useState(false)
  const [interimSpoken, setInterimSpoken] = useState('')
  const micEnabledRef = useRef(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }, [])

  const handleSttError = useCallback(
    (errorCode: string) => {
      clearResumeTimer()
      micEnabledRef.current = false
      setMicEnabled(false)
      setInterimSpoken('')
      try {
        client?.enableMic(false)
      } catch {
        /* ignore */
      }
      onError(
        errorCode === 'not-allowed' || errorCode === 'service-not-allowed'
          ? 'Microphone permission denied. You can keep typing with the mic off.'
          : 'Microphone unavailable. You can keep typing with the mic off.',
      )
    },
    [clearResumeTimer, client, onError],
  )

  const handleFinalTranscript = useCallback(
    (transcript: string) => {
      const text = transcript.trim()
      if (!isActiveRef.current || !micEnabledRef.current || !isListeningState || !text) return
      setInterimSpoken('')
      onSpokenTurn(text)
    },
    [isActiveRef, isListeningState, onSpokenTurn],
  )

  const browserSTT = useBrowserSTT({
    onFinal: handleFinalTranscript,
    onError: handleSttError,
  })

  useEffect(() => {
    if (!micEnabled || !usesBrowserStt) setInterimSpoken('')
    else setInterimSpoken(browserSTT.interim)
  }, [browserSTT.interim, micEnabled, usesBrowserStt])

  const disableMic = useCallback(() => {
    clearResumeTimer()
    micEnabledRef.current = false
    setMicEnabled(false)
    setInterimSpoken('')
    browserSTT.stop()
    try {
      client?.enableMic(false)
    } catch {
      /* ignore */
    }
  }, [browserSTT, clearResumeTimer, client])

  useEffect(() => () => clearResumeTimer(), [clearResumeTimer])

  const toggleMic = useCallback(() => {
    if (!client || !isActiveRef.current) return
    if (!audioEnabled) {
      disableMic()
      onError('Audio is turned off. Turn audio on to use the microphone, or keep typing below.')
      return
    }
    if (micEnabledRef.current) {
      disableMic()
      return
    }

    if (usesBrowserStt) {
      if (!browserSTT.supported) {
        disableMic()
        onError('Speech recognition is not available in this browser. You can keep typing below.')
        return
      }
      try {
        client.enableMic(false)
        browserSTT.start()
        micEnabledRef.current = true
        setMicEnabled(true)
        onError('')
      } catch {
        disableMic()
        onError('Microphone unavailable. You can keep typing with the mic off.')
      }
    } else {
      try {
        browserSTT.stop()
        client.enableMic(true)
        micEnabledRef.current = true
        setMicEnabled(true)
        onError('')
      } catch {
        disableMic()
        onError('Microphone unavailable. You can keep typing with the mic off.')
      }
    }
  }, [audioEnabled, browserSTT, client, disableMic, isActiveRef, onError, usesBrowserStt])

  const onBotStartedSpeaking = useCallback(() => {
    clearResumeTimer()
    if (usesBrowserStt) {
      browserSTT.stop()
    }
  }, [browserSTT, clearResumeTimer, usesBrowserStt])

  const onBotStoppedSpeaking = useCallback(() => {
    clearResumeTimer()
    if (!isActiveRef.current || !micEnabledRef.current || !usesBrowserStt) return
    resumeTimerRef.current = setTimeout(() => {
      resumeTimerRef.current = null
      if (isActiveRef.current && micEnabledRef.current && usesBrowserStt) {
        try {
          browserSTT.start()
        } catch {
          /* recognition releasing */
        }
      }
    }, 300)
  }, [browserSTT, clearResumeTimer, isActiveRef, usesBrowserStt])

  return {
    micEnabled,
    interimSpoken,
    toggleMic,
    disableMic,
    onBotStartedSpeaking,
    onBotStoppedSpeaking,
  }
}
