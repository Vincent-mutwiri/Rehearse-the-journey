import JoyMascot, { type JoyPersona, type JoyState } from '@/components/JoyMascot'
import StoryCard from '@/components/StoryCard'
import { STORIES, type RouteData } from '@/stories'
import { LEVEL_LABELS, type FlowStepDef, type ScenarioDef } from '@/controller/v11ScenariosAndModes'

export interface JoyCenterpieceProps {
  state: JoyState
  joyThinking: boolean
  activePersona: JoyPersona
  parallelOverlap: boolean
  nod: number
  reduceMotion: boolean
  stopAuto: boolean
  micEnabled: boolean
  userSpeaking?: boolean
  currentScenario: ScenarioDef
  chaosLevel: 1 | 2 | 3 | 4
  currentStepDef: FlowStepDef | undefined
  storyId: string | null
  storySession: number
  storyImages: Record<string, string>
  storyRoutes: Record<string, RouteData>
  onCloseStory: () => void
}

export default function JoyCenterpiece({
  state,
  joyThinking,
  activePersona,
  parallelOverlap,
  nod,
  reduceMotion,
  stopAuto,
  micEnabled,
  userSpeaking = false,
  currentScenario,
  chaosLevel,
  currentStepDef,
  storyId,
  storySession,
  storyImages,
  storyRoutes,
  onCloseStory,
}: JoyCenterpieceProps) {
  const activeStory = storyId && STORIES[storyId]
    ? {
        ...STORIES[storyId],
        image: storyImages[storyId] ?? STORIES[storyId].image,
        route: storyRoutes[storyId] ?? STORIES[storyId].route,
      }
    : null

  const primaryPersona: JoyPersona =
    activePersona === 'amani' ? currentScenario.persona : activePersona
  const primaryLabel =
    activePersona === 'amani'
      ? currentScenario.personaLabel
      : (currentStepDef?.speakerLabel ?? currentScenario.personaLabel)

  const partnerLabelByScenario: Record<string, string> = {
    hospital: 'Visitor Amani (You / Partner)',
    matatu: 'Passenger Amani (You / Partner)',
    government: 'Citizen Amani (You / Partner)',
    directions: 'Visitor Amani (You / Partner)',
  }
  const partnerLabel = partnerLabelByScenario[currentScenario.id] ?? 'Practice Partner Amani'

  const primaryState: JoyState =
    state === 'paused' || state === 'ended' || state === 'connecting' || state === 'idle'
      ? state
      : parallelOverlap
        ? state === 'speaking'
          ? 'speaking'
          : 'listening'
        : activePersona === 'amani'
          ? state === 'speaking'
            ? 'listening'
            : 'idle'
          : joyThinking && state === 'listening'
            ? 'idle'
            : state

  const partnerState: JoyState =
    state === 'paused' || state === 'ended' || state === 'connecting' || state === 'idle'
      ? state
      : parallelOverlap
        ? state === 'speaking'
          ? 'speaking'
          : 'listening'
        : activePersona === 'amani'
          ? state
          : userSpeaking
            ? 'speaking'
            : state === 'speaking'
              ? 'listening'
              : micEnabled
                ? 'speaking'
                : 'listening'

  return (
    <section
      aria-label="Joy, your rehearsal companion"
      className="rehearsal-companion flex flex-col items-center gap-4 lg:sticky lg:top-8 lg:h-fit lg:min-h-[60vh] lg:flex-1 lg:items-center lg:justify-center"
    >
      <div
        className="joy-centerpiece-stage"
        data-parallel-overlap={parallelOverlap ? 'true' : 'false'}
        data-duo-stage="true"
      >
        <div className="joy-stage-backdrop" aria-hidden="true" />
        <div className="joy-duo-row flex items-end justify-center gap-1 sm:gap-3">
          <div className="flex flex-col items-center">
            <JoyMascot
              state={primaryState}
              thinking={joyThinking && activePersona !== 'amani'}
              persona={primaryPersona}
              facing="right"
              companionLabel="Joy, your rehearsal companion"
              encourageSignal={nod}
              reduceMotion={reduceMotion || stopAuto}
              className="joy-duo-mascot"
            />
            <span className="mt-1 rounded-full bg-lavender/40 px-2.5 py-0.5 text-[11px] font-semibold">
              {primaryLabel}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <JoyMascot
              state={partnerState}
              thinking={joyThinking && activePersona === 'amani'}
              persona="amani"
              facing="left"
              companionLabel="Amani, practice conversation partner"
              encourageSignal={nod}
              reduceMotion={reduceMotion || stopAuto}
              className="joy-duo-mascot"
            />
            <span className="mt-1 rounded-full bg-sage/40 px-2.5 py-0.5 text-[11px] font-semibold">
              {partnerLabel}
            </span>
          </div>
        </div>
        <span className="joy-status-pill mt-2" aria-hidden="true">
          {state === 'speaking'
            ? `🔊 ${currentStepDef?.speakerLabel ?? 'Joy'} speaking to Amani`
            : joyThinking
              ? '💭 Joy is thinking…'
              : state === 'listening'
                ? micEnabled || userSpeaking
                  ? '🎤 Your turn — Amani speaking with Joy'
                  : '✨ Two-mascot dialogue ready for your turn'
                : state === 'paused'
                  ? '⏸ Resting (paused)'
                  : '👋 Practice companions'}
        </span>
      </div>
      <div className="rehearsal-companion-heading text-center">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Rehearse the Journey</h1>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-lavender/60 px-3 py-1">{currentScenario.name}</span>
          <span className="rounded-full bg-peach/70 px-3 py-1">{LEVEL_LABELS[chaosLevel].title}</span>
          <span className="rounded-full bg-mist px-3 py-1">
            {parallelOverlap
              ? 'Receptionist Joy & Patient Amani'
              : currentStepDef?.speakerLabel ?? currentScenario.personaLabel}
          </span>
        </div>
      </div>
      {activeStory && (
        <StoryCard
          key={`${storySession}:${activeStory.id}`}
          story={activeStory}
          onClose={onCloseStory}
        />
      )}
    </section>
  )
}
