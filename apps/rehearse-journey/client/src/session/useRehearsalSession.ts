import { useCallback, useEffect, useRef, useState } from 'react'
import { RTVIEvent, type PipecatClient } from '@pipecat-ai/client-js'
import { useRTVIClientEvent } from '@pipecat-ai/client-react'
import type { JoyPersona } from '@/components/JoyMascot'
import { STORIES, type RouteData } from '@/stories'
import {
  LEVEL_LABELS,
  PROVIDER_STACK_OPTIONS,
  SCENARIO_CATALOG,
  type RehearsalMode,
  type ScenarioId,
} from '@/controller/v11ScenariosAndModes'
import { ReadAloud, StopAutoAdvance, MotionReducer } from '@/toolkitAdapters'
import { useApprovalGate } from '@/approval/useApprovalGate'
import { useSpeechInput } from '@/speech-input/useSpeechInput'

export type RolePlayState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'paused' | 'ended'

export interface Turn {
  speaker: 'Joy' | 'You'
  speakerLabel?: string
  text: string
  id: number
}

export function useRehearsalSession(client: PipecatClient | undefined) {
  const [state, setState] = useState<RolePlayState>('idle')
  const [turns, setTurns] = useState<Turn[]>([])
  const [typedInput, setTypedInput] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [nod, setNod] = useState(0)
  const [joyThinking, setJoyThinking] = useState(false)

  // Story card state + dynamic off-critical-path story image map
  const [storyId, setStoryId] = useState<string | null>(null)
  const [storySession, setStorySession] = useState(0)
  const [storyImages, setStoryImages] = useState<Record<string, string>>({})
  const [storyRoutes, setStoryRoutes] = useState<Record<string, RouteData>>({})

  // Scenario, level, mode, persona, provider state
  const [scenarioId, setScenarioId] = useState<ScenarioId>('hospital')
  const [chaosLevel, setChaosLevel] = useState<1 | 2 | 3 | 4>(1)
  const [mode, setMode] = useState<RehearsalMode>('practise')
  const [activePersona, setActivePersona] = useState<JoyPersona>('joy')
  const [parallelOverlap, setParallelOverlap] = useState(false)
  const [audioPref, setAudioPref] = useState(true)
  const [providerStackId, setProviderStackId] = useState<string>('openai')
  const [usesBrowserStt, setUsesBrowserStt] = useState<boolean>(false)
  const [providerNotice, setProviderNotice] = useState<string>('')
  const [cameraConsent, setCameraConsent] = useState(false)
  const [backendConfirmedScenario, setBackendConfirmedScenario] = useState<string>('hospital')
  const [whiskerTraces, setWhiskerTraces] = useState<string[]>([
    'in | TransportReady | SmallWebRTC SDP offer ready',
    'out | FlowOpening | Step 1 · Arrive & state your visit',
  ])

  const stoppingRef = useRef(false)
  const active = useRef(false)
  const sendingRef = useRef(false)
  const generation = useRef(0)
  const turnId = useRef(0)
  const pendingConfigRef = useRef<{
    scenario_id: ScenarioId
    level: 1 | 2 | 3 | 4
    mode: RehearsalMode
    audio_enabled: boolean
  }>({
    scenario_id: 'hospital',
    level: 1,
    mode: 'practise',
    audio_enabled: true,
  })

  const currentScenario = SCENARIO_CATALOG[scenarioId]
  const currentSteps = currentScenario.stepsByLevel[chaosLevel]

  const openStory = useCallback(
    (targetStoryId: string) => {
      if (!STORIES[targetStoryId]) return
      setStorySession(s => s + 1)
      setStoryId(targetStoryId)
      if (client && active.current) {
        try {
          client.sendClientMessage?.('story_request', { story_id: targetStoryId })
        } catch {
          /* ignore if mock does not define sendClientMessage */
        }
      }
    },
    [client],
  )

  const approval = useApprovalGate({
    client,
    currentSteps,
    onStepApproved: (speaker, fanout, stepStoryId) => {
      setActivePersona(speaker)
      setParallelOverlap(fanout)
      if (stepStoryId && STORIES[stepStoryId]) {
        setStorySession(s => s + 1)
        setStoryId(stepStoryId)
      }
    },
    onCameraConsentChanged: setCameraConsent,
  })

  const currentStepDef =
    currentSteps[Math.min(approval.controllerSnap.currentStepIndex, currentSteps.length - 1)] ??
    currentSteps[0]
  const activeProviderStack =
    PROVIDER_STACK_OPTIONS.find(p => p.id === (audioPref ? providerStackId : 'text_only')) ??
    PROVIDER_STACK_OPTIONS[0]

  const addTurn = useCallback(
    (
      speaker: 'Joy' | 'You',
      text: string,
      speakerLabel?: string,
      options?: { appendToPrevious?: boolean },
    ) => {
      const cleaned = text.trim()
      if (!cleaned) return
      setTurns(prev => {
        if (options?.appendToPrevious && prev.length > 0) {
          const last = prev[prev.length - 1]
          const sameLabel =
            (last.speakerLabel ?? (last.speaker === 'Joy' ? 'Joy' : 'You')) ===
            (speakerLabel ?? (speaker === 'Joy' ? 'Joy' : 'You'))
          if (last.speaker === speaker && sameLabel) {
            return [...prev.slice(0, -1), { ...last, text: `${last.text} ${cleaned}` }]
          }
        }
        return [...prev, { speaker, speakerLabel, text: cleaned, id: turnId.current++ }]
      })
      if (speaker === 'You') setNod(n => n + 1)
    },
    [],
  )

  const sendSpoken = useCallback(
    (text: string) => {
      if (!client || !active.current || !text || state !== 'listening') return
      setJoyThinking(true)
      void client
        .sendText(text, { run_immediately: true, audio_response: audioPref })
        .then(() => addTurn('You', text))
        .catch(() => setError('Your speech could not be sent. Try again or type below.'))
    },
    [addTurn, audioPref, client, state],
  )

  const speech = useSpeechInput({
    client,
    isActiveRef: active,
    isListeningState: state === 'listening',
    usesBrowserStt,
    audioEnabled: audioPref,
    onSpokenTurn: sendSpoken,
    onError: setError,
  })

  const sendSessionConfigToBot = useCallback(
    (cfg: {
      scenario_id: ScenarioId
      level: 1 | 2 | 3 | 4
      mode: RehearsalMode
      audio_enabled: boolean
    }) => {
      pendingConfigRef.current = cfg
      if (!client || !active.current) return
      try {
        client.sendClientMessage?.('session_config', cfg)
      } catch {
        /* ignore if mock does not define sendClientMessage */
      }
    },
    [client],
  )

  useRTVIClientEvent(RTVIEvent.BotTranscript, (data: { text: string }) => {
    if (active.current && data.text.trim()) {
      addTurn('Joy', data.text, undefined, { appendToPrevious: true })
      setJoyThinking(false)
      setNod(n => n + 1)
    }
  })

  useRTVIClientEvent(RTVIEvent.UserTranscript, (data: { text: string; final: boolean }) => {
    if (active.current && data.final) addTurn('You', data.text, undefined, { appendToPrevious: true })
  })

  useRTVIClientEvent(RTVIEvent.BotReady, () => {
    if (active.current) {
      setState('listening')
      sendSessionConfigToBot(pendingConfigRef.current)
    }
  })

  useRTVIClientEvent(RTVIEvent.Disconnected, () => {
    if (active.current) {
      active.current = false
      speech.disableMic()
      setStoryId(null)
      setState('ended')
      setError('Connection ended. Start again to reconnect to Joy.')
    }
  })

  useRTVIClientEvent(RTVIEvent.BotStartedSpeaking, () => {
    if (active.current) {
      setState('speaking')
      speech.onBotStartedSpeaking()
    }
  })

  useRTVIClientEvent(RTVIEvent.BotStoppedSpeaking, () => {
    if (active.current) {
      setState('listening')
      setJoyThinking(false)
      speech.onBotStoppedSpeaking()
    }
  })

  useRTVIClientEvent(RTVIEvent.ServerMessage, (data: unknown) => {
    if (!active.current) return
    const msg = (data as { data?: unknown })?.data ?? data
    if (!msg || typeof msg !== 'object') return
    const m = msg as Record<string, unknown>
    const type = typeof m.type === 'string' ? m.type : ''

    if (type === 'session_configured') {
      if (typeof m.scenario_id === 'string' && m.scenario_id in SCENARIO_CATALOG) {
        setScenarioId(m.scenario_id as ScenarioId)
        setBackendConfirmedScenario(m.scenario_id)
      }
      if (typeof m.level === 'number' && m.level >= 1 && m.level <= 4) {
        setChaosLevel(m.level as 1 | 2 | 3 | 4)
      }
      if (typeof m.speaker === 'string') {
        setActivePersona(m.speaker as JoyPersona)
      }
      if (typeof m.stack_id === 'string') {
        setProviderStackId(m.stack_id)
      }
      if (typeof m.uses_browser_stt === 'boolean') {
        setUsesBrowserStt(m.uses_browser_stt)
      }
      setWhiskerTraces(prev => [
        ...prev.slice(-9),
        `in | SessionConfigured | scenario=${String(m.scenario_id)} L${String(m.level)}`,
      ])
    } else if (type === 'story_open' && typeof m.story_id === 'string' && STORIES[m.story_id]) {
      setStorySession(s => s + 1)
      setStoryId(m.story_id)
      if (typeof m.image === 'string' && m.image.startsWith('data:image/')) {
        const sid = m.story_id
        const img = m.image
        setStoryImages(prev => ({ ...prev, [sid]: img }))
      }
      if (m.route && typeof m.route === 'object') {
        const sid = m.story_id
        const rt = m.route as RouteData
        setStoryRoutes(prev => ({ ...prev, [sid]: rt }))
      }
      setWhiskerTraces(prev => [...prev.slice(-9), `in | StoryOpen | ${m.story_id}${m.image ? ' +image' : ''}${m.route ? ' +route' : ''}`])
    } else if (
      type === 'story_image' &&
      typeof m.story_id === 'string' &&
      typeof m.image === 'string' &&
      m.image.startsWith('data:image/')
    ) {
      // Asynchronous image arrival off the critical conversation path (only applied while session active)
      const sid = m.story_id
      const img = m.image
      setStoryImages(prev => ({ ...prev, [sid]: img }))
      setWhiskerTraces(prev => [...prev.slice(-9), `in | StoryImageReady | ${sid}`])
    } else if (
      type === 'story_route' &&
      typeof m.story_id === 'string' &&
      m.route &&
      typeof m.route === 'object'
    ) {
      const sid = m.story_id
      const rt = m.route as RouteData
      setStoryRoutes(prev => ({ ...prev, [sid]: rt }))
      setWhiskerTraces(prev => [...prev.slice(-9), `in | StoryRouteReady | ${sid}`])
    } else if (type === 'story_close') {
      setStoryId(null)
    } else if (type === 'flow_node_transition' && typeof m.node_id === 'string') {
      const spk = (typeof m.speaker === 'string' ? m.speaker : 'joy') as JoyPersona
      setActivePersona(spk)
      approval.syncStepFromBackend(m.node_id)
      const matchedStep = currentSteps.find(s => s.id === m.node_id)
      if (matchedStep?.storyId && STORIES[matchedStep.storyId]) {
        setStorySession(s => s + 1)
        setStoryId(matchedStep.storyId)
      }
      setWhiskerTraces(prev => [
        ...prev.slice(-9),
        `in | FlowTransition | ${m.node_id} (${String(m.step_title ?? '')})`,
      ])
    } else if (type === 'approval_proposal' && typeof m.target_node === 'string') {
      approval.proposeModelNavigation(
        m.target_node,
        String(m.target_title ?? m.target_node),
        typeof m.approval_id === 'string' ? m.approval_id : undefined,
      )
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
      if (typeof m.uses_browser_stt === 'boolean') {
        setUsesBrowserStt(m.uses_browser_stt)
      }
    } else if (type === 'provider_switched' && typeof m.reason === 'string') {
      if (typeof m.to_stack === 'string') {
        setProviderStackId(m.to_stack)
        const meta = PROVIDER_STACK_OPTIONS.find(p => p.id === m.to_stack)
        if (meta) setUsesBrowserStt(meta.usesBrowserStt)
      }
      setProviderNotice(m.reason)
      setWhiskerTraces(prev => [...prev.slice(-9), `in | ProviderSwitched | ${m.reason}`])
    }
  })

  useRTVIClientEvent(RTVIEvent.Error, () => {
    if (active.current) setError('Joy could not complete that response. Try again or exit and reconnect.')
  })

  useRTVIClientEvent(RTVIEvent.DeviceError, () => {
    speech.disableMic()
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

  const handleStart = useCallback(
    async (
      nextScenario: ScenarioId = scenarioId,
      nextLevel: 1 | 2 | 3 | 4 = chaosLevel,
      nextMode: RehearsalMode = mode,
    ) => {
      if (!client || active.current || stoppingRef.current) return
      const current = ++generation.current
      active.current = true
      setScenarioId(nextScenario)
      setChaosLevel(nextLevel)
      setMode(nextMode)
      const scen = SCENARIO_CATALOG[nextScenario]
      const stepsForScenario = scen.stepsByLevel[nextLevel]
      setActivePersona(scen.persona)
      setParallelOverlap(false)
      const cfg = {
        scenario_id: nextScenario,
        level: nextLevel,
        mode: nextMode,
        audio_enabled: audioPref,
      }
      pendingConfigRef.current = cfg
      approval.startNewSession(
        stepsForScenario.map(s => s.id),
        [
          `Scenario: ${scen.name} (${LEVEL_LABELS[nextLevel].title})`,
          'Carry pretend clinic card or practice note',
          'Pause or ask companion to repeat at any time',
        ],
      )
      setError('')
      speech.disableMic()
      setState('connecting')
      try {
        await client.connect({
          webrtcRequestParams: {
            endpoint: '/api/offer',
            requestData: cfg,
          },
        })
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
    },
    [approval, audioPref, chaosLevel, client, mode, scenarioId, speech],
  )

  const stopSession = useCallback(
    async (next: 'paused' | 'ended', onAfterStop?: () => void) => {
      active.current = false
      generation.current++
      stoppingRef.current = true
      setStopping(true)
      ReadAloud.stop()
      onAfterStop?.()
      setJoyThinking(false)
      setStoryId(null)
      setParallelOverlap(false)
      if (next === 'ended') {
        setCameraConsent(false)
        setStoryImages({})
      }
      approval.pauseController()
      speech.disableMic()
      const tracks = client?.tracks()
      tracks?.local.audio?.stop()
      tracks?.bot?.audio?.stop()
      setState(next)
      try {
        await client?.disconnect()
      } catch {
        setError('Connection cleanup failed. Reload this page before starting again.')
      } finally {
        stoppingRef.current = false
        setStopping(false)
      }
    },
    [approval, client, speech],
  )

  const handleSendText = useCallback(async () => {
    const text = typedInput.trim()
    if (
      !client ||
      !active.current ||
      sendingRef.current ||
      !text ||
      (state !== 'listening' && state !== 'speaking')
    )
      return
    const current = generation.current
    sendingRef.current = true
    setSending(true)
    setError('')
    setJoyThinking(true)
    try {
      await client.sendText(text, { run_immediately: true, audio_response: audioPref })
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
  }, [addTurn, audioPref, client, state, typedInput])

  const handleSelectMode = useCallback(
    (nextMode: RehearsalMode) => {
      setMode(nextMode)
      sendSessionConfigToBot({
        scenario_id: scenarioId,
        level: chaosLevel,
        mode: nextMode,
        audio_enabled: audioPref,
      })
    },
    [audioPref, chaosLevel, scenarioId, sendSessionConfigToBot],
  )

  const handleToggleAudioPref = useCallback(() => {
    const nextAudio = !audioPref
    setAudioPref(nextAudio)
    if (!nextAudio) {
      speech.disableMic()
    }
    sendSessionConfigToBot({
      scenario_id: scenarioId,
      level: chaosLevel,
      mode,
      audio_enabled: nextAudio,
    })
  }, [audioPref, chaosLevel, mode, scenarioId, sendSessionConfigToBot, speech])

  return {
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
    usesBrowserStt,
    setUsesBrowserStt,
    providerNotice,
    setProviderNotice,
    cameraConsent,
    setCameraConsent,
    backendConfirmedScenario,
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
  }
}
