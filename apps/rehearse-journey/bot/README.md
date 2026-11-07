# Rehearse the Journey — Bot

Pipecat voice bot powering **Receptionist Joy** — a fictional hospital reception
practice conversation for the Rehearse the Journey demo.

## Quick start

```bash
# 1. Install deps (uv must be installed — curl -LsSf https://astral.sh/uv/install.sh | sh)
cd apps/rehearse-journey/bot
uv sync --locked

# 2. Set your API key
cp .env.example .env
# Edit .env — add OPENAI_API_KEY (already set in hub env, so this may be pre-filled)

# 3. Run the bot (serves on http://localhost:7860)
uv run bot.py
```

Use the React client at `http://localhost:3000` for both typing and speaking.
The runner's `http://localhost:7860` page is also available for transport debugging.

## Key selection

| Scenario | What to set |
|---|---|
| Hub OpenAI key (default) | `OPENAI_API_KEY` in `.env` |
| Gemini Live (unverified) | Run `uv sync --locked --extra gemini`; set `GOOGLE_API_KEY` + `USE_GEMINI_LIVE=1` in `.env` |

> **Note:** Pipecat reads `GOOGLE_API_KEY`. The hub provisions `GEMINI_API_KEY`.
> Set both to be safe: `GOOGLE_API_KEY=<value>` and `GEMINI_API_KEY=<value>`.

## What this is

- **Character:** Receptionist Joy, fictional Nairobi hospital, Level 1 (Easy Start)
- **Transport:** SmallWebRTC — no Daily account needed for local demo
- **LLM:** GPT-4o (or Pipecat's Gemini Live service if selected; optional `GEMINI_LIVE_MODEL` override)
- **STT:** OpenAI Whisper
- **TTS:** OpenAI TTS, voice `nova`
- **Turn detection:** Silero VAD with the bundled ONNX model; Whisper needs explicit speech boundaries
- **Typed input:** RTVI send-text into the same context as speech; no microphone required
- **Sequence:** prompt-driven greeting → pretend clinic card → fictional waiting area

Pipecat is pinned to 1.15.0 with a committed lockfile. API key presence is only a
startup check; it does not prove provider/model access. No automated check has yet
verified the physical microphone or a live provider response. Keep logging at
INFO for the demo; verbose service logs can include conversation content.

## Status labels (S0 gate)

| Integration | Status |
|---|---|
| `uv run bot.py` starts | 🟡 Verify after `uv sync` |
| Bot answers on localhost:7860 | 🟡 Verify after first run |
| OpenAI STT+LLM+TTS | 🟡 Key set, verify live |
| Gemini Live | ⚪ Not tested (key not set) |

## v1.1 Modules & Whisker / Tail Dev Tooling

- `flow_config.py` & `flow_engine.py`: Structured Pipecat Flows across 4 scenarios & 4 chaos levels
- `multi_agent.py`: Shared-bus multi-agent handoff (`joy` ↔ `amani`) and parallel fan-out
- `providers.py`: Vendor-agnostic stack selection and runtime fallback chain
- `vision.py`: Live help camera sign explanation with non-navigation safety boundary
- `mode_router.py`: Four-mode router (`learn`, `practise`, `explore`, `live-help`)
- `dev_tooling.py`: Whisker real-time frame trace & Tail terminal session snapshot (`ENABLE_WHISKER=1 ENABLE_TAIL=1 uv run bot.py`)

Run all v1.1 unit/integration checks with:
```bash
python3 test_v11_sprints.py
```

## Fictional fixture disclosure

This scenario uses a scripted fictional hospital. It **does not** represent a
real institution, a real co-designer's journey, or validated clinical processes.
The PRD's "fit to real person" criterion is noted as unmet for the demo build.
