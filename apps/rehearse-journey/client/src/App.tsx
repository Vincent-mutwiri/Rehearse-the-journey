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
import { AudioVisualizerBar } from '@/components/pipecat/audio-visualizer-bar'
import JoyMascot, { type JoyPersona } from '@/components/JoyMascot'
import StoryCard from '@/components/StoryCard'
import { STORIES } from './stories'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { useBrowserSTT } from '@/lib/useBrowserSTT'
import { Button } from '@/components/ui/button'
import {
  Sprout,
  Cross,
  BusFront,
  Landmark,
  Signpost,
  MessageCircle,
  MicOff,
  Pause,
  Play,
  Camera,
  MapPin,
  BookOpen,
  Layers,
  ShieldCheck,
  Activity,
  Users,
} from 'lucide-react'
import {
  ReadAloud,
  StopAutoAdvance,
  MotionReducer,
  enableStopAutoAdvance,
  simplifyStepText,
  ORIGINAL_STEP_TEXT,
} from './toolkitAdapters'
import {
  RehearsalApprovalController,
  type ApprovalProposal,
} from './controller/approvalController'
import {
  SCENARIO_CATALOG,
  LEVEL_LABELS,
  PROVIDER_STACK_OPTIONS,
  SIGN_CARDS,
  buildLearnStepsForGoal,
  type RehearsalMode,
  type ScenarioId,
  type LearnStepDraft,
} from './controller/v11ScenariosAndModes'

// ── Types ────────────────────────────────────────────────────────────────────

type RolePlayState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'paused' | 'ended'

// ── Scenarios (S4.4 landing) ─────────────────────────────────────────────────
// Only Hospital Level 1 is live; the rest are honest previews, not dead buttons.

const SCENARIOS: Array<{ id: ScenarioId; name: string; level: string; live: boolean; icon: typeof Cross }> = [
  { id: 'hospital', name: 'Hospital Reception', level: 'Level 1 · Easy Start', live: true, icon: Cross },
  { id: 'matatu', name: 'Matatu Stage', level: 'Levels 1–4 · v1.1', live: true, icon: BusFront },
  { id: 'government', name: 'Government Service', level: 'Levels 1–4 · v1.1', live: true, icon: Landmark },
  { id: 'directions', name: 'Asking for Directions', level: 'Levels 1–4 · v1.1', live: true, icon: Signpost },
]

// ── Transcript entry ─────────────────────────────────────────────────────────

interface Turn { speaker: 'Joy' | 'You'; speakerLabel?: string; text: string; id: number }

// Rotating tips: this element advances on a timer, so the toolkit's
// stop-auto-advance adapter has something real to hold still.
const TIPS = [
  'Tip: you can always type instead of speaking — the mic stays off until you turn it on.',
  'Tip: Pause stops Joy mid-sentence and turns the mic off. Exit ends the session.',
  'Tip: every change on this page is a rehearsal aid; nothing is saved or sent anywhere else.',
]

const STATUS_NARRATION: Record<RolePlayState, string> = {
  idle: 'Ready to start. Press Start Rehearsal to connect to Joy.',
  connecting: 'Connecting to Joy.',
  listening: 'Listening. You can type below, or turn on your microphone.',
  speaking: 'Joy is speaking.',
  paused: 'Paused. Audio stopped and microphone off.',
  ended: 'Session ended.',
}

// ── Inner component (has access to PipecatClient hooks) ──────────────────────

