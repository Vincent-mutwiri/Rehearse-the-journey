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

// StopAutoAdvance pauses any playing <audio>/<video> it finds — and the
// bot's voice is a plain <audio> element (PipecatClientAudio). An
// accessibility preference must never still the rehearsal's own voice, so
// after enabling we hand AUDIO elements back: anything the adapter already
// paused is resumed and untracked, and an element still loading (the
// adapter pauses those later, on 'playing') is started again once.
export function enableStopAutoAdvance() {
  StopAutoAdvance.enable()
  handBackBotAudio()
}

function handBackBotAudio() {
  const paused: Set<HTMLMediaElement> | undefined = StopAutoAdvance.pausedMedia
  if (paused) {
    for (const el of Array.from(paused)) {
      if (!el || el.tagName !== 'AUDIO') continue
      paused.delete(el)
      try { void el.play()?.catch?.(() => {}) } catch { /* autoplay policy */ }
    }
  }
  document.querySelectorAll('audio').forEach((el) => {
    if (!el.paused) return
    el.addEventListener('playing', function resume() {
      try { void el.play()?.catch?.(() => {}) } catch { /* already playing */ }
    }, { once: true })
  })
}

// The toolkit's simplify-text adapter rewrites page text through an AI
// provider; the demo has no provider key, so this deterministic table does
// the same job for the fixture's fixed strings — the same reversible
// "Show original" pattern, with no model call and no pretense.
export const ORIGINAL_STEP_TEXT =
  'During this rehearsal you will interact with Receptionist Joy at the front desk ' +
  'of a fictional hospital. You will be asked to present a National ID or clinic ' +
  'registration card and to state the reason for your visit. The exchange follows ' +
  'a fixed sequence and will not proceed until you choose to continue.'

const SIMPLE_STEP_TEXT =
  'You will talk to the receptionist at a practice hospital. Have your ID or ' +
  'clinic card ready, and say why you are visiting. The chat goes one step at ' +
  'a time — nothing moves on until you say so.'

export function simplifyStepText(text: string): string {
  return text === ORIGINAL_STEP_TEXT ? SIMPLE_STEP_TEXT : text
}
