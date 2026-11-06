"""
Rehearse the Journey — Pipecat Bot (S0 / S1 baseline)
======================================================
Receptionist Joy: Hospital Reception, Level 1 — fictional fixture.

Transport : SmallWebRTC  (no Daily account needed, runs on localhost:7860)
LLM       : OpenAI GPT-4o   (primary — set OPENAI_API_KEY in .env)
STT       : OpenAI Whisper  (bundled with [openai] extra)
TTS       : OpenAI TTS      (voice: nova — warm, female)

Gemini Live (optional):
    Set GOOGLE_API_KEY (or GEMINI_API_KEY) and USE_GEMINI_LIVE=1 in .env
    to switch to Gemini Multimodal Live speech-to-speech.

Run:
    cd apps/rehearse-journey/bot
    uv sync
    uv run bot.py        # then open http://localhost:7860
"""

import os
import sys

from dotenv import load_dotenv
from loguru import logger

load_dotenv()

logger.remove()
logger.add(sys.stderr, level=os.getenv("LOG_LEVEL", "INFO"))

# ---------------------------------------------------------------------------
# Key check — fail fast with a readable message before heavy imports
# ---------------------------------------------------------------------------
USE_GEMINI_LIVE = os.getenv("USE_GEMINI_LIVE", "0").strip() == "1"
GOOGLE_API_KEY  = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY")

if USE_GEMINI_LIVE:
    if not GOOGLE_API_KEY:
        logger.error(
            "USE_GEMINI_LIVE=1 but GOOGLE_API_KEY / GEMINI_API_KEY is not set in .env.\n"
            "Set the key, or set USE_GEMINI_LIVE=0 to fall back to OpenAI STT+LLM+TTS."
        )
        sys.exit(1)
    logger.info("🔑  Key check OK — Gemini Live path selected.")
else:
    if not OPENAI_API_KEY:
        logger.error(
            "OPENAI_API_KEY is not set in .env.\n"
            "Add it, or set GOOGLE_API_KEY + USE_GEMINI_LIVE=1 to use Gemini Live."
        )
        sys.exit(1)
    logger.info("🔑  Key check OK — OpenAI STT + GPT-4o + TTS path selected.")

# ---------------------------------------------------------------------------
# Pipecat imports
# ---------------------------------------------------------------------------
from pipecat.frames.frames import EndFrame, LLMMessagesFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.runner.run import main
from pipecat.runner.types import RunnerArguments, SmallWebRTCRunnerArguments

# ---------------------------------------------------------------------------
# Joy character — fictional fixture, clearly labelled
# ---------------------------------------------------------------------------
JOY_SYSTEM_PROMPT = """
You are Receptionist Joy — a warm, patient, plain-language hospital receptionist
at a **fictional** Nairobi hospital used only for conversation practice.

⚠️ FICTION LABEL: This is a practice scenario. If asked whether this is real,
   say clearly: "This is a practice scenario — not a real hospital."

ROLE
  Greet visitors, ask for their ID or registration card, direct them to the
  correct waiting area. Never invent real hospital policies or real doctor
  names (use "Dr. Kamau" as a placeholder). Speak in short, clear sentences —
  two sentences per turn maximum.

LEVEL 1 (Easy Start — short, predictable)
  1. Greet and ask why the visitor is here.
  2. Ask for National ID or clinic registration card.
  3. Direct them to Waiting Area B, then say goodbye.
  After step 3 end the exchange warmly.

TONE  Warm, calm, never hurried. If the user seems confused, offer a hint.
LANGUAGE  English only.
""".strip()

# Opening greeting trigger message
GREETING_TRIGGER = "[Session start — deliver your Level 1 opening greeting now.]"


# ---------------------------------------------------------------------------
# Bot entry point — called per session by the Pipecat runner
# ---------------------------------------------------------------------------
async def bot(runner_args: RunnerArguments) -> None:
    """Main bot session. Called by pipecat.runner.run.main() for each connection."""

    # ── Transport ────────────────────────────────────────────────────────────
    if not isinstance(runner_args, SmallWebRTCRunnerArguments):
        logger.error(f"Unsupported runner args type: {type(runner_args)}")
        return

    transport = runner_args.create_transport()

    # ── AI services ─────────────────────────────────────────────────────────
    if USE_GEMINI_LIVE:
        from pipecat.services.google.llm import GoogleLLMService
        from pipecat.services.google.stt import GoogleSTTService
        from pipecat.services.google.tts import GoogleTTSService

        stt = GoogleSTTService(api_key=GOOGLE_API_KEY)
        llm = GoogleLLMService(
            api_key=GOOGLE_API_KEY,
            model="gemini-2.0-flash-live-001",
        )
        tts = GoogleTTSService(api_key=GOOGLE_API_KEY, voice="en-US-Studio-O")
    else:
        from pipecat.services.openai.llm import OpenAILLMService
        from pipecat.services.openai.stt import OpenAISTTService
        from pipecat.services.openai.tts import OpenAITTSService

        stt = OpenAISTTService(api_key=OPENAI_API_KEY)
        llm = OpenAILLMService(api_key=OPENAI_API_KEY, model="gpt-4o")
        tts = OpenAITTSService(api_key=OPENAI_API_KEY, voice="nova")

    # ── Context / prompt ────────────────────────────────────────────────────
    context = OpenAILLMContext(
        messages=[{"role": "system", "content": JOY_SYSTEM_PROMPT}]
    )
    context_aggregator = llm.create_context_aggregator(context)

    # ── Pipeline ─────────────────────────────────────────────────────────────
    # audio-in → STT → user-context → LLM → TTS → audio-out → assistant-context
    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(allow_interruptions=True),
    )

    # ── Events ───────────────────────────────────────────────────────────────

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected — triggering Joy's greeting.")
        # Queue Joy's opening greeting without waiting for user input
        await task.queue_frames(
            [
                LLMMessagesFrame(
                    messages=[
                        {"role": "system", "content": JOY_SYSTEM_PROMPT},
                        {"role": "user", "content": GREETING_TRIGGER},
                    ]
                )
            ]
        )

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected — ending pipeline.")
        await task.queue_frames([EndFrame()])

    # ── Run ──────────────────────────────────────────────────────────────────
    runner = PipelineRunner()
    await runner.run(task)


# ---------------------------------------------------------------------------
# CLI entry-point
# `uv run bot.py` → starts FastAPI dev server on http://localhost:7860
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    main()