function RehearsalView() {
  const client = usePipecatClient()
  const [state, setState] = useState<RolePlayState>('idle')
  const [selectedLevel, setSelectedLevel] = useState<LevelId>('1')
  const [clarityEnabled, setClarityEnabled] = useState(false)
  const [clarityPercentage, setClarityPercentage] = useState<ClarificationPercentage>(40)
  const [clarificationHint, setClarificationHint] = useState('')
  const [showClarificationHint, setShowClarificationHint] = useState(false)
  const [clarificationOpportunities, setClarificationOpportunities] = useState(0)
  const [clarificationQuestions, setClarificationQuestions] = useState(0)
  const [clarificationsResolved, setClarificationsResolved] = useState(0)
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
  const tipsRef = useRef<HTMLDivElement>(null)

  // S3 — toolkit adapter preferences. Each maps to a real adapter module in
  // tools/adapters/ (or its deterministic stand-in for simplify-text, which
  // needs an AI provider the demo does not have).
  const [readAloud, setReadAloud] = useState(false)
  const [plainWords, setPlainWords] = useState(false)
  const [stopAuto, setStopAuto] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [aloudSpeaking, setAloudSpeaking] = useState(false)
  // Increments on each completed user turn — retriggers Joy's sage nod.
  const [nod, setNod] = useState(0)
  // Joy is preparing a response (between user send and Joy's first word).
  const [joyThinking, setJoyThinking] = useState(false)
  // Interim speech-to-text from the browser STT — shows what Joy "hears"
  // before the transcript is final, so the person knows the mic is working.
  const [interimSpoken, setInterimSpoken] = useState('')
  // Bot-driven interactive story next to the mascot. storySession remounts
  // the card so reopening the same story restarts at slide one.
  const [storyId, setStoryId] = useState<string | null>(null)
  const [storySession, setStorySession] = useState(0)

  // ── v1.1 Full Pipecat Architecture state (SA–SF) ─────────────────────────
  const [scenarioId, setScenarioId] = useState<ScenarioId>('hospital')
  const [chaosLevel, setChaosLevel] = useState<1 | 2 | 3 | 4>(1)
  const [mode, setMode] = useState<RehearsalMode>('practise')
  const [activePersona, setActivePersona] = useState<JoyPersona>('joy')
  const [parallelOverlap, setParallelOverlap] = useState(false)
  const [audioPref, setAudioPref] = useState(true)
  const [providerStackId, setProviderStackId] = useState<string>('gemini_proxy')
  const [providerNotice, setProviderNotice] = useState<string>('')
  const [cameraConsent, setCameraConsent] = useState(false)
  const [devFrameOverlay, setDevFrameOverlay] = useState(false)
  const [selectedSignId, setSelectedSignId] = useState<string>('outpatient_b')
  const [learnGoal, setLearnGoal] = useState('prepare for my first hospital visit')
  const [learnSteps, setLearnSteps] = useState<LearnStepDraft[]>(() =>
    buildLearnStepsForGoal('prepare for my first hospital visit'),
  )
  const [exploreQuery, setExploreQuery] = useState('Where is the Hospital Road bus stage?')
  const [exploreLang, setExploreLang] = useState<'en' | 'sw'>('en')
  const [routeRequested, setRouteRequested] = useState(false)
  const [whiskerOpen, setWhiskerOpen] = useState(false)
  const [whiskerTraces, setWhiskerTraces] = useState<string[]>([
    'in | TransportReady | SmallWebRTC SDP offer ready',
    'out | FlowOpening | Step 1 · Arrive & state your visit',
  ])

  const approvalControllerRef = useRef<RehearsalApprovalController>(
    new RehearsalApprovalController(
      SCENARIO_CATALOG.hospital.stepsByLevel[1].map(s => s.id),
      [
        'Carry pretend clinic card or appointment note',
        'Ask Receptionist Joy to repeat directions if needed',
      ],
    ),
  )
  const [controllerSnap, setControllerSnap] = useState(() =>
    approvalControllerRef.current.getSnapshot(),
  )
  const syncController = useCallback(() => {
    setControllerSnap(approvalControllerRef.current.getSnapshot())
  }, [])

  const currentScenario = SCENARIO_CATALOG[scenarioId]
  const currentSteps = currentScenario.stepsByLevel[chaosLevel]
  const currentStepDef =
    currentSteps[Math.min(controllerSnap.currentStepIndex, currentSteps.length - 1)] ??
    currentSteps[0]
  const activeProviderStack =
    PROVIDER_STACK_OPTIONS.find(p => p.id === (audioPref ? providerStackId : 'text_only')) ??
    PROVIDER_STACK_OPTIONS[0]

  const motionReduced = useReducedMotion(reduceMotion)
  const landing = state === 'idle'
  const statusRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const previousState = useRef<RolePlayState>(state)

  // Keep keyboard focus useful when a clicked control is replaced by a new view.
  useEffect(() => {
    const previous = previousState.current
    previousState.current = state
    if (state === previous) return
    if (state === 'idle') titleRef.current?.focus()
    else if (state === 'connecting' || state === 'paused' || state === 'ended') statusRef.current?.focus()
    else if (state === 'listening' && previous !== 'speaking') document.getElementById('typed-input')?.focus()
  }, [state])

  // The landing has no carousel; start only once the session view is mounted.
  useEffect(() => {
    const box = tipsRef.current
    if (landing || stopAuto || motionReduced || !box) return
    const slides = Array.from(box.querySelectorAll('.tip-slide'))
    if (!slides.length) return
    let i = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')))
    const id = setInterval(() => {
      i = (i + 1) % slides.length
      slides.forEach((slide, index) => slide.classList.toggle('is-active', index === i))
    }, 6000)
    return () => clearInterval(id)
  }, [landing, stopAuto, motionReduced])

  // Track whether the read-aloud adapter is actually speaking.
  useEffect(() => {
    if (!readAloud) { setAloudSpeaking(false); return }
    const id = setInterval(() => setAloudSpeaking(ReadAloud.speaking), 400)
    return () => clearInterval(id)
  }, [readAloud])

  const addTurn = useCallback((speaker: string, text: string) => {
    setTurns(prev => [...prev, { speaker, text, id: turnId.current++ }])
    if (speaker === 'You') setNod(n => n + 1)
  }, [])

  const parseSpeaker = useCallback((text: string) => {
    const match = text.match(/^(Joy|Amani|Nurse Wanjiku|Hospital Attendant|Attendant):\s*(.*)$/s)
    return match ? { speaker: match[1], text: match[2] } : { speaker: 'Joy', text }
  }, [])

  // Browser STT for the gemini_text path. The Lovable proxy carries REST but
  // not the Gemini Live WebSocket, so the bot has no server-side STT — the
  // browser transcribes and the transcript goes out as RTVI sendText, the
  // same path as the typed input. Joy still speaks via GeminiTTSService.
  const sendSpoken = useCallback((transcript: string) => {
    const text = transcript.trim()
    if (!client || !active.current || !text) return
    // Half-duplex: only send the person's speech when Joy is NOT speaking.
    // This prevents the browser mic from picking up Joy's TTS audio from the
    // speakers, transcribing it, and echoing it back as user input.
    if (state !== 'listening') return
    setInterimSpoken('')
    setJoyThinking(true)
    void client.sendText(text, { run_immediately: true, audio_response: true })
      .then(() => {
        if (clarityEnabled && isClarificationQuestion(text)) {
          setClarificationQuestions((count) => count + 1)
          if (clarificationHint) setClarificationsResolved((count) => count + 1)
          setClarificationHint('')
          setShowClarificationHint(false)
        }
        addTurn('You', text)
      })
      .catch(() => setError('Your speech could not be sent. Try again or type below.'))
  }, [client, state, addTurn, clarityEnabled, clarificationHint])
  const browserSTT = useBrowserSTT({ onFinal: sendSpoken })

  // Show interim STT text so the person knows the mic is hearing them.
  useEffect(() => {
    if (!micEnabled) setInterimSpoken('')
    else setInterimSpoken(browserSTT.interim)
  }, [browserSTT.interim, micEnabled])

  // Listen for bot transcript events
  useRTVIClientEvent(RTVIEvent.BotTranscript, (data: { text: string }) => {
    if (active.current && data.text.trim()) {
      const parsed = parseSpeaker(data.text)
      if (clarityEnabled && /\b(put .* table|go upstairs|wait over there|over there)\b/i.test(parsed.text)) {
        setClarificationOpportunities((count) => count + 1)
        setClarificationHint(clarificationHintFor(parsed.text))
        setShowClarificationHint(false)
      }
      addTurn(parsed.speaker, parsed.text)
      setJoyThinking(false)  // Joy's first word arrived — no longer "thinking"
      setNod(n => n + 1)     // Joy's turn complete → sage nod
    }
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
    if (active.current) {
      setState('speaking')
      // Half-duplex: stop the browser STT so it doesn't pick up Joy's TTS
      // audio from the speakers and echo it back as user speech.
      browserSTT.stop()
    }
  })
  useRTVIClientEvent(RTVIEvent.BotStoppedSpeaking, () => {
    if (active.current) {
      setState('listening')
      setJoyThinking(false)
      // Resume browser STT only if the person still has the mic on —
      // don't auto-restart if they turned it off or paused. A short delay
      // lets the TTS tail fade before the mic reopens.
      if (micEnabled) {
        setTimeout(() => {
          if (active.current && micEnabled) {
            try { browserSTT.start() } catch { /* needs a moment */ }
          }
        }, 300)
      }
    }
  })
  // Bot-driven interactive stories: the bot sends {type:'story_open', story_id}
  // (or 'story_close') as an RTVI server message when a flow node declares one.
  useRTVIClientEvent(RTVIEvent.ServerMessage, (data: unknown) => {
    const msg = (data as { data?: unknown })?.data ?? data
    if (!msg || typeof msg !== 'object') return
    const m = msg as { type?: string; story_id?: string }
    if (m.type === 'story_open' && typeof m.story_id === 'string' && STORIES[m.story_id]) {
      setStorySession(s => s + 1)
      setStoryId(m.story_id)
    } else if (m.type === 'story_close') {
      setStoryId(null)
    }
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
      ReadAloud.stop()
      if (StopAutoAdvance.enabled) StopAutoAdvance.disable()
      if (MotionReducer.enabled) MotionReducer.disable()
      void client?.disconnect().catch(() => {})
    }
  }, [client])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!client || active.current || stoppingRef.current) return
    const current = ++generation.current
    active.current = true
    setError('')
    setClarificationHint('')
    setShowClarificationHint(false)
    setClarificationOpportunities(0)
    setClarificationQuestions(0)
    setClarificationsResolved(0)
    setMicEnabled(false)
    client.enableMic(false)
    setState('connecting')
    try {
      await client.connect()
      if (current !== generation.current) {
        await client.disconnect()
        return
      }
      // Tell the backend which validated hospital configuration to use before
      // it emits the opening greeting.
      client.sendClientMessage('set-level', {
        level_id: selectedLevel,
        clarificationPractice: {
          enabled: clarityEnabled,
          ambiguityPercentage: clarityPercentage,
        },
      })
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
    // Stop conversation audio and this page's read-aloud speech. OS screen readers remain user-controlled.
    ReadAloud.stop()
    setReadAloud(false)
    setAloudSpeaking(false)
    setJoyThinking(false)
    setInterimSpoken('')
    setStoryId(null)
    browserSTT.stop()  // stop browser STT too — don't leave the mic listening
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

  // Decompress is independent of Pipecat, but an active rehearsal must yield its
  // audio. It stays paused after Decompress closes; resuming remains explicit.
  useEffect(() => {
    const pauseForCalmMe = () => {
      if (active.current) void stopSession('paused')
    }
    window.addEventListener(CALM_ME_OPEN_EVENT, pauseForCalmMe)
    return () => window.removeEventListener(CALM_ME_OPEN_EVENT, pauseForCalmMe)
  }, [stopSession])

  const handleChangeLevel = useCallback(async () => {
    await stopSession('ended')
    setTurns([])
    setTypedInput('')
    setError('')
    setState('idle')
  }, [stopSession])

  const handleSendText = useCallback(async () => {
    const text = typedInput.trim()
    if (!client || !active.current || sendingRef.current || !text ||
        (state !== 'listening' && state !== 'speaking')) return
    const current = generation.current
    sendingRef.current = true
    setSending(true)
    setError('')
    setJoyThinking(true)
    try {
      await client.sendText(text, { run_immediately: true, audio_response: true })
      if (active.current && current === generation.current) {
        if (clarityEnabled && isClarificationQuestion(text)) {
          setClarificationQuestions((count) => count + 1)
          if (clarificationHint) setClarificationsResolved((count) => count + 1)
          setClarificationHint('')
          setShowClarificationHint(false)
        }
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
  }, [client, typedInput, addTurn, state, clarityEnabled, clarificationHint])

  const sendPracticePrompt = useCallback(async (prompt: string) => {
    if (!client || !active.current || sendingRef.current ||
        (state !== 'listening' && state !== 'speaking')) return
    sendingRef.current = true
    setSending(true)
    setError('')
    setJoyThinking(true)
    try {
      await client.sendText(prompt, { run_immediately: true, audio_response: true })
      addTurn('You', prompt)
    } catch {
      setError('That request could not be sent. Try typing instead.')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [client, state, addTurn])

  const handleToggleMic = () => {
    if (!client || !active.current) return
    if (!browserSTT.supported) {
      setMicEnabled(false)
      setError('Speech recognition is not available in this browser. You can keep typing below.')
      return
    }
    if (micEnabled) {
      browserSTT.stop()
      setMicEnabled(false)
    } else {
      try {
        browserSTT.start()
        setMicEnabled(true)
        setError('')
      } catch {
        setMicEnabled(false)
        setError('Microphone unavailable. You can keep typing with the mic off.')
      }
    }
  }

  // ── S3 preference toggles ──────────────────────────────────────────────────

  // What the read-aloud adapter speaks: the page's own text — the scenario
  // notice, the step card, the status line, and Joy's latest turn. Joy's
  // voice itself comes from the bot, not this adapter.
  const buildNarration = useCallback(() => {
    const lastJoy = [...turns].reverse().find(t => t.speaker === 'Joy')
    return [
      'Rehearse the Journey. Practice scenario, not a real hospital.',
      STATUS_NARRATION[state],
      plainWords ? simplifyStepText(ORIGINAL_STEP_TEXT) : ORIGINAL_STEP_TEXT,
      lastJoy ? `Joy said: ${lastJoy.text}` : '',
    ].filter(Boolean).join(' ')
  }, [turns, state, plainWords])

  const toggleReadAloud = () => {
    const next = !readAloud
    setReadAloud(next)
    if (next) {
      ReadAloud.speak(buildNarration())
    } else {
      ReadAloud.stop()
      setAloudSpeaking(false)
    }
  }

  const toggleStopAuto = () => {
    const next = !stopAuto
    setStopAuto(next)
    if (next) enableStopAutoAdvance()
    else StopAutoAdvance.disable()
  }

  const toggleReduceMotion = () => {
    const next = !reduceMotion
    setReduceMotion(next)
    if (next) MotionReducer.enable()
    else MotionReducer.disable()
  }

  const togglePlainWords = () => {
    setPlainWords(!plainWords)
    setShowOriginal(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isConnected = state === 'listening' || state === 'speaking'

  // ── Landing (S4.4): how `idle` renders — Joy, title, scenario cards ──
  if (state === 'idle') {
    return (
      <main className="welcome-shell">
        <header className="welcome-nav">
          <div className="welcome-brand"><Sprout aria-hidden="true" /><span>Kioo<span className="welcome-brand-subtitle">Your practice companion</span></span></div>
          <span className="welcome-nav-note">A space to try, at your pace.</span>
        </header>

        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-intro">
            <h1 id="welcome-title" ref={titleRef} tabIndex={-1}>Rehearse<br />the Journey</h1>
            <p>Everyday conversations can feel a little easier with a little practice. Try them with Joy, one step at a time.</p>
            <ul className="welcome-reassurances" aria-label="You’re in control">
              <li><MessageCircle aria-hidden="true" />Speak or type</li>
              <li><Pause aria-hidden="true" />Pause whenever you need</li>
            </ul>
          </div>
          <div className="welcome-companion">
            <div className="welcome-companion-backdrop" aria-hidden="true" />
            <JoyMascot state="idle" reduceMotion={reduceMotion || stopAuto} className="welcome-joy" />
            <p className="welcome-greeting">Hi, I’m Joy.<br /><strong>Let’s try it together.</strong></p>
          </div>
        </section>

        <section className="welcome-scenarios" aria-labelledby="scenario-heading">
          <div className="welcome-section-heading">
            <h2 id="scenario-heading">Where shall we start?</h2>
            <p>Choose a conversation to practice.</p>
          </div>
          <div className="scenario-layout" role="group" aria-label="Practice scenarios">
            <div className="scenario-start flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="scenario-symbol"><Cross aria-hidden="true" /></span>
                <div>
                  <span className="scenario-level">Hospital Reception</span>
                  <span className="scenario-title block">Choose your level</span>
                </div>
              </div>
              <div className="grid gap-3" role="list" aria-label="Hospital Reception difficulty levels">
                {HOSPITAL_LEVELS.map(level => (
                  <button
                    key={level.id}
                    type="button"
                    aria-pressed={selectedLevel === level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={'rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender ' +
                      (selectedLevel === level.id ? 'border-lavender bg-lavender/25' : 'border-ink/15 bg-white/60 hover:border-lavender/60')}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Level {level.id} · {level.name}</span>
                      <span className="text-xs font-semibold opacity-75">People: {level.people}</span>
                    </span>
                    <span className="mt-1 block text-sm opacity-80">{level.description}</span>
                  </button>
                ))}
              </div>
              <section className="clarity-practice" aria-labelledby="clarity-title">
                <div className="clarity-heading">
                  <div>
                    <h3 id="clarity-title">Ask for Clarity</h3>
                    <p>Practise asking specific questions when someone gives unclear instructions.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={clarityEnabled}
                    aria-label={`Ask for Clarity. ${clarityEnabled ? 'On' : 'Off'}`}
                    className={`clarity-switch${clarityEnabled ? ' is-on' : ''}`}
                    onClick={() => setClarityEnabled((enabled) => !enabled)}
                  >
                    <span className="clarity-switch-thumb" aria-hidden="true" />
                    <span>{clarityEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
                {clarityEnabled && (
                  <fieldset className="clarity-options">
                    <legend>How often should instructions be unclear?</legend>
                    {([
                      [20, 'A little practice'],
                      [40, 'Regular practice'],
                      [60, 'More practice'],
                    ] as const).map(([percentage, label]) => (
                      <label key={percentage}>
                        <input
                          type="radio"
                          name="clarity-percentage"
                          value={percentage}
                          checked={clarityPercentage === percentage}
                          onChange={() => setClarityPercentage(percentage)}
                        />
                        <span><strong>{percentage}%</strong> {label}</span>
                      </label>
                    ))}
                    <p className="clarity-note">About {clarityPercentage}% of suitable instructions will be intentionally unclear.</p>
                  </fieldset>
                )}
              </section>
              <Button variant="scenario" onClick={handleStart} className="scenario-start">
                <span className="scenario-action">Start Level {selectedLevel} practice <Play aria-hidden="true" data-icon="inline-end" /></span>
              </Button>
            </div>
            <div className="scenario-previews">
              <p className="scenario-preview-heading">More everyday journeys, coming soon</p>
              {SCENARIOS.map(s => (
                <Button key={s.name} variant="preview" disabled className="scenario-preview">
                  <span className="scenario-preview-icon"><s.icon aria-hidden="true" /></span>
                  <span>{s.name}</span>
                  <span className="scenario-coming">Coming soon</span>
                </Button>
              ))}
            </div>
          </div>
        </section>
        {error && <p role="alert" className="welcome-error">{error}</p>}
        <footer className="welcome-footer"><MicOff aria-hidden="true" /><p>Your microphone starts off. This is fictional practice with AI; use made-up details.</p></footer>
      </main>
    )
  }

  return (
    <main className="rehearsal-shell mx-auto flex min-h-screen w-full max-w-[920px] flex-col gap-6 px-5 py-6 sm:py-8 lg:flex-row lg:gap-10 lg:py-10">
      {/* ── Joy, center stage: a sticky column on wide screens, a hero on narrow ── */}
      <section
        aria-label="Joy, your rehearsal companion"
        className="flex flex-col items-center gap-4 lg:sticky lg:top-8 lg:h-fit lg:min-h-[60vh] lg:flex-1 lg:items-center lg:justify-center"
      >
        <JoyMascot
          state={joyThinking && state === 'listening' ? 'idle' : state}
          encourageSignal={nod}
          reduceMotion={reduceMotion || stopAuto}
          className="lg:scale-110"
        />
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Rehearse the Journey</h1>
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-lavender/60 px-3 py-1">Hospital Reception</span>
            <span className="rounded-full bg-peach/70 px-3 py-1">Level {selectedLevel} · {getHospitalLevel(selectedLevel).name}</span>
            <span className="rounded-full bg-mist px-3 py-1">{getHospitalLevel(selectedLevel).characters.join(' · ')}</span>
          </div>
        </div>
        {storyId && STORIES[storyId] && (
          <StoryCard
            key={`${storySession}:${storyId}`}
            story={STORIES[storyId]}
            onClose={() => setStoryId(null)}
          />
        )}
      </section>

      {/* ── Conversation: the right column on wide screens, the full width below Joy ── */}
      <div className="flex flex-col gap-5 lg:flex-[1.4] lg:overflow-y-auto lg:max-h-[calc(100vh-5rem)]">
      {readAloud && (
        <Button variant="outline" className="sticky top-3 z-10 self-start" onClick={() => {
          ReadAloud.stop()
          setReadAloud(false)
          setAloudSpeaking(false)
          statusRef.current?.focus()
        }}>
          Stop page speech
        </Button>
      )}

      {/* ── Fictional fixture disclosure ── */}
      <div
        role="note"
        aria-label="Fictional scenario notice"
        className="rounded-2xl border border-peach bg-peach/20 p-4 text-sm leading-relaxed"
      >
        <strong>Practice scenario — not a real hospital.</strong> This conversation
        is fictional and used only for rehearsal. Use made-up details. Starting
        connects to an AI provider; typed messages and any enabled microphone audio
        are sent for replies. The mic starts off. This app does not save the transcript.
      </div>

      {/* ── S3: toolkit adapter preferences ── */}
      <fieldset className="rounded-2xl border border-ink/10 bg-white/70 p-5">
        <legend className="px-1.5 font-semibold">
          Accessibility preferences{' '}
          <span className="font-normal opacity-70">(toolkit adapters, applied to this page)</span>
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="group" aria-label="Accessibility preferences">
          {(
            [
              {
                key: 'readAloud', on: readAloud, toggle: toggleReadAloud,
                label: readAloud ? '⏹ Stop reading aloud' : '🔊 Read page aloud',
                hint: aloudSpeaking ? 'Reading this page’s text now…' : 'Speaks the text on this page',
              },
              {
                key: 'plainWords', on: plainWords, toggle: togglePlainWords,
                label: plainWords ? 'Aa Plainer words — on' : 'Aa Plainer words',
                hint: 'Rewrites the step card in plain language',
              },
              {
                key: 'stopAuto', on: stopAuto, toggle: toggleStopAuto,
                label: '⏸ Stop auto-advance',
                hint: 'Holds still anything that moves on a timer',
              },
              {
                key: 'reduceMotion', on: reduceMotion, toggle: toggleReduceMotion,
                label: '🐢 Reduce motion',
                hint: 'Stops animations and transitions on this page',
              },
            ] as const
          ).map(p => (
            <button
              key={p.key}
              aria-pressed={p.on}
              onClick={p.toggle}
              className={
                'min-h-[56px] rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-colors ' +
                (p.on
                  ? 'border-lavender bg-lavender/25'
                  : 'border-ink/15 bg-white/60 hover:border-lavender/60')
              }
            >
              {p.label}
              <span className="mt-1 block text-xs font-normal opacity-75">{p.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* ── Rotating tips: the auto-advancing content stop-auto-advance holds ── */}
      <div ref={tipsRef} className="tips-carousel min-h-[52px] rounded-2xl border border-dashed border-lavender bg-mist/50 px-4 py-3 text-sm" aria-label="Rehearsal tips">
        {TIPS.map((tip, i) => (
          <div key={i} className={`tip-slide${i === 0 ? ' is-active' : ''}`}>{tip}</div>
        ))}
      </div>

      {/* ── Connection status + Joy's voice visualizer ── */}
      <div ref={statusRef} tabIndex={-1} role="status" aria-live="polite" aria-label="Connection status" className="rounded-2xl border border-ink/10 bg-mist/40 p-4">
        {(isConnected || state === 'connecting') && (
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <AudioVisualizerBar
              participantType="bot"
              isConnecting={state === 'connecting'}
              reduceMotion={motionReduced || stopAuto}
              barColor={state === 'speaking' ? '--lavender' : '--sage'}
              barCount={28}
              barWidth={4}
              barGap={4}
              barMaxHeight={44}
              className="h-11 max-w-full flex-1"
            />
            <p className="min-w-0 text-sm">
              {state === 'speaking'
                ? '🔊 Joy is speaking…'
                : joyThinking
                  ? '💭 Joy is thinking…'
                  : micEnabled
                    ? (interimSpoken ? `you said: ${interimSpoken}` : '🎤 Listening — speak or type below.')
                    : 'Microphone off — type below, or turn on your microphone.'}
            </p>
          </div>
        )}
        {state === 'connecting' && <p>⏳ Connecting to Joy…</p>}
        {state === 'paused' && <p>Paused — audio stopped and mic off. Reconnect to start a new exchange with Joy.</p>}
        {state === 'ended' && (
          <>
            <p>
              Session ended.{' '}
              <Button
                size="sm"
                disabled={stopping}
                onClick={() => { setTurns([]); setTypedInput(''); setError(''); setState('idle') }}
              >
                Start again
              </Button>
            </p>
            {clarityEnabled && (
              <section className="clarity-reflection" aria-labelledby="reflection-title">
                <h3 id="reflection-title">Your Practice Reflection</h3>
                <p>You had {clarificationOpportunities} clarification {clarificationOpportunities === 1 ? 'opportunity' : 'opportunities'}, asked for more information {clarificationQuestions} {clarificationQuestions === 1 ? 'time' : 'times'}, and resolved {clarificationsResolved}.</p>
                <p>Asking questions helped make the instructions clearer.</p>
              </section>
            )}
          </>
        )}
      </div>
      {isConnected && clarityEnabled && clarificationHint && (
        <aside className="clarification-hint" aria-live="polite">
          {!showClarificationHint ? (
            <Button variant="outline" className="rounded-full" onClick={() => setShowClarificationHint(true)}>
              Need a hint?
            </Button>
          ) : (
            <p><strong>Try asking:</strong> {clarificationHint}</p>
          )}
        </aside>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {/* ── Transcript ── */}
      <section
        aria-label="Conversation transcript"
        role="log"
        aria-relevant="additions"
        aria-live="polite"
        className="max-h-[320px] min-h-[200px] overflow-y-auto rounded-2xl border border-ink/10 bg-mist/40 p-5 text-base"
      >
        {turns.length === 0 && !joyThinking && <p className="opacity-60">The conversation will appear here.</p>}
        {turns.map(t => (
          <div
            key={t.id}
            className={
              'mb-3 rounded-2xl px-4 py-2.5 ' +
              (t.speaker === 'Joy'
                ? 'bg-lavender/15 border border-lavender/25'
                : 'bg-white/60 border border-ink/10 ml-4 sm:ml-8')
            }
          >
            <span className="text-xs font-bold uppercase tracking-wide opacity-70">
              {t.speaker}
            </span>
            <p className="mt-0.5 leading-relaxed">{t.text}</p>
          </div>
        ))}
        {joyThinking && (
          <div className="mb-3 rounded-2xl bg-lavender/15 border border-lavender/25 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wide opacity-70">Joy</span>
            <p className="mt-0.5 flex items-center gap-1.5 leading-relaxed">
              <span className="inline-block h-2 w-2 rounded-full bg-lavender/60 rtj-pulse" />
              <span className="inline-block h-2 w-2 rounded-full bg-lavender/60 rtj-pulse" style={{ animationDelay: '0.3s' }} />
              <span className="inline-block h-2 w-2 rounded-full bg-lavender/60 rtj-pulse" style={{ animationDelay: '0.6s' }} />
            </p>
          </div>
        )}
      </section>

      {/* ── Step card: the simplify-text demo target ── */}
      <section aria-label="What to expect" className="rounded-2xl border border-ink/10 bg-white/70 p-5">
        <h2 className="mb-2 text-base font-semibold">What to expect</h2>
        <p className={plainWords ? 'mb-3' : ''}>
          {plainWords && !showOriginal ? simplifyStepText(ORIGINAL_STEP_TEXT) : ORIGINAL_STEP_TEXT}
        </p>
        {plainWords && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setShowOriginal(o => !o)}
            aria-pressed={showOriginal}
          >
            {showOriginal ? 'Show plainer words' : 'Show original'}
          </Button>
        )}
      </section>

      {/* ── Typed input (guaranteed alternative to voice) ── */}
      <div className="flex items-end gap-3">
        <textarea
          id="typed-input"
          aria-label="Type your response here"
          placeholder="Type here — works with or without mic"
          className="min-h-[64px] min-w-0 flex-1 resize-y rounded-2xl border border-ink/15 bg-white/80 px-4 py-3 text-base outline-none focus-visible:border-lavender focus-visible:ring-2 focus-visible:ring-lavender/50"
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
        <Button
          variant="outline"
          className="h-12 shrink-0 rounded-full px-5"
          onClick={handleSendText}
          disabled={!isConnected || sending || !typedInput.trim()}
          aria-label="Send typed message"
        >
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>

      {/* ── Controls: always visible, never buried ── */}
      <div className="flex flex-wrap gap-3" role="group" aria-label="Rehearsal controls">
        {isConnected && (
          <>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={sending}
              onClick={() => void sendPracticePrompt('Please repeat your last instruction slowly, using simpler words.')}
              aria-label="Ask Joy to repeat the last instruction"
            >
              Repeat
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={sending}
              onClick={() => void sendPracticePrompt('I need help. Please give me one simple example of what I can say next.')}
              aria-label="Ask Joy for help and an example"
            >
              Help
            </Button>
          </>
        )}
        {isConnected && (
          <Button variant="secondary" className="rounded-full" onClick={() => void stopSession('paused')} aria-label="Pause — stops audio and microphone">
            ⏸ Pause
          </Button>
        )}
        {state === 'paused' && (
          <Button disabled={stopping} className="rounded-full" onClick={handleStart} aria-label="Reconnect with microphone off">
            Reconnect with mic off
          </Button>
        )}
        {(isConnected || state === 'paused' || state === 'connecting') && (
          <Button
            variant="outline"
            className="rounded-full border-ink/25 text-ink hover:bg-ink/5"
            onClick={() => void stopSession('ended')}
            aria-label="Exit rehearsal — ends the session"
          >
            ✕ Exit
          </Button>
        )}
        {isConnected && (
          <Button
            variant="outline"
            className="rounded-full border-ink/25 text-ink hover:bg-ink/5"
            onClick={handleToggleMic}
            aria-label={micEnabled ? 'Turn microphone off — stops browser speech recognition' : 'Turn microphone on — speak to Joy'}
            aria-pressed={micEnabled}
          >
            {micEnabled ? '🎤 Mic on' : '🎤 Mic off'}
          </Button>
        )}
        {(isConnected || state === 'paused') && (
          <Button
            variant="outline"
            className="rounded-full border-ink/25 text-ink hover:bg-ink/5"
            onClick={() => void handleChangeLevel()}
            aria-label="Change hospital rehearsal level"
          >
            Change level
          </Button>
        )}
      </div>
      </div>

      {/* Pipecat audio element (required for voice output) */}
      {isConnected && <PipecatClientAudio />}
    </main>
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
      <CalmMe />
    </PipecatClientProvider>
  )
}
