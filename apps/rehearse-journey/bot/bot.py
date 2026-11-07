"""Receptionist Joy: fictional Level 1 practice over SmallWebRTC.

RTVI carries typed input and transcripts through the same session as speech.
"""

import os
import sys

from dotenv import load_dotenv
from loguru import logger

from scenario import JOY_SYSTEM_PROMPT

load_dotenv()
logger.remove()
logger.add(sys.stderr, level=os.getenv("LOG_LEVEL", "INFO"))


def check_keys():
    """Check presence only; this does not verify provider access."""
    if os.getenv("USE_GEMINI_LIVE", "0").strip() == "1":
        key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError("Set GOOGLE_API_KEY or GEMINI_API_KEY for Gemini Live.")
        # The Lovable team proxy carries REST (generateContent) but not the
        # Live WebSocket (bidiGenerateContent). When a proxy base URL is set,
        # use the REST text LLM + Gemini TTS path, not Live. STT is handled
        # in the browser (Web Speech API) and arrives as RTVI sendText.
        if os.getenv("GEMINI_PROXY_BASE_URL"):
            return "gemini_text", key
        return "gemini", key
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise ValueError("Set OPENAI_API_KEY in bot/.env for the OpenAI pipeline.")
    return "openai", key


def _proxy_http_options():
    """HttpOptions pointing the google-genai Client at the Lovable proxy, if set."""
    proxy_base = os.getenv("GEMINI_PROXY_BASE_URL")
    if not proxy_base:
        return None
    from google.genai.types import HttpOptions
    opts = HttpOptions(
        base_url=proxy_base,
        api_version=os.getenv("GEMINI_PROXY_API_VERSION", "v1beta"),
    )
    logger.info(f"Routing Gemini through proxy: {proxy_base}")
    return opts


async def bot(runner_args):
    # Importing this module never checks credentials or initializes media.
    from pipecat.audio.vad.silero import SileroVADAnalyzer
    from pipecat.frames.frames import LLMRunFrame
    from pipecat.pipeline.pipeline import Pipeline
    from pipecat.pipeline.worker import PipelineParams, PipelineWorker
    from pipecat.processors.aggregators.llm_context import LLMContext
    from pipecat.processors.aggregators.llm_response_universal import (
        LLMContextAggregatorPair,
        LLMUserAggregatorParams,
    )
    from pipecat.runner.types import SmallWebRTCRunnerArguments
    from pipecat.transports.base_transport import TransportParams
    from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
    from pipecat.workers.runner import WorkerRunner

    if not isinstance(runner_args, SmallWebRTCRunnerArguments):
        raise ValueError("This demo requires SmallWebRTC; run without a transport override.")

    provider, key = check_keys()
    transport = SmallWebRTCTransport(
        webrtc_connection=runner_args.webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_stream_on_start=False,
        ),
    )

    if provider == "gemini":
        # Gemini Live (speech-to-speech) — only works without the proxy; the
        # proxy 404s the bidi WebSocket. STT is server-side (Live hears audio).
        from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService

        settings = {"system_instruction": JOY_SYSTEM_PROMPT, "voice": "Aoede"}
        if os.getenv("GEMINI_LIVE_MODEL"):
            settings["model"] = os.environ["GEMINI_LIVE_MODEL"]
        llm = GeminiLiveLLMService(
            api_key=key,
            settings=GeminiLiveLLMService.Settings(**settings),
            http_options=_proxy_http_options(),
            inference_on_context_initialization=False,
        )
        before_user, after_user = [], [llm]

    elif provider == "gemini_text":
        # Gemini REST text LLM + Gemini TTS, both through the Lovable proxy.
        # No server-side STT — the browser's Web Speech API transcribes the
        # person's speech and sends it as RTVI sendText, which the
        # LLMUserAggregator accepts as a user turn. Joy's reply is spoken by
        # GeminiTTSService (gemini-3.8-flash-lite-tts) through the proxy.
        from pipecat.services.google.llm import GoogleLLMService
        from pipecat.services.google.tts import GeminiTTSService

        http_options = _proxy_http_options()
        llm = GoogleLLMService(
            api_key=key,
            model=os.getenv("GEMINI_TEXT_MODEL", "gemini-3.8-flash"),
            system_instruction=JOY_SYSTEM_PROMPT,
            http_options=http_options,
        )
        tts = GeminiTTSService(
            api_key=key,
            model=os.getenv("GEMINI_TTS_MODEL", "gemini-3.8-flash-lite-tts"),
            voice=os.getenv("GEMINI_TTS_VOICE", "Leda"),
            http_options=http_options,
            use_genai=True,
        )
        # No STT in the pipeline — the browser transcribes and sends text.
        before_user, after_user = [], [llm, tts]

    else:  # openai
        from pipecat.services.openai.llm import OpenAILLMService
        from pipecat.services.openai.stt import OpenAISTTService
        from pipecat.services.openai.tts import OpenAITTSService

        stt = OpenAISTTService(
            api_key=key,
            settings=OpenAISTTService.Settings(model="whisper-1"),
        )
        llm = OpenAILLMService(
            api_key=key,
            settings=OpenAILLMService.Settings(
                model="gpt-4o", system_instruction=JOY_SYSTEM_PROMPT, max_tokens=180,
            ),
        )
        tts = OpenAITTSService(
            api_key=key,
            settings=OpenAITTSService.Settings(model="tts-1", voice="nova"),
        )
        before_user, after_user = [stt], [llm, tts]

    context = LLMContext()
    user, assistant = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )
    # Both RTVI send-text and STT append to this context, with no parallel history.
    worker = PipelineWorker(
        Pipeline([
            transport.input(), *before_user, user, *after_user,
            transport.output(), assistant,
        ]),
        params=PipelineParams(enable_metrics=False, enable_usage_metrics=False),
        enable_rtvi=True,
    )
    runner = WorkerRunner(handle_sigint=runner_args.handle_sigint)
    await runner.add_workers(worker)
    greeted = False

    @worker.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        # Wait for RTVI readiness so both the greeting and transcript arrive.
        nonlocal greeted
        if greeted:
            return
        greeted = True
        context.add_message({
            "role": "user",
            "content": "Please start the fictional practice with your opening greeting.",
        })
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        await runner.cancel()

    await runner.run()


if __name__ == "__main__":
    try:
        provider, _ = check_keys()
    except ValueError as error:
        logger.error(str(error))
        sys.exit(1)
    logger.info("Starting {} rehearsal; provider access is not yet verified.", provider)
    from pipecat.runner.run import main

    main()
