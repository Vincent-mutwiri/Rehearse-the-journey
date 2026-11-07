# Rehearse the Journey — Demo App

**Demo date:** Sat Nov 7, 2026 · Senses Hub, Nairobi  
**Sprint plan:** [`Project/Pipecat-Nov7-sprint-plan.md`](../../Project/Pipecat-Nov7-sprint-plan.md)

## Structure

```
apps/rehearse-journey/
├── bot/        Python Pipecat backend — Receptionist Joy voice bot
└── client/     React + TypeScript + Vite frontend
```

## Quick start

### Bot (Python — terminal 1)
```bash
cd bot
uv sync
uv run bot.py          # serves on http://localhost:7860
```

### Client (React — terminal 2)
```bash
cd client
pnpm install
pnpm dev               # serves on http://localhost:3000
```

Open **http://localhost:3000** in Chrome.

### Calm Me

The persistent **Calm Me** button is in the upper-right corner of the app.
It opens an independent calming session that reads the exact predefined
opening and Kenyan Swahili/Sheng affirmations aloud using the browser's native
speech synthesis. It does not request the microphone, listen, record, or send
conversation audio to Pipecat. If a rehearsal is active, opening Calm Me pauses
that rehearsal; it never resumes it automatically.

Use the overlay to pause or continue voice, adjust volume and speed, repeat the
sequence, or end the session. Voice availability and Swahili pronunciation
depend on the voices installed by the browser/operating system. When speech
synthesis is unavailable, the affirmations remain readable and can be advanced
manually.

Start Rehearsal connects with the microphone off. Type a made-up reply and press
Send (or Enter; Shift+Enter adds a line). Turn microphone on only when you want
to speak. Both input methods use the same bot conversation.

Pause disconnects and stops the local and remote audio tracks. Reconnect starts
a new exchange with the mic off; it does not restore the previous bot context.
Hospital Reception now offers five levels; changing level stops the current
session before returning to the selection screen.

## Hospital Reception levels

| Level | Name | People | Behaviour |
|---|---|---:|---|
| 1 | Easy Start | 1 | Joy, short predictable exchange |
| 2 | Everyday Conversation | 1 | Joy, longer follow-up questions |
| 3 | Multiple People | 2 | Joy and Amani, brief turn changes |
| 4 | Busy Environment | 3–4 | Joy, Amani, Nurse Wanjiku, Attendant |
| 5 | Unpredictable Environment | Variable | Controlled changes with up to four speakers |

The client sends a validated `set-level` RTVI message before the greeting. The
backend validates the ID and applies the corresponding prompt configuration.
Levels 3–5 use one Pipecat LLM with explicit speaker orchestration; they are not
represented as independent AI agents. Only one simulated speaker is allowed per
response and background audio is off by default. Pause, Resume, Repeat/Help,
typed input, microphone control and Exit remain available across levels.

## Sprint 1 verification

The five reception levels are prompt-configured, not yet a Pipecat Flows state
machine or independent multi-agent handoff system.

| Check | Status |
|---|---|
| TypeScript + production build | Passed |
| Python syntax | Passed |
| Five-level configuration tests | Passed |
| Level selection TypeScript/build | Passed |
| Browser UI with mocked SDK connection | Passed |
| Provider-backed typed reply | Not yet verified |
| Spoken reply on demo-machine mic | Not yet verified |
| Optional Gemini Live | Not yet verified |

The browser regression covers mic-off start, typed replies, unsent draft
preservation, disabled sends while paused, reconnect, and exit. It makes no AI
requests. With Vite running, Python Playwright and Chrome installed:

```bash
python3 client/test/rehearsal-e2e.py http://localhost:3000
```

Manual S1 gate (use fictional details only):

1. Start the bot and React client. Start Rehearsal and check Joy's fictional
   greeting appears in the transcript. Check Chrome has not requested mic access.
2. With the mic off, type “I am here for my pretend appointment.” Check Joy replies
   about the pretend clinic card. Type “No card today” and check the exchange ends
   warmly with the fictional waiting-area direction.
3. Start again, turn the mic on explicitly, and complete a spoken turn. Check
   both your final transcript and Joy's answer appear.
4. Pause during Joy's audio, then Exit. Verify sound and mic stop. Reconnect must
   leave the mic off. Record results before marking either sprint gate complete.

## S0 gate

- [ ] `uv run bot.py` starts without errors
- [ ] `http://localhost:7860` loads the SmallWebRTC page
- [ ] Joy responds to your voice over WebRTC
- [ ] Key check passes (see bot README for key setup)

## Keys

| Variable | Where | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | `bot/.env` | STT + LLM + TTS (default) |
| `GOOGLE_API_KEY` | `bot/.env` | Gemini Live (optional — set `USE_GEMINI_LIVE=1` too) |

The hub sets `OPENAI_API_KEY` in the shell environment — `uv run bot.py` will
pick it up automatically even without an explicit `.env` entry.

## Fictional fixture disclosure

All hospital names, doctor names, and processes are **fictional** and used only
for conversation practice. The PRD's "fit to real person" criterion is noted
as unmet in this demo build.

## Joy’s 3D character

Joy is an original procedural Three.js character rendered through React Three
Fiber 8 (the client uses React 18). `client/src/components/JoyScene.tsx` defines
seven named bones, a body with blended skin weights, and bone-attached facial
features and limbs. There are no external model or texture downloads.

The conversation state drives breathing, listening tilts, connecting glances,
speaking gestures and a farewell pose. Each completed user turn triggers a brief
nod. Mouth movement represents the speaking state; it is not phoneme lip sync.

The scene loads in a separate chunk. OS reduced motion, Reduce motion, Stop
auto-advance and paused/ended sessions all stop continuous rendering. A text
placeholder keeps Joy’s accessible label available while loading or if WebGL
fails. Edit the rig and its frame poses in `JoyScene.tsx` to change the character.

## S4.5 accessibility review

Keyboard navigation, focus visibility, browser accessibility semantics, and
visualizer motion have a dedicated regression:

```bash
cd client
python3 test/s45-accessibility.py http://localhost:3003
```

See [the S4.5 evidence and Linux review walkthrough](evidence/s4.5/README.md).
The laptop has a **Turn off screen reader** desktop launcher for Orca; app
read-aloud speech has a separate **Stop page speech** control. Full Orca usability
and co-designer acceptance remain pending. The latest isolated OpenAI voice
attempt was blocked by HTTP 401, so physical-mic/provider voice is not verified.
