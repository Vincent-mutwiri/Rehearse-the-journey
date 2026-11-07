/**
 * Dashboard — the landing page with section cards.
 *
 * The person picks a section; each opens its own experience.
 * Joy stays as the mascot throughout (shown in JoyCenterpiece).
 */

import { Sprout, Navigation, HeartPulse, ArrowRight } from 'lucide-react'
import JoyMascot from './JoyMascot'

export type DashboardSection =
  | 'simulations'
  | 'directions'
  | 'wellness'

export interface DashboardProps {
  onSelect: (section: DashboardSection) => void
  reduceMotion?: boolean
}

const SECTIONS: Array<{
  id: DashboardSection
  title: string
  description: string
  icon: typeof Sprout
  accent: string
}> = [
  {
    id: 'simulations',
    title: 'Simulations',
    description: 'Practise conversations with Joy & Amani — hospital, matatu, government office. Pick a scenario and rehearse.',
    icon: Sprout,
    accent: 'lavender',
  },
  {
    id: 'directions',
    title: 'Get Directions',
    description: 'Enter where you want to go. See the route on a real map, step by step. Candidate path — confirm with your co-designer.',
    icon: Navigation,
    accent: 'sage',
  },
  {
    id: 'wellness',
    title: 'Wellness',
    description: 'Check in with yourself. Pick a mood, try a grounding exercise, hear an encouraging word from Joy.',
    icon: HeartPulse,
    accent: 'peach',
  },
]

export default function Dashboard({ onSelect, reduceMotion = false }: DashboardProps) {
  return (
    <section className="dashboard-grid" aria-label="Choose a section">
      <div className="mx-auto flex flex-col items-center gap-2 text-center">
        <div
          className="joy-centerpiece-stage"
          data-duo-stage="true"
        >
          <div className="joy-stage-backdrop" aria-hidden="true" />
          <div className="joy-duo-row flex items-end justify-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center">
              <JoyMascot
                state="speaking"
                persona="joy"
                facing="right"
                companionLabel="Joy, your rehearsal companion"
                reduceMotion={reduceMotion}
                className="joy-duo-mascot"
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
                reduceMotion={reduceMotion}
                className="joy-duo-mascot"
              />
              <span className="mt-1 rounded-full bg-sage/40 px-2.5 py-0.5 text-[11px] font-semibold">
                Visitor Amani
              </span>
            </div>
          </div>
          <span className="joy-status-pill mt-2" aria-hidden="true">
            💬 Joy &amp; Amani rehearsing together
          </span>
        </div>
        <h2 className="dashboard-heading mt-1">What would you like to do?</h2>
        <p className="dashboard-subtitle">
          Pick a section to start. Joy &amp; Amani are here with you the whole way.
        </p>
      </div>
      <div className="dashboard-cards" role="group">
        {SECTIONS.map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              className={`dashboard-card dashboard-card-${s.accent}`}
              onClick={() => onSelect(s.id)}
              aria-label={s.title}
            >
              <span className="dashboard-card-icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="dashboard-card-body">
                <span className="dashboard-card-title">{s.title}</span>
                <span className="dashboard-card-desc">{s.description}</span>
              </span>
              <span className="dashboard-card-action">
                Start <ArrowRight aria-hidden="true" />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
