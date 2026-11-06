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

Start Rehearsal connects with the microphone off. Type a made-up reply and press
Send (or Enter; Shift+Enter adds a line). Turn microphone on only when you want
to speak. Both input methods use the same bot conversation.

Pause disconnects and stops the local and remote audio tracks. Reconnect starts
a new exchange with the mic off; it does not restore the previous bot context.
Scenario selection and advance/exit approval controls are still Sprint 2 work.

## Sprint 1 verification

The Level 1 reception sequence is prompt-driven, not a Pipecat Flows state machine.

| Check | Status |
|---|---|
| TypeScript + production build | Passed |
| Python syntax | Passed |
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
