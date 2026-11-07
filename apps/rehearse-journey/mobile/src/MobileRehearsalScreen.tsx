/**
 * SF.2 — React Native Companion Screen (`apps/rehearse-journey/mobile`)
 *
 * Connects to the same Python Pipecat backend (`/api/offer` over SmallWebRTC)
 * and shares `RehearsalApprovalController` + `SharedAbilityProfile` with web.
 */

import {
  DEFAULT_SHARED_PROFILE,
  NativeMotionReducerAdapter,
  NativeReadAloudAdapter,
  NativeStopAutoAdvanceAdapter,
  simplifyStepTextNative,
  type SharedAbilityProfile,
} from './nativeAdapters'
import { RehearsalApprovalController } from '../../client/src/controller/approvalController'

export interface MobileSessionViewModel {
  botEndpoint: string
  profile: SharedAbilityProfile
  controller: RehearsalApprovalController
  readAloudAdapter: NativeReadAloudAdapter
  stopAutoAdapter: NativeStopAutoAdvanceAdapter
  motionAdapter: NativeMotionReducerAdapter
  applyProfileUpdate: (patch: Partial<SharedAbilityProfile>) => SharedAbilityProfile
  getStepText: (rawText: string, showOriginal?: boolean) => string
}

export function createMobileSessionViewModel(
  botEndpoint = 'http://127.0.0.1:7860/api/offer',
): MobileSessionViewModel {
  let profile: SharedAbilityProfile = { ...DEFAULT_SHARED_PROFILE }
  const controller = new RehearsalApprovalController()
  const readAloudAdapter = new NativeReadAloudAdapter()
  const stopAutoAdapter = new NativeStopAutoAdvanceAdapter()
  const motionAdapter = new NativeMotionReducerAdapter()

  function applyProfileUpdate(patch: Partial<SharedAbilityProfile>): SharedAbilityProfile {
    profile = { ...profile, ...patch }
    if (profile.stopAutoAdvance) stopAutoAdapter.enable()
    else stopAutoAdapter.disable()

    if (profile.reduceMotion) motionAdapter.enable()
    else motionAdapter.disable()

    if (!profile.readAloud) readAloudAdapter.stop()
    return { ...profile }
  }

  function getStepText(rawText: string, showOriginal = false): string {
    if (profile.plainWords && !showOriginal) {
      return simplifyStepTextNative(rawText)
    }
    return rawText
  }

  return {
    botEndpoint,
    get profile() {
      return profile
    },
    controller,
    readAloudAdapter,
    stopAutoAdapter,
    motionAdapter,
    applyProfileUpdate,
    getStepText,
  }
}
