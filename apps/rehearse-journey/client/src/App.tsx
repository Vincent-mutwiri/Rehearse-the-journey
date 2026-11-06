/**
 * Rehearse the Journey — React Client (S0 baseline)
 *
 * Architecture:
 *   - PipecatClient from @pipecat-ai/client-js connects to the Python bot
 *   - SmallWebRTCTransport from @pipecat-ai/small-webrtc-transport
 *   - Controller owns role-play state: idle | connecting | listening | speaking | paused | ended
 *   - Typed input is ALWAYS available (guaranteed alternative to voice)
 *   - Pause / Exit are always-visible DOM buttons
 *
 * S1 scope: Joy speaks first, shared spoken/typed conversation, opt-in mic.
 * S2 scope: scenario/level selection, approval gate, pause/exit.
 * S3 scope: toolkit adapters ×4.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  PipecatClientProvider,
  PipecatClientAudio,
  usePipecatClient,
  useRTVIClientEvent,
} from '@pipecat-ai/client-react'
import { PipecatClient, RTVIEvent } from '@pipecat-ai/client-js'
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport'
import { UserAudioControlView } from '@/components/pipecat/user-audio-control'

// ── Types ────────────────────────────────────────────────────────────────────

type RolePlayState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'paused' | 'ended'

// ── Colour tokens (match Kioo Companion palette) ─────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    maxWidth: 720,
    margin: '0 auto',
    padding: '24px 20px',
    gap: 24,
  },
  header: {
    borderBottom: '3px solid #111111',
    paddingBottom: 16,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
  },
  badgeTeal: { background: '#006B5B', color: '#FFFFFF' },
  badgeRed:  { background: '#C62828', color: '#FFFFFF' },
  badgeBlack:{ background: '#111111', color: '#FFFFFF' },
  fiction: {
    background: '#FFF3CD',
    border: '2px solid #C62828',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: '0.9rem',
  },
  statusArea: {
    padding: '16px',
    background: '#F5F5F5',
    borderRadius: 8,
    minHeight: 80,
  },
  transcript: {
    flex: 1,
    padding: 16,
    background: '#FAFAFA',
    border: '2px solid #111111',
    borderRadius: 8,
    minHeight: 200,
    fontSize: '1rem',
    overflowY: 'auto' as const,
  },
  inputRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: 12,
    fontSize: '1rem',
    border: '3px solid #111111',
    borderRadius: 8,
    resize: 'vertical' as const,
    minHeight: 64,
    fontFamily: 'inherit',
  },
  btnTeal: {
    padding: '12px 24px',
    background: '#006B5B',
    color: '#FFFFFF',
    border: '3px solid #006B5B',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: 48,
  },
  btnRed: {
    padding: '12px 24px',
    background: '#C62828',
    color: '#FFFFFF',
    border: '3px solid #C62828',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: 48,
  },
  btnBlack: {
    padding: '12px 24px',
    background: '#111111',
    color: '#FFFFFF',
    border: '3px solid #111111',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: 48,
  },
  controlRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
}

// ── Transcript entry ─────────────────────────────────────────────────────────

interface Turn { speaker: 'Joy' | 'You'; text: string; id: number }

// ── Inner component (has access to PipecatClient hooks) ──────────────────────

function RehearsalView() {
  const client = usePipecatClient()
  const [state, setState] = useState<RolePlayState>('idle')
  const [turns, setTurns] = useState<Turn[]>([])
  const [typedInput, setTypedInput] = useState('')
  const [error, setError] = useState('')
  const [micEnabled, setMicEnabled] = useState(false)
  const [sending, setSending] = useState(false)
  const [stopping, setStopping] = useState(false)
  const stoppingRef = useRef(false)
  const active = useRef(false)
  const sendingRef = useRef(false)
  const generation = useRef(0)
  const turnId = useRef(0)

  const addTurn = useCallback((speaker: 'Joy' | 'You', text: string) => {
    setTurns(prev => [...prev, { speaker, text, id: turnId.current++ }])
  }, [])

  // Listen for bot transcript events
  useRTVIClientEvent(RTVIEvent.BotTranscript, (data: { text: string }) => {
    if (active.current && data.text.trim()) addTurn('Joy', data.text)
  })

  useRTVIClientEvent(RTVIEvent.UserTranscript, (data: { text: string; final: boolean }) => {
    if (active.current && data.final) addTurn('You', data.text)
  })

  useRTVIClientEvent(RTVIEvent.BotReady, () => {
    if (active.current) setState('listening')
  })
  useRTVIClientEvent(RTVIEvent.Disconnected, () => {
    if (active.current) {
      active.current = false
      setMicEnabled(false)
      setState('ended')
      setError('Connection ended. Start again to reconnect to Joy.')
    }
  })
  useRTVIClientEvent(RTVIEvent.BotStartedSpeaking, () => {
    if (active.current) setState('speaking')
  })
  useRTVIClientEvent(RTVIEvent.BotStoppedSpeaking, () => {
    if (active.current) setState('listening')
  })
  useRTVIClientEvent(RTVIEvent.Error, () => {
    if (active.current) setError('Joy could not complete that response. Try again or exit and reconnect.')
  })
  useRTVIClientEvent(RTVIEvent.DeviceError, () => {
    client?.enableMic(false)
    setMicEnabled(false)
    setError('Microphone unavailable. You can keep typing with the mic off.')
  })

  useEffect(function disconnectOnUnmount() {
    return () => {
      active.current = false
      generation.current++
      void client?.disconnect().catch(() => {})
    }
  }, [client])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!client || active.current || stoppingRef.current) return
    const current = ++generation.current
    active.current = true
    setError('')
    setMicEnabled(false)
    client.enableMic(false)
    setState('connecting')
    try {
      await client.connect()
      if (current !== generation.current) {
        await client.disconnect()
        return
      }
      setState('listening')
    } catch {
      if (current === generation.current) {
        active.current = false
        await client.disconnect().catch(() => {})
        setError('Could not connect to Joy. Check that the bot is running on localhost:7860, then try again.')
        setState('idle')
      }
    }
  }

  const stopSession = useCallback(async (next: 'paused' | 'ended') => {
    active.current = false
    generation.current++
    stoppingRef.current = true
    setStopping(true)
    client?.enableMic(false)
    const tracks = client?.tracks()
    tracks?.local.audio?.stop()
    tracks?.bot?.audio?.stop()
    setMicEnabled(false)
    setState(next)
    // Remove the audio element in this render, before network cleanup finishes.
    try {
      await client?.disconnect()
    } catch {
      setError('Connection cleanup failed. Reload this page before starting again.')
    } finally {
      stoppingRef.current = false
      setStopping(false)
    }
  }, [client])

  const handleSendText = useCallback(async () => {
    const text = typedInput.trim()
    if (!client || !active.current || sendingRef.current || !text ||
        (state !== 'listening' && state !== 'speaking')) return
    const current = generation.current
    sendingRef.current = true
    setSending(true)
    setError('')
    try {
      await client.sendText(text, { run_immediately: true, audio_response: true })
      if (active.current && current === generation.current) {
        addTurn('You', text)
        setTypedInput('')
      }
    } catch {
      if (active.current && current === generation.current) {
        setError('Your message could not be sent. Your text is still here; try Send again.')
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [client, typedInput, addTurn, state])

  const handleToggleMic = () => {
    if (!client || !active.current) return
    try {
      client.enableMic(!micEnabled)
      setMicEnabled(!micEnabled)
      setError('')
    } catch {
      setMicEnabled(false)
      setError('Microphone unavailable. You can keep typing with the mic off.')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isConnected = state === 'listening' || state === 'speaking'

  return (
    <div style={styles.app}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Rehearse the Journey</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ ...styles.badge, ...styles.badgeTeal }}>Hospital Reception</span>
          <span style={{ ...styles.badge, ...styles.badgeRed }}>Level 1 · Easy Start</span>
          <span style={{ ...styles.badge, ...styles.badgeBlack }}>Receptionist Joy</span>
        </div>
      </header>

      {/* ── Fictional fixture disclosure ── */}
      <div style={styles.fiction} role="note" aria-label="Fictional scenario notice">
        ⚠️ <strong>Practice scenario — not a real hospital.</strong> This conversation
        is fictional and used only for rehearsal. Use made-up details. Starting
        connects to an AI provider; typed messages and any enabled microphone audio
        are sent for replies. The mic starts off. This app does not save the transcript.
      </div>

      {/* ── Connection status ── */}
      <div style={styles.statusArea} aria-live="polite" aria-label="Connection status">
        {state === 'idle'       && <p>Ready to start. Press <strong>Start Rehearsal</strong> to connect to Joy.</p>}
        {state === 'connecting' && <p>⏳ Connecting to Joy…</p>}
        {state === 'listening'  && <p>{micEnabled ? 'Microphone on — speak or type below.' : 'Microphone off — type below, or turn on your microphone.'}</p>}
        {state === 'speaking'   && <p>🔊 Joy is speaking…</p>}
        {state === 'paused'     && <p>Paused — audio stopped and mic off. Reconnect to start a new exchange with Joy.</p>}
        {state === 'ended'      && (
          <p>Session ended. <button disabled={stopping} style={styles.btnTeal} onClick={() => { setTurns([]); setTypedInput(''); setError(''); setState('idle') }}>
            Start again
          </button></p>
        )}
      </div>
      {error && <p role="alert">{error}</p>}

      {/* ── Transcript ── */}
      <section style={styles.transcript} aria-label="Conversation transcript" aria-live="polite">
        {turns.length === 0 && <p style={{ color: '#666' }}>The conversation will appear here.</p>}
        {turns.map(t => (
          <div key={t.id} style={{ marginBottom: 12 }}>
            <strong>{t.speaker}:</strong> {t.text}
          </div>
        ))}
      </section>

      {/* ── Typed input (guaranteed alternative to voice) ── */}
      <div style={styles.inputRow}>
        <textarea
          id="typed-input"
          aria-label="Type your response here"
          placeholder="Type here — works with or without mic"
          style={styles.textarea}
          value={typedInput}
          maxLength={2000}
          onChange={e => setTypedInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              handleSendText()
            }
          }}
        />
        <button
          style={isConnected ? styles.btnTeal : { ...styles.btnTeal, opacity: 0.5 }}
          onClick={handleSendText}
          disabled={!isConnected || sending || !typedInput.trim()}
          aria-label="Send typed message"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>

      {/* ── Controls: always visible, never buried ── */}
      <div style={styles.controlRow} role="group" aria-label="Rehearsal controls">
        {state === 'idle' && (
          <button style={styles.btnTeal} onClick={handleStart} aria-label="Start rehearsal with Joy">
            Start Rehearsal
          </button>
        )}
        {isConnected && (
          <button style={styles.btnBlack} onClick={() => void stopSession('paused')} aria-label="Pause — stops audio and microphone">
            ⏸ Pause
          </button>
        )}
        {state === 'paused' && (
          <button disabled={stopping} style={styles.btnTeal} onClick={handleStart} aria-label="Reconnect with microphone off">
            Reconnect with mic off
          </button>
        )}
        {(isConnected || state === 'paused' || state === 'connecting') && (
          <button style={styles.btnRed} onClick={() => void stopSession('ended')} aria-label="Exit rehearsal — ends the session">
            ✕ Exit
          </button>
        )}
        {isConnected && (
          <UserAudioControlView
            isMicEnabled={micEnabled}
            onToggleMic={handleToggleMic}
            noDevicePicker
            noVisualizer
            activeText="Microphone on"
            inactiveText="Microphone off"
            variant="outline"
            unavailableText={stopping ? 'Stopping audio…' : undefined}
          />
        )}
      </div>

      {/* Pipecat audio element (required for voice output) */}
      {isConnected && <PipecatClientAudio />}
    </div>
  )
}

// ── Root App — wraps with PipecatClientProvider ───────────────────────────────

export default function App() {
  const client = useMemo(() => new PipecatClient({
    transport: new SmallWebRTCTransport({
      // Pipecat runner serves the SmallWebRTC SDP exchange at POST /api/offer
      // Vite dev proxy forwards /api → http://localhost:7860
      webrtcRequestParams: { endpoint: '/api/offer' },
    }),
    enableMic: false,
    enableCam: false,
  }), [])

  return (
    <PipecatClientProvider client={client}>
      <RehearsalView />
    </PipecatClientProvider>
  )
}
