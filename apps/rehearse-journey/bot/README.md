# Rehearse the Journey — Bot

Pipecat voice bot powering **Receptionist Joy** — a fictional hospital reception
practice conversation for the Rehearse the Journey demo.

## Quick start

```bash
# 1. Install deps (uv must be installed — curl -LsSf https://astral.sh/uv/install.sh | sh)
cd apps/rehearse-journey/bot
uv sync

# 2. Set your API key
cp .env.example .env
# Edit .env — add OPENAI_API_KEY (already set in hub env, so this may be pre-filled)

# 3. Run the bot (serves on http://localhost:7860)
uv run bot.py
```

Then open `http://localhost:7860` in Chrome and talk to Joy.

## Key selection

| Scenario | What to set |
|---|---|
| Hub OpenAI key (default) | `OPENAI_API_KEY` in `.env` |
| Gemini Live | `GOOGLE_API_KEY` + `USE_GEMINI_LIVE=1` in `.env` |

> **Note:** Pipecat reads `GOOGLE_API_KEY`. The hub provisions `GEMINI_API_KEY`.
> Set both to be safe: `GOOGLE_API_KEY=<value>` and `GEMINI_API_KEY=<value>`.

## What this is

- **Character:** Receptionist Joy, fictional Nairobi hospital, Level 1 (Easy Start)
- **Transport:** SmallWebRTC — no Daily account needed for local demo
- **LLM:** GPT-4o (or Gemini 2.0 Flash Live if Gemini Live path is selected)
- **STT:** OpenAI Whisper
- **TTS:** OpenAI TTS, voice `nova`

## Status labels (S0 gate)

| Integration | Status |
|---|---|
| `uv run bot.py` starts | 🟡 Verify after `uv sync` |
| Bot answers on localhost:7860 | 🟡 Verify after first run |
| OpenAI STT+LLM+TTS | 🟡 Key set, verify live |
| Gemini Live | ⚪ Not tested (key not set) |

## Fictional fixture disclosure

This scenario uses a scripted fictional hospital. It **does not** represent a
real institution, a real co-designer's journey, or validated clinical processes.
The PRD's "fit to real person" criterion is noted as unmet for the demo build.
