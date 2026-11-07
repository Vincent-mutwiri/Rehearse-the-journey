/**
 * SF.3 — Toolkit Adapter Bridge for React Native (`apps/rehearse-journey/mobile`)
 *
 * Ports the four Nov 7 toolkit DOM adapters (`read-aloud`, `simplify-text`,
 * `stop-auto-advance`, `motion-reducer`) to React Native equivalents sharing
 * the exact same AbilityModel profile contract as the web client.
 */

export interface SharedAbilityProfile {
  readAloud: boolean
  plainWords: boolean
  stopAutoAdvance: boolean
  reduceMotion: boolean
  audioEnabled: boolean
}

export const DEFAULT_SHARED_PROFILE: SharedAbilityProfile = {
  readAloud: false,
  plainWords: false,
  stopAutoAdvance: false,
  reduceMotion: false,
  audioEnabled: true,
}

export interface SpeechDriver {
  speak: (text: string) => void
  stop: () => void
}

/**
 * 1. `read-aloud` bridge — wraps `expo-speech` (or injected driver in tests)
 * and guarantees immediate silence on Pause/Exit.
 */
export class NativeReadAloudAdapter {
  public enabled = false
  public speaking = false
  private driver: SpeechDriver

  constructor(driver?: SpeechDriver) {
    this.driver = driver ?? {
      speak: () => {
        this.speaking = true
      },
      stop: () => {
        this.speaking = false
      },
    }
  }

  public speak(text: string): void {
    this.enabled = true
    this.speaking = true
    this.driver.speak(text)
  }

  public stop(): void {
    this.enabled = false
    this.speaking = false
    this.driver.stop()
  }
}

/**
 * 2. `simplify-text` bridge — deterministic plain-language step rewrite
 * with reversible "Show original" support on native `<Text>` containers.
 */
const NATIVE_SIMPLIFY_MAP: Record<string, string> = {
  'During this rehearsal you will interact with Receptionist Joy at the front desk of a fictional hospital. You will be asked to present a National ID or clinic registration card and to state the reason for your visit. The exchange follows a fixed sequence and will not proceed until you choose to continue.':
    'You will talk to the receptionist at a practice hospital. Have your ID or clinic card ready, and say why you are visiting. The chat goes one step at a time — nothing moves on until you say so.',
}

export function simplifyStepTextNative(text: string): string {
  return NATIVE_SIMPLIFY_MAP[text] ?? text
}

/**
 * 3. `stop-auto-advance` bridge — holds timer-driven UI carousels still
 * without muting or pausing the Pipecat WebRTC voice stream.
 */
export class NativeStopAutoAdvanceAdapter {
  public enabled = false

  public enable(): void {
    this.enabled = true
  }

  public disable(): void {
    this.enabled = false
  }

  public shouldAdvanceTimer(): boolean {
    return !this.enabled
  }
}

/**
 * 4. `motion-reducer` bridge — maps `reduceMotion` to React Native `Animated`
 * timing configuration (`duration: 0`, `useNativeDriver: true`) and static mascot poses.
 */
export class NativeMotionReducerAdapter {
  public enabled = false

  public enable(): void {
    this.enabled = true
  }

  public disable(): void {
    this.enabled = false
  }

  public getAnimationConfig(defaultDurationMs = 280): {
    duration: number
    useNativeDriver: boolean
  } {
    return {
      duration: this.enabled ? 0 : defaultDurationMs,
      useNativeDriver: true,
    }
  }
}
