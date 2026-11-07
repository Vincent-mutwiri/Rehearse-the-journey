/**
 * Wellness — a calm check-in space.
 *
 * Pick a mood, try a grounding exercise, hear an encouraging word from Joy.
 * Not a therapy tool — a warm-up companion before a journey.
 */

import { useState } from 'react'
import { Heart, Wind, Repeat, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface WellnessProps {
  onBack: () => void
}

const MOODS = [
  { id: 'calm', label: 'Calm', emoji: '😌' },
  { id: 'anxious', label: 'A bit anxious', emoji: '😟' },
  { id: 'excited', label: 'Excited', emoji: '😊' },
  { id: 'tired', label: 'Tired', emoji: '😪' },
  { id: 'confident', label: 'Confident', emoji: '💪' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😵‍💫' },
]

const ENCOURAGEMENTS: Record<string, string> = {
  calm: 'You\'re feeling calm — that\'s a great place to start. Let\'s keep that feeling going.',
  anxious: 'It\'s okay to feel anxious. Joy is here with you. Take a breath — you\'ve got this.',
  excited: 'Love that energy! Let\'s channel it into something good.',
  tired: 'You\'re tired and that\'s okay. Let\'s take it one small step at a time.',
  confident: 'You\'re feeling confident — let\'s build on that. You\'re ready.',
  overwhelmed: 'When it\'s a lot, one step at a time helps. Joy is here. Let\'s start small.',
}

const BREATHING_STEPS = [
  'Breathe in slowly… count 1, 2, 3, 4.',
  'Hold it gently… 1, 2.',
  'Breathe out slowly… 1, 2, 3, 4, 5, 6.',
  'Rest a moment. You\'re doing great.',
]

const GROUNDING_54321 = [
  'Name 5 things you can see around you.',
  'Name 4 things you can touch.',
  'Name 3 things you can hear.',
  'Name 2 things you can smell.',
  'Name 1 thing you can taste or are grateful for.',
]

export default function Wellness({ onBack }: WellnessProps) {
  const [mood, setMood] = useState<string | null>(null)
  const [exercise, setExercise] = useState<'breathing' | 'grounding' | null>(null)
  const [step, setStep] = useState(0)

  const activeExercise = exercise === 'breathing' ? BREATHING_STEPS : exercise === 'grounding' ? GROUNDING_54321 : []
  const isLastStep = step >= activeExercise.length - 1

  return (
    <section className="wellness-section" aria-label="Wellness check-in">
      <header className="wellness-header">
        <div className="wellness-header-row">
          <Button variant="outline" size="sm" className="rounded-full wellness-back-btn" onClick={onBack}>
            <ArrowLeft aria-hidden="true" /> Back to dashboard
          </Button>
          <h2 className="wellness-title">How are you feeling today?</h2>
        </div>
      </header>

      {/* Mood picker */}
      <div className="wellness-moods" role="group" aria-label="Pick your mood">
        {MOODS.map(m => (
          <button
            key={m.id}
            type="button"
            className={`wellness-mood${mood === m.id ? ' is-selected' : ''}`}
            onClick={() => { setMood(m.id); setExercise(null); setStep(0) }}
            aria-pressed={mood === m.id}
          >
            <span className="wellness-mood-emoji" aria-hidden="true">{m.emoji}</span>
            <span className="wellness-mood-label">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Encouragement from Joy */}
      {mood && (
        <div className="wellness-encouragement" role="note">
          <Heart aria-hidden="true" />
          <p>{ENCOURAGEMENTS[mood]}</p>
        </div>
      )}

      {/* Exercise picker */}
      {mood && !exercise && (
        <div className="wellness-exercises">
          <h3 className="wellness-exercise-prompt">Want to try a quick grounding exercise?</h3>
          <div className="wellness-exercise-buttons">
            <Button variant="outline" className="rounded-xl" onClick={() => { setExercise('breathing'); setStep(0) }}>
              <Wind aria-hidden="true" /> Breathing (4-2-6)
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => { setExercise('grounding'); setStep(0) }}>
              <Heart aria-hidden="true" /> 5-4-3-2-1 grounding
            </Button>
          </div>
        </div>
      )}

      {/* Active exercise */}
      {exercise && (
        <div className="wellness-active-exercise" aria-live="polite">
          <h3 className="wellness-exercise-title">
            {exercise === 'breathing' ? 'Breathing' : '5-4-3-2-1 Grounding'}
          </h3>
          <p className="wellness-step-text">{activeExercise[step]}</p>
          <div className="wellness-step-nav">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            <span className="wellness-step-dots" aria-hidden="true">
              {activeExercise.map((_, i) => (
                <span key={i} className={`wellness-dot${i === step ? ' is-active' : ''}`} />
              ))}
            </span>
            {isLastStep ? (
              <Button size="sm" className="rounded-full" onClick={() => { setExercise(null); setStep(0) }}>
                Done <Repeat aria-hidden="true" />
              </Button>
            ) : (
              <Button size="sm" className="rounded-full" onClick={() => setStep(s => s + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}