import { Component, lazy, Suspense, useSyncExternalStore, type ReactNode } from 'react'

export type JoyState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'paused' | 'ended'
export interface JoyMascotProps {
  state: JoyState
  encourageSignal?: number
  reduceMotion?: boolean
  className?: string
}
const JoyScene = lazy(() => import('./JoyScene'))
const motionQuery = '(prefers-reduced-motion: reduce)'
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(motionQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches
function Placeholder() { return <span className="joy-placeholder">Joy</span> }
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Placeholder /> : this.props.children }
}
export default function JoyMascot({ state, encourageSignal = 0, reduceMotion = false, className = '' }: JoyMascotProps) {
  const systemReducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true)
  const still = reduceMotion || systemReducedMotion || state === 'paused' || state === 'ended'
  return (
    <div role="img" aria-label={`Joy, your rehearsal companion — ${state}`}
      data-state={state} data-motion={still ? 'still' : 'animated'} className={`joy ${className}`}>
      <SceneBoundary>
        <Suspense fallback={<Placeholder />}>
          <JoyScene state={state} encourageSignal={encourageSignal} still={still} />
        </Suspense>
      </SceneBoundary>
    </div>
  )
}
