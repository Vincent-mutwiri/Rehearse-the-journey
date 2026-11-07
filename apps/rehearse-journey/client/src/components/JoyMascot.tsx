import { useReducedMotion } from '@/lib/use-reduced-motion'
import { Component, lazy, Suspense, type ReactNode } from 'react'
import JoyPlaceholder from './JoyPlaceholder'

export type JoyState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'paused' | 'ended'
export type JoyPersona = 'joy' | 'amani' | 'otieno' | 'wanjiku' | 'maina'
export interface JoyMascotProps {
  state: JoyState
  thinking?: boolean
  persona?: JoyPersona
  companionLabel?: string
  encourageSignal?: number
  reduceMotion?: boolean
  className?: string
}
const JoyScene = lazy(() => import('./JoyScene'))
class SceneBoundary extends Component<{ children: ReactNode; persona?: JoyPersona }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <JoyPlaceholder persona={this.props.persona} /> : this.props.children }
}
export default function JoyMascot({
  state,
  thinking = false,
  persona = 'joy',
  companionLabel = 'Joy, your rehearsal companion',
  encourageSignal = 0,
  reduceMotion = false,
  className = '',
}: JoyMascotProps) {
  const systemReducedMotion = useReducedMotion()
  const still = reduceMotion || systemReducedMotion || state === 'paused' || state === 'ended'
  return (
    <div
      role="img"
      aria-label={`${companionLabel} — ${thinking && state === 'idle' ? 'thinking' : state}`}
      data-state={state}
      data-thinking={thinking ? 'true' : 'false'}
      data-persona={persona}
      data-motion={still ? 'still' : 'animated'}
      className={`joy ${className}`}
    >
      <SceneBoundary persona={persona}>
        <Suspense fallback={<JoyPlaceholder persona={persona} />}>
          <JoyScene
            state={state}
            thinking={thinking}
            persona={persona}
            encourageSignal={encourageSignal}
            still={still}
          />
        </Suspense>
      </SceneBoundary>
    </div>
  )
}
