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
from typing import Optional

from dotenv import load_dotenv
from loguru import logger

from dev_tooling import create_dev_telemetry
from flow_engine import FlowEngine
from mode_router import EXPLORE_SYSTEM_PROMPT
from multi_agent import PERSONAS, MultiAgentBus
from providers import FallbackChainCoordinator, ProviderRegistry, ProviderSelection
from scenario import JOY_SYSTEM_PROMPT
from vision import VISION_SYSTEM_PROMPT
from clarification import ClarificationPractice

load_dotenv()
logger.remove()
logger.add(sys.stderr, level=os.getenv("LOG_LEVEL", "INFO"))


def select_provider_for_session(audio_preference: Optional[bool] = None) -> tuple[str, str, ProviderSelection]:
    """Select the active provider stack and return (provider_mode, api_key, selection)."""
    if audio_preference is None:
        audio_preference = os.getenv("ABILITY_AUDIO_ENABLED", "1").strip() != "0"
    selection = ProviderRegistry.from_profile(audio_preference=audio_preference)
    logger.info(
        "Provider stack selected: {} ({}) — {}",
        selection.stack_id,
        selection.display_name,
        selection.reason,
    )
    if selection.stack_id in ("gemini_proxy", "gemini_direct"):
        return "gemini_text", selection.api_key or "", selection
    if selection.stack_id == "gemini_live":
        return "gemini", selection.api_key or "", selection
    if selection.stack_id == "openai":
        return "openai", selection.api_key or "", selection
    logger.warning("Using text_only mode (no voice provider active or audio disabled).")
    return "text_only", "", selection


