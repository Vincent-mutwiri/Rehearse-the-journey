/**
 * Dashboard — the landing page with section cards.
 *
 * The person picks a section; each opens its own experience.
 * Joy stays as the mascot throughout (shown in JoyCenterpiece).
 */

import { Sprout, Navigation, HeartPulse, Map, Camera, Mic, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type DashboardSection =
  | 'simulations'
  | 'directions'
  | 'wellness'

export interface DashboardProps {
  onSelect: (section: DashboardSection) => void
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
    description: 'Practise conversations with Joy — hospital, matatu, government office. Pick a scenario and rehearse.',
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

export default function Dashboard({ onSelect }: DashboardProps) {
  return (
    <section className="dashboard-grid" aria-label="Choose a section">
      <h2 className="dashboard-heading">What would you like to do?</h2>
      <p className="dashboard-subtitle">
        Pick a section to start. Joy is here with you the whole way.
      </p>
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