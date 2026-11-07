# Rehearse the Journey — Pipecat Nov 7 Demo Sprint

**Status:** Draft for Vin · **Pivot decision:** Fri Nov 6, 2026
**Demo:** Sat Nov 7, 08:00–23:00, Senses Hub, Nairobi (demo machine: Linux + Chrome)
**Direction:** Move the conversation-practice core from the scripted Kioo Companion prototype (`Project/prototype.md`) to a real voice agent on **Pipecat**, keeping the React + toolkit accessibility/consent layer that's already designed in `Project/PRD.md` and `Project/rehearse-journey-implementation-plan.md`.

> This plan narrows the PRD hard for the demo. It is honest about what ships and what does not. The full PRD remains the north star; the v1.1 Pipecat migration picks up everything de-scoped here.

---

## 0. The decision, stated plainly

Pipecat is the right tool for the **spoken role-play** half of this project — real-time voice, barge-in, structured Flows, multi-agent handoff for chaos levels. It does **not** replace the React controller, the AbilityModel profile, the tool-approval gate, or the toolkit DOM adapters. Those stay JS/React-native. So the architecture is hybrid:

- **Pipecat (Python) owns the spoken conversation** for the current step.
- **React (TypeScript) owns the journey, the approvals, the preferences, and the accessibility adaptations.**
- A typed role-play input is always available in React, independent of Pipecat — so the demo degrades gracefully if voice fails.

This is the only honest way to ship a Pipecat demo by tomorrow without throwing away the safeguarding story the PRD is built on.

---

## 1. Architecture for the demo

```
Browser (Chrome, demo machine): React + TS + Vite (from pipecat init)
  ├── Pipecat React client SDK          (RTVI → connects to the Python bot)
  ├── Controller                        (owns role-play state: idle|listening|speaking|paused|ended)
  ├── Approval gate                     (React-owned; approve/deny on advance + exit)
  ├── Toolkit adapters ×4              (read-aloud, simplify-text, stop-auto-advance, motion-reducer/confirm-actions)
  ├── AbilityModel + preference toggles (drive the adapters + the Pipecat system prompt)
  ├── Scenario/level selection UI       (reuse Kioo Companion selection as React state)
  └── Typed role-play input             (guaranteed alternative; sends text into the conversation)

Pipecat backend (Python, localhost:7860):
  ├── Transport: SmallWebRTC            (no Daily account needed for the local demo)
  ├── Gemini Live (speech-to-speech)    (GOOGLE_API_KEY from the hub GEMINI_API_KEY)
  │     OR  STT → LLM → TTS fallback    (Deepgram + Gemini/OpenAI + Cartesia/Google TTS)
  └── One Pipecat Flow                   (Receptionist Joy, hospital reception, Level 1)
```

One screen, one role-play, one character for the live demo. Multi-agent chaos levels and the full 7-stage flow are v1.1.

---

## 2. What ships Nov 7 (minimal viable demo)

1. **One spoken role-play works live, unaided, on the demo machine** — Receptionist Joy, hospital reception, Level 1, over SmallWebRTC. The co-designer drives it.
2. **Typed role-play is always available** as the guaranteed alternative — the demo still runs if the mic/voice fails.
3. **Pause stops audio immediately; Exit ends the session** — direct DOM controls, not chat commands.
4. **≥4 toolkit adapter effects are observable** from explicit preference toggles (the "use of toolkit" 20%).
5. **Scenario/level selection screen** shows the four Kioo Companion scenarios, with only hospital Level 1 live and the others honestly labelled "preview — coming in v1.1".
6. **Fictional journey is labelled fictional**; the co-designer's-real-journey PRD criterion is disclosed as unmet by the fixture.
7. **Repo deliverables:** working code, README + short write-up, demo video, ≥1 toolkit issue logged from co-designer testing.

## 3. What does NOT ship Nov 7 (v1.1 — be brutal)

> Full v1.1 build-out: see §9 — the sprints that take full advantage of Pipecat (Flows, multi-agent, multimodal, vendor-agnostic providers, the four-mode vision).

- Maps / Explore + Routes (the whole location layer) — v1.1 sprint SE.
- Multi-agent chaos levels (Level 4 = real handoff/fan-out, not a label swap) — v1.1 sprint SB.
- The 20-case approval suite — minimal approve/deny on advance + exit only for Nov 7.
- `save_checklist` + the full 7-stage flow — reduce to: pick scenario → set preferences → rehearse (spoken + typed) → pause/exit.
- Gemini Live ephemeral-token flow — use the simplest working transport; ephemeral tokens are v1.1.
- `@generative-a11y/ai-sdk` chat-stream pacing — use the toolkit `read-aloud` adapter for visual narration.
- Learn mode, NotebookLM, accounts, backend DB, profile inference, camera input — all v1.1 (sprint SD for camera).

If the clock runs out, drop S3 adapters last (they're the 20% differentiator); never drop Pause/Exit reliability (it's safeguarding).

---

## 4. Sprints (tonight + Sat AM)

Estimates are planning, not guarantees. Demo is 08:00 Sat. Freeze **2 h before** the confirmed presentation slot.

### S0 — Pipecat foundation + key check · Fri Nov 6 · DONE (with caveats)

**What was done:**
- [x] `uv` installed; Pipecat CLI installed (`uv tool install "pipecat-ai[cli]"`, `pipecat --version`).
- [x] Bot scaffolded with `pipecat init apps/rehearse-journey` — `bot/` (Python Pipecat) + `client/` (React + Vite + TS), SmallWebRTC transport, Gemini Live LLM option.
- [x] `uv add "pipecat-ai[google]"` — `google-genai` 2.34.0 installed (adds Gemini Live service).
- [x] `.env` configured: `OPENAI_API_KEY` (hub key, 35 chars), `GOOGLE_API_KEY` (Gemini key, 39 chars), `USE_GEMINI_LIVE=1` (switched to Gemini after OpenAI 401).
- [x] **Dropped `silero` extra** from `pyproject.toml` — it pulls `torch` (~800MB) which blocked `uv sync` for 51+ minutes. OpenAI STT does its own endpointing; server-side VAD is optional. The sync still took 51 min on the hub's slow network (opencv 59MB, llvmlite 57MB, av 33MB, onnxruntime 22MB at ~22 KB/s), but it completed. **Lock committed (`uv.lock`).**
- [x] **Fixed TypeScript error in `App.tsx`** — `params` is not a valid field on `PipecatClientOptions` (v1.11 API). Verified the actual type defs and the Pipecat runner source: SmallWebRTC SDP exchange is `POST /api/offer`. Fixed: `webrtcRequestParams: { endpoint: '/api/offer' }` on the `SmallWebRTCTransport`. Vite proxy already routes `/api` → `localhost:7860`. **Client builds clean** (`tsc --noEmit` + `vite build`: 632KB bundle, 183KB gzipped).
- [x] Incoming commits (rebased) added **Pipecat UI** (shadcn registry components) + Tailwind (`@tailwindcss/vite`) + an audio-control component. `pnpm install` syncs the new deps.

**What's NOT done (honest status):**
- **Both AI providers failed on the actual run.** The OpenAI path 401'd (`sk-43b40...aaba` is invalid); the Gemini Live path 1011'd ("Your prepayment credits are depleted"). The bot **boots, WebRTC connects, Joy's system prompt loads, the pipeline links correctly** — but the first real turn dies because there's no working AI key. **This is the S0 blocker.** The mechanics all work; the billing doesn't.

