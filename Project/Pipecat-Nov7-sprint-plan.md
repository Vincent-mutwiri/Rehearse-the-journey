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
- [ ] React controller owns role-play state (`idle | listening | speaking | paused | ended`). Pipecat proposes; the controller decides.
- [ ] **Pause** aborts the Pipecat session and stops audio immediately (mute + end tracks). **Exit** ends the session. Both are DOM buttons, always visible, never buried in chat.
- [ ] Resume is explicit — it does not auto-restart the mic.
- [ ] Reuse the Kioo Companion scenario/level selection as React state. Show all four scenarios; only hospital Level 1 is live; the other three are labelled "preview — v1.1".
- [ ] Minimal approval gate: "Advance to next role-play turn?" approve/deny; "Exit rehearsal?" approve/deny. Deny = stay put. (No 20-case suite — that's v1.1; test approve + deny by hand.)
- [ ] **Gate:** Pause stops audio instantly; Exit ends; Deny leaves you put; the selection screen routes only to the live role-play.

### S3 — Toolkit adapters ×4 · Sat AM · ~1.5 h
- [ ] Get the toolkit adapters usable from the scaffolded React client — import the adapter modules (`tools/adapters/`) or copy the specific files (`read-aloud.js`, `simplify-text.js`, `stop-auto-advance.js`, `motion-reducer.js` / `confirm-actions.js`) into the client `src`. Confirm the import/build path works (this is the JS/Python-bridge task).
- [ ] Wire ≥4 adapters to explicit preference toggles, each with an **observable** effect:
      - `read-aloud` — speaks the current step narration
      - `simplify-text` — rewrites the step text to plain language
      - `stop-auto-advance` — guarantees no timer-driven progression
      - `motion-reducer` (or `confirm-actions`) — reduces animation / adds a confirm on exit
- [   ] Verify enabling/disabling a preference never defeats Pause (adapter toggle must not restart stopped media).
- [ ] Keyboard-only run + the co-designer's preferred AT (TalkBack/VoiceOver/Orca) on the demo device.
- [ ] **Gate:** four observable adapter effects from explicit preferences; removal restores; keyboard + AT work.

### S4 — Dry-run + evidence + freeze · Sat AM · ~1.5 h
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

Each sprint maps one Pipecat capability to a concrete Rehearse-the-Journey feature. They're sequential, each building on the one before. Estimates are planning, not guarantees.

#### SA — Pipecat Flows for structured role-play · ~1 week

**Capability used:** Pipecat Flows (built-in state management for structured conversations).

The Nov 7 demo uses a single system prompt and lets the LLM manage the conversation. That's fine for Level 1, but it can't enforce the three-step sequence or branch reliably when the user gives an unexpected answer. Flows fixes that.

- [ ] Replace the single-prompt `bot.py` with a **Pipecat Flow** that models the hospital Level 1 sequence as state-machine nodes: `greet` → `ask_for_card` → `direct_to_waiting_area` → `close`.
- [ ] Each node has: an entry prompt, a transition condition (what the user said, via the STT transcript), and a fallback (repeat or simplify). Transitions are deterministic, not LLM-guessed.
- [ ] The Flow owns the conversation state; the React controller owns the journey position (which step the person is on). The Flow reports node transitions so the controller can offer the approval gate to advance.
- [ ] Make the Flow reusable: the same Flow engine drives hospital, matatu, and government scenarios by swapping the node definitions, not the bot code.
- [ ] Add Level 2 (Everyday Practice) and Level 3 (Handling Changes) as Flow variants — longer exchanges, a room-move diversion, a queue-system outage — all as node graphs, not new bots.

**Gate:** A person completes the hospital Level 1 role-play and the Flow advances through the three nodes in order; an unexpected answer triggers the fallback, not a hallucinated step.

#### SB — Multi-agent chaos levels · ~1.5 weeks

**Capability used:** Multi-agent handoff + parallel fan-out over a shared bus.

Level 4 in the Kioo Companion prototype only swaps a speaker label. Pipecat's multi-agent model lets the fourth level actually be multiple personas — a receptionist hands off to a patient in the waiting area, who hands back when the receptionist calls your name.

- [ ] Implement Level 4 (Busy Environment) as a **multi-agent handoff**: a primary agent (Receptionist Joy) hands the conversation to a second agent (Patient Amani in the waiting area), who hands back. Each agent is its own Pipecat pipeline with its own character prompt, sharing the session context over the bus.
- [ ] Add **parallel fan-out** for the "two people talk at once" case: both agents speak, the user chooses who to respond to. This is the chaos that the scripted prototype can't do.
- [ ] The React controller still owns journey position and approvals; the multi-agent handoff is a Pipecat-internal concern the controller sees as "the current speaker changed."
- [ ] Gate the handoff behind the same approval gate: advancing from Level 3 to Level 4 is a `go_to_step` the person approves, not an automatic difficulty increase.

**Gate:** Level 4 runs two agents that hand off mid-conversation; the person experiences a busy waiting room, not a label swap.

#### SC — Vendor-agnostic provider layer · ~3 days

**Capability used:** Pluggable STT/LLM/TTS — swap providers with one line.

The Nov 7 bot is pinned to one provider (OpenAI or Gemini Live). If a key runs out, the demo dies. The v1.1 provider layer makes that swappable per scenario and per preference.

- [ ] Abstract provider config behind an interface: `STTProvider`, `LLMProvider`, `TTSProvider`. The bot reads the scenario + the person's AbilityModel preferences and picks the combo.
- [ ] Standard pipeline: **Deepgram STT + OpenAI LLM + Cartesia TTS** (lowest latency, vendor-neutral). Speech-to-speech option: **Gemini Live** or **OpenAI Realtime** for scenarios where the person has opted into audio and the key has credits.
- [ ] Let the person's preferences drive the choice: if they've set `audio: off`, the bot uses text-only LLM (no STT/TTS) and the typed path is the only path. If `audio: on` and a Live key is available, use speech-to-speech for lowest latency.
- [ ] Fallback chain: if Gemini Live 503s, fall back to Deepgram+OpenAI+Cartesia automatically. The person hears a tiny pause, not a dead session.

**Gate:** The bot runs on three different provider combos without code changes; a Live key outage degrades to the standard pipeline without dropping the session.

#### SD — Multimodal: camera for Live help · ~1 week

**Capability used:** Multimodal pipeline (video frames, not just audio).

The PRD's Live help mode ("explain this sign") needs the camera. Pipecat carries video frames in the same pipeline as audio — the model sees what the person sees, in real time.

- [ ] Add an **opt-in camera stream** to the bot: the person grants per-session consent, the bot sends video frames to a vision-capable model (Gemini Multimodal Live or OpenAI Realtime with video).
- [ ] The person points the camera at a sign and asks "what does this mean?" — the model answers in spoken language, using the toolkit's `simplify-text` adapter to keep the answer plain.
- [ ] **Never** presented as obstacle detection or navigation truth — the UI says "explanation only; confirm with staff or signage." This is the PRD's explicit boundary (§2.2 US-4, §4.5).
- [ ] Mic and camera have separate on/off controls. Turning the camera off doesn't drop the voice session; turning both off leaves the typed path.

**Gate:** The person points the camera at a hospital sign, asks what it means, and hears a plain-language explanation — with the camera clearly opt-in and the "not navigation" label visible.

#### SE — The four-mode vision · ~2 weeks

**Capability used:** One pipeline architecture, four modes sharing one profile.

The PRD's north star is Learn / Practise / Explore / Live help, all sharing one profile, one assistant, one approval gate. Pipecat's pipeline is the "one assistant"; the four modes are different service selections behind it.

- [ ] **Learn mode** — the assistant turns a goal or document into lesson outlines. Uses the same Pipecat bot with a text LLM (no voice), outputting structured `RehearsalStep`s the person reviews and approves.
- [ ] **Practise mode** — the Flows + multi-agent build from SA + SB. The person rehearses the role-play; the bot is the character.
- [ ] **Explore mode** — Maps grounding + Routes (separate JS layer, unchanged from the PRD). The bot answers location questions with sourced answers; Maps facts vs generated explanations are labelled.
- [ ] **Live help mode** — the camera + spoken help from SD. The person talks to the assistant in real time about what they see.
- [ ] All four modes read the same AbilityModel profile; the person's preferences (language, explanation length, audio, sensory) drive every mode. One set of explicit edits, four modes honouring them.

**Gate:** The person moves between all four modes in one session without re-setting preferences; each mode reads the same profile and honours the same consent gate.

#### SF — Pipecat UI + mobile client · ~1 week

**Capability used:** Pipecat UI (shadcn registry) + client SDKs (React Native).

The Nov 7 client uses the legacy Voice UI Kit. Pipecat UI replaces it with shadcn components installed as source — the incoming commits already started this (components.json, the Pipecat UI components).

- [ ] Finish the **Pipecat UI** integration: replace the custom App.tsx UI with the shadcn registry components (audio-visualizer-bar, device-select, user-audio-control). These are the components the incoming commits added.
- [ ] Add a **React Native client** using `@pipecat-ai/client-react-native` for mobile. Same bot backend, different client SDK. The person practises on their phone, not just the demo laptop.
- [ ] Keep the toolkit DOM adapters running on both clients — the React web client runs them natively; the React Native client needs a bridge or a re-implementation (the adapters are pure-DOM, so the React Native side wraps the same logic in native components).

**Gate:** The person drives the role-play from a phone; the same toolkit adapters (read-aloud, simplify, stop-auto-advance) are active on both web and mobile.

### Tooling the v1.1 build uses

- **Whisker** (Pipecat's real-time debugger) — inspect the pipeline while it runs, see frame flow, catch where a turn detection fails. Essential for SB (multi-agent) and SD (multimodal).
- **Tail** (terminal dashboard) — monitor active sessions during dev.
- **`pipecat eval`** — run the PRD's 20-case approval suite (§5.1 of the implementation plan) against the Flows build. The Nov 7 demo skips this; v1.1 doesn't.

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
