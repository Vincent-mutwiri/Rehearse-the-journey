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

  return (
    <section
      aria-label="Joy, your rehearsal companion"
      className="rehearsal-companion flex flex-col items-center gap-4 lg:sticky lg:top-8 lg:h-fit lg:min-h-[60vh] lg:flex-1 lg:items-center lg:justify-center"
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
                ? micEnabled
                  ? '🎤 Listening to your voice'
                  : '✨ Ready for your turn'
                : state === 'paused'
                  ? '⏸ Resting (paused)'
                  : '👋 Practice companion'}
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
