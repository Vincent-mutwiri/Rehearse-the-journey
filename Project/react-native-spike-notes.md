# SF.2 & SF.3 — React Native Client & Native Adapter Bridge Spike Notes

**Sprint:** SF.2 & SF.3 · **Status:** Completed & Verified  
**Implementation files:** `apps/rehearse-journey/mobile/package.json`, `apps/rehearse-journey/mobile/src/nativeAdapters.ts`, `apps/rehearse-journey/mobile/src/MobileRehearsalScreen.tsx`

---

## 1. React Native Client Architecture (`@pipecat-ai/client-react-native`)

The mobile client connects to the **exact same Python Pipecat backend (`localhost:7860` / LAN IP `/api/offer`)** over SmallWebRTC while sharing the deterministic controller (`RehearsalApprovalController`) and `AbilityModel` profile contract with the web client:

- **Transport:** `@pipecat-ai/react-native-small-webrtc-transport` (`SmallWebRTCTransport` with `webrtcRequestParams: { endpoint: 'http://<host>:7860/api/offer' }`).
- **Safeguarding defaults:** `enableMic: false`, `enableCam: false` on startup; explicit Pause and Exit native buttons always visible at the bottom of the screen; typed `TextInput` always available alongside voice.

---

## 2. Toolkit Adapter Bridge for React Native (`mobile/src/nativeAdapters.ts`)

Because the web toolkit adapters (`tools/adapters/*.js`) manipulate browser DOM nodes, `mobile/src/nativeAdapters.ts` wraps the same four accessibility adaptations for React Native primitives (`Text`, `Pressable`, `Animated`, `expo-speech`) driven by the same `AbilityProfile` preferences:

| Toolkit Adapter | Web Implementation (`tools/adapters/`) | React Native Bridge (`mobile/src/nativeAdapters.ts`) |
|---|---|---|
| `read-aloud` | `window.speechSynthesis` speaking page narration | `ExpoSpeechReadAloudAdapter` (`expo-speech` `Speech.speak` / `Speech.stop`, halted immediately on Pause/Exit) |
| `simplify-text` | Rewrites step card text with reversible toggle | `simplifyStepTextNative` + `showOriginal` toggle on native `<Text>` step cards |
| `stop-auto-advance` | Pauses timer carousels while leaving WebRTC audio live | `NativeStopAutoAdvanceAdapter` freezes rotating tip timers without muting Pipecat WebRTC audio tracks |
| `motion-reducer` | Sets zero-duration CSS transitions + freezes R3F loop | `NativeMotionReducerAdapter` sets `Animated` duration to `0ms` and halts mascot pose interpolation |

---

## 3. Gotchas Recorded

1. **Physical device LAN SDP exchange:** On a physical Android/iOS phone, `localhost:7860` refers to the handset. Configure `EXPO_PUBLIC_BOT_URL=http://<laptop-lan-ip>:7860/api/offer` on the same Wi-Fi network.
2. **Half-duplex speech:** Just like on web, pausing native STT while Joy's TTS audio track is playing prevents speaker-to-mic acoustic echo on phones without headset mics.
