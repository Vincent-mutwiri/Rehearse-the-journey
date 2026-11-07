# SD.1 — Multimodal Camera Transport & "Explain This Sign" Spike Notes

**Sprint:** SD.1–SD.4 · **Status:** Completed & Verified  
**Implementation files:** `apps/rehearse-journey/bot/vision.py`, `apps/rehearse-journey/bot/bot.py`, `apps/rehearse-journey/client/src/App.tsx`

---

## 1. SmallWebRTC Video Track & Transport Wiring

- In `apps/rehearse-journey/bot/bot.py`, `SmallWebRTCTransport` configures `TransportParams`:
  ```python
  TransportParams(
      audio_in_enabled=provider != "text_only",
      audio_out_enabled=provider != "text_only",
      audio_in_stream_on_start=False,
      video_in_enabled=camera_enabled or mode == "live-help",
  )
  ```
- On the React client (`App.tsx`), `PipecatClient` initializes with `enableMic: false` and `enableCam: false` so neither microphone nor camera starts without explicit opt-in.

---

## 2. Per-Session Approval-Gated Camera Consent (SD.3 & SD.4)

1. **Approval Gate:** Clicking **Request Camera Consent (Approve/Deny)** in Live help mode calls `approvalController.proposeEnableCamera()`, which displays the approval card:
   > *"Joy wants to use your camera for Live help ("Explain this sign") — approve or deny?"*
2. **Deny = Stay Off:** Denying the proposal keeps `cameraConsent = false` while leaving the voice and typed session running uninterrupted.
3. **Camera & Audio Independence:**
   - Microphone and camera have completely independent toggles.
   - Turning the camera off mid-session (`Turn Camera Off (Voice & Typed Continue)`) keeps voice and typed chat active.
   - Turning both camera and mic off leaves the typed input as the guaranteed alternative.
   - Refreshing the page or ending the session (`stopSession('ended')`) clears `cameraConsent` so consent is strictly per-session.
4. **Dev-Only Frame Overlay:** A toggleable `"What am I seeing?" debug frame` preview displays the exact sign text frame currently being processed.

---

## 3. Strict Non-Navigation Safety Boundary (PRD §2.2 US-4 / §4.5)

The safety boundary is enforced in all three places required by SD.4:
1. **System Prompt (`VISION_SYSTEM_PROMPT` in `bot/vision.py`):**
   > *"You are explaining a visible sign in plain language. You are not detecting obstacles, reading the person's location, or giving navigation advice. If you can't see the sign clearly, say so. Always remind the person: 'Explanation only; confirm with staff or signage.'"*
2. **React UI (`App.tsx` Live help banner & sign cards):**
   > *"Safety boundary: Explanation only; confirm with staff or signage. Never used for obstacle detection, location truth, or navigation advice."*
3. **Unclear / Blurred Sign Handling (`unclear_blur` fixture):**
   When a sign is blurred or angled, Joy explicitly declines to guess and advises asking a staff member nearby. Both standard and `simplify-text` ("Plainer words") explanations are supported.
