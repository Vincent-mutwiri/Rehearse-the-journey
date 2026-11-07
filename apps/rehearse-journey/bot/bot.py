"""Receptionist Joy & Kioo v1.1 Pipecat Bot:
- Structured Pipecat Flows (SA: Hospital L1-L4, Matatu, Government, Directions)
- Multi-agent handoff & parallel fan-out (SB: Joy <-> Patient Amani)
- Vendor-agnostic provider stacks + runtime fallback chain (SC)
- Multimodal camera sign explanation helper (SD)
- Four-mode router: Learn, Practise, Explore, Live help (SE)
- Whisker + Tail dev telemetry (SF.4)
"""

import asyncio
import os
import sys

from dotenv import load_dotenv
from loguru import logger

from dev_tooling import create_dev_telemetry
from flow_engine import FlowEngine
from mode_router import EXPLORE_SYSTEM_PROMPT
from multi_agent import PERSONAS, MultiAgentBus
from providers import FallbackChainCoordinator, ProviderRegistry
from scenario import JOY_SYSTEM_PROMPT, get_level, level_prompt
from vision import VISION_SYSTEM_PROMPT
from clarification import ClarificationPractice

load_dotenv()
logger.remove()
logger.add(sys.stderr, level=os.getenv("LOG_LEVEL", "INFO"))


def check_keys():
    """Backward-compatible key check + SC.1 provider selection."""
    audio_pref = os.getenv("ABILITY_AUDIO_ENABLED", "1").strip() != "0"
    selection = ProviderRegistry.from_profile(audio_preference=audio_pref)
    logger.info(
        "Provider stack selected: {} ({}) — {}",
        selection.stack_id,
        selection.display_name,
        selection.reason,
    )
    if selection.stack_id == "gemini_proxy":
        return "gemini_text", selection.api_key or ""
    if selection.stack_id == "gemini_live":
        return "gemini", selection.api_key or ""
    if selection.stack_id in ("openai", "deepgram_openai_cartesia"):
        return "openai", selection.api_key or ""
    # SC.3: No valid keys -> fall back cleanly to text_only with a readable log instead of crashing
    logger.warning("No voice provider key found; falling back to text_only mode.")
    return "text_only", ""


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


def build_system_instruction(
    mode: str,
    flow_engine: FlowEngine,
    bus: MultiAgentBus,
) -> str:
    """Compose mode + persona character prompt + current Flow node sequence."""
    if mode == "live-help":
        return f"{JOY_SYSTEM_PROMPT}\n\n[LIVE HELP VISION MODE]\n{VISION_SYSTEM_PROMPT}"
    if mode == "explore":
        return f"{JOY_SYSTEM_PROMPT}\n\n[EXPLORE LOCATION MODE]\n{EXPLORE_SYSTEM_PROMPT}"
    persona = PERSONAS.get(bus.active_speaker_id, PERSONAS["joy"])
    node = flow_engine.current_node
    return (
        f"{JOY_SYSTEM_PROMPT}\n\n"
        f"[ACTIVE PERSONA: {persona.display_name} ({persona.role_badge})]\n"
        f"{persona.character_instructions}\n\n"
        f"[CURRENT FLOW NODE: {node.id} — {node.step_title}]\n"
        f"{node.entry_prompt}"
    )


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

    from pipecat.processors.frameworks.rtvi import RTVIProcessor

    class StoryRTVIProcessor(RTVIProcessor):
        """Forwards FlowEngine, MultiAgentBus, and DevTelemetry events to the client as RTVI server messages.

        Typed input and browser-STT speech both arrive as ``send-text`` messages,
        so hooking here makes story_open / flow_node_transition / speaker_changed /
        approval_proposal events fire for either input path.
        """

        def __init__(
            self,
            engine: FlowEngine,
            bus: MultiAgentBus,
            telemetry,
            fallback_coordinator: FallbackChainCoordinator,
            context=None,
            **kwargs,
        ):
            super().__init__(**kwargs)
            self._engine = engine
            self._bus = bus
            self._telemetry = telemetry
            self._fallback = fallback_coordinator
            self._context = context

        async def _send_flow_events(self, decision):
            for event in decision.rtvi_events:
                await self.send_server_message(event)

        async def _handle_send_text(self, data, message_id, user_id=None):
            text = (getattr(data, "content", "") or "").strip()
            self._telemetry.trace_frame("in", "UserSendText", text[:80])
            self._bus.record_turn("user", text)

            # SB.3: If two personas overlapped on the prior turn, user's response selects who continues
            if self._bus.parallel_overlap_active:
                resolved = self._bus.resolve_parallel_barge_in(text)
                self._telemetry.active_speaker = self._bus.active_speaker_id
                await self.send_server_message(resolved)

            decision = self._engine.evaluate_user_turn(text)
            self._telemetry.current_node = decision.node_id

            # SB.2 & SB.3: Multi-agent handoff or parallel fan-out
            if decision.handoff_to:
                handoff_evt = self._bus.handoff(decision.handoff_to, parallel=decision.parallel_fanout)
                self._telemetry.active_speaker = self._bus.active_speaker_id
                await self.send_server_message(handoff_evt)
            if decision.parallel_fanout:
                fanout_evt = self._bus.build_parallel_fanout_turn()
                await self.send_server_message(fanout_evt)

            await self._send_flow_events(decision)

            # Inject current Flow node + active persona guidance so the LLM follows the state machine
            if self._context is not None:
                persona = self._bus.active_persona
                self._context.add_message({
                    "role": "system",
                    "content": (
                        f"[ACTIVE PERSONA: {persona.display_name} ({persona.role_badge})] "
                        f"{persona.character_instructions}\n"
                        f"[FLOW STEP '{decision.node_id}' ({decision.step_title})]: "
                        f"{decision.instruction_for_llm}"
                    ),
                })

            await super()._handle_send_text(data, message_id, user_id)

    scenario_id = os.getenv("REHEARSAL_SCENARIO", "hospital")
    level = int(os.getenv("REHEARSAL_LEVEL", "1"))
    mode = os.getenv("REHEARSAL_MODE", "practise")
    camera_enabled = os.getenv("ENABLE_CAMERA_STREAM", "0").strip() == "1"

    flow_engine = FlowEngine(scenario_id=scenario_id, level=level, base_prompt=JOY_SYSTEM_PROMPT)
    clarification = ClarificationPractice()
    bus = MultiAgentBus(active_speaker_id=flow_engine.flow.primary_persona)
    fallback_coordinator = FallbackChainCoordinator(
        audio_preference=os.getenv("ABILITY_AUDIO_ENABLED", "1").strip() != "0"
    )
    telemetry = create_dev_telemetry()
    telemetry.scenario_id = scenario_id
    telemetry.level = level
    telemetry.mode = mode
    telemetry.active_stack = fallback_coordinator.current.stack_id
    telemetry.active_speaker = bus.active_speaker_id
    telemetry.current_node = flow_engine.current_node_id

    provider, key = check_keys()
    system_prompt = build_system_instruction(mode, flow_engine, bus)

    transport = SmallWebRTCTransport(
        webrtc_connection=runner_args.webrtc_connection,
        params=TransportParams(
            audio_in_enabled=provider != "text_only",
            audio_out_enabled=provider != "text_only",
            audio_in_stream_on_start=False,
            video_in_enabled=camera_enabled or mode == "live-help",
        ),
    )

    if provider == "gemini":
        from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService

        settings = {"system_instruction": system_prompt, "voice": bus.active_persona.voice_gemini}
        if os.getenv("GEMINI_LIVE_MODEL"):
            settings["model"] = os.environ["GEMINI_LIVE_MODEL"]
        llm = GeminiLiveLLMService(
            api_key=key,
            settings=GeminiLiveLLMService.Settings(**settings),
            http_options=_proxy_http_options(),
            inference_on_context_initialization=False,
        )
        before_user, after_user = [], [llm]

    elif provider in ("gemini_text", "text_only"):
        from pipecat.services.google.llm import GoogleLLMService
        from pipecat.services.google.tts import GeminiTTSService

        http_options = _proxy_http_options()
        llm = GoogleLLMService(
            api_key=key or "text-only-placeholder",
            model=os.getenv("GEMINI_TEXT_MODEL", "gemini-3.8-flash"),
            system_instruction=system_prompt,
            http_options=http_options,
        )
        if provider == "text_only":
            before_user, after_user = [], [llm]
        else:
            tts = GeminiTTSService(
                api_key=key,
                model=os.getenv("GEMINI_TTS_MODEL", "gemini-3.8-flash-lite-tts"),
                voice=os.getenv("GEMINI_TTS_VOICE", bus.active_persona.voice_gemini),
                http_options=http_options,
                use_genai=True,
            )
            before_user, after_user = [], [llm, tts]

    else:  # openai or deepgram_openai_cartesia
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
                model="gpt-4o", system_instruction=system_prompt, max_tokens=180,
            ),
        )
        tts = OpenAITTSService(
            api_key=key,
            settings=OpenAITTSService.Settings(model="tts-1", voice=bus.active_persona.voice_openai),
        )
        before_user, after_user = [stt], [llm, tts]

    context = LLMContext()
    user, assistant = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )
    worker = PipelineWorker(
        Pipeline([
            transport.input(), *before_user, user, *after_user,
            transport.output(), assistant,
        ]),
        params=PipelineParams(enable_metrics=False, enable_usage_metrics=False),
        enable_rtvi=True,
        rtvi_processor=StoryRTVIProcessor(
            flow_engine,
            bus=bus,
            telemetry=telemetry,
            fallback_coordinator=fallback_coordinator,
            context=context,
        ),
    )
    runner = WorkerRunner(handle_sigint=runner_args.handle_sigint)
    await runner.add_workers(worker)
    greeted = False
    selected_level = None
    level_timeout_task = None

    async def start_selected_level(level_id, client_message=None, clarification_settings=None):
        """Validate the client choice, configure the prompt, then greet once."""
        nonlocal greeted, selected_level
        try:
            selected_level = get_level(level_id)
        except ValueError as error:
            if client_message is not None:
                await worker.rtvi.send_error_response(client_message, str(error))
            logger.warning(str(error))
            return

        # One model is intentionally used for all levels. The explicit prompt
        # and speaker limit provide controlled multi-character simulation.
        clarification.configure(clarification_settings or {})
        llm.append_system_instruction(level_prompt(selected_level))
        llm.append_system_instruction(clarification.prompt_instruction())
        logger.info(
            "Hospital level {} selected: {} (people={}, max_active_speakers={})",
            selected_level.id,
            selected_level.name,
            selected_level.people,
            selected_level.max_active_speakers,
        )
        if client_message is not None:
            await worker.rtvi.send_server_response(client_message, {
                "level_id": selected_level.id,
                "name": selected_level.name,
                "characters": list(selected_level.characters),
                "max_active_speakers": selected_level.max_active_speakers,
                "clarificationPractice": clarification.snapshot(),
            })
        if greeted:
            return
        greeted = True
        await rtvi.send_server_message({
            "type": "provider_selected",
            "stack_id": fallback_coordinator.current.stack_id,
            "display_name": fallback_coordinator.current.display_name,
            "reason": fallback_coordinator.current.reason,
        })
        opening = flow_engine.opening_instruction()
        telemetry.trace_frame("out", "FlowOpening", opening.step_title)
        for event in opening.rtvi_events:
            await rtvi.send_server_message(event)
        context.add_message({
            "role": "user",
            "content": (
                f"Please start the fictional practice with your opening greeting. "
                f"Follow current Flow node '{opening.node_id}': {opening.instruction_for_llm}"
            ),
        })
        await worker.queue_frames([LLMRunFrame()])

    @worker.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        # The client sends set-level immediately after connect. Do not greet
        # before that message, otherwise the selected level would be ignored.
        nonlocal level_timeout_task
        if level_timeout_task is None:
            async def default_level_after_timeout():
                await asyncio.sleep(2.0)
                if not greeted:
                    await start_selected_level("1")
            level_timeout_task = asyncio.create_task(default_level_after_timeout())

    @worker.rtvi.event_handler("on_client_message")
    async def on_client_message(message):
        if message.type == "set-level":
            data = message.data if isinstance(message.data, dict) else {}
            await start_selected_level(
                data.get("level_id"),
                message,
                data.get("clarificationPractice"),
            )
        elif message.type == "send-text" and clarification.enabled:
            data = message.data if isinstance(message.data, dict) else {}
            content = data.get("content", "")
            if isinstance(content, str):
                clarification_result = clarification.handle_user_message(content)
                if clarification_result.get("is_clarification"):
                    llm.append_system_instruction(
                        "The user is asking for clarification. Answer with this exact "
                        f"specific meaning, without introducing a new ambiguity: "
                        f"{clarification_result['specific_instruction']}"
                    )
                else:
                    scheduled = clarification.next_instruction()
                    if scheduled and "vague_instruction" in scheduled:
                        clarification.record_delivered()
                        llm.append_system_instruction(
                            "For the next ordinary, non-safety direction, use this "
                            f"mildly vague wording: {scheduled['vague_instruction']}. "
                            f"Its exact meaning is: {scheduled['specific_instruction']}. "
                            "If the user asks what you mean, give the exact meaning."
                        )

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        telemetry.trace_frame("in", "ClientDisconnected", "Session closed")
        await runner.cancel()

    await runner.run()


if __name__ == "__main__":
    provider, _ = check_keys()
    logger.info("Starting {} rehearsal; provider stack ready.", provider)
    from pipecat.runner.run import main

    main()
