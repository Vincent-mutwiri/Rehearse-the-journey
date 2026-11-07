import { useReducedMotion } from '@/lib/use-reduced-motion'
import { Component, lazy, Suspense, type ReactNode } from 'react'
import JoyPlaceholder from './JoyPlaceholder'

export type JoyState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'paused' | 'ended'
export interface JoyMascotProps {
  state: JoyState
  encourageSignal?: number
  reduceMotion?: boolean
  className?: string
}
const JoyScene = lazy(() => import('./JoyScene'))
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <JoyPlaceholder /> : this.props.children }
}
export default function JoyMascot({ state, encourageSignal = 0, reduceMotion = false, className = '' }: JoyMascotProps) {
  const systemReducedMotion = useReducedMotion()
  const still = reduceMotion || systemReducedMotion || state === 'paused' || state === 'ended'
  return (
    <div role="img" aria-label={`Joy, your rehearsal companion — ${state}`}
      data-state={state} data-motion={still ? 'still' : 'animated'} className={`joy ${className}`}>
      <SceneBoundary>
        <Suspense fallback={<JoyPlaceholder />}>
          <JoyScene state={state} encourageSignal={encourageSignal} still={still} />
        </Suspense>
      </SceneBoundary>
    </div>
  )
}
