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

- Maps / Explore + Routes (the whole location layer).
- Multi-agent chaos levels — one character only for the demo.
- The 20-case approval suite — minimal approve/deny on advance + exit only.
- `save_checklist` + the full 7-stage flow — reduce to: pick scenario → set preferences → rehearse (spoken + typed) → pause/exit.
- Gemini Live ephemeral-token flow — use the simplest working transport; ephemeral tokens are v1.1.
- `@generative-a11y/ai-sdk` chat-stream pacing — use the toolkit `read-aloud` adapter for visual narration.
- Learn mode, NotebookLM, accounts, backend DB, profile inference, camera input.

If the clock runs out, drop S3 adapters last (they're the 20% differentiator); never drop Pause/Exit reliability (it's safeguarding).

---

## 4. Sprints (tonight + Sat AM)

Estimates are planning, not guarantees. Demo is 08:00 Sat. Freeze **2 h before** the confirmed presentation slot.

### S0 — Pipecat foundation + key check · tonight · ~1.5 h
- [ ] Install `uv` (if missing): `curl -LsSf https://astral.sh/uv/install.sh | sh`
- [ ] Install the Pipecat CLI: `uv tool install "pipecat-ai[cli]"`; verify `pipecat --version`.
- [ ] Scaffold the web bot **interactively** (safest for a first run):
      `cd /home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit`
      `pipecat init apps/rehearse-journey`
      Choose: Web/Mobile → React → Vite → **SmallWebRTC** transport → **Gemini Live (speech-to-speech)** LLM.
      (If the wizard doesn't offer SmallWebRTC + Gemini Live together, accept Daily for transport — it's fine for a local demo; you just need the Daily key.)
- [ ] `cd apps/rehearse-journey/bot`, `uv add "pipecat-ai[google]"`, `cp .env.example .env`.
- [ ] **Set `GOOGLE_API_KEY` to the hub's `GEMINI_API_KEY` value.** (Pipecat reads `GOOGLE_API_KEY`; the hub provisions `GEMINI_API_KEY` — same key, different env var name.) Confirm the key has **Gemini Live / Multimodal Live access** and a Live-eligible model.
- [ ] `uv run bot.py` → serves `http://localhost:7860`. Do the first run **now** (it downloads models, ~20 s; never first-run on stage). Talk to the bot once.
- [ ] **Gate:** the scaffolded bot answers you live over SmallWebRTC on the demo machine. If Gemini Live access is missing, fall back to STT+LLM+TTS (Deepgram + Gemini/OpenAI + Cartesia/Google TTS) and record the fallback as a status note — do not claim Live is verified when it isn't.

### S1 — One Receptionist Joy role-play Flow · tonight · ~2.5 h
- [x] In `bot.py`, set the system prompt to pin the character: Receptionist Joy, the **fictional** hospital reception, Level 1 (short predictable exchange), warm plain-language tone, never invents the hospital's real internal process.
- [ ] Get one full spoken turn working end-to-end: user speaks → Joy responds in character, on the demo machine mic.
- [x] Add the **typed role-play input** in the React client as the guaranteed alternative — send text into the same conversation. Mic must not be required. Implemented via RTVI; browser regression uses a mocked bot. Provider-backed acceptance remains below.
- [x] Label the fixture as fictional in the UI.
- [ ] **Gate:** you can complete one spoken role-play turn with Joy **and** one typed turn, on the demo machine, without the mic.

S1 implementation note (Nov 6): the Level 1 sequence is prompt-driven, not a
Pipecat Flows state machine. OpenAI STT → GPT-4o → TTS is the selected default;
the optional Gemini path now uses the actual Gemini Live service, but is unverified.
The client starts with mic off and offers explicit microphone activation. Build,
Python syntax, and mocked browser checks pass. Local-provider and physical-mic
checks remain open; do not mark S0 or S1 gates complete from those automated checks.

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

## 8. Immediate start (do this now)

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