**Gate status:** 🟡 **Blocked on a working AI key.** The Pipecat + WebRTC + React stack is verified end-to-end except for the provider's API call. Unblocking = get a valid OpenAI key (switch `USE_GEMINI_LIVE=0`) **or** add billing to the Gemini AI Studio project **or** use a fresh key with free-tier credits.

---

### S1 — One Receptionist Joy role-play Flow · Fri Nov 6 / Sat Nov 7 · DONE (committed, merged to main)

**Commit `a6a82f3` — "Implement Sprint 1: Receptionist Joy role-play over Pipecat"** (merged to `main` via fast-forward; rebased onto the 2 incoming Pipecat-UI commits from origin).

**What was done:**
- [x] **`scenario.py`** — `JOY_SYSTEM_PROMPT`: Receptionist Joy, **fictional** Nairobi hospital, Level 1 (short predictable exchange). Plain language, two sentences max per turn, one question at a time, no markdown/emojis, no real ID/phone/health detail, never claims to book/register/save, never gives medical advice, never invents real hospital procedures/fees/doctors. The fiction label is in the prompt itself.
- [x] **`bot.py`** — backend wiring: `SmallWebRTCInputTransport` → `LLMUserAggregator` → `GeminiLiveLLMService` (or `OpenAILLMService`) → `SmallWebRTCOutputTransport` → `LLMAssistantAggregator`. RTVI carries typed input and transcripts through the **same session** as speech — one conversation, two input modes. Key-check fails fast with a readable message before heavy imports if a key is missing.
- [x] **`App.tsx`** — typed replies via `client.sendText()` (the guaranteed alternative to voice; mic not required). **Mic off by default** (`enableMic: false` in the `PipecatClient` constructor; explicit mic toggle in the UI). **Send-error recovery** — `RTVIEvent.Error` and `RTVIEvent.DeviceError` handlers surface a readable message instead of a silent hang. **Audio cleanup on Pause/Exit** — `stopSession` stops local + bot audio tracks and disconnects; a `useEffect` runs `disconnect()` on unmount so a navigation away doesn't leave audio playing.
- [x] Fictional fixture labelled in the UI (the `role="note"` notice: "Practice scenario — not a real hospital").

**What's NOT done (honest status):**
- [ ] **Spoken turn end-to-end is unverified** because the AI providers are down (see S0). The pipeline links correctly (`LLMUserAggregator#0 -> GeminiLiveLLMService#0 -> SmallWebRTCOutputTransport#0`) and Joy's system instruction composes correctly — the only failure is the provider's 401/1011, not our code.
- [ ] **Typed turn end-to-end is unverified** for the same reason — `sendText()` needs a working LLM behind it to produce a response.

**Gate status:** 🟡 **Code-complete, blocked on the provider key.** Everything that's in our control is done; the gate fails on something that isn't (a billed AI key). The moment a working key lands, S0+S1 are green — no further code changes needed to hear Joy speak.

### S2 — Controller + pause/exit + selection · tonight/Sat AM · ~2 h
- [x] React controller owns role-play state (`idle | listening | speaking | paused | ended`). Pipecat proposes; the controller decides. *(verified live 06:25: connect → `listening`)*
- [x] **Pause** aborts the Pipecat session and stops audio immediately (mute + end tracks). **Exit** ends the session. Both are DOM buttons, always visible, never buried in chat. *(verified live: Pause → `paused` + Send disabled; Exit → `ended`)*
- [x] Resume is explicit — it does not auto-restart the mic. *(Reconnect with mic off; mic stays off)*
- [x] Reuse the Kioo Companion scenario/level selection as React state. Show all four scenarios + level selector (`Hospital Reception`, `Matatu Stage`, `Government Service`, `Asking for Directions`).
- [x] Minimal approval gate: "Advance to next role-play turn?" approve/deny; "Exit rehearsal?" approve/deny. Deny = stay put. (`RehearsalApprovalController` in `client/src/controller/approvalController.ts` + full 20-case suite in `Project/approval-cases.md`.)
- [x] **Gate:** Pause stops audio instantly; Exit ends; Deny leaves you put; the selection screen routes to the chosen Flow.

### S3 — Toolkit adapters ×4 · Sat AM · ~1.5 h
- [x] Get the toolkit adapters usable from the scaffolded React client — import the adapter modules (`tools/adapters/`) or copy the specific files (`read-aloud.js`, `simplify-text.js`, `stop-auto-advance.js`, `motion-reducer.js` / `confirm-actions.js`) into the client `src`. Confirm the import/build path works (this is the JS/Python-bridge task).
      - Done 06:20: `client/src/toolkitAdapters.ts` imports `read-aloud.js`, `stop-auto-advance.js`, `motion-reducer.js` straight from `tools/adapters/` (Vite `server.fs.allow` added for dev; `pnpm build` clean). `simplify-text.js` needs an AI provider key the demo lacks, so a deterministic stand-in (`simplifyStepText` + `ORIGINAL_STEP_TEXT`) does the same reversible rewrite on the "What to expect" card — disclosed in code, no fake model call.
- [x] Wire ≥4 adapters to explicit preference toggles, each with an **observable** effect:
      - `read-aloud` — speaks the current step narration → speaks the page's own text (scenario notice + step card + status + Joy's latest turn) via `speechSynthesis`
      - `simplify-text` — rewrites the step text to plain language → "Plainer words" toggle + "Show original" button on the step card
      - `stop-auto-advance` — guarantees no timer-driven progression → holds still a rotating tips carousel (`tips-carousel`/`tip-slide`/`is-active`, 6 s timer)
      - `motion-reducer` — reduces animation / adds a confirm on exit → stops the pulsing status indicator's CSS animation (verified 1.6 s → 0.001 ms → restored)
- [x] Verify enabling/disabling a preference never defeats Pause (adapter toggle must not restart stopped media).
      - Done: `stopSession` calls `ReadAloud.stop()`; unmount disables all adapters. `enableStopAutoAdvance()` hands AUDIO elements back to the Pipecat client (`StopAutoAdvance.pausedMedia` untracked + `play()`), so the adapter cannot still Joy's `<audio>` voice. Verified in headless Chrome: carousel holds/resumes, motion CSS toggles, simplify reverses, read-aloud speaks and stops.
- [ ] Keyboard-only run + the co-designer's preferred AT (TalkBack/VoiceOver/Orca) on the demo device.
- [ ] **Gate:** four observable adapter effects from explicit preferences; removal restores; keyboard + AT work. (Adapter effects verified; keyboard/AT run still pending.)

### S4 — UI emergency: Soft mirror (Kioo companion) · Sat AM · ~1.5 h

**Goal:** give Joy a calm, friendly presence through the Soft mirror palette, a rigged 3D character, and conversation-driven gestures. The landing and rehearsal views share the same companion and existing session controller.

**Implementation status (Nov 7):** S4.1–S4.4 are implemented. Joy uses Three.js + React Three Fiber 8 with an original procedural rig, replacing the SVG mascot. TypeScript and the production build pass; Vite reports large-chunk warnings. Headless Chrome verifies the canvas, speaking/listening states, motion preferences, mic-off start, typed replies, send failure, pause, reconnect, and exit. S4.5 remains partially complete: keyboard-only navigation, browser accessibility-tree checks, and visualizer motion checks now pass. Orca’s desktop stop control is installed and the user confirms silence. Full Orca usability, physical-mic/live-voice verification, and co-designer acceptance remain open; OpenAI rejected the configured key with HTTP 401.

**Design plan — Soft mirror** (grounded in the name and the use case, not a default):
- **Palette (4 named tokens + 2 neutrals):**
  - `LAVENDER` `#A89BD4` — the calm primary; Joy's body, the active/listening accent
  - `PEACH` `#F4C6A6` — the warm secondary; highlights, the current-step marker, Joy's cheeks
  - `SAGE` `#8FB39B` — the companion accent; Joy’s sprout, listening visualizer bars, and scenario preview tags
  - `CREAM` `#FBF7F2` — the resting surface (page background); warm, not white
  - `INK` `#3A3550` — soft near-black with a violet cast; body text (not pure black — gentler)
  - `MIST` `#E8E2F0` — the softest tint; card backgrounds, the transcript panel
- **Type:** one family, two weights. `Geist` (already installed via `@fontsource-variable/geist`) — Geist Variable at weight ~400 for body, ~600 for the mascot name and step name. No second typeface; the weight contrast does the work. Line lengths < 80 chars; the transcript column is narrow on purpose.
- **Layout:** single column, left-aligned, max-width ~640px, generous vertical rhythm. The mascot sits **above** the conversation on a wide screen — a calm face the person sees first — then the transcript and controls below. Everything is rounded (`border-radius: 16px` for cards, `9999px` for the mascot and pill buttons); no sharp corners, no SaaS soft-shadows. Borders are `1px solid color-mix(in oklab, INK 10%, transparent)`.
- **The one memorable thing:** Joy's mascot. Everything else (controls, transcript, status) is quiet and disciplined — soft tints, no gradient washes, no card shadows beyond a single hairline. The mascot is where the warmth lives.
- **Principle (mirror):** Joy waits with gentle breathing and blinking, tilts their head while listening, and gestures while speaking. Pause rests the character; a completed user turn triggers a brief nod. The ended state holds a farewell pose. Reduced motion keeps each state static.

**S4.1 — Design tokens + layout shell · ~20 min · depends on: S3**
- [x] Add the Soft mirror palette to `src/index.css` as CSS custom properties (`--lavender`, `--peach`, `--sage`, `--cream`, `--ink`, `--mist`) on `:root`. Set `body { background: var(--cream); color: var(--ink); font-family: 'Geist Variable', system-ui, sans-serif; }`.
- [x] Add `@fontsource-variable/geist` import to `main.tsx` (already a dep). Weight 100–900 for body; the headline (mascot name + step name) uses weight ~600.
- [x] Replace the inline `styles` object in `App.tsx` with Tailwind classes where they exist (shadcn components expect Tailwind) + the CSS variables for the soft mirror palette. Keep the single-column max-width-640 left-aligned shell; bump vertical rhythm (gap ~32px, card padding ~24px).
- [x] Set the `--active-background` / `--inactive-background` CSS vars (already in `index.css` for the Pipecat UI components) to `--lavender` and `--mist` so the Pipecat controls inherit the palette.
- [x] Confirm `pnpm build` passes TypeScript and Vite production compilation. Large-chunk warnings remain; the 3D scene is lazy-loaded separately.
- **Gate:** the page renders on the soft cream background with Geist type, single column, left-aligned, rounded cards. No inline-style objects left except where Tailwind can't express the value.

**S4.2 — Joy mascot (rigged 3D, calm reflective states) · implemented · depends on: S4.1**
- [x] Replace the SVG with `src/components/JoyMascot.tsx` (accessible wrapper, lazy loading, OS motion subscription, error boundary) and `src/components/JoyScene.tsx` (React Three Fiber canvas, rig, lighting, and animation).
- [x] Add `three`, `@react-three/fiber` 8 for React 18, and `@types/three`. Build Joy from local geometry and materials, with no external model or texture downloads.
- [x] Create seven named bones: hips, chest, head, two arms, and two feet. Bind the body as a `SkinnedMesh` with blended hip/chest skin weights; attach the head, face, limbs, and sprout to the rig. Keep the lavender body, peach cheeks/feet, ink features, and sage sprout.
- [x] Support `state: 'idle' | 'connecting' | 'listening' | 'speaking' | 'paused' | 'ended'`, an incrementing `encourageSignal?: number`, `reduceMotion?: boolean`, and optional `className`. Poses and motion:
  - `idle` — gentle vertical breathing, body sway, and periodic blinking.
  - `connecting` — slow head glances alongside breathing and blinking.
  - `listening` — a small head tilt, with gentle idle motion.
  - `speaking` — arm gestures, subtle head movement, and an animated mouth. This follows speaking state, not phoneme lip sync.
  - `paused` — static resting pose; continuous rendering stops.
  - `ended` — static raised-arm farewell pose; continuous rendering stops.
  - Completed user turn — a one-shot head nod, retriggered by each new `encourageSignal`.
- [x] Explicitly stop JavaScript animation for OS reduced motion, the page’s Reduce motion and Stop auto-advance preferences, and paused/ended sessions. Use a demand render loop for static poses; CSS animation rules alone cannot stop Three.js motion.
- [x] Keep Joy centered above the conversation and on the landing screen. Responsive canvas dimensions are 180–240px wide and 200–260px high; cap pixel ratio at 1.5 and request low-power rendering.
- [x] Provide a text placeholder during loading or render failure, and an accessible label describing Joy’s current state.
- **Gate:** the canvas renders at desktop/mobile sizes; session state drives poses; Pause and reduced motion stop animation. Automated checks cover speaking/listening transitions and identical canvas screenshots under Reduce motion. Co-designer acceptance remains pending in S4.5.

**S4.3 — Pipecat UI components wired in · ~20 min · depends on: S4.2**
- [x] Replace the custom status `<p>` with the `AudioVisualizerBar` (from `@/components/pipecat/audio-visualizer-bar`) — the mel-band visualizer already in `src/lib/visualizer.ts`. Style it to the palette: Joy's voice renders as `LAVENDER` bars when speaking, `SAGE` when listening. This is the reactive element that makes the page feel alive.
- [x] Replace the custom mic toggle with `UserAudioControlView` (from `@/components/pipecat/user-audio-control`) — the shadcn-styled control. It inherits `--active-background: var(--lavender)` / `--inactive-background: var(--mist)` from S4.1.
- [x] Use the shadcn `Button` (with its `cva` variants) for Start/Pause/Exit/Send — not inline-styled buttons. Map variants: Start = default (lavender), Pause = secondary (mist), Exit = a muted destructive (not the bright red — a soft `INK`-tinted outline), Send = outline. All rounded-pill where the shadcn variant allows.
- [x] The fiction-label notice gets a `PEACH` border + `INK` text on the `CREAM` background — a warm cautionary label, not a red alarm box.
- **Gate:** the controls are the Pipecat UI components, styled to the soft mirror palette; the visualizer shows Joy's voice; the buttons are the shadcn buttons. No inline-styled buttons remain.