def check_keys():
    """Backward-compatible key check + SC.1 provider selection."""
    provider, key, _ = select_provider_for_session()
    return provider, key


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
    from pipecat.frames.frames import (
        ErrorFrame,
        Frame,
        LLMFullResponseEndFrame,
        LLMFullResponseStartFrame,
        LLMMessagesAppendFrame,
        LLMRunFrame,
        LLMTextFrame,
    )
    from pipecat.pipeline.pipeline import Pipeline
    from pipecat.pipeline.worker import PipelineParams, PipelineWorker
    from pipecat.processors.aggregators.llm_context import LLMContext
    from pipecat.processors.aggregators.llm_response_universal import (
        LLMContextAggregatorPair,
        LLMUserAggregatorParams,
    )
    from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
    from pipecat.runner.types import SmallWebRTCRunnerArguments
    from pipecat.transports.base_transport import TransportParams
    from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
    from pipecat.workers.runner import WorkerRunner

    if not isinstance(runner_args, SmallWebRTCRunnerArguments):
        raise ValueError("This demo requires SmallWebRTC; run without a transport override.")

    from pipecat.processors.frameworks.rtvi import RTVIProcessor

    class DeterministicTextOnlyLLMProcessor(FrameProcessor):
        """Functional text-only processor that responds from the active FlowNode without requiring an API key."""

        def __init__(self, engine: FlowEngine, bus: MultiAgentBus, **kwargs):
            super().__init__(**kwargs)
            self._engine = engine
            self._bus = bus

        def build_reply(self) -> str:
            persona = self._bus.active_persona
            node = self._engine.current_node
            if self._engine.pending_approval_node_id:
                target = self._engine.flow.nodes.get(self._engine.pending_approval_node_id)
                target_title = target.step_title if target else self._engine.pending_approval_node_id
                return (
                    f"{persona.display_name}: Thank you for sharing that in this fictional practice. "
                    f"Whenever you are ready, approve advancing to '{target_title}' on screen, or keep practising here."
                )
            return f"{persona.display_name} ({node.step_title}): {node.entry_prompt}"

        async def process_frame(self, frame: Frame, direction: FrameDirection):
            await super().process_frame(frame, direction)
            if isinstance(frame, (LLMRunFrame, LLMMessagesAppendFrame)):
                run_now = isinstance(frame, LLMRunFrame) or bool(getattr(frame, "run_llm", False))
                await self.push_frame(frame, direction)
                if run_now:
                    reply = self.build_reply()
                    await self.push_frame(LLMFullResponseStartFrame())
                    await self.push_frame(LLMTextFrame(text=reply))
                    await self.push_frame(LLMFullResponseEndFrame())
                return
            await self.push_frame(frame, direction)

    class StoryRTVIProcessor(RTVIProcessor):
        """Forwards FlowEngine, MultiAgentBus, SessionConfig, Approval, and Fallback events over RTVI."""

        def __init__(
            self,
            engine: FlowEngine,
            bus: MultiAgentBus,
            telemetry,
            fallback_coordinator: FallbackChainCoordinator,
            context=None,
            image_http_options=None,
            image_api_key=None,
            image_timeout_sec: float = 8.0,
            clarification: Optional[ClarificationPractice] = None,
            **kwargs,
        ):
            super().__init__(**kwargs)
            self._engine = engine
            self._bus = bus
            self._telemetry = telemetry
            self._fallback = fallback_coordinator
            self._context = context
            self._image_http_options = image_http_options
            self._image_api_key = image_api_key
            self._image_timeout_sec = image_timeout_sec
            self._session_active = True
            self._clarification = clarification or ClarificationPractice()
            self._bg_image_tasks: set[asyncio.Task] = set()

        def close_session(self):
            """Mark session ended and cancel any in-flight asynchronous image generation tasks."""
            self._session_active = False
            for task in list(self._bg_image_tasks):
                task.cancel()
            self._bg_image_tasks.clear()

        async def _generate_and_send_story_image(self, story_id: str, node_id: Optional[str] = None):
            """Generate a story illustration off the critical conversation path with a timeout."""
            try:
                from image_gen import generate_story_image

                image_url = await asyncio.wait_for(
                    generate_story_image(
                        story_id,
                        api_key=self._image_api_key,
                        http_options=self._image_http_options,
                    ),
                    timeout=self._image_timeout_sec,
                )
                if not self._session_active or not image_url:
                    return
                await self.send_server_message(
                    {
                        "type": "story_image",
                        "story_id": story_id,
                        "node_id": node_id,
                        "image": image_url,
                    }
                )
            except asyncio.TimeoutError:
                logger.warning(f"Story image generation timed out for {story_id}")
            except asyncio.CancelledError:
                return
            except Exception as exc:
                logger.warning(f"Story image generation failed for {story_id}: {exc}")

        async def _generate_and_send_story_route(self, story_id: str, node_id: Optional[str] = None):
            """Compute a story route off the critical conversation path."""
            try:
                from maps import get_story_route

                route = await asyncio.wait_for(
                    asyncio.to_thread(get_story_route, story_id),
                    timeout=self._image_timeout_sec,
                )
                if not self._session_active or not route:
                    return
                await self.send_server_message(
                    {
                        "type": "story_route",
                        "story_id": story_id,
                        "node_id": node_id,
                        "route": route,
                    }
                )
            except asyncio.TimeoutError:
                logger.warning(f"Story route computation timed out for {story_id}")
            except asyncio.CancelledError:
                return
            except Exception as exc:
                logger.warning(f"Story route computation failed for {story_id}: {exc}")

        async def _send_flow_events(self, decision):
            for event in decision.rtvi_events:
                out_event = dict(event)
                if out_event.get("type") == "story_open" and out_event.get("story_id"):
                    story_id = out_event["story_id"]
                    # Attach the Maps route data if already cached; otherwise
                    # compute off the critical path so story_open is never delayed.
                    try:
                        from maps import _cache as route_cache

                        if story_id in route_cache:
                            out_event["route"] = route_cache[story_id]
                        elif self._session_active:
                            rtask = asyncio.create_task(
                                self._generate_and_send_story_route(
                                    story_id, out_event.get("node_id")
                                )
                            )
                            self._bg_image_tasks.add(rtask)
                            rtask.add_done_callback(self._bg_image_tasks.discard)
                    except Exception as exc:
                        logger.warning(f"Could not schedule story route for {story_id}: {exc}")
                    # Attach the generated scene illustration (if available).
                    try:
                        from image_gen import _cache as image_cache

                        if story_id in image_cache:
                            out_event["image"] = image_cache[story_id]
                        elif self._session_active and self._image_api_key:
                            task = asyncio.create_task(
                                self._generate_and_send_story_image(
                                    story_id, out_event.get("node_id")
                                )
                            )
                            self._bg_image_tasks.add(task)
                            task.add_done_callback(self._bg_image_tasks.discard)
                    except Exception as exc:
                        logger.warning(f"Could not schedule story image for {story_id}: {exc}")
                await self.send_server_message(out_event)

        async def process_frame(self, frame: Frame, direction: FrameDirection):
            if isinstance(frame, ErrorFrame) and self._session_active:
                err_text = str(getattr(frame, "error", "provider error"))
                next_sel, notice = self._fallback.handle_provider_error(err_text)
                self._telemetry.active_stack = next_sel.stack_id
                await self.send_server_message(notice)
            await super().process_frame(frame, direction)

        async def _handle_client_message(self, msg_id: str, data):
            msg_type = getattr(data, "t", "")
            payload = getattr(data, "d", None) or {}
            if not isinstance(payload, dict):
                payload = {}

            if msg_type == "session_config":
                validated = FlowEngine.validate_session_config(payload)
                self._clarification.configure(validated.get("clarificationPractice"))
                node = self._engine.reset(validated["scenario_id"], validated["level"])
                self._bus.active_speaker_id = self._engine.flow.primary_persona
                self._bus.parallel_overlap_active = False
                self._telemetry.scenario_id = validated["scenario_id"]
                self._telemetry.level = validated["level"]
                self._telemetry.mode = validated["mode"]
                self._telemetry.current_node = node.id
                self._telemetry.active_speaker = self._bus.active_speaker_id
                if not validated["audio_enabled"]:
                    self._fallback = FallbackChainCoordinator(audio_preference=False)
                    self._telemetry.active_stack = "text_only"
                await self.send_server_message(
                    {
                        "type": "session_configured",
                        "scenario_id": validated["scenario_id"],
                        "level": validated["level"],
                        "mode": validated["mode"],
                        "audio_enabled": validated["audio_enabled"],
                        "node_id": node.id,
                        "step_title": node.step_title,
                        "speaker": node.speaker,
                        "stack_id": self._fallback.current.stack_id,
                        "uses_browser_stt": self._fallback.current.uses_browser_stt,
                        "clarificationPractice": self._clarification.snapshot(),
                    }
                )
                opening = self._engine.opening_instruction()
                await self._send_flow_events(opening)
            elif msg_type == "approval_response":
                approved = bool(payload.get("approved", False))
                target_node = payload.get("target_node")
                approval_id = payload.get("approval_id")
                decision = self._engine.resolve_approval(
                    approved=approved,
                    target_node_id=str(target_node) if target_node else None,
                    approval_id=str(approval_id) if approval_id else None,
                )
                self._telemetry.current_node = decision.node_id
                if decision.handoff_to:
                    handoff_evt = self._bus.handoff(
                        decision.handoff_to, parallel=decision.parallel_fanout
                    )
                    self._telemetry.active_speaker = self._bus.active_speaker_id
                    await self.send_server_message(handoff_evt)
                if decision.parallel_fanout:
                    fanout_evt = self._bus.build_parallel_fanout_turn()
                    await self.send_server_message(fanout_evt)
                await self._send_flow_events(decision)
                if approved and not decision.used_fallback and self._context is not None:
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
                    await self.push_frame(
                        LLMMessagesAppendFrame(
                            messages=[
                                {
                                    "role": "user",
                                    "content": (
                                        f"The visitor approved advancing to '{decision.step_title}'. "
                                        f"Please continue with: {decision.instruction_for_llm}"
                                    ),
                                }
                            ],
                            run_llm=True,
                        )
                    )
            elif msg_type == "story_request":
                req_story_id = str(payload.get("story_id") or "").strip()
                if req_story_id:
                    from types import SimpleNamespace

                    await self._send_flow_events(
                        SimpleNamespace(
                            rtvi_events=[
                                {
                                    "type": "story_open",
                                    "story_id": req_story_id,
                                    "node_id": self._engine.current_node_id,
                                }
                            ]
                        )
                    )

            await super()._handle_client_message(msg_id, data)

        async def _handle_send_text(self, data, message_id, user_id=None):
            text = (getattr(data, "content", "") or "").strip()
            self._telemetry.trace_frame("in", "UserSendText", text[:80])
            self._bus.record_turn("user", text)

            clarification_result = self._clarification.handle_user_message(text)
            if self._context is not None:
                if clarification_result.get("is_clarification"):
                    self._context.add_message({
                        "role": "system",
                        "content": (
                            "The user asked for clarification. Answer specifically and plainly: "
                            f"{clarification_result['specific_instruction']}"
                        ),
                    })
                else:
                    scheduled = self._clarification.next_instruction()
                    if scheduled and "vague_instruction" in scheduled:
                        self._clarification.record_delivered()
                        self._context.add_message({
                            "role": "system",
                            "content": (
                                "For the next ordinary, non-safety direction, use this mild wording: "
                                f"{scheduled['vague_instruction']} Its exact meaning is: "
                                f"{scheduled['specific_instruction']} If asked, explain it specifically."
                            ),
                        })

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

    raw_body = getattr(runner_args, "body", None) or {}
    if not isinstance(raw_body, dict):
        raw_body = {}
    initial_config = FlowEngine.validate_session_config(
        {
            "scenario_id": raw_body.get("scenario_id") or os.getenv("REHEARSAL_SCENARIO", "hospital"),
            "level": raw_body.get("level") or os.getenv("REHEARSAL_LEVEL", "1"),
            "mode": raw_body.get("mode") or os.getenv("REHEARSAL_MODE", "practise"),
            "audio_enabled": raw_body.get(
                "audio_enabled",
                os.getenv("ABILITY_AUDIO_ENABLED", "1").strip() != "0",
            ),
        }
    )
    scenario_id = initial_config["scenario_id"]
    level = initial_config["level"]
    mode = initial_config["mode"]
    audio_enabled = initial_config["audio_enabled"]
    camera_enabled = os.getenv("ENABLE_CAMERA_STREAM", "0").strip() == "1"

    flow_engine = FlowEngine(scenario_id=scenario_id, level=level, base_prompt=JOY_SYSTEM_PROMPT)
    bus = MultiAgentBus(active_speaker_id=flow_engine.flow.primary_persona)
    fallback_coordinator = FallbackChainCoordinator(audio_preference=audio_enabled)
    telemetry = create_dev_telemetry()
    telemetry.scenario_id = scenario_id
    telemetry.level = level
    telemetry.mode = mode
    telemetry.active_stack = fallback_coordinator.current.stack_id
    telemetry.active_speaker = bus.active_speaker_id
    telemetry.current_node = flow_engine.current_node_id

    provider, key, selection = select_provider_for_session(audio_preference=audio_enabled)
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

    elif provider == "gemini_text":
        from pipecat.services.google.llm import GoogleLLMService
        from pipecat.services.google.tts import GeminiTTSService

        http_options = _proxy_http_options()
        llm = GoogleLLMService(
            api_key=key,
            model=os.getenv("GEMINI_TEXT_MODEL", "gemini-3.8-flash"),
            system_instruction=system_prompt,
            http_options=http_options,
        )
        tts = GeminiTTSService(
            api_key=key,
            model=os.getenv("GEMINI_TTS_MODEL", "gemini-3.8-flash-lite-tts"),
            voice=os.getenv("GEMINI_TTS_VOICE", bus.active_persona.voice_gemini),
            http_options=http_options,
            use_genai=True,
        )
        before_user, after_user = [], [llm, tts]

    elif provider == "text_only":
        llm = DeterministicTextOnlyLLMProcessor(flow_engine, bus)
        before_user, after_user = [], [llm]

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
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer() if provider != "text_only" else None
        ),
    )
    rtvi_proc = StoryRTVIProcessor(
        flow_engine,
        bus=bus,
        telemetry=telemetry,
        fallback_coordinator=fallback_coordinator,
        context=context,
        clarification=ClarificationPractice(),
        image_http_options=_proxy_http_options(),
        image_api_key=os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"),
    )
    worker = PipelineWorker(
        Pipeline([
            transport.input(), *before_user, user, *after_user,
            transport.output(), assistant,
        ]),
        params=PipelineParams(enable_metrics=False, enable_usage_metrics=False),
        enable_rtvi=True,
        rtvi_processor=rtvi_proc,
    )
    runner = WorkerRunner(handle_sigint=runner_args.handle_sigint)
    await runner.add_workers(worker)
    greeted = False

    @worker.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        nonlocal greeted
        if greeted:
            return
        greeted = True
        opening = flow_engine.opening_instruction()
        await rtvi.send_server_message({
            "type": "provider_selected",
            "stack_id": selection.stack_id,
            "display_name": selection.display_name,
            "reason": selection.reason,
            "audio_enabled": selection.audio_enabled,
            "uses_browser_stt": selection.uses_browser_stt,
        })
        await rtvi.send_server_message({
            "type": "session_configured",
            "scenario_id": flow_engine.flow.scenario_id,
            "level": flow_engine.flow.level,
            "mode": telemetry.mode,
            "audio_enabled": selection.audio_enabled,
            "node_id": opening.node_id,
            "step_title": opening.step_title,
            "speaker": opening.speaker,
            "stack_id": selection.stack_id,
            "uses_browser_stt": selection.uses_browser_stt,
        })
        telemetry.trace_frame("out", "FlowOpening", opening.step_title)
        await rtvi_proc._send_flow_events(opening)
        context.add_message({
            "role": "user",
            "content": (
                f"Please start the fictional practice with your opening greeting. "
                f"Follow current Flow node '{opening.node_id}': {opening.instruction_for_llm}"
            ),
        })
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        rtvi_proc.close_session()
        telemetry.trace_frame("in", "ClientDisconnected", "Session closed")
        await runner.cancel()

    await runner.run()


if __name__ == "__main__":
    provider, _ = check_keys()
    logger.info("Starting {} rehearsal; provider stack ready.", provider)
    from pipecat.runner.run import main

    main()
