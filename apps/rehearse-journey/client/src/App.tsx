/**
 * Rehearse the Journey — React Client
 *
 * Modularized into:
 *   - `src/session/useRehearsalSession.ts` (Pipecat RTVI session, scenario/mode sync, async story images)
 *   - `src/speech-input/useSpeechInput.ts` (Provider-aware Browser STT vs. Pipecat mic, cancellable timers)
 *   - `src/approval/useApprovalGate.ts` (Deterministic approval controller + backend approval sync)
 *   - `src/presentation/*` (WelcomeLanding, JoyCenterpiece, ApprovalGateCard, CompanionModesPanel)
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  PipecatClientProvider,
  PipecatClientAudio,
  usePipecatClient,
} from '@pipecat-ai/client-react'
import { PipecatClient } from '@pipecat-ai/client-js'
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport'
import { AudioVisualizerBar } from '@/components/pipecat/audio-visualizer-bar'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { Button } from '@/components/ui/button'
import {
  ReadAloud,
  StopAutoAdvance,
  MotionReducer,
  enableStopAutoAdvance,
  simplifyStepText,
  ORIGINAL_STEP_TEXT,
} from './toolkitAdapters'
import { PROVIDER_STACK_OPTIONS } from './controller/v11ScenariosAndModes'
import { useRehearsalSession, type RolePlayState } from './session/useRehearsalSession'
import WelcomeLanding from './presentation/WelcomeLanding'
import JoyCenterpiece from './presentation/JoyCenterpiece'
import ApprovalGateCard from './presentation/ApprovalGateCard'
import CompanionModesPanel from './presentation/CompanionModesPanel'
import SettingsDrawer from './presentation/SettingsDrawer'
import Dashboard, { type DashboardSection } from './components/Dashboard'
import Wellness from './components/Wellness'
import Directions from './components/Directions'

const STATUS_NARRATION: Record<RolePlayState, string> = {
  idle: 'Ready to start. Press Start Rehearsal to connect to Joy.',
  connecting: 'Connecting to Joy.',
  listening: 'Listening. You can type below, or turn on your microphone.',
  speaking: 'Joy is speaking.',
  paused: 'Paused. Audio stopped and microphone off.',
  ended: 'Session ended.',
}

function RehearsalView() {
  const client = usePipecatClient()
  const session = useRehearsalSession(client)
  const {
    state,
    setState,
    turns,
    setTurns,
    typedInput,
    setTypedInput,
    error,
    setError,
    sending,
    stopping,
    nod,
    joyThinking,
    storyId,
    setStoryId,
    openStory,
    storySession,
    storyImages,
    storyRoutes,
    scenarioId,
    chaosLevel,
    setChaosLevel,
    mode,
    handleSelectMode,
    activePersona,
    setActivePersona,
    parallelOverlap,
    setParallelOverlap,
    audioPref,
    handleToggleAudioPref,
    providerStackId,
    setProviderStackId,
    setUsesBrowserStt,
    providerNotice,
    setProviderNotice,
    cameraConsent,
    setCameraConsent,
    whiskerTraces,
    currentScenario,
    currentSteps,
    currentStepDef,
    activeProviderStack,
    approval,
    speech,
    addTurn,
    handleStart,
    stopSession,
    handleSendText,
  } = session

  // S3 — toolkit adapter preferences
  const [readAloud, setReadAloud] = useState(false)
  const [plainWords, setPlainWords] = useState(false)
  const [stopAuto, setStopAuto] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [currentExchangeOnly, setCurrentExchangeOnly] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [aloudSpeaking, setAloudSpeaking] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const userSpeakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (userSpeakTimerRef.current) clearTimeout(userSpeakTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const lastTurn = turns[turns.length - 1]
    if (lastTurn?.speaker === 'You') {
      setUserSpeaking(true)
      if (userSpeakTimerRef.current) clearTimeout(userSpeakTimerRef.current)
      userSpeakTimerRef.current = setTimeout(() => {
        setUserSpeaking(false)
      }, 1800)
    }
  }, [turns])

  const isDevMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env
    return params.get('dev') === '1' || metaEnv?.VITE_DEV_DIAGNOSTICS === '1'
  }, [])

  const motionReduced = useReducedMotion(reduceMotion)
  // Dashboard section — which section the person picked from the dashboard.
  // null = the dashboard landing; 'simulations' = the scenario picker;
  // 'directions' = the directions form; 'wellness' = the wellness check-in.
  const [dashboardSection, setDashboardSection] = useState<DashboardSection | null>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const previousState = useRef<RolePlayState>(state)

  useEffect(() => {
    const previous = previousState.current
    previousState.current = state
    if (state === previous) return
    if (state === 'idle') titleRef.current?.focus()
    else if (state === 'connecting' || state === 'paused' || state === 'ended') statusRef.current?.focus()
    else if (state === 'listening' && previous !== 'speaking') document.getElementById('typed-input')?.focus()
  }, [state])

  useEffect(() => {
    if (!readAloud) {
      setAloudSpeaking(false)
      return
    }
    const id = setInterval(() => setAloudSpeaking(ReadAloud.speaking), 400)
    return () => clearInterval(id)
  }, [readAloud])

  const buildNarration = useCallback(() => {
    const lastJoy = [...turns].reverse().find(t => t.speaker === 'Joy')
    return [
      'Rehearse the Journey. Practice scenario, not a real hospital.',
      STATUS_NARRATION[state],
      plainWords ? simplifyStepText(ORIGINAL_STEP_TEXT) : ORIGINAL_STEP_TEXT,
      lastJoy ? `Joy said: ${lastJoy.text}` : '',
    ]
      .filter(Boolean)
      .join(' ')
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

  const toggleCurrentExchangeOnly = () => {
    setCurrentExchangeOnly(prev => !prev)
  }

  const visibleTurns = useMemo(() => {
    if (!currentExchangeOnly || turns.length <= 2) return turns
    const lastTurn = turns[turns.length - 1]
    if (lastTurn.speaker === 'You') {
      const prevJoy = [...turns.slice(0, -1)].reverse().find(t => t.speaker === 'Joy')
      return prevJoy ? [prevJoy, lastTurn] : [lastTurn]
    }
    const prevYou = [...turns.slice(0, -1)].reverse().find(t => t.speaker === 'You')
    return prevYou ? [prevYou, lastTurn] : [lastTurn]
  }, [currentExchangeOnly, turns])

  const transcriptRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (currentExchangeOnly) return
    const el = transcriptRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [turns, joyThinking, currentExchangeOnly])

  const isConnected = state === 'listening' || state === 'speaking'

  if (state === 'idle' && !dashboardSection) {
    return (
      <main className="welcome-shell mx-auto flex min-h-screen w-full max-w-[920px] flex-col gap-8 px-5 py-8">
        <Dashboard onSelect={setDashboardSection} reduceMotion={reduceMotion || stopAuto} />
      </main>
    )
  }

  if (state === 'idle' && dashboardSection === 'wellness') {
    return (
      <main className="welcome-shell mx-auto flex min-h-screen w-full max-w-[640px] flex-col gap-6 px-5 py-8">
        <Wellness onBack={() => setDashboardSection(null)} />
      </main>
    )
  }

  if (state === 'idle' && dashboardSection === 'directions') {
    return (
      <main className="welcome-shell mx-auto flex min-h-screen w-full max-w-[640px] flex-col gap-6 px-5 py-8">
        <Directions onBack={() => setDashboardSection(null)} />
      </main>
    )
  }

  if (state === 'idle') {
    return (
      <WelcomeLanding
        titleRef={titleRef}
        reduceMotion={reduceMotion}
        stopAuto={stopAuto}
        chaosLevel={chaosLevel}
        onSelectChaosLevel={setChaosLevel}
        onStartScenario={(scenId, lvl) => void handleStart(scenId, lvl, mode)}
        onBackToDashboard={() => setDashboardSection(null)}
        error={error}
      />
    )
  }

  return (
    <main className="rehearsal-shell mx-auto flex min-h-screen w-full max-w-[920px] flex-col gap-6 px-5 py-6 sm:py-8 lg:flex-row lg:gap-10 lg:py-10">
      <JoyCenterpiece
        state={state}
        joyThinking={joyThinking}
        activePersona={activePersona}
        parallelOverlap={parallelOverlap}
        nod={nod}
        reduceMotion={reduceMotion}
        stopAuto={stopAuto}
        micEnabled={speech.micEnabled}
        userSpeaking={userSpeaking || Boolean(speech.interimSpoken) || Boolean(typedInput.trim())}
        currentScenario={currentScenario}
        chaosLevel={chaosLevel}
        currentStepDef={currentStepDef}
        storyId={storyId}
        storySession={storySession}
        storyImages={storyImages}
        storyRoutes={storyRoutes}
        onCloseStory={() => setStoryId(null)}
      />

      <div className="rehearsal-conversation flex min-w-0 flex-col gap-4 lg:flex-[1.4]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                void (async () => {
                  // Tear down any live connection first, then land on the Dashboard.
                  if (isConnected || state === 'connecting' || state === 'paused') {
                    await stopSession('ended')
                  }
                  setTurns([])
                  setTypedInput('')
                  setError('')
                  setStoryId(null)
                  setDashboardSection(null)
                  setReadAloud(false)
                  setAloudSpeaking(false)
                  setState('idle')
                })()
              }
              aria-label="Back to home — ends this session and returns to the dashboard"
              title="Back to home — ends this session and returns to the dashboard"
              className="rounded-full border border-ink/15 bg-white/60 px-3 py-1 text-xs font-semibold text-ink/80 transition-colors hover:border-lavender/60 hover:bg-white"
            >
              ← Home
            </button>
            <h2 className="text-lg font-semibold">Conversation</h2>
            <button
              type="button"
              aria-pressed={currentExchangeOnly}
              onClick={toggleCurrentExchangeOnly}
              title="Toggle between showing only the current conversation exchange or the full scrolling transcript"
              className={
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors ' +
                (currentExchangeOnly
                  ? 'border-lavender bg-lavender/25 text-ink'
                  : 'border-ink/15 bg-white/60 text-ink/80 hover:border-lavender/60')
              }
            >
              {currentExchangeOnly ? 'Current turn only' : 'Show current turn only'}
            </button>
          </div>
          <SettingsDrawer>
            <fieldset className="min-w-0">
              <legend className="px-1.5 font-semibold">
                Accessibility preferences
              </legend>
              <div className="mt-3 grid gap-3">
                {(
                  [
                    {
                      key: 'readAloud',
                      on: readAloud,
                      toggle: toggleReadAloud,
                      label: readAloud ? '⏹ Stop reading aloud' : '🔊 Read page aloud',
                      hint: aloudSpeaking ? 'Reading this page’s text now…' : 'Speaks the text on this page',
                    },
                    {
                      key: 'plainWords',
                      on: plainWords,
                      toggle: togglePlainWords,
                      label: plainWords ? 'Aa Plainer words — on' : 'Aa Plainer words',
                      hint: 'Rewrites the step card in plain language',
                    },
                    {
                      key: 'currentExchangeOnly',
                      on: currentExchangeOnly,
                      toggle: toggleCurrentExchangeOnly,
                      label: currentExchangeOnly
                        ? '💬 Current exchange only — on'
                        : '💬 Current exchange only',
                      hint: 'Shows only the latest turn instead of scrolling through history',
                    },
                    {
                      key: 'stopAuto',
                      on: stopAuto,
                      toggle: toggleStopAuto,
                      label: '⏸ Stop auto-advance',
                      hint: 'Holds still anything that moves on a timer',
                    },
                    {
                      key: 'reduceMotion',
                      on: reduceMotion,
                      toggle: toggleReduceMotion,
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
          </SettingsDrawer>
        </header>
        {readAloud && (
          <Button
            variant="outline"
            className="sticky top-3 z-10 self-start"
            onClick={() => {
              ReadAloud.stop()
              setReadAloud(false)
              setAloudSpeaking(false)
              statusRef.current?.focus()
            }}
          >
            Stop page speech
          </Button>
        )}

        <div
          ref={statusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          aria-label="Connection status"
          className="rounded-2xl border border-ink/10 bg-mist/40 p-4"
        >
          {(isConnected || state === 'connecting') && (
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="rehearsal-audio-container min-w-0 flex-1">
                <AudioVisualizerBar
                  participantType="bot"
                  isConnecting={state === 'connecting'}
                  reduceMotion={motionReduced || stopAuto}
                  barColor={state === 'speaking' ? '--lavender' : '--sage'}
                  barCount={28}
                  barWidth={4}
                  barGap={4}
                  barMaxHeight={44}
                  className="rehearsal-audio-meter h-11 max-w-full flex-1"
                />
              </div>
              <p className="min-w-0 text-sm">
                {state === 'speaking'
                  ? '🔊 Joy is speaking…'
                  : joyThinking
                    ? '💭 Joy is thinking…'
                    : speech.micEnabled
                      ? speech.interimSpoken
                        ? `you said: ${speech.interimSpoken}`
                        : '🎤 Listening — speak or type below.'
                      : 'Microphone off — type below, or turn on your microphone.'}
              </p>
            </div>
          )}
          {state === 'connecting' && <p>⏳ Connecting to Joy…</p>}
          {state === 'paused' && (
            <p>Paused — audio stopped and mic off. Reconnect to start a new exchange with Joy.</p>
          )}
          {state === 'ended' && (
            <p>
              Session ended.{' '}
              <Button
                size="sm"
                disabled={stopping}
                onClick={() => {
                  setTurns([])
                  setTypedInput('')
                  setError('')
                  setState('idle')
                }}
              >
                Start again
              </Button>
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <section
          ref={transcriptRef}
          aria-label="Conversation transcript"
          role="log"
          aria-relevant="additions"
          aria-live="polite"
          className="rehearsal-transcript max-h-[320px] min-h-[200px] overflow-y-auto rounded-2xl border border-ink/10 bg-mist/40 p-5 text-base"
        >
          {visibleTurns.length === 0 && !joyThinking && (
            <p className="opacity-60">The conversation will appear here.</p>
          )}
          {currentExchangeOnly && turns.length > visibleTurns.length && (
            <p className="mb-2.5 text-xs opacity-65">
              Showing current exchange ({turns.length - visibleTurns.length} earlier{' '}
              {turns.length - visibleTurns.length === 1 ? 'message' : 'messages'} hidden)
            </p>
          )}
          {visibleTurns.map(t => (
            <div
              key={t.id}
              className={
                'mb-3 rounded-2xl px-4 py-2.5 ' +
                (t.speaker === 'Joy'
                  ? 'border border-lavender/25 bg-lavender/15'
                  : 'ml-4 border border-ink/10 bg-white/60 sm:ml-8')
              }
            >
              <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                {t.speakerLabel ?? (t.speaker === 'Joy' ? 'Joy' : 'You')}
              </span>
              <p className="mt-0.5 leading-relaxed">{t.text}</p>
            </div>
          ))}
          {joyThinking && (
            <div className="mb-3 rounded-2xl border border-lavender/25 bg-lavender/15 px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wide opacity-70">Joy</span>
              <p className="mt-0.5 flex items-center gap-1.5 leading-relaxed">
                <span className="rtj-pulse inline-block h-2 w-2 rounded-full bg-lavender/60" />
                <span
                  className="rtj-pulse inline-block h-2 w-2 rounded-full bg-lavender/60"
                  style={{ animationDelay: '0.3s' }}
                />
                <span
                  className="rtj-pulse inline-block h-2 w-2 rounded-full bg-lavender/60"
                  style={{ animationDelay: '0.6s' }}
                />
              </p>
            </div>
          )}
        </section>

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
                void handleSendText()
              }
            }}
          />
          <Button
            variant="outline"
            className="h-12 shrink-0 rounded-full px-5"
            onClick={() => void handleSendText()}
            disabled={!isConnected || sending || !typedInput.trim()}
            aria-label="Send typed message"
          >
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>

        <div className="rehearsal-controls flex flex-wrap gap-3" role="group" aria-label="Rehearsal controls">
          {isConnected && (
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() =>
                void stopSession('paused', () => {
                  setReadAloud(false)
                  setAloudSpeaking(false)
                })
              }
              aria-label="Pause — stops audio and microphone"
            >
              ⏸ Pause
            </Button>
          )}
          {state === 'paused' && (
            <Button
              disabled={stopping}
              className="rounded-full"
              onClick={() => void handleStart(scenarioId, chaosLevel, mode)}
              aria-label="Reconnect with microphone off"
            >
              Reconnect with mic off
            </Button>
          )}
          {(isConnected || state === 'paused' || state === 'connecting') && (
            <Button
              variant="outline"
              className="rounded-full border-ink/25 text-ink hover:bg-ink/5"
              onClick={() =>
                void stopSession('ended', () => {
                  setReadAloud(false)
                  setAloudSpeaking(false)
                })
              }
              aria-label="Exit rehearsal — ends the session"
            >
              ✕ Exit
            </Button>
          )}
          {isConnected && (
            <Button
              variant="outline"
              className="rounded-full border-ink/25 text-ink hover:bg-ink/5"
              onClick={speech.toggleMic}
              aria-label={speech.micEnabled ? 'Microphone on' : 'Microphone off'}
              title={
                speech.micEnabled
                  ? 'Turn microphone off — stops speech capture'
                  : 'Turn microphone on — speak to Joy'
              }
              aria-pressed={speech.micEnabled}
            >
              {speech.micEnabled ? '🎤 Mic on' : '🎤 Mic off'}
            </Button>
          )}
        </div>

        <ApprovalGateCard
          proposal={approval.controllerSnap.pendingProposal}
          onRespond={approval.respondToProposal}
        />

        <details className="rehearsal-disclosure">
          <summary>What to expect</summary>
          <div className="pt-3">
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
          </div>
        </details>

        <details className="rehearsal-disclosure">
          <summary>Journey &amp; modes</summary>
          <CompanionModesPanel
            mode={mode}
            onSelectMode={handleSelectMode}
            scenarioId={scenarioId}
            chaosLevel={chaosLevel}
            currentStepIndex={approval.controllerSnap.currentStepIndex}
            currentSteps={currentSteps}
            currentStepDef={currentStepDef}
            plainWords={plainWords}
            savedChecklist={approval.controllerSnap.savedChecklist}
            audioPref={audioPref}
            onToggleAudioPref={handleToggleAudioPref}
            cameraConsent={cameraConsent}
            onRequestCameraConsent={approval.proposeEnableCamera}
            onRevokeCameraConsent={() => setCameraConsent(false)}
            onProposeNext={approval.proposeNext}
            onProposeBack={approval.proposeBack}
            onProposeSaveChecklist={approval.proposeSaveChecklist}
            onOpenStory={() =>
              openStory(currentStepDef?.storyId ?? currentScenario.defaultStoryId)
            }
            onApproveLearnPlan={titles => {
              approval.editChecklistDraft(titles)
              handleSelectMode('practise')
            }}
            isDevMode={isDevMode}
            activePersona={activePersona}
            parallelOverlap={parallelOverlap}
            onTriggerDevParallelOverlap={() => {
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
            activeProviderStack={activeProviderStack}
            providerStackId={providerStackId}
            onSimulateProviderFallback={() => {
              const supported = PROVIDER_STACK_OPTIONS.filter(p => !p.previewOnly)
              const curIdx = supported.findIndex(p => p.id === providerStackId)
              const nextMeta = supported[(curIdx + 1) % supported.length]
              setProviderStackId(nextMeta.id)
              setUsesBrowserStt(nextMeta.usesBrowserStt)
              setProviderNotice(
                `Switched provider stack to ${nextMeta.label} (fallback chain verified).`,
              )
            }}
            providerNotice={providerNotice}
            whiskerTraces={whiskerTraces}
          />
        </details>
      </div>

      {/* Pipecat audio element (rendered only when connected and voice output is enabled) */}
      {isConnected && audioPref && <PipecatClientAudio />}
    </main>
  )
}

export default function App() {
  const client = useMemo(
    () =>
      new PipecatClient({
        transport: new SmallWebRTCTransport({
          webrtcRequestParams: { endpoint: '/api/offer' },
        }),
        enableMic: false,
        enableCam: false,
      }),
    [],
  )

  return (
    <PipecatClientProvider client={client}>
      <RehearsalView />
    </PipecatClientProvider>
  )
}