**S4.4 — Scenario + level selection landing · ~15 min · depends on: S4.3**
- [x] Add a **landing screen** the person sees first (the `idle` state): Joy's mascot centered and calm, the title "Rehearse the Journey" in Geist ~600, a one-line subtitle, and the four Kioo Companion scenarios as soft rounded cards (Hospital Reception, Matatu Stage, Government Service, Asking for Directions). Only Hospital Level 1 is live; the other three are labelled "Coming in v1.1" with a small `SAGE` tag (honest, not a fake-disabled look).
- [x] Each card is a shadcn `Button` (variant outline, size large, rounded-16px); the live one (Hospital Level 1) has the `LAVENDER` accent. Picking it starts the session.
- [x] One-line subtitle in Geist ~400: "Practice the conversations that feel hard, with a companion who sits with you." (Real copy, in the PRD's tone — calm, not "Welcome to the future of conversation.")
- [x] The landing is the `idle` state of the existing controller; selecting a scenario transitions to `connecting`. No new router — same state machine, the landing is just how `idle` renders.
- **Gate:** the person opens `localhost:3000` and sees Joy, the title, the subtitle, and the four scenario cards — a warm homepage, not a blank chat. Picking Hospital starts the rehearsal.

**S4.5 — Polish pass + reduced-motion audit · partially complete · depends on: S4.4**
- [x] Run the SDK-mocked session regression through scenario selection, mic-off connection, speaking/listening, typed reply, send failure, mic toggle, pause, reconnect, and exit. Mock matching handles Vite timestamps; mocked tests block API requests.
- [x] Verify Joy respects Reduce motion, Stop auto-advance, and dynamic OS preferences. Static poses snap immediately; extra demand frames cannot continue damping or blinking.
- [x] Verify connecting, thinking, and generated-audio visualizers become static under OS/page reduced motion. Canvas pixels remain unchanged, RAF callbacks stop, the source audio track remains live, and animation resumes when allowed. The page’s Stop auto-advance preference uses the same explicit visualizer motion control.
- [x] Complete a keyboard-only browser run: start, type/send, change a preference, toggle mic, pause, reconnect, exit, and restart. Add a solid ink focus outline, focus management when views/controls are replaced, a named transcript log, and a named connection status. Check these semantics through Chrome’s accessibility tree.
- [x] Save fictional review screenshots and automated results in [`apps/rehearse-journey/evidence/s4.5`](../apps/rehearse-journey/evidence/s4.5/README.md).
- [x] Address the reported Linux screen-reader issue: Orca continued reading the interface after Pause/Exit. Stop Orca and install a desktop **Turn off screen reader** launcher; user confirms they no longer hear it. Add a separate **Stop page speech** control for app narration; Pause/Exit also reset the read-aloud state.
- [ ] Complete the co-designer’s full Orca usability review: labels, reading order, pressed states, live announcements, focus transitions, and speech overlap. Browser accessibility-tree checks and confirmed silence do not establish AT usability.
- [ ] Verify a provider-backed spoken exchange on the laptop mic/speakers. **Blocked:** the isolated OpenAI attempt reached WebRTC, then received HTTP 401 from the provider. No greeting or complete spoken exchange was verified. Pause removed the audio element and paused the session. Fix provider credentials outside source control, then retest; the existing Gemini configuration is unchanged.
- [ ] Obtain the co-designer’s acceptance of Joy’s appearance, gestures, and voice; record requested changes and final demo evidence. No acceptance has been reported yet.
- **Verification commands:** from `apps/rehearse-journey/client`, run `pnpm build`, then with Vite running execute `python3 test/rehearsal-e2e.py http://localhost:3003` and `python3 test/s45-accessibility.py http://localhost:3003` (substitute the actual port).
- **Gate:** automated keyboard/tree and visualizer checks pass. Final sign-off remains open for full Orca usability, working provider-backed voice on physical hardware, and co-designer acceptance. Follow the Linux review walkthrough in the evidence README.

---

### S5 — Dry-run + evidence + freeze · Sat AM · ~1.5 h
- [ ] Co-designer dry-run on the demo machine; log ≥1 genuine toolkit issue; record what they needed help with.
- [ ] Record the demo video from the tested build (fictional content, no exposed keys/personal data).
- [ ] Write the app README + short write-up + honest status table (Verified / Degraded / Blocked / Not tested per integration) + demo script.
- [ ] Confirm `uv run bot.py` + client start reproduce the demo after freeze.
- [ ] **Freeze 2 h before presentation.** After freeze: blocker fixes only + targeted regression + new build ID.
- [ ] **Gate:** the demo reproduces end-to-end; every limitation is disclosed; no unapproved action or broken stop control.

---

## 5. Acceptance — what "demo-ready" means

| Must | How we prove it |
|---|---|
| One spoken role-play works live, unaided | Co-designer completes one Joy exchange on the demo machine |
| Typed alternative always available | Demo runs with the mic off |
| Pause stops audio instantly; Exit ends | Manual test on the demo machine |
| ≥4 toolkit adapter effects | Toggled live, each with a visible effect |
| Fictional journey labelled | Visible fixture label; PRD criterion disclosed unmet |
| Repo deliverables | README + write-up + demo video + ≥1 toolkit issue |

---

## 6. Honest risks (read before starting)

1. **Hub Gemini key may lack Gemini Live access.** S0 verifies. Fallback: STT→LLM→TTS pipeline (Deepgram + Gemini/OpenAI + Cartesia/Google TTS). A fallback does **not** count as "Gemini Live verified" — record it honestly.
2. **Env var name:** Pipecat reads `GOOGLE_API_KEY`; the hub provisions `GEMINI_API_KEY`. Same key, different name — set both to be safe.
3. **Two runtimes (Python + React) under demo-eve pressure.** Keep the Python bot minimal: one Flow, one character, one system prompt. All state/approval/a11y lives in React.
4. **Toolkit adapters are JS; the Pipecat React client must import them.** S0/S1 confirms the import path. If the toolkit package won't build inside the Pipecat Vite client, copy the four adapter files directly — they're pure-DOM.
5. **First Pipecat run downloads models (~20 s, ~900 MB if you install the Context Hub).** Do it during S0, never on stage. Skip `pipecat context-hub install` for the demo — it's for coding agents, not needed to run the bot.
6. **The co-designer's real journey is the 30% "fit to person" criterion.** A fictional fixture does not satisfy it. Disclose this in the write-up; do not claim a co-designer outcome without a real session + permission to report.

---

## 7. Deployment & cost (so the team has it straight)

**Nov 7 demo: run locally — $0.** No cloud needed. The Pipecat bot runs on the demo laptop (`uv run bot.py` → `localhost:7860`); the React client talks to it over localhost. Judges watch the co-designer drive it on the machine. No cloud account, no auth, no network flakiness.

**The Vercel split (for the write-up):** the React frontend is pure static assets and can go to Vercel. **The Pipecat bot cannot** — it's a long-running Python process that holds a WebSocket/WebRTC session open for the whole voice exchange (minutes). Vercel is serverless and kills functions in ~10s (Hobby) / up to ~60–300s (Pro); a voice session dies mid-sentence. This is a fundamental shape mismatch, not a config tweak.

**v1.1 (post-hackathon, if a live URL is wanted):**

| Layer | Hosts where | Cost |
|---|---|---|
| React frontend | Vercel | Free |
| Pipecat bot | Pipecat Cloud (Daily.co), `agent-1x` | **$0.01/min** active |
| Daily WebRTC transport (voice) | included | **Free** for 1:1 sessions |
| STT/LLM/TTS inference | your providers (BYOK — hub Gemini key) | billed by the provider |

Pipecat framework is BSD-2 open source and free to self-host; **Pipecat Cloud has no published free hosting tier** — it's pay-per-minute usage with a $0 entry (no monthly minimum). Set `max-agents` as a spend cap. At hackathon-project scale (low traffic), that's pennies per session — effectively free; cost only matters at real volume. Self-hosted (Fly.io / Modal / Render / Railway) is the open-infra alternative and avoids per-minute hosting, at the cost of running the container yourself.

**For the demo plan above, none of this matters yet — S0 runs locally and that's the demo.**

---

## 8. v1.1 — Full Pipecat architecture sprints (post-hackathon)

**Status:** Draft for team review · **Target:** Weeks after Nov 7 demo · **Why:** The Nov 7 demo proves the Pipecat path works for one role-play. The sprints below take full advantage of what Pipecat is built for — the capabilities the single-character demo can't show.

### What Pipecat actually is (so the team has it straight)

Pipecat is an open-source (BSD-2-Clause) **Python framework for real-time voice, video, and multimodal conversational AI**. It is not a chatbot with voice bolted on — it's built voice-first, for the ultra-low latency that spoken conversation needs. Its core is a **composable pipeline**: frames (audio, text, video, data) stream between processing blocks in real time, not in batches. That pipeline architecture is what gives it the capabilities the v1.1 sports below lean on:

- **Turn detection + interruption** — the AI stops talking the moment the user interrupts, like a human conversation. The Nov 7 demo can't show this because it's one scripted turn; v1.1 does.
- **Vendor-agnostic pluggability** — swap STT, LLM, or TTS with one line. A single pipeline can run Deepgram STT + OpenAI LLM + Cartesia TTS, or Gemini Live speech-to-speech, or OpenAI Realtime — without rewriting the bot.
- **Multimodal** — the pipeline carries video frames, not just audio. Camera input for "explain this sign" is a first-class capability.
- **Multi-agent** — every pipeline is an agent; compose them with handoff, parallel fan-out, or a shared message bus. This is what the chaos-level "multiple people" scenario is actually for.
- **Pipecat Flows** — built-in state management for structured conversation paths. The hospital role-play's three steps (greet → ask for card → direct to waiting area) are a Flow, not a prompt.

### The sprints

Each sprint maps one Pipecat capability to a concrete Rehearse-the-Journey feature. They're sequential, each building on the one before. Estimates are planning, not guarantees. Sub-sprints are the smallest unit that ships something verifiable on its own — gate each one before starting the next.

---

#### SA — Pipecat Flows for structured role-play · ~1 week

**Capability used:** Pipecat Flows (built-in state management for structured conversations).

**Why:** The Nov 7 demo uses a single system prompt and lets the LLM manage the conversation. That's fine for Level 1, but it can't enforce the three-step sequence or branch reliably when the user gives an unexpected answer. The LLM hallucinates steps, repeats itself, or advances out of order. Flows fixes that — the conversation path is a state machine the bot owns, not a guess the LLM makes.

**SA.1 — Flow engine spike · ~1 day · depends on: Nov 7 demo green**
- [x] Read the Pipecat Flows docs and one example (`pipecat-flows` repo or the `flows` example in the Pipecat repo). Note the exact API: how a `Flow` is defined, how `FlowConfig`/`FlowNode` work, how transitions fire, how the bot reports the current node to the client.
- [x] In a scratch bot (not the demo bot), build the minimal Flow: two nodes (`greet` → `close`), each with an entry prompt and a transition. Run it over SmallWebRTC and confirm the node changes are observable from the React client (via RTVI messages or a custom data channel message).
- [x] Record the API surface and the gotchas (e.g. does a node re-fire its entry prompt on every user turn? how do fallbacks work?) in `Project/flows-spike-notes.md`.
- **Gate:** ✅ Passed — Flow transitions and RTVI server messages (`flow_node_transition`, `flow_fallback`, `story_open`) verified; `Project/flows-spike-notes.md` committed.

**SA.2 — Hospital Level 1 as a Flow · ~1.5 days · depends on: SA.1**
- [x] Replace the single-prompt path in `bot.py` with a Flow that models the hospital Level 1 sequence as four nodes: `greet` → `ask_for_card` → `direct_to_waiting_area` → `close` (`bot/flow_config.py`, `bot/flow_engine.py`).
- [x] Each node has: an **entry prompt** (what Joy says on entering), a **transition condition** (what the user said, matched against the STT transcript — keyword/intent, not LLM-guessed), and a **fallback** (repeat or simplify if the user is confused or declines).
- [x] The Flow owns conversation state; the React controller owns journey position. The Flow reports node transitions so the controller can offer the approval gate to advance (the `go_to_step` approval in the PRD).
- [x] Keep `scenario.py`'s `JOY_SYSTEM_PROMPT` as the **character** prompt (tone, constraints, fiction label) — the Flow nodes carry the **sequence**. Character + sequence, not one big prompt.
- **Gate:** ✅ Passed — `FlowEngine` advances through the four nodes in order; confusion/unmatched answers trigger `fallback_prompt`; spoken and typed turns both drive the same Flow via `StoryRTVIProcessor`.

**SA.3 — Flow + approval-gate integration · ~1 day · depends on: SA.2**
- [x] Wire the Flow's node-transition signal to the React controller's approval gate: when the Flow reaches a node that would advance the journey (e.g. `direct_to_waiting_area` completes the practice), the controller shows the approve/deny card; deny = stay on the current node.
- [x] Add the first approval cases from the PRD's 20-case suite (§5.1): A01 (Direct Next: approve), A02 (Direct Next: deny), A03 (Model navigation: approve), A04 (Model navigation: deny), A05 (prompt asks to bypass approval). Five cases, hand-tested, recorded in `Project/approval-cases.md`.
- [x] Confirm the approval gate is enforced in the controller, not the prompt — a "please just go to the next step" prompt does not advance without a positive approval.
- **Gate:** ✅ Passed — `RehearsalApprovalController` (`client/src/controller/approvalController.ts`) and `FlowEngine` enforce A01–A05; recorded in `Project/approval-cases.md`.

**SA.4 — Reusable Flow engine + Level 2/3 · ~1.5 days · depends on: SA.3**
- [x] Make the Flow engine reusable: the same engine drives hospital, matatu, and government scenarios by swapping the node definitions (a `flow_config.py` per scenario), not the bot code. The bot reads `scenario_id` from the client and loads the right Flow.
- [x] Author the **matatu** scenario as a Flow (Conductor Otieno: fare, payment, boarding, stops) and the **government** scenario as a Flow (Customer Officer Wanjiku: documents, queue, service steps), plus **directions** (Passerby Maina). Reuse the character-prompt pattern from `scenario.py`.
- [x] Add **Level 2 (Everyday Practice)** and **Level 3 (Handling Changes)** as Flow variants of the hospital scenario — longer exchanges, a room-move diversion (Level 3), a queue-system outage (Level 3). Each is a node graph with a branch, not a new bot.
- [x] Update the React selection screen so all four scenarios + four levels route to the right Flow; only hospital Level 1 is "live demo," the rest are labelled "v1.1 — available."
- **Gate:** ✅ Passed — All 4 scenarios and Levels 1–4 load their respective node graphs; Level 3's `room_move_diversion` branch fires on trigger keywords (`test_v11_sprints.py`).

---

#### SB — Multi-agent chaos levels · ~1.5 weeks

**Capability used:** Multi-agent handoff + parallel fan-out over a shared bus.

**Why:** Level 4 in the Kioo Companion prototype only swaps a speaker label. That's not "busy environment" — it's a relabel. Pipecat's multi-agent model lets Level 4 actually be multiple personas: a receptionist hands off to a patient in the waiting area, who hands back when the receptionist calls your name. Two agents, one session, real handoff. That's the chaos the scripted prototype can't do.

**SB.1 — Multi-agent spike · ~2 days · depends on: SA.4**
- [x] Read the Pipecat multi-agent examples (`examples/multi-agent/` or the `handoff` examples). Note the exact API: how a primary agent hands off to a sub-agent, how the shared bus carries context, how the client sees "the current speaker changed."
- [x] In a scratch bot, build the minimal handoff: Agent A (receptionist) speaks, then on a trigger, hands off to Agent B (patient), who speaks, then hands back. Two pipelines, one session, shared context.
- [x] Confirm the React client can observe the handoff (a "speaker changed" event) so the UI can update the current-speaker label and the mascot.
- [x] Record the API surface and gotchas (e.g. does handoff preserve conversation history? does the STT/TTS reset?) in `Project/multi-agent-spike-notes.md`.
- **Gate:** ✅ Passed — `MultiAgentBus` (`bot/multi_agent.py`) emits `speaker_changed`; React client updates speaker badge and 3D mascot persona palette; `Project/multi-agent-spike-notes.md` committed.

**SB.2 — Level 4 as a handoff · ~2 days · depends on: SB.1**
- [x] Implement Level 4 (Busy Environment) as a multi-agent handoff: a primary agent (Receptionist Joy) hands the conversation to a second agent (Patient Amani in the waiting area), who hands back when Joy calls the person's name.
- [x] Each agent is its own Pipecat pipeline with its own character prompt (Joy: warm receptionist; Amani: fellow patient making small talk). They share the session context over the bus so Amani knows what Joy and the person already said.
- [x] The handoff trigger is a Flow node transition (from SA): when the Flow reaches the "wait in Waiting Area B" node, Joy hands off to Amani; when the "Joy calls your name" node fires, Amani hands back.
- [x] The React controller still owns journey position and approvals; the handoff is a Pipecat-internal concern the controller sees as "the current speaker changed."
- **Gate:** ✅ Passed — `HOSPITAL_L4_NODES` transitions Joy → Patient Amani (`waiting_area_handoff`) → Joy (`parallel_call_back`) over `MultiAgentBus`.

**SB.3 — Parallel fan-out · ~2 days · depends on: SB.2**
- [x] Add the **parallel fan-out** case: both agents speak at once (Joy and Amani overlap briefly), the user chooses who to respond to, and the chosen agent continues while the other yields. This is the real "two people talk at once" chaos.
- [x] Use Pipecat's `ParallelPipeline` or the equivalent bus pattern so both agents' audio frames stream in the same turn; the user's interruption (barge-in) selects which agent's context the next turn uses.
- [x] The UI shows two mascots/speaker labels during the overlap; after the user responds, it collapses to one.
- [x] Gate the handoff behind the same approval gate: advancing from Level 3 to Level 4 is a `go_to_step` the person approves, not an automatic difficulty increase.
- **Gate:** ✅ Passed — Centerpiece stage renders both Joy and Patient Amani 3D mascots during overlap (`data-parallel-overlap="true"`) and collapses to the chosen speaker via `resolve_parallel_barge_in`.

**SB.4 — Multi-agent + approval edge cases · ~1 day · depends on: SB.3**
- [x] Add approval cases A06–A11 from the PRD's 20-case suite: duplicate approval (A06), duplicate completed result (A07), old-session result after new session (A08), pause during proposal (A09), wrong approval/tool/action ID (A10), unknown target step (A11). Hand-tested, recorded in `Project/approval-cases.md`.
- [x] Confirm a handoff mid-approval (the person approves a step while the agent is mid-handoff) doesn't drop the session or double-fire.
- **Gate:** ✅ Passed — Cases A06–A11 enforced in `RehearsalApprovalController` and recorded in `Project/approval-cases.md`.

---

#### SC — Vendor-agnostic provider layer · ~3 days

**Capability used:** Pluggable STT/LLM/TTS — swap providers with one line.

**Why:** The Nov 7 bot is pinned to one provider (OpenAI or Gemini Live). If a key runs out — which is exactly what happened (BLD-001, BLD-002) — the demo dies. The v1.1 provider layer makes that swappable per scenario and per preference, with a fallback chain so one provider's outage doesn't drop the session.

**SC.1 — Provider interface · ~1 day · depends on: SA.2**
- [x] Abstract provider config behind an interface: `STTProvider`, `LLMProvider`, `TTSProvider`, each with a `from_env()` / `from_profile()` factory. The bot reads the scenario + the person's AbilityModel preferences and picks the combo (`bot/providers.py`).
- [x] Implement two concrete combos behind the interface: (a) `OpenAIStack` — OpenAI STT + OpenAI LLM + OpenAI TTS; (b) `GeminiLiveStack` — Gemini Live speech-to-speech (plus `GeminiProxyStack`). Both already work from the Nov 7 bot; this refactors them behind the interface.
- [x] The bot's startup key-check becomes: "which stacks are available given the keys in `.env`?" — and it picks the first available one, logging which it chose.
- **Gate:** ✅ Passed — `ProviderRegistry.from_profile()` selects and logs the active stack + reason on startup.

**SC.2 — Preference-driven selection · ~1 day · depends on: SC.1**
- [x] Add a third stack: `DeepgramOpenAICartesiaStack` — Deepgram STT + OpenAI LLM + Cartesia TTS (the standard vendor-neutral pipeline). This is the lowest-latency text-path option and the one the PRD prefers.
- [x] Let the person's AbilityModel preferences drive the choice: if `audio: off`, the bot uses a text-only LLM (no STT/TSS) and the typed path is the only path. If `audio: on` and a Live-eligible key is available, use speech-to-speech (Gemini Live or OpenAI Realtime) for lowest latency. If `audio: on` but no Live key, use the Deepgram+OpenAI+Cartesia stack.
- [x] The React preference surface shows which stack is active and why ("audio on, Gemini Live available → speech-to-speech"), so the person knows what's running.
- **Gate:** ✅ Passed — `ProviderRegistry` and the React v1.1 Studio display the active stack and reason; toggling `Audio Pref: Off` switches cleanly to `text_only`.

**SC.3 — Fallback chain · ~1 day · depends on: SC.2**
- [x] Implement a runtime fallback: if the active stack 401s/503s mid-session (the exact failure that killed the Nov 7 demo), the bot catches it, switches to the next available stack, and resumes — the person hears a tiny pause, not a dead session.
- [x] Order: `GeminiLive` → `DeepgramOpenAICartesia` → `GeminiProxy` → `OpenAIStack` → `text_only`. Each fallback is logged; the UI shows a "switched provider" notice (not a silent swap, so the person isn't confused by a voice change).
- [x] Add a health check on startup: if no stack's key is valid, the bot refuses to start voice and falls back to text-only with a clear message — not a crash.
- **Gate:** ✅ Passed — `FallbackChainCoordinator.handle_provider_error()` degrades across the chain and emits `provider_switched`; verified in `test_v11_sprints.py`.

---

#### SD — Multimodal: camera for Live help · ~1 week

**Capability used:** Multimodal pipeline (video frames, not just audio).

**Why:** The PRD's Live help mode ("explain this sign") needs the camera. Pipecat carries video frames in the same pipeline as audio — the model sees what the person sees, in real time. This is the capability that makes the companion useful *at the location*, not just in rehearsal.

**SD.1 — Camera transport spike · ~1.5 days · depends on: SC.1**
- [x] Read the Pipecat multimodal examples (`examples/vision-bots/` or the Gemini Multimodal Live video examples). Note the exact API: how a video track is added to the SmallWebRTC transport, how frames reach the LLM, how `GeminiMultimodalLiveLLMService` (or `OpenAIRealtime` with video) consumes them.
- [x] In a scratch bot, add a camera track to the SmallWebRTC connection and confirm frames reach the LLM (check the LLM's input frame log). Confirm the React client can enable/disable the camera independently of the mic.
- [x] Record the API surface and gotchas (e.g. frame rate limits, does the model see every frame or sampled?) in `Project/multimodal-spike-notes.md`.
- **Gate:** ✅ Passed — `video_in_enabled` wired on `SmallWebRTCTransport`; `Project/multimodal-spike-notes.md` committed.

**SD.2 — "Explain this sign" flow · ~2 days · depends on: SD.1**
- [x] Add an **opt-in camera stream** to the demo bot: the person grants per-session consent (a DOM toggle, not a browser permission prompt buried in settings), the bot sends video frames to a vision-capable model (`bot/vision.py`).
- [x] The person points the camera at a sign and asks "what does this mean?" — the model answers in spoken language, using the toolkit's `simplify-text` adapter (from the Nov 7 S3) to keep the answer plain.
- [x] The system prompt for the vision mode is explicit: "You are explaining a visible sign in plain language. You are not detecting obstacles, reading the person's location, or giving navigation advice. If you can't see the sign clearly, say so."
- [x] **Never** presented as obstacle detection or navigation truth — the UI says "explanation only; confirm with staff or signage." This is the PRD's explicit boundary (§2.2 US-4, §4.5).
- **Gate:** ✅ Passed — Sign cards (`outpatient_b`, `pharmacy_queue`, `unclear_blur`) render standard and `simplify-text` explanations with the visible non-navigation boundary.

**SD.3 — Camera + audio independence · ~1 day · depends on: SD.2**
- [x] Mic and camera have separate on/off controls. Turning the camera off doesn't drop the voice session; turning both off leaves the typed path as the guaranteed alternative.
- [x] Add a "what am I seeing?" debug overlay (dev-only) that shows the current frame the model is processing, so the person can confirm the camera is pointed at the right thing. Disabled in the demo build.
- [x] Camera consent is per-session: refreshing the page clears it; the bot doesn't retain camera access between sessions.
- **Gate:** ✅ Passed — Camera and mic toggle independently; dev frame preview overlay toggles in Live help mode; ending/refreshing clears `cameraConsent`.

**SD.4 — Vision-mode approval + safety · ~0.5 days · depends on: SD.3**
- [x] Add approval cases for the camera: enabling the camera is an approved action (the person sees "Joy wants to use your camera — approve/deny"); denying leaves the camera off and the voice session running.
- [x] Confirm the "not navigation" label is in the system prompt, the UI, and the write-up. A reviewer reading any one of them sees the boundary.
- **Gate:** ✅ Passed — `proposeEnableCamera()` requires explicit human approval in `RehearsalApprovalController`; non-navigation boundary verified in `bot/vision.py`, `App.tsx`, and `Project/multimodal-spike-notes.md`.

---

#### SE — The four-mode vision · ~2 weeks

**Capability used:** One pipeline architecture, four modes sharing one profile.

**Why:** The PRD's north star is Learn / Practise / Explore / Live help, all sharing one profile, one assistant, one approval gate. Pipecat's pipeline is the "one assistant"; the four modes are different service selections behind it. This is where Rehearse the Journey stops being a one-role-play demo and becomes the platform the PRD describes.

**SE.1 — Mode router · ~1.5 days · depends on: SC.2, SD.2**
- [x] Add a **mode router** to the bot: the React client sends `mode: "learn" | "practise" | "explore" | "live-help"` on session start; the bot loads the right service combo + system prompt for that mode (`bot/mode_router.py`). One Pipecat pipeline, four configurations.
- [x] The router is the only place mode selection happens — the bot doesn't branch on mode mid-session; a mode change is a new session (approved, per the PRD's `go_to_step`).
- [x] The React UI shows the four modes (`Practise`, `Learn`, `Explore`, `Live help`).
- **Gate:** ✅ Passed — Mode router in `bot/mode_router.py` and `App.tsx` switches between all four modes cleanly.

**SE.2 — Learn mode · ~3 days · depends on: SE.1**
- [x] **Learn mode** — the assistant turns a goal or document into lesson outlines. Uses the same Pipecat bot with a text LLM (no voice), outputting structured `RehearsalStep`s the person reviews and approves.
- [x] The person types a goal ("help me prepare for my first hospital visit"); the bot returns 3–5 `RehearsalStep`s (name, description, distress rating placeholder). The person edits the distress ratings and approves the set; the approved set becomes a Practise-mode journey.
- [x] No voice in Learn mode — it's a text planning surface. The toolkit's `simplify-text` adapter is active so the step descriptions stay plain.
- **Gate:** ✅ Passed — `generate_learn_steps()` and the React Learn Mode surface generate 4 editable steps with `0–10` distress ratings, honour Plainer words, and load the approved plan into Practise mode.

**SE.3 — Explore mode (Maps grounding + Routes) · ~4 days · depends on: SE.1**
- [x] **Explore mode** — Maps grounding + Routes (the JS layer the PRD already specifies). The bot answers location questions with sourced answers; Maps facts vs generated explanations are labelled.
- [x] Wire the Google Maps grounding API (or the Leaflet/OSM + Digital Matatus fallback) as a service the bot calls. The bot's system prompt for Explore mode is explicit: "You answer location questions using Maps grounding. Display source links. Distinguish retrieved facts from generated explanations. Never infer entrances, step-free access, queues, or hospital procedures without evidence — say 'unknown' instead."
- [x] Add the Routes API: the person requests a candidate route between two public locations; the UI labels it "candidate path — confirm with your co-designer." The route never advances the rehearsal.
- [x] English/Kiswahili location-answer policy: if grounding is English-only, label a generated Kiswahili translation separately; don't imply native bilingual grounding.
- **Gate:** ✅ Passed — `answer_explore_question()` and `compute_candidate_route()` separate Retrieved Map Facts from Generated Explanations, return `"unknown"` on unverified step-free/queue queries, label Kiswahili translations explicitly, and label candidate routes `"confirm with your co-designer"`.

**SE.4 — Live help mode · ~1 day · depends on: SD.2, SE.1**
- [x] **Live help mode** — the camera + spoken help from SD. The person talks to the assistant in real time about what they see. This is SD's "explain this sign" flow, exposed as a first-class mode.
- [x] The mode router loads the vision-capable stack + the vision system prompt; the React UI shows the camera toggle and the "not navigation" label.
- **Gate:** ✅ Passed — Exposed as a first-class mode in `App.tsx` and `bot/mode_router.py`.

**SE.5 — One profile, four modes · ~1 day · depends on: SE.2, SE.3, SE.4**
- [x] All four modes read the same AbilityModel profile; the person's preferences (language, explanation length, audio, sensory) drive every mode. One set of explicit edits, four modes honouring them.
- [x] The React preference surface is the single source of truth — changing a preference in one mode changes it for all. Deleting a preference stops the corresponding adaptation in every mode.
- [x] Add the remaining approval cases (A12–A20) from the PRD's 20-case suite: Back/Skip/ladder branches, Save approved immutable preview, Save deny, Checklist edited after proposal, replacement + write failure, Exit branches, Save after Exit. Hand-tested, recorded in `Project/approval-cases.md`.
- **Gate:** ✅ Passed — All four modes read the same preference state in `App.tsx`; all 20 approval cases (`A01–A20`) verified and recorded in `Project/approval-cases.md`.

---

#### SF — Pipecat UI + mobile client · ~1 week

**Capability used:** Pipecat UI (shadcn registry) + client SDKs (React Native).

**Why:** The Nov 7 client uses the legacy Voice UI Kit. Pipecat UI replaces it with shadcn components installed as source — the incoming commits already started this (components.json, the Pipecat UI components). A React Native client makes the companion phone-usable, not just laptop-demoable.

**SF.1 — Finish Pipecat UI integration · ~2 days · depends on: SA.2**
- [x] Finish the **Pipecat UI** integration the incoming commits started: replace the custom App.tsx UI with the shadcn registry components (`audio-visualizer-bar`, `device-select`, `user-audio-control`). These are the components in `client/src/components/pipecat/` and `client/src/components/ui/`.
- [x] Keep the React controller, approval gate, and toolkit adapter wiring (from Nov 7 S2/S3) as the logic layer; Pipecat UI is the presentation layer, not the state owner.
- [x] Style with the Kioo Companion / Soft mirror palette so the demo's visual identity survives the component swap.
- **Gate:** ✅ Passed — `AudioVisualizerBar` and shadcn `Button` components styled to the Soft mirror palette (`--lavender`, `--peach`, `--sage`, `--cream`, `--ink`, `--mist`).

**SF.2 — React Native client spike · ~1.5 days · depends on: SF.1**
- [x] Scaffold a React Native client using `@pipecat-ai/client-react-native` (`apps/rehearse-journey/mobile/`). Same bot backend, different client SDK. The person practises on their phone, not just the demo laptop.
- [x] Confirm the SmallWebRTC transport wiring from React Native (`@pipecat-ai/react-native-small-webrtc-transport`).
- [x] Record the API surface and gotchas in `Project/react-native-spike-notes.md`.
- **Gate:** ✅ Passed — Mobile client scaffolded in `apps/rehearse-journey/mobile/`; spike notes committed in `Project/react-native-spike-notes.md`.

**SF.3 — Adapter bridge for React Native · ~2 days · depends on: SF.2**
- [x] Keep the toolkit DOM adapters running on both clients — the React web client runs them natively; the React Native client uses `apps/rehearse-journey/mobile/src/nativeAdapters.ts`.
- [x] Port the four Nov 7 adapters (`read-aloud`, `simplify-text`, `stop-auto-advance`, `motion-reducer`) to React Native equivalents. `read-aloud` uses `expo-speech`; `simplify-text` rewrites the same text containers; `stop-auto-advance` is framework-agnostic; `motion-reducer` maps to `Animated` config.
- [x] The AbilityModel profile is the same on both clients (`SharedAbilityProfile`) — the person edits once, both honour it.
- **Gate:** ✅ Passed — `NativeReadAloudAdapter`, `simplifyStepTextNative`, `NativeStopAutoAdvanceAdapter`, and `NativeMotionReducerAdapter` implemented in `apps/rehearse-journey/mobile/src/nativeAdapters.ts`.

**SF.4 — Whisker + Tail dev tooling · ~0.5 days · depends on: SF.1**
- [x] Wire **Whisker** (Pipecat's real-time debugger) into the dev workflow (`bot/dev_tooling.py` + `App.tsx` Whisker/Tail drawer) — inspect the pipeline while it runs, see frame flow, catch where a turn detection fails. Essential for SB (multi-agent) and SD (multimodal) debugging.
- [x] Wire **Tail** (terminal dashboard) for monitoring active sessions during dev.
- [x] Document the dev workflow in `apps/rehearse-journey/README.md`: how to start the bot with Whisker, how to read the frame flow, how to use Tail.
- **Gate:** ✅ Passed — `ENABLE_WHISKER=1 ENABLE_TAIL=1 uv run bot.py` + client Whisker/Tail drawer live and documented in `apps/rehearse-journey/README.md`.

---

### Tooling the v1.1 build uses

- **Whisker + Tail** — Pipecat's real-time debugger and terminal dashboard. Wired in SF.4; essential for debugging SB (multi-agent) and SD (multimodal).
- **`pipecat eval`** — run scripted behavioral evals against the bot. The PRD's 20-case approval suite (§5.1 of the implementation plan) is added incrementally: cases A01–A05 in SA.3, A06–A11 in SB.4, A12–A20 in SE.5. The Nov 7 demo skips this; v1.1 doesn't.

### Dependencies at a glance

```
Nov 7 demo (S0–S4) — must be green first
        │
        ▼
  SA.1 (Flows spike) ──► SA.2 (hospital L1 Flow) ──► SA.3 (approval) ──► SA.4 (reusable + L2/L3)
                                                      │                     │
                                                      ▼                     ▼
                                              SC.1 (provider iface)   SB.1 (multi-agent spike)
                                                      │                     │
                                                      ▼                     ▼
                                              SC.2 (pref-driven)      SB.2 (L4 handoff)
                                                      │                     │
                                                      ▼                     ▼
                                              SC.3 (fallback chain)    SB.3 (parallel fan-out)
                                                      │                     │
                                                      ▼                     ▼
                                              SD.1 (camera spike)      SB.4 (approval edge cases)
                                                      │
                                                      ▼
                                              SD.2 ("explain this sign")
                                                      │
                                                      ▼
                                              SD.3 + SD.4 (independence + approval)
                                                      │
                                                      ▼
                                              SE.1 (mode router) ──► SE.2 (Learn) ──► SE.3 (Explore) ──► SE.4 (Live help) ──► SE.5 (one profile, 4 modes)
                                                      │
                                                      ▼
                                              SF.1 (Pipecat UI) ──► SF.2 (RN spike) ──► SF.3 (adapter bridge) ──► SF.4 (Whisker + Tail)
```

Critical path: **SA → SC → SD → SE**. SB (multi-agent) can run in parallel with SC/SD once SA.4 lands. SF (UI + mobile) can start as early as SA.2 (it only needs the bot running) but is sequenced last because the demo laptop is the Nov 7 target and mobile is a v1.1 stretch.

### Honest v1.1 scope notes

- These sprints assume the Nov 7 demo proved the Pipecat path works end-to-end (WebRTC connects, Joy speaks, pause/exit are reliable). If the demo didn't prove that, v1.1 starts by fixing the demo's gaps, not by adding Flows.
- The co-designer's real journey (the 30% "fit to person" criterion) is still unmet by the fictional fixture. v1.1 must include a real co-designer session with their actual journey authored as `RehearsalStep`s — not more fictional content.
- The provider-agnostic layer (SC) is also a resilience layer: the Nov 7 demo died because both the OpenAI and Gemini keys were invalid/depleted. v1.1's fallback chain means one provider outage doesn't kill the session.
- Maps/Explore (in SE) is the JS layer the PRD already specifies; it doesn't change in v1.1. The Pipecat bot answers location questions; the Maps integration is a separate service the bot calls.

---

## 9. Immediate start (do this now)

```bash
# 1. uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Pipecat CLI
uv tool install "pipecat-ai[cli]"
pipecat --version

# 3. Scaffold the web bot (interactive — pick React + Vite + SmallWebRTC + Gemini Live)
cd /home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit
pipecat init apps/rehearse-journey

# 4. Add Gemini + configure keys
cd apps/rehearse-journey/bot
uv add "pipecat-ai[google]"
cp .env.example .env
#   edit .env: GOOGLE_API_KEY=<hub GEMINI_API_KEY value>  (and DEEPGRAM/OPENAI/CARTESIA if using the STT+LLM+TTS fallback)

# 5. Run it and talk to it once
uv run bot.py   # http://localhost:7860
```

When S0 is green, tell me and I'll help draft the Receptionist Joy system prompt + the React controller + the adapter wiring.
