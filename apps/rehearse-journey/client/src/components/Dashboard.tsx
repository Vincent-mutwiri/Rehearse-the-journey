/**
 * Dashboard — the landing page with section cards.
 *
 * The person picks a section; each opens its own experience.
 * Joy stays as the mascot throughout (shown in JoyCenterpiece).
 */

import { Sprout, Navigation, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react'
import JoyMascot from './JoyMascot'
import type { PersonaProfileId } from '@/rehearsalToolkit'
import { PersonaWorkspaceCallout } from '@/presentation/PersonaLogin'

export type DashboardSection =
  | 'simulations'
  | 'stories'
  | 'directions'

export interface DashboardProps {
  onSelect: (section: DashboardSection) => void
  reduceMotion?: boolean
  personaId?: PersonaProfileId
  showPersonaCallout?: boolean
}

interface SectionCardDef {
  id: DashboardSection
  title: string
  stepBadge?: string
  sensoryBadge?: string
  description: string
  icon: typeof Sprout
  accent: string
}

const STANDARD_SECTIONS: SectionCardDef[] = [
  {
    id: 'simulations',
    title: 'Practice Arena',
    description: 'Practise conversations with Joy & Amani — hospital, matatu, government office. Pick a scenario and rehearse.',
    icon: Sprout,
    accent: 'lavender',
  },
  {
    id: 'directions',
    title: 'Get Directions',
    description: 'Enter where you want to go. See the route on a real map, how the place looks, key landmarks, crowd busyness, noise levels, and live weather.',
    icon: Navigation,
    accent: 'sage',
  },
]

const ZAWADI_SECTIONS: SectionCardDef[] = [
  {
    id: 'simulations',
    title: 'Practice Arena',
    sensoryBadge: '🟢 Calm 1-on-1 · Mic Starts OFF · No Timers',
    description: 'Practise a gentle, predictable conversation with Receptionist Joy at Level 1 (Easy Start). Pause or decompress at any moment.',
    icon: Sprout,
    accent: 'sage',
  },
  {
    id: 'directions',
    title: 'Get Directions',
    sensoryBadge: '🌿 Quiet Hours & Sensory Crowd Forecast',
    description: 'Check quiet visiting hours, estimated crowd noise (dB), weather comfort, and plain-English route steps before you leave home.',
    icon: Navigation,
    accent: 'sage',
  },
]

const KAMAU_SECTIONS: SectionCardDef[] = [
  {
    id: 'stories',
    title: 'Visual Stories & Maps',
    stepBadge: 'Step 1 · See the Place First',
    description: 'Step through visual story cards and the hospital floor-plan map before starting a conversation.',
    icon: BookOpen,
    accent: 'peach',
  },
  {
    id: 'simulations',
    title: 'Practice Arena',
    stepBadge: 'Step 2 · Practise with 1-Tap Chips',
    description: 'Practise talking with Joy using tap-to-send starter phrases and an open visual floor map beside you.',
    icon: Sprout,
    accent: 'lavender',
  },
  {
    id: 'directions',
    title: 'Get Directions',
    stepBadge: 'Step 3 · Landmark Route Steps',
    description: 'Read numbered, plain-English route directions with bold word-anchors, matatu stages, and clear landmarks.',
    icon: Navigation,
    accent: 'sage',
  },
]

export default function Dashboard({
  onSelect,
  reduceMotion = false,
  personaId = 'baraka',
  showPersonaCallout = false,
}: DashboardProps) {
  const sections =
    personaId === 'zawadi'
      ? ZAWADI_SECTIONS
      : personaId === 'kamau'
        ? KAMAU_SECTIONS
        : STANDARD_SECTIONS

  const headingText =
    personaId === 'zawadi'
      ? 'Welcome, Zawadi. Take this at your own calm pace.'
      : personaId === 'kamau'
        ? 'Kamau’s Step-by-Step Journey Workspace'
        : 'What would you like to do?'

  const subtitleText =
    personaId === 'zawadi'
      ? 'All 3D motion and auto-timers are paused for you. Pick one calm activity below whenever you feel ready.'
      : personaId === 'kamau'
        ? 'Short sentences, bold word-anchors, and visual floor maps are active. Follow the 3 numbered steps below:'
        : 'Pick a section to start. Joy & Amani are here with you the whole way.'

  return (
    <section className="dashboard-grid space-y-6" aria-label="Choose a section">
      {showPersonaCallout && (
        <PersonaWorkspaceCallout
          activePersonaId={personaId}
          context="dashboard"
          onOpenStoryMap={() => onSelect('stories')}
        />
      )}
      <div className="mx-auto flex flex-col items-center gap-2 text-center">
        <div
          className="joy-centerpiece-stage"
          data-duo-stage="true"
        >
          <div className="joy-stage-backdrop" aria-hidden="true" />
          <div className="joy-duo-row flex items-end justify-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center">
              <JoyMascot
                state={personaId === 'zawadi' ? 'idle' : 'speaking'}
                persona="joy"
                facing="right"
                behindDesk
                companionLabel="Joy, your rehearsal companion"
                reduceMotion={reduceMotion || personaId === 'zawadi'}
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
                reduceMotion={reduceMotion || personaId === 'zawadi'}
                className="joy-duo-mascot"
              />
              <span className="mt-1 rounded-full bg-sage/40 px-2.5 py-0.5 text-[11px] font-semibold">
                Visitor Amani
              </span>
            </div>
          </div>
          <span className="joy-status-pill ai4a11y-bionic mt-2" aria-hidden="true">
            {personaId === 'zawadi'
              ? '🌿 Calm Sanctuary Mode · Still & Predictable'
              : personaId === 'kamau'
                ? '📖 Structured Focus Mode · Visual Maps & Word-Anchors'
                : '💬 Joy & Amani rehearsing together'}
          </span>
        </div>
        <h2 className="dashboard-heading mt-1">{headingText}</h2>
        <p className="dashboard-subtitle">{subtitleText}</p>
      </div>
      <div className="dashboard-cards" role="group">
        {sections.map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              className={`dashboard-card dashboard-card-${s.accent}`}
              onClick={() => onSelect(s.id)}
              aria-label={s.title}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="dashboard-card-icon" aria-hidden="true">
                  <Icon />
                </span>
                {s.stepBadge && (
                  <span className="rounded-full border border-ink/20 bg-white px-3 py-1 text-xs font-bold text-ink">
                    {s.stepBadge}
                  </span>
                )}
                {s.sensoryBadge && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#6b9e82] bg-white px-2.5 py-1 text-[11px] font-bold text-ink">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.sensoryBadge}
                  </span>
                )}
              </div>
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
