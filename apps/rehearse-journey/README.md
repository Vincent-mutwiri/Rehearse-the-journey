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
