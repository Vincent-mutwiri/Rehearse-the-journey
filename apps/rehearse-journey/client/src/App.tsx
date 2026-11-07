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
import { Button } from '@/components/ui/button'
import {
  ReadAloud,
  StopAutoAdvance,
  MotionReducer,
  enableStopAutoAdvance,
  simplifyStepText,
  ORIGINAL_STEP_TEXT,
} from './toolkitAdapters'
import { LEVEL_LABELS, PROVIDER_STACK_OPTIONS } from './controller/v11ScenariosAndModes'
import { useRehearsalSession, type RolePlayState } from './session/useRehearsalSession'
import WelcomeLanding from './presentation/WelcomeLanding'
import JoyCenterpiece from './presentation/JoyCenterpiece'
import ApprovalGateCard from './presentation/ApprovalGateCard'
import CompanionModesPanel from './presentation/CompanionModesPanel'
import SettingsDrawer from './presentation/SettingsDrawer'
import Dashboard, { type DashboardSection } from './components/Dashboard'
import Directions from './components/Directions'
import CalmMe, { CALM_ME_OPEN_EVENT } from './components/CalmMe'
import StoryCard from './components/StoryCard'
import { STORIES } from './stories'

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
    clarityEnabled,
    clarityPercentage,
    handleToggleClarity,
    handleChangeClarityPercentage,
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

  // Dashboard section — which section the person picked from the dashboard.
  // null = the dashboard landing; 'simulations' = the scenario picker;
  // 'directions' = the directions form.
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

  // Decompress is independent of Pipecat, but an active rehearsal must yield
  // its audio. Resuming the rehearsal remains an explicit user action.
  useEffect(() => {
    const pauseForCalmMe = () => {
      if (state === 'listening' || state === 'speaking' || state === 'connecting') {
        void stopSession('paused')
      }
    }
    window.addEventListener(CALM_ME_OPEN_EVENT, pauseForCalmMe)
    return () => window.removeEventListener(CALM_ME_OPEN_EVENT, pauseForCalmMe)
  }, [state, stopSession])

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

  const isConnected = state === 'listening' || state === 'speaking'

  if (state === 'idle' && !dashboardSection) {
    return (
      <main className="welcome-shell mx-auto flex min-h-screen w-full max-w-[920px] flex-col gap-8 px-5 py-8">
        <Dashboard onSelect={setDashboardSection} reduceMotion={reduceMotion || stopAuto} />
      </main>
    )
  }

  if (state === 'idle' && dashboardSection === 'directions') {
    return (
      <main className="welcome-shell mx-auto flex min-h-screen w-full max-w-[640px] flex-col gap-6 px-5 py-8">
        <Directions
          onBack={() => setDashboardSection(null)}
          onRehearseMatatu={() => {
            setDashboardSection('simulations')
            void handleStart('matatu', chaosLevel, mode)
          }}
        />
      </main>
    )
  }

  if (state === 'idle' && dashboardSection === 'stories') {
    const activeStoryKey = storyId && STORIES[storyId] ? storyId : 'hospital-waiting-area'
    const activeStoryObj = STORIES[activeStoryKey]
    return (
      <main className="welcome-shell mx-auto flex min-h-screen w-full max-w-[760px] flex-col gap-6 px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setDashboardSection(null)}
          >
            ← Back to dashboard
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => setDashboardSection('simulations')}
          >
            Practise with Joy &amp; Amani →
          </Button>
        </header>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Interactive Stories &amp; Maps</h2>
          <p className="mt-1 text-sm opacity-75">
            Step through each visual story card and floor-plan map at your own pace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose an interactive story">
          {Object.values(STORIES).map(st => (
            <button
              key={st.id}
              type="button"
              aria-pressed={activeStoryKey === st.id}
              onClick={() => setStoryId(st.id)}
              className={
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ' +
                (activeStoryKey === st.id
                  ? 'border-lavender bg-lavender/30 text-ink'
                  : 'border-ink/15 bg-white/70 text-ink/80 hover:border-lavender/50')
              }
            >
              {st.title}
            </button>
          ))}
        </div>
        <div className="flex justify-center py-2">
          <StoryCard
            key={`dashboard:${activeStoryObj.id}`}
            story={{
              ...activeStoryObj,
              image: storyImages[activeStoryObj.id] ?? activeStoryObj.image,
              route: storyRoutes[activeStoryObj.id] ?? activeStoryObj.route,
            }}
            onClose={() => setDashboardSection(null)}
          />
        </div>
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
    <main className="rehearsal-shell rehearsal-duo-layout mx-auto flex min-h-screen w-full max-w-[1120px] flex-col gap-6 px-5 py-6 sm:py-8 lg:gap-10 lg:py-10">
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
            <h1 className="sr-only">Rehearse the Journey</h1>

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
                  onClick={() => handleToggleClarity(!clarityEnabled)}
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
                        onChange={() => handleChangeClarityPercentage(percentage)}
                      />
                      <span><strong>{percentage}%</strong> {label}</span>
                    </label>
                  ))}
                  <p className="clarity-note">About {clarityPercentage}% of suitable instructions will be intentionally unclear.</p>
                </fieldset>
              )}
            </section>

            <section className="border-t border-ink/15 pt-5" aria-label="Practice details">
              <h3 className="font-semibold">{currentScenario.name}</h3>
              <p className="mt-1 text-sm">{LEVEL_LABELS[chaosLevel].title}</p>
            </section>
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
          </SettingsDrawer>
        </header>
      <div className="rehearsal-workspace grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-4">
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
            turns={turns}
            currentScenario={currentScenario}
            currentStepDef={currentStepDef}
          />

          <div className="rehearsal-conversation flex min-w-0 flex-col gap-4">

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
              className={isConnected ? 'sr-only' : 'text-center text-sm'}
            >
              {isConnected && (
                <p>{state === 'speaking' ? 'Joy is speaking.' : joyThinking ? 'Joy is thinking.' : speech.micEnabled ? 'Microphone on — speak or type.' : 'Microphone off — type below, or turn on your microphone.'}</p>
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

            {/* Announce new turns once; visible dialogue stays beneath the mascots. */}
            <section
              aria-label="Conversation transcript"
              role="log"
              aria-relevant="additions text"
              aria-live="polite"
              className="sr-only"
            >
              {turns.map(turn => (
                <p key={turn.id}>
                  {turn.speakerLabel ?? (turn.speaker === 'Joy' ? 'Joy' : 'You')}: {turn.text}
                </p>
              ))}
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
          </div>
        </div>

        <aside
          aria-label="Interactive story and practice map"
          className="rehearsal-story-rail flex w-full flex-col items-center lg:sticky lg:top-6"
        >
          {storyId && STORIES[storyId] ? (
            <StoryCard
              key={`${storySession}:${storyId}`}
              story={{
                ...STORIES[storyId],
                image: storyImages[storyId] ?? STORIES[storyId].image,
                route: storyRoutes[storyId] ?? STORIES[storyId].route,
              }}
              onClose={() => setStoryId(null)}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => openStory(currentStepDef?.storyId ?? currentScenario.defaultStoryId)}
            >
              📖 Open Interactive Story &amp; Map
            </Button>
          )}
        </aside>
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
      <CalmMe />
    </PipecatClientProvider>
  )
}
