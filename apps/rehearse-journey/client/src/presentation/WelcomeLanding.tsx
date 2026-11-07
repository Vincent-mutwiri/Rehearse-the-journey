import type { RefObject } from 'react'
import { Sprout, Cross, BusFront, Landmark, Signpost, MessageCircle, MicOff, Pause, Play } from 'lucide-react'
import JoyMascot from '@/components/JoyMascot'
import { Button } from '@/components/ui/button'
import { LEVEL_LABELS, type ScenarioId } from '@/controller/v11ScenariosAndModes'

export const SCENARIOS: Array<{
  id: ScenarioId
  name: string
  level: string
  live: boolean
  icon: typeof Cross
}> = [
  { id: 'hospital', name: 'Hospital Reception', level: 'Level 1 · Easy Start', live: true, icon: Cross },
  { id: 'matatu', name: 'Matatu Stage', level: 'Levels 1–4 · v1.1', live: true, icon: BusFront },
  { id: 'government', name: 'Government Service', level: 'Levels 1–4 · v1.1', live: true, icon: Landmark },
  { id: 'directions', name: 'Asking for Directions', level: 'Levels 1–4 · v1.1', live: true, icon: Signpost },
]

export interface WelcomeLandingProps {
  titleRef: RefObject<HTMLHeadingElement>
  reduceMotion: boolean
  stopAuto: boolean
  chaosLevel: 1 | 2 | 3 | 4
  onSelectChaosLevel: (lvl: 1 | 2 | 3 | 4) => void
  onStartScenario: (scenarioId: ScenarioId, level: 1 | 2 | 3 | 4) => void
  error: string
  onBackToDashboard?: () => void
}

export default function WelcomeLanding({
  titleRef,
  reduceMotion,
  stopAuto,
  chaosLevel,
  onSelectChaosLevel,
  onStartScenario,
  error,
  onBackToDashboard,
}: WelcomeLandingProps) {
  return (
    <main className="welcome-shell">
      <header className="welcome-nav">
        <div className="welcome-brand">
          <Sprout aria-hidden="true" />
          <span>
            Kioo<span className="welcome-brand-subtitle">Your practice companion</span>
          </span>
        </div>
        <div className="welcome-nav-right">
          {onBackToDashboard && (
            <button
              type="button"
              className="welcome-back-btn"
              onClick={onBackToDashboard}
            >
              ← Dashboard
            </button>
          )}
          <span className="welcome-nav-note">A space to try, at your pace.</span>
        </div>
      </header>

      <section className="welcome-hero" aria-labelledby="welcome-title">
        <div className="welcome-intro">
          <h1 id="welcome-title" ref={titleRef} tabIndex={-1}>
            Rehearse
            <br />
            the Journey
          </h1>
          <p>
            Everyday conversations can feel a little easier with a little practice. Try them with
            Joy, one step at a time.
          </p>
          <ul className="welcome-reassurances" aria-label="You’re in control">
            <li>
              <MessageCircle aria-hidden="true" />
              Speak or type
            </li>
            <li>
              <Pause aria-hidden="true" />
              Pause whenever you need
            </li>
          </ul>
        </div>
        <div className="welcome-companion">
          <div className="welcome-companion-backdrop" aria-hidden="true" />
          <div className="welcome-duo flex items-end justify-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center">
              <JoyMascot
                state="speaking"
                persona="joy"
                facing="right"
                companionLabel="Joy, your rehearsal companion"
                reduceMotion={reduceMotion || stopAuto}
                className="welcome-joy"
              />
              <span className="mt-1 rounded-full bg-lavender/40 px-2.5 py-0.5 text-[11px] font-semibold">
                Receptionist Joy
              </span>
            </div>
            <div className="flex flex-col items-center">
              <JoyMascot
                state="listening"
                persona="amani"
                facing="left"
                companionLabel="Amani, practice conversation partner"
                reduceMotion={reduceMotion || stopAuto}
                className="welcome-joy welcome-partner-joy"
              />
              <span className="mt-1 rounded-full bg-sage/40 px-2.5 py-0.5 text-[11px] font-semibold">
                Visitor Amani
              </span>
            </div>
          </div>
          <p className="welcome-greeting mt-2">
            Hi, we’re Joy &amp; Amani.
            <br />
            <strong>Let’s rehearse the conversation together.</strong>
          </p>
        </div>
      </section>

      <section className="welcome-scenarios" aria-labelledby="scenario-heading">
        <div className="welcome-section-heading">
          <h2 id="scenario-heading">Where shall we start?</h2>
          <p>Choose a conversation to practice.</p>
        </div>
        <div className="scenario-layout" role="group" aria-label="Practice scenarios">
          <Button
            variant="scenario"
            onClick={() => onStartScenario('hospital', chaosLevel)}
            className="scenario-start"
          >
            <span className="scenario-symbol">
              <Cross aria-hidden="true" />
            </span>
            <span className="scenario-start-copy">
              <span className="scenario-level">{LEVEL_LABELS[chaosLevel].title}</span>
              <span className="scenario-title">Hospital Reception</span>
              <span className="scenario-description">
                Practice arriving, asking for help, and talking to a friendly receptionist.
              </span>
            </span>
            <span className="scenario-action">
              Start practice <Play aria-hidden="true" data-icon="inline-end" />
            </span>
          </Button>
          <div className="scenario-previews">
            <p className="scenario-preview-heading">More everyday journeys (Pipecat Flows)</p>
            {SCENARIOS.slice(1).map(s => (
              <Button
                key={s.id}
                variant="preview"
                onClick={() => onStartScenario(s.id, chaosLevel)}
                className="scenario-preview"
              >
                <span className="scenario-preview-icon">
                  <s.icon aria-hidden="true" />
                </span>
                <span>{s.name}</span>
                <span className="scenario-coming">{s.level}</span>
              </Button>
            ))}
          </div>
        </div>
        <div
          className="mt-5 flex flex-wrap items-center gap-2 text-xs"
          role="group"
          aria-label="Practice difficulty level"
        >
          <span className="font-semibold opacity-75">Level:</span>
          {([1, 2, 3, 4] as const).map(lvl => (
            <button
              key={lvl}
              type="button"
              aria-pressed={chaosLevel === lvl}
              onClick={() => onSelectChaosLevel(lvl)}
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
      {error && (
        <p role="alert" className="welcome-error">
          {error}
        </p>
      )}
      <footer className="welcome-footer">
        <MicOff aria-hidden="true" />
        <p>Your microphone starts off. This is fictional practice with AI; use made-up details.</p>
      </footer>
    </main>
  )
}
