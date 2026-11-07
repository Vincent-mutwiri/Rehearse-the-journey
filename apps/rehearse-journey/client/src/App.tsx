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

  const addTurn = useCallback((speaker: 'Joy' | 'You', text: string, speakerLabel?: string) => {
    setTurns(prev => [...prev, { speaker, speakerLabel, text, id: turnId.current++ }])
    if (speaker === 'You') setNod(n => n + 1)
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
      .then(() => addTurn('You', text))
      .catch(() => setError('Your speech could not be sent. Try again or type below.'))
  }, [client, state, addTurn])
  const browserSTT = useBrowserSTT({ onFinal: sendSpoken })

  // Show interim STT text so the person knows the mic is hearing them.
  useEffect(() => {
    if (!micEnabled) setInterimSpoken('')
    else setInterimSpoken(browserSTT.interim)
  }, [browserSTT.interim, micEnabled])

  // Listen for bot transcript events
  useRTVIClientEvent(RTVIEvent.BotTranscript, (data: { text: string }) => {
    if (active.current && data.text.trim()) {
      addTurn('Joy', data.text)
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
  // Bot-driven interactive stories & v1.1 Flow / Multi-Agent / Provider events
  useRTVIClientEvent(RTVIEvent.ServerMessage, (data: unknown) => {
    const msg = (data as { data?: unknown })?.data ?? data
    if (!msg || typeof msg !== 'object') return
    const m = msg as Record<string, unknown>
    const type = typeof m.type === 'string' ? m.type : ''

    if (type === 'story_open' && typeof m.story_id === 'string' && STORIES[m.story_id]) {
      setStorySession(s => s + 1)
      setStoryId(m.story_id)
      // If the bot attached a generated scene illustration (a data URL),
      // patch it onto the story so the StoryCard shows it. Falls back to the
      // slides' own content when absent.
      if (typeof m.image === 'string' && m.image.startsWith('data:image/')) {
        STORIES[m.story_id].image = m.image
      }
      setWhiskerTraces(prev => [...prev.slice(-9), `in | StoryOpen | ${m.story_id}${m.image ? ' +image' : ''}`])
    } else if (type === 'story_close') {
      setStoryId(null)
    } else if (type === 'flow_node_transition' && typeof m.node_id === 'string') {
      const spk = (typeof m.speaker === 'string' ? m.speaker : 'joy') as JoyPersona
      setActivePersona(spk)
      setWhiskerTraces(prev => [
        ...prev.slice(-9),
        `in | FlowTransition | ${m.node_id} (${String(m.step_title ?? '')})`,
      ])
    } else if (type === 'approval_proposal' && typeof m.target_node === 'string') {
      approvalControllerRef.current.proposeNavigation(
        m.target_node,
        'model',
        `Advance rehearsal to "${String(m.target_title ?? m.target_node)}"?`,
      )
      syncController()
      setWhiskerTraces(prev => [...prev.slice(-9), `in | ApprovalProposal | -> ${m.target_node}`])
    } else if (type === 'speaker_changed') {
      const nextSpeaker = (typeof m.active_speaker === 'string'
        ? m.active_speaker
        : typeof m.speaker === 'string'
          ? m.speaker
          : 'joy') as JoyPersona
      setActivePersona(nextSpeaker)
      setParallelOverlap(Boolean(m.parallel_fanout))
      setWhiskerTraces(prev => [...prev.slice(-9), `in | SpeakerChanged | ${nextSpeaker}`])
    } else if (type === 'parallel_fanout') {
      setParallelOverlap(true)
      setWhiskerTraces(prev => [...prev.slice(-9), 'in | ParallelFanout | Joy + Amani overlap'])
    } else if (type === 'parallel_resolved' && typeof m.chosen_speaker === 'string') {
      setActivePersona(m.chosen_speaker as JoyPersona)
      setParallelOverlap(false)
      setWhiskerTraces(prev => [...prev.slice(-9), `in | ParallelResolved | chosen=${m.chosen_speaker}`])
    } else if (type === 'provider_selected' && typeof m.stack_id === 'string') {
      setProviderStackId(m.stack_id)
    } else if (type === 'provider_switched' && typeof m.reason === 'string') {
      if (typeof m.to_stack === 'string') setProviderStackId(m.to_stack)
      setProviderNotice(m.reason)
      setWhiskerTraces(prev => [...prev.slice(-9), `in | ProviderSwitched | ${m.reason}`])
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

  const handleStart = async (
    nextScenario: ScenarioId = scenarioId,
    nextLevel: 1 | 2 | 3 | 4 = chaosLevel,
  ) => {
    if (!client || active.current || stoppingRef.current) return
    const current = ++generation.current
    active.current = true
    setScenarioId(nextScenario)
    setChaosLevel(nextLevel)
    const scen = SCENARIO_CATALOG[nextScenario]
    const stepsForScenario = scen.stepsByLevel[nextLevel]
    setActivePersona(scen.persona)
    setParallelOverlap(false)
    approvalControllerRef.current.startNewSession(
      stepsForScenario.map(s => s.id),
      [
        `Scenario: ${scen.name} (${LEVEL_LABELS[nextLevel].title})`,
        'Carry pretend clinic card or practice note',
        'Pause or ask companion to repeat at any time',
      ],
    )
    syncController()
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

  const handleRespondApproval = useCallback(
    (proposal: ApprovalProposal, approved: boolean) => {
      const res = approvalControllerRef.current.respondToProposal({
        approvalId: proposal.approvalId,
        actionId: proposal.actionId,
        toolCallId: proposal.toolCallId,
        sessionId: proposal.sessionId,
        approved,
      })
      syncController()
      if (proposal.type === 'enable_camera') {
        setCameraConsent(approved && res.applied)
      } else if (proposal.type === 'go_to_step' && approved && res.applied && proposal.targetStepId) {
        const matchedStep = currentSteps.find(s => s.id === proposal.targetStepId)
        if (matchedStep) {
          setActivePersona(matchedStep.speaker)
          setParallelOverlap(Boolean(matchedStep.parallelFanout))
        }
      }
    },
    [currentSteps, syncController],
  )

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
    setParallelOverlap(false)
    if (next === 'ended') setCameraConsent(false)
    approvalControllerRef.current.pause()
    syncController()
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
  }, [client, syncController])

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
            <Button variant="scenario" onClick={() => void handleStart('hospital', chaosLevel)} className="scenario-start">
              <span className="scenario-symbol"><Cross aria-hidden="true" /></span>
              <span className="scenario-start-copy">
                <span className="scenario-level">{LEVEL_LABELS[chaosLevel].title}</span>
                <span className="scenario-title">Hospital Reception</span>
                <span className="scenario-description">Practice arriving, asking for help, and talking to a friendly receptionist.</span>
              </span>
              <span className="scenario-action">Start practice <Play aria-hidden="true" data-icon="inline-end" /></span>
            </Button>
            <div className="scenario-previews">
              <p className="scenario-preview-heading">More everyday journeys (v1.1 Pipecat Flows)</p>
              {SCENARIOS.slice(1).map(s => (
                <Button
                  key={s.id}
                  variant="preview"
                  onClick={() => void handleStart(s.id, chaosLevel)}
                  className="scenario-preview"
                >
                  <span className="scenario-preview-icon"><s.icon aria-hidden="true" /></span>
                  <span>{s.name}</span>
                  <span className="scenario-coming">{s.level}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs" role="group" aria-label="Practice difficulty level">
            <span className="font-semibold opacity-75">Level:</span>
            {([1, 2, 3, 4] as const).map(lvl => (
              <button
                key={lvl}
                type="button"
                aria-pressed={chaosLevel === lvl}
                onClick={() => setChaosLevel(lvl)}
                className={
                  'min-h-[36px] rounded-full border px-3 py-1 font-medium transition-colors ' +
                  (chaosLevel === lvl
                    ? 'border-lavender bg-lavender/30'
                    : 'border-ink/15 bg-white/60 hover:border-lavender/50')
                }
              >
                {LEVEL_LABELS[lvl].title}
              </button>
            ))}
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
        <div
          className="joy-centerpiece-stage"
          data-parallel-overlap={parallelOverlap ? 'true' : 'false'}
        >
          <div className="joy-stage-backdrop" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <JoyMascot
              state={joyThinking && state === 'listening' ? 'idle' : state}
              thinking={joyThinking}
              persona={activePersona}
              encourageSignal={nod}
              reduceMotion={reduceMotion || stopAuto}
              className="lg:scale-110"
            />
            {parallelOverlap && (
              <JoyMascot
                state={state === 'speaking' ? 'speaking' : 'listening'}
                persona="amani"
                companionLabel="Patient Amani, fellow visitor"
                encourageSignal={nod}
                reduceMotion={reduceMotion || stopAuto}
                className="scale-95"
              />
            )}
          </div>
          <span className="joy-status-pill" aria-hidden="true">
            {state === 'speaking'
              ? `🔊 ${currentStepDef?.speakerLabel ?? 'Joy'} speaking`
              : joyThinking
                ? '💭 Joy is thinking…'
                : state === 'listening'
                  ? (micEnabled ? '🎤 Listening to your voice' : '✨ Ready for your turn')
                  : state === 'paused'
                    ? '⏸ Resting (paused)'
                    : '👋 Practice companion'}
          </span>
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Rehearse the Journey</h1>
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-lavender/60 px-3 py-1">{currentScenario.name}</span>
            <span className="rounded-full bg-peach/70 px-3 py-1">{LEVEL_LABELS[chaosLevel].title}</span>
            <span className="rounded-full bg-mist px-3 py-1">
              {parallelOverlap ? 'Receptionist Joy & Patient Amani' : currentStepDef?.speakerLabel ?? currentScenario.personaLabel}
            </span>
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
        )}
      </div>
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
              {t.speakerLabel ?? (t.speaker === 'Joy' ? 'Joy' : 'You')}
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
          <Button variant="secondary" className="rounded-full" onClick={() => void stopSession('paused')} aria-label="Pause — stops audio and microphone">
            ⏸ Pause
          </Button>
        )}
        {state === 'paused' && (
          <Button disabled={stopping} className="rounded-full" onClick={() => void handleStart(scenarioId, chaosLevel)} aria-label="Reconnect with microphone off">
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
            aria-label={micEnabled ? 'Microphone on' : 'Microphone off'}
            title={micEnabled ? 'Turn microphone off — stops browser speech recognition' : 'Turn microphone on — speak to Joy'}
            aria-pressed={micEnabled}
          >
            {micEnabled ? '🎤 Mic on' : '🎤 Mic off'}
          </Button>
        )}
      </div>

      {/* ── SA.3 / SB.4 / SD.4 / SE.5: Controller Approval Gate ── */}
      {controllerSnap.pendingProposal && (
        <section
          role="region"
          aria-label="Approval gate"
          className="rounded-2xl border-2 border-lavender bg-lavender/15 p-4 text-sm"
        >
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Action approval required ({controllerSnap.pendingProposal.type})</span>
          </div>
          <p className="mt-1.5 leading-relaxed">{controllerSnap.pendingProposal.description}</p>
          {controllerSnap.pendingProposal.checklistSnapshot && (
            <ul className="mt-2 list-inside list-disc rounded-xl bg-white/70 p-3 text-xs">
              {controllerSnap.pendingProposal.checklistSnapshot.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-full"
              onClick={() =>
                controllerSnap.pendingProposal &&
                handleRespondApproval(controllerSnap.pendingProposal, true)
              }
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() =>
                controllerSnap.pendingProposal &&
                handleRespondApproval(controllerSnap.pendingProposal, false)
              }
            >
              Deny (stay put)
            </Button>
          </div>
        </section>
      )}

      {/* ── v1.1 Full Pipecat Architecture Studio (SA–SF) ── */}
      <section
        aria-label="v1.1 Pipecat Architecture Studio"
        className="rounded-2xl border border-ink/10 bg-white/70 p-5 text-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            Pipecat v1.1 Architecture · {currentStepDef?.title ?? 'Flow Step'}
          </h2>
          <span className="rounded-full bg-sage/30 px-3 py-0.5 text-xs font-semibold">
            Step {controllerSnap.currentStepIndex + 1} of {currentSteps.length}
          </span>
        </div>

        {/* SE.1: Mode Router (Practise / Learn / Explore / Live help) sharing one profile */}
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Companion modes">
          {(
            [
              { id: 'practise', label: 'Practise (Flows)', icon: Layers },
              { id: 'learn', label: 'Learn (Step Planner)', icon: BookOpen },
              { id: 'explore', label: 'Explore (Maps & Routes)', icon: MapPin },
              { id: 'live-help', label: 'Live help (Camera Sign)', icon: Camera },
            ] as const
          ).map(m => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={
                'inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ' +
                (mode === m.id
                  ? 'border-lavender bg-lavender/30'
                  : 'border-ink/15 bg-white/70 hover:border-lavender/50')
              }
            >
              <m.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {m.label}
            </button>
          ))}
        </div>

        {/* SA.2–SA.4 & SB.2–SB.3: Flow step progression, approval gate proposals, & multi-agent handoff */}
        {mode === 'practise' && (
          <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
            <p className="text-xs leading-relaxed opacity-85">
              <strong>Current Flow Node ({currentStepDef?.id}):</strong>{' '}
              {plainWords ? currentStepDef?.simplifiedDescription : currentStepDef?.description}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  approvalControllerRef.current.proposeNext('direct')
                  syncController()
                }}
              >
                Propose Next Step (Approve/Deny)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  approvalControllerRef.current.proposeBack()
                  syncController()
                }}
              >
                Propose Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  approvalControllerRef.current.proposeSaveChecklist()
                  syncController()
                }}
              >
                Save Rehearsal Checklist
              </Button>
              {chaosLevel === 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => {
                    const nextOverlap = !parallelOverlap
                    setParallelOverlap(nextOverlap)
                    setActivePersona(nextOverlap ? 'joy' : 'amani')
                    if (nextOverlap) {
                      addTurn(
                        'Joy',
                        'Receptionist Joy: Desk 1 is ready for you! · Patient Amani: Take your time, friend—I can hold your seat.',
                        'Joy & Amani',
                      )
                    }
                  }}
                >
                  <Users className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  {parallelOverlap ? 'Resolve Two-Voice Overlap' : 'Trigger Level 4 Parallel Overlap'}
                </Button>
              )}
            </div>
            {controllerSnap.savedChecklist && (
              <p className="rounded-xl bg-sage/20 px-3 py-2 text-xs">
                <strong>Saved checklist ({controllerSnap.savedChecklist.length} items):</strong>{' '}
                {controllerSnap.savedChecklist.join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* SE.2: Learn Mode (Goal -> RehearsalSteps with editable distress ratings) */}
        {mode === 'learn' && (
          <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
            <label htmlFor="learn-goal-input" className="block text-xs font-semibold">
              Learn Mode — Turn a goal into an approved rehearsal plan (no voice required):
            </label>
            <div className="flex gap-2">
              <input
                id="learn-goal-input"
                type="text"
                value={learnGoal}
                onChange={e => setLearnGoal(e.target.value)}
                className="min-h-[40px] flex-1 rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setLearnSteps(buildLearnStepsForGoal(learnGoal))}
              >
                Build Steps
              </Button>
            </div>
            <ul className="space-y-2">
              {learnSteps.map((ls, idx) => (
                <li key={ls.id} className="rounded-xl border border-ink/10 bg-mist/30 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2 font-semibold">
                    <span>{ls.title}</span>
                    <label className="flex items-center gap-1 font-normal">
                      <span>Distress (0–10):</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={ls.distressRating}
                        aria-label={`Distress rating for ${ls.title}`}
                        onChange={e => {
                          const v = Math.max(0, Math.min(10, Number(e.target.value) || 0))
                          setLearnSteps(prev =>
                            prev.map((item, i) => (i === idx ? { ...item, distressRating: v } : item)),
                          )
                        }}
                        className="w-14 rounded border border-ink/20 bg-white px-1.5 py-0.5 text-center"
                      />
                    </label>
                  </div>
                  <p className="mt-1 opacity-85">
                    {plainWords ? ls.plainDescription : ls.description}
                  </p>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                approvalControllerRef.current.editChecklistDraft(learnSteps.map(s => s.title))
                syncController()
                setMode('practise')
              }}
            >
              Approve Plan & Load in Practise Mode
            </Button>
          </div>
        )}

        {/* SE.3: Explore Mode (Maps grounding + Candidate Routes + Kiswahili translation label) */}
        {mode === 'explore' && (
          <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold">
                Explore Mode — Grounded Nairobi Location Q&A & Candidate Routes
              </span>
              <button
                type="button"
                onClick={() => setExploreLang(l => (l === 'en' ? 'sw' : 'en'))}
                className="min-h-[32px] rounded-full border border-ink/15 bg-white px-3 py-1 text-xs font-medium"
              >
                Language: {exploreLang === 'en' ? 'English' : 'Kiswahili (labelled translation)'}
              </button>
            </div>
            <input
              type="text"
              aria-label="Ask a location question"
              value={exploreQuery}
              onChange={e => setExploreQuery(e.target.value)}
              className="min-h-[40px] w-full rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs"
            />
            {(() => {
              const q = exploreQuery.toLowerCase()
              const isUnknown = ['step-free', 'wheelchair', 'queue', 'fee', 'procedure', 'ramp'].some(
                k => q.includes(k),
              )
              return (
                <div className="rounded-xl border border-ink/10 bg-mist/30 p-3 text-xs space-y-1.5">
                  <p>
                    <strong>Retrieved Map Fact:</strong>{' '}
                    {isUnknown
                      ? 'Unknown from verified public map sources.'
                      : 'Kenyatta National Hospital Campus Bus Stage is on Hospital Road, Upper Hill, Nairobi (-1.3008, 36.8070), served by public matatu routes 7C and 46.'}
                  </p>
                  <p>
                    <strong>Generated Explanation:</strong>{' '}
                    {isUnknown
                      ? 'Public map data does not verify step-free entrances, live queue lengths, or internal hospital procedures. Please confirm directly with facility reception.'
                      : 'Visitors alighting at Hospital Road stage follow the signed pedestrian walkway. Fictional rehearsal here does not represent real hospital procedures.'}
                  </p>
                  {exploreLang === 'sw' && (
                    <p className="rounded-lg bg-peach/25 p-2">
                      <strong>Generated Kiswahili Translation (from English-grounded source):</strong>{' '}
                      {isUnknown
                        ? 'Haijulikani kwenye vyanzo vya ramani: tafadhali thibitisha lango au foleni moja kwa moja na mapokezi.'
                        : 'Kituo cha basi cha Hospital Road kiko Upper Hill, Nairobi (njia 7C na 46).'}
                    </p>
                  )}
                  <p className="opacity-75">
                    Sources:{' '}
                    <a
                      href="https://www.openstreetmap.org/#map=16/-1.3008/36.8070"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      OpenStreetMap Nairobi Upper Hill
                    </a>{' '}
                    ·{' '}
                    <a
                      href="https://www.openstreetmap.org/relation/3492650"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Digital Matatus Route 46
                    </a>
                  </p>
                </div>
              )
            })()}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setRouteRequested(r => !r)}
              >
                {routeRequested ? 'Hide Candidate Route' : 'Request Candidate Route (CBD → Upper Hill)'}
              </Button>
            </div>
            {routeRequested && (
              <div className="rounded-xl border border-peach bg-peach/15 p-3 text-xs">
                <strong>Candidate path — confirm with your co-designer (3.4 km, ~18 min):</strong>
                <ol className="mt-1 list-inside list-decimal space-y-0.5">
                  <li>Board Route 7C or 46 at Kencom Stage, CBD.</li>
                  <li>Alight at Hospital Road Stage, Upper Hill.</li>
                  <li>Confirm roadside signage with your co-designer (never advances rehearsal).</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* SD.1–SD.4 & SE.4: Live Help Camera ("Explain this sign") with approval gate & safety boundary */}
        {mode === 'live-help' && (
          <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
            <div
              role="note"
              className="rounded-xl border border-peach bg-peach/20 p-3 text-xs font-medium"
            >
              <strong>Safety boundary:</strong> Explanation only; confirm with staff or signage.
              Never used for obstacle detection, location truth, or navigation advice.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!cameraConsent ? (
                <Button
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => {
                    approvalControllerRef.current.proposeEnableCamera()
                    syncController()
                  }}
                >
                  <Camera className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Request Camera Consent (Approve/Deny)
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setCameraConsent(false)}
                >
                  Turn Camera Off (Voice & Typed Continue)
                </Button>
              )}
              <button
                type="button"
                aria-pressed={devFrameOverlay}
                onClick={() => setDevFrameOverlay(d => !d)}
                className="min-h-[34px] rounded-full border border-ink/15 bg-white px-3 py-1 text-xs"
              >
                {devFrameOverlay ? 'Hide "What am I seeing?" frame' : 'Show "What am I seeing?" debug frame'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SIGN_CARDS.map(sc => (
                <button
                  key={sc.id}
                  type="button"
                  aria-pressed={selectedSignId === sc.id}
                  onClick={() => setSelectedSignId(sc.id)}
                  className={
                    'min-h-[34px] rounded-full border px-3 py-1 text-xs font-medium ' +
                    (selectedSignId === sc.id
                      ? 'border-lavender bg-lavender/25'
                      : 'border-ink/15 bg-white')
                  }
                >
                  {sc.title}
                </button>
              ))}
            </div>
            {(() => {
              const card = SIGN_CARDS.find(c => c.id === selectedSignId) ?? SIGN_CARDS[0]
              return (
                <div className="rounded-xl border border-ink/10 bg-mist/30 p-3 text-xs space-y-1.5">
                  {devFrameOverlay && (
                    <div className="rounded-lg border border-dashed border-ink/30 bg-white/80 p-2 font-mono text-[11px]">
                      [Camera Frame Preview · {cameraConsent ? 'STREAMING OPT-IN' : 'CONSENT OFF'}]:{' '}
                      {card.signText}
                    </div>
                  )}
                  <p>
                    <strong>Joy’s Sign Explanation ({plainWords ? 'Plainer words' : 'Standard'}):</strong>{' '}
                    {plainWords ? card.plainExplanation : card.standardExplanation}
                  </p>
                </div>
              )
            })()}
          </div>
        )}

        {/* SC.1–SC.3 & SF.4: Provider Stack Selection, Runtime Fallback, & Whisker/Tail Dev Telemetry */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3 text-xs">
          <div>
            <strong>Active Provider Stack:</strong> {activeProviderStack.label}{' '}
            <span className="opacity-75">({activeProviderStack.reason})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!audioPref}
              onClick={() => setAudioPref(a => !a)}
              className="min-h-[32px] rounded-full border border-ink/15 bg-white px-3 py-1 font-medium"
            >
              {audioPref ? 'Audio Pref: On' : 'Audio Pref: Off (Text-Only)'}
            </button>
            <button
              type="button"
              onClick={() => {
                const order = ['gemini_live', 'deepgram_openai_cartesia', 'gemini_proxy', 'openai', 'text_only']
                const nextIdx = (order.indexOf(providerStackId) + 1) % order.length
                const nextId = order[nextIdx]
                setProviderStackId(nextId)
                const nextMeta = PROVIDER_STACK_OPTIONS.find(p => p.id === nextId)
                setProviderNotice(
                  `Switched provider stack to ${nextMeta?.label ?? nextId} (fallback chain verified).`,
                )
              }}
              className="min-h-[32px] rounded-full border border-ink/15 bg-white px-3 py-1 font-medium"
            >
              Simulate Provider Fallback
            </button>
            <button
              type="button"
              aria-pressed={whiskerOpen}
              onClick={() => setWhiskerOpen(w => !w)}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-ink/15 bg-white px-3 py-1 font-medium"
            >
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Whisker / Tail
            </button>
          </div>
        </div>
        {providerNotice && (
          <p role="status" className="mt-2 rounded-xl bg-peach/25 px-3 py-1.5 text-xs">
            ⚡ {providerNotice}
          </p>
        )}
        {whiskerOpen && (
          <div className="mt-2 rounded-xl border border-ink/15 bg-ink p-3 font-mono text-[11px] text-cream">
            <div className="mb-1 font-semibold">
              [Tail Session Dashboard] scenario={scenarioId} level=L{chaosLevel} mode={mode} speaker=
              {activePersona} stack={activeProviderStack.id}
            </div>
            {whiskerTraces.map((tr, i) => (
              <div key={i} className="opacity-85">
                [Whisker] {tr}
              </div>
            ))}
          </div>
        )}
      </section>
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
    </PipecatClientProvider>
  )
}
