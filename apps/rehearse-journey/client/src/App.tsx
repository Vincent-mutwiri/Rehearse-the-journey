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
 * S0 scope: connects to bot, shows connection status, typed input works.
 * S1 scope: Joy speaks first, role-play flow, full controller.
 * S2 scope: scenario/level selection, approval gate, pause/exit.
 * S3 scope: toolkit adapters ×4.
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import {
  PipecatClientProvider,
  PipecatClientAudio,
  usePipecatClient,
  useRTVIClientEvent,
} from '@pipecat-ai/client-react'
import { PipecatClient, RTVIEvent } from '@pipecat-ai/client-js'
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport'

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
  const turnId = useRef(0)

  const addTurn = useCallback((speaker: 'Joy' | 'You', text: string) => {
    setTurns(prev => [...prev, { speaker, text, id: turnId.current++ }])
  }, [])

  // Listen for bot transcript events
  useRTVIClientEvent(RTVIEvent.BotTranscript, (data: { text: string }) => {
    addTurn('Joy', data.text)
    setState('listening')
  })

  useRTVIClientEvent(RTVIEvent.UserTranscript, (data: { text: string; final: boolean }) => {
    if (data.final) addTurn('You', data.text)
  })

  useRTVIClientEvent(RTVIEvent.Connected, () => setState('listening'))
  useRTVIClientEvent(RTVIEvent.Disconnected, () => setState('ended'))
  useRTVIClientEvent(RTVIEvent.BotStartedSpeaking, () => setState('speaking'))
  useRTVIClientEvent(RTVIEvent.BotStoppedSpeaking, () => setState('listening'))

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setState('connecting')
    try {
      await client?.connect()
    } catch (err) {
      console.error('Connection error:', err)
      setState('idle')
    }
  }

  const handlePause = useCallback(async () => {
    // Mute + suspend transport — Pause stops audio immediately (safeguarding)
    await client?.enableMic(false)
    setState('paused')
  }, [client])

  const handleResume = useCallback(async () => {
    // Resume is explicit — never auto-restart mic
    await client?.enableMic(true)
    setState('listening')
  }, [client])

  const handleExit = useCallback(async () => {
    await client?.disconnect()
    setState('ended')
  }, [client])

  const handleSendText = useCallback(async () => {
    if (!typedInput.trim()) return
    addTurn('You', typedInput.trim())
    // Send text into the conversation
    try {
      await client?.sendText(typedInput.trim())
    } catch (e) {
      console.warn('sendText failed — bot may not be connected yet', e)
    }
    setTypedInput('')
  }, [client, typedInput, addTurn])

  // ── Render ─────────────────────────────────────────────────────────────────

  const isConnected = state === 'listening' || state === 'speaking' || state === 'paused'

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
        is fictional and used only for rehearsal.
      </div>

      {/* ── Connection status ── */}
      <div style={styles.statusArea} aria-live="polite" aria-label="Connection status">
        {state === 'idle'       && <p>Ready to start. Press <strong>Start Rehearsal</strong> to connect to Joy.</p>}
        {state === 'connecting' && <p>⏳ Connecting to Joy…</p>}
        {state === 'listening'  && <p>🎤 Joy is listening — speak or type below.</p>}
        {state === 'speaking'   && <p>🔊 Joy is speaking…</p>}
        {state === 'paused'     && <p>⏸ Paused — your mic is off. Press <strong>Resume</strong> when ready.</p>}
        {state === 'ended'      && (
          <p>✅ Session ended. <button style={styles.btnTeal} onClick={() => { setTurns([]); setState('idle') }}>
            Start again
          </button></p>
        )}
      </div>

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
          onChange={e => setTypedInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendText()
            }
          }}
        />
        <button
          style={isConnected ? styles.btnTeal : { ...styles.btnTeal, opacity: 0.5 }}
          onClick={handleSendText}
          disabled={!isConnected || !typedInput.trim()}
          aria-label="Send typed message"
        >
          Send
        </button>
      </div>

      {/* ── Controls: always visible, never buried ── */}
      <div style={styles.controlRow} role="group" aria-label="Rehearsal controls">
        {state === 'idle' && (
          <button style={styles.btnTeal} onClick={handleStart} aria-label="Start rehearsal with Joy">
            Start Rehearsal
          </button>
        )}
        {isConnected && state !== 'paused' && (
          <button style={styles.btnBlack} onClick={handlePause} aria-label="Pause — stops your mic immediately">
            ⏸ Pause
          </button>
        )}
        {state === 'paused' && (
          <button style={styles.btnTeal} onClick={handleResume} aria-label="Resume rehearsal">
            ▶ Resume
          </button>
        )}
        {isConnected && (
          <button style={styles.btnRed} onClick={handleExit} aria-label="Exit rehearsal — ends the session">
            ✕ Exit
          </button>
        )}
      </div>

      {/* Pipecat audio element (required for voice output) */}
      <PipecatClientAudio />
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
    enableMic: true,
    enableCam: false,
  }), [])

  return (
    <PipecatClientProvider client={client}>
      <RehearsalView />
    </PipecatClientProvider>
  )
}
