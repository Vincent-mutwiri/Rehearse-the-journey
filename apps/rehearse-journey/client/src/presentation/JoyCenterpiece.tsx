import JoyMascot, { type JoyPersona, type JoyState } from '@/components/JoyMascot'
import { type FlowStepDef, type ScenarioDef } from '@/controller/v11ScenariosAndModes'
import type { Turn } from '@/session/useRehearsalSession'

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
  turns?: Turn[]
  currentScenario: ScenarioDef
  currentStepDef: FlowStepDef | undefined
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
  turns = [],
  currentScenario,
  currentStepDef,
}: JoyCenterpieceProps) {
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
  const latestPrimaryTurn = [...turns].reverse().find(turn =>
    turn.speaker === 'Joy' && turn.persona !== 'amani',
  )
  const latestPartnerTurn = [...turns].reverse().find(turn =>
    turn.speaker === 'You' || turn.persona === 'amani',
  )

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
      className="rehearsal-companion"
    >
      <span className="sr-only">
        {currentScenario.name} · {primaryLabel}
      </span>
      <div
        className="joy-centerpiece-stage"
        data-parallel-overlap={parallelOverlap ? 'true' : 'false'}
        data-duo-stage="true"
        data-scenario={currentScenario.id}
      >
        <div
          className="joy-stage-backdrop joy-hospital-backdrop"
          aria-hidden="true"
        >
          {/* Hospital reception background elements */}
          <svg
            viewBox="0 0 640 240"
            preserveAspectRatio="xMidYMid slice"
            className="h-full w-full opacity-90"
          >
            {/* Soft hospital wall & wainscotting */}
            <rect x="0" y="0" width="640" height="165" fill="#f5f0fa" />
            <rect x="0" y="165" width="640" height="75" fill="#e6dff2" />
            <line x1="0" y1="165" x2="640" y2="165" stroke="#c8bce0" strokeWidth="2" />

            {/* Hospital reception header sign board */}
            <g transform="translate(36, 18)">
              <rect
                x="0"
                y="0"
                width="208"
                height="44"
                rx="10"
                fill="#fffdfa"
                stroke="#a89bd4"
                strokeWidth="1.5"
              />
              {/* Medical cross icon */}
              <circle cx="26" cy="22" r="13" fill="#8fb39b" opacity="0.25" />
              <rect x="23" y="13" width="6" height="18" rx="1.5" fill="#526d5a" />
              <rect x="17" y="19" width="18" height="6" rx="1.5" fill="#526d5a" />
              <text
                x="48"
                y="20"
                fontFamily="system-ui, sans-serif"
                fontSize="10"
                fontWeight="700"
                fill="#3a3550"
              >
                HOSPITAL RECEPTION
              </text>
              <text
                x="48"
                y="34"
                fontFamily="system-ui, sans-serif"
                fontSize="9"
                fontWeight="600"
                fill="#655e76"
              >
                Desk 1 · Waiting Area B ←
              </text>
            </g>

            {/* Daylight hospital window in center-right */}
            <g transform="translate(275, 22)">
              <rect
                x="0"
                y="0"
                width="104"
                height="96"
                rx="10"
                fill="#e2eff5"
                stroke="#c8bce0"
                strokeWidth="2"
              />
              <line x1="52" y1="0" x2="52" y2="96" stroke="#c8bce0" strokeWidth="2" />
              <line x1="0" y1="48" x2="104" y2="48" stroke="#c8bce0" strokeWidth="2" />
              <circle cx="78" cy="24" r="10" fill="#f4c6a6" opacity="0.65" />
            </g>

            {/* Corridor arch & Waiting Area B door on the right */}
            <g transform="translate(430, 26)">
              <path
                d="M0 139 L0 42 Q0 0 44 0 L84 0 Q128 0 128 42 L128 139 Z"
                fill="#ebe4f5"
                stroke="#c8bce0"
                strokeWidth="1.5"
              />
              <rect x="26" y="16" width="76" height="20" rx="5" fill="#8fb39b" opacity="0.35" />
              <text
                x="64"
                y="29"
                textAnchor="middle"
                fontFamily="system-ui, sans-serif"
                fontSize="8.5"
                fontWeight="700"
                fill="#3a3550"
              >
                WAITING BAY B
              </text>
              {/* Waiting bench silhouette */}
              <rect x="24" y="108" width="80" height="10" rx="4" fill="#a89bd4" opacity="0.55" />
              <rect x="28" y="96" width="72" height="12" rx="3" fill="#c8bce0" opacity="0.55" />
            </g>

            {/* Calm potted plant on reception side */}
            <g transform="translate(238, 124)">
              <rect x="8" y="24" width="20" height="18" rx="4" fill="#f4c6a6" />
              <ellipse cx="18" cy="18" rx="14" ry="10" fill="#8fb39b" opacity="0.75" />
              <ellipse cx="12" cy="12" rx="8" ry="12" fill="#6b9679" opacity="0.65" />
            </g>
          </svg>
        </div>
        <div className="joy-duo-row">
          <div className="joy-dialogue-column" role="group" aria-label={`${primaryLabel} dialogue`}>
            <JoyMascot
              state={primaryState}
              thinking={joyThinking && activePersona !== 'amani'}
              persona={primaryPersona}
              facing="right"
              behindDesk={primaryPersona === 'joy' || primaryPersona === 'wanjiku'}
              companionLabel="Joy, your rehearsal companion"
              encourageSignal={nod}
              reduceMotion={reduceMotion || stopAuto}
              className="joy-duo-mascot"
            />
            <span className="mt-1 rounded-full bg-lavender/40 px-2.5 py-0.5 text-[11px] font-semibold">
              {primaryLabel}
            </span>
            <div className="joy-dialogue joy-dialogue-primary" data-speaker="primary">
              {latestPrimaryTurn
                ? <p>{latestPrimaryTurn.text}</p>
                : <p className="joy-dialogue-placeholder">The companion’s reply will appear here.</p>}
              {joyThinking && activePersona !== 'amani' && (
                <p className="joy-dialogue-thinking">Thinking…</p>
              )}
            </div>
          </div>
          <div className="joy-dialogue-column" role="group" aria-label="Your and Amani’s dialogue">
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
            <div className="joy-dialogue joy-dialogue-partner" data-speaker="partner">
              {latestPartnerTurn
                ? <p>{latestPartnerTurn.text}</p>
                : <p className="joy-dialogue-placeholder">Your reply will appear here when you speak or send a message.</p>}
              {joyThinking && activePersona === 'amani' && (
                <p className="joy-dialogue-thinking">Thinking…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
