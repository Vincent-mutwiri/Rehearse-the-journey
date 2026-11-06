// The Pipecat client reuses the toolkit's browser adapters directly. These
// imports stay deliberately narrow: no toolkit host, account, or AI key is
// needed for the local demo.
// @ts-expect-error The toolkit adapters are plain browser JavaScript modules.
import { ReadAloud } from '../../../../tools/adapters/read-aloud.js'
// @ts-expect-error The toolkit adapters are plain browser JavaScript modules.
import { StopAutoAdvance } from '../../../../tools/adapters/stop-auto-advance.js'
// @ts-expect-error The toolkit adapters are plain browser JavaScript modules.
import { MotionReducer } from '../../../../tools/adapters/motion-reducer.js'

export { ReadAloud, StopAutoAdvance, MotionReducer }

// The full toolkit simplify-text adapter requires an AI provider. Sprint 3's
// local fixture has no provider key, so this deterministic adapter demonstrates
// the same reversible preference effect without pretending to call a model.
export function simplifyStep(text: string, enabled: boolean): string {
  if (!enabled) return text
  return text
    .replace(/Receptionist Joy/gi, 'the receptionist')
    .replace(/fictional hospital/gi, 'practice hospital')
    .replace(/National ID or clinic registration card/gi, 'ID or clinic card')
    .replace(/Waiting Area B/gi, 'Waiting Area B')
}
