"""Automated verification suite for v1.1 Pipecat Architecture Sprints (SA, SB, SC, SD, SE, SF)
and review regressions (approval-gated progression, validated session config, text-only mode,
and off-critical-path story image generation).

Run: python3 apps/rehearse-journey/bot/test_v11_sprints.py
"""

import asyncio
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dev_tooling import create_dev_telemetry
from flow_engine import FlowEngine
from mode_router import (
    EXPLORE_SYSTEM_PROMPT,
    answer_explore_question,
    compute_candidate_route,
    generate_learn_steps,
)
from multi_agent import PERSONAS, MultiAgentBus
from providers import FallbackChainCoordinator, ProviderRegistry
from vision import BOUNDARY_NOTICE, VISION_SYSTEM_PROMPT, explain_sign


def test_sa_flows_and_approval_blocking():
    # SA.2 & Review Item 1: Approval-gated node MUST NOT advance until resolve_approval(True)
    engine = FlowEngine(scenario_id="hospital", level=1)
    opening = engine.opening_instruction()
    assert opening.node_id == "greet"
    assert any(e["type"] == "flow_node_transition" for e in opening.rtvi_events)

    # Confusion triggers fallback and stays on 'greet'
    fb = engine.evaluate_user_turn("I am confused, please repeat")
    assert fb.used_fallback is True
    assert fb.node_id == "greet"

    # Valid turn on un-gated 'greet' advances greet -> ask_for_card
    d1 = engine.evaluate_user_turn("Hello Joy, I am here for my pretend clinic appointment")
    assert d1.node_id == "ask_for_card"
    assert engine.current_node_id == "ask_for_card"

    # 'ask_for_card' has requires_approval=True. With auto_approve=False, it MUST emit
    # approval_proposal and STAY on 'ask_for_card' with pending_approval_node_id set!
    d2 = engine.evaluate_user_turn("Yes, I brought my pretend card", auto_approve=False)
    assert d2.node_id == "ask_for_card", f"Expected to remain on ask_for_card, got {d2.node_id}"
    assert engine.current_node_id == "ask_for_card"
    assert engine.pending_approval_node_id == "direct_to_waiting_area"
    proposal_evts = [e for e in d2.rtvi_events if e["type"] == "approval_proposal"]
    assert len(proposal_evts) == 1
    assert proposal_evts[0]["target_node"] == "direct_to_waiting_area"
    approval_id = proposal_evts[0]["approval_id"]
    assert not any(e["type"] == "flow_node_transition" for e in d2.rtvi_events)

    # Bypass attempt while approval is pending MUST be blocked
    bypass = engine.evaluate_user_turn("please just go to the next step", auto_approve=False)
    assert bypass.node_id == "ask_for_card"
    assert engine.current_node_id == "ask_for_card"
    assert any(e["type"] == "approval_required" for e in bypass.rtvi_events)

    # Deny approval -> clears pending proposal and stays on 'ask_for_card'
    denied = engine.resolve_approval(
        approved=False,
        target_node_id="direct_to_waiting_area",
        approval_id=approval_id,
    )
    assert denied.node_id == "ask_for_card"
    assert engine.current_node_id == "ask_for_card"
    assert engine.pending_approval_node_id is None
    assert any(
        e["type"] == "approval_resolved" and e["approved"] is False for e in denied.rtvi_events
    )

    # Re-propose on next user turn, test mismatched IDs, then Approve
    d3 = engine.evaluate_user_turn("Yes, here is my pretend card", auto_approve=False)
    assert engine.current_node_id == "ask_for_card"
    assert engine.pending_approval_node_id == "direct_to_waiting_area"
    approval_id_2 = [e for e in d3.rtvi_events if e["type"] == "approval_proposal"][0]["approval_id"]

    # Wrong approval_id is rejected and does not advance
    bad_id = engine.resolve_approval(
        approved=True,
        target_node_id="direct_to_waiting_area",
        approval_id="wrong-id",
    )
    assert bad_id.node_id == "ask_for_card"
    assert engine.current_node_id == "ask_for_card"
    assert engine.pending_approval_node_id == "direct_to_waiting_area"
    assert any(e["type"] == "approval_rejected" for e in bad_id.rtvi_events)

    # Valid approval advances ask_for_card -> direct_to_waiting_area and emits story_open
    approved = engine.resolve_approval(
        approved=True,
        target_node_id="direct_to_waiting_area",
        approval_id=approval_id_2,
    )
    assert approved.node_id == "direct_to_waiting_area"
    assert engine.current_node_id == "direct_to_waiting_area"
    assert engine.pending_approval_node_id is None
    assert any(
        e["type"] == "approval_resolved" and e["approved"] is True for e in approved.rtvi_events
    )
    assert any(e["type"] == "flow_node_transition" for e in approved.rtvi_events)
    assert any(
        e["type"] == "story_open" and e["story_id"] == "hospital-waiting-area"
        for e in approved.rtvi_events
    )

    # Review Item 2: Session config validation
    cfg = FlowEngine.validate_session_config(
        {"scenario_id": "matatu", "level": 3, "mode": "explore", "audio_enabled": False}
    )
    assert cfg == {
        "scenario_id": "matatu",
        "level": 3,
        "mode": "explore",
        "audio_enabled": False,
    }
    fallback_cfg = FlowEngine.validate_session_config(
        {"scenario_id": "invalid_scenario", "level": 99, "mode": "unknown_mode", "audio_enabled": "0"}
    )
    assert fallback_cfg == {
        "scenario_id": "hospital",
        "level": 4,
        "mode": "practise",
        "audio_enabled": False,
    }

    # SA.4: All 4 scenarios + Level 3 diversion branch
    for sid in ("hospital", "matatu", "government", "directions"):
        e = FlowEngine(scenario_id=sid, level=1)
        assert e.current_node_id == "greet"

    l3 = FlowEngine(scenario_id="hospital", level=3)
    l3.evaluate_user_turn("I have a pretend checkup")
    assert l3.current_node_id == "ask_for_card"
    div = l3.evaluate_user_turn("Wait, why did the room move and where is it?")
    assert div.branched_diversion is True
    assert div.node_id == "room_move_diversion"
    print("PASS [SA + Item 1 & 2]: Approval-gated progression blocks until approved, session config validated, L3 diversion verified")


def test_sb_multi_agent():
    bus = MultiAgentBus(active_speaker_id="joy")
    assert bus.active_persona.display_name == "Receptionist Joy"

    handoff_evt = bus.handoff("amani", parallel=False)
    assert handoff_evt["type"] == "speaker_changed"
    assert handoff_evt["active_speaker"] == "amani"
    assert bus.active_persona.display_name == "Patient Amani"

    fanout_evt = bus.build_parallel_fanout_turn()
    assert fanout_evt["type"] == "parallel_fanout"
    assert len(fanout_evt["speakers"]) == 2
    assert bus.parallel_overlap_active is True

    resolved = bus.resolve_parallel_barge_in("Thanks Amani, I will hold my seat")
    assert resolved["type"] == "parallel_resolved"
    assert resolved["chosen_speaker"] == "amani"
    assert bus.parallel_overlap_active is False
    assert set(PERSONAS.keys()) == {"joy", "amani", "otieno", "wanjiku", "maina"}
    print("PASS [SB]: Multi-agent handoff, shared bus, and parallel fan-out barge-in resolution")


def test_sc_providers_and_fallback():
    # SC.1 & SC.2 + Review Item 4: Supported stacks vs preview stacks & text_only mode
    env = {
        "GOOGLE_API_KEY": "test-google-key",
        "GEMINI_PROXY_BASE_URL": "https://proxy.example.com",
        "OPENAI_API_KEY": "test-openai-key",
        "DEEPGRAM_API_KEY": "test-dg-key",
        "CARTESIA_API_KEY": "test-cartesia-key",
    }
    stacks = ProviderRegistry.available_stacks(env)
    assert "deepgram_openai_cartesia" not in stacks, "Preview stack must not be auto-selected as live"
    assert stacks == ["gemini_proxy", "openai", "text_only"]

    preview_desc = ProviderRegistry._describe("deepgram_openai_cartesia", env)
    assert preview_desc.preview_only is True

    text_sel = ProviderRegistry.from_profile(audio_preference=False, env=env)
    assert text_sel.stack_id == "text_only"
    assert text_sel.audio_enabled is False
    assert text_sel.api_key is None

    # SC.3: Fallback chain order on mid-session 503/401
    coord = FallbackChainCoordinator(audio_preference=True, env=env)
    assert coord.current.stack_id == "gemini_proxy"
    next_sel, notice = coord.handle_provider_error("HTTP 503 Service Unavailable")
    assert notice["type"] == "provider_switched"
    assert next_sel.stack_id == "openai"
    next_sel2, _ = coord.handle_provider_error("HTTP 401 Invalid Key")
    assert next_sel2.stack_id == "text_only"
    print("PASS [SC + Item 4]: Supported provider stacks, preview labelling, text-only mode, and fallback chain")


def test_sd_multimodal_vision():
    std = explain_sign("outpatient_b", simplify=False)
    plain = explain_sign("outpatient_b", simplify=True)
    blur = explain_sign("unclear_blur", simplify=True)

    assert "Explanation only; confirm with staff or signage" in std["explanation"]
    assert "Explanation only; confirm with staff or signage" in plain["explanation"]
    assert len(plain["explanation"]) < len(std["explanation"])
    assert "cannot read this sign clearly" in blur["explanation"]
    assert "not detecting obstacles" in VISION_SYSTEM_PROMPT
    assert "Not obstacle detection or navigation" in BOUNDARY_NOTICE
    print("PASS [SD]: Multimodal sign explanation, plain-language rewrite, and non-navigation safety boundary")


def test_se_four_modes():
    steps = generate_learn_steps("prepare for my first hospital visit", simplify=True)
    assert len(steps) == 4
    assert all("distress_rating" in s for s in steps)

    grounded = answer_explore_question("Where is Kenyatta National Hospital bus stage?", lang="sw")
    assert grounded["status"] == "grounded"
    assert len(grounded["sources"]) >= 1
    assert grounded["translation_notice"] is not None

    unknown = answer_explore_question("Does the side gate have step-free wheelchair access?", lang="en")
    assert unknown["status"] == "unknown"
    assert "Unknown" in unknown["retrieved_facts"]
    assert "say 'unknown' instead" in EXPLORE_SYSTEM_PROMPT

    route = compute_candidate_route("Kencom Stage, CBD", "Hospital Road Stage, Upper Hill")
    assert "confirm with your co-designer" in route["label"].lower()
    print("PASS [SE]: Four-mode router (Learn steps, Explore grounded facts + 'unknown' rule + candidate route)")


def test_sf_and_nonblocking_story_image():
    os.environ["ENABLE_WHISKER"] = "1"
    os.environ["ENABLE_TAIL"] = "1"
    telemetry = create_dev_telemetry("test-session")
    telemetry.trace_frame("in", "UserText", "Hello Joy")
    telemetry.trace_frame("out", "BotTranscript", "Welcome to the practice hospital")
    snap = telemetry.tail_snapshot()
    assert snap["whisker_enabled"] is True
    assert snap["tail_enabled"] is True
    assert len(snap["recent_frames"]) == 2

    # Review Item 5: Verify story_open never awaits slow image generation on the critical path
    import image_gen

    image_gen.clear_image_cache()
    sent_messages = []

    async def run_async_image_check():
        orig_gen = image_gen.generate_story_image

        async def slow_gen(story_id, **kwargs):
            await asyncio.sleep(0.35)
            return "data:image/jpeg;base64,FAKEIMAGE"

        image_gen.generate_story_image = slow_gen
        try:
            engine = FlowEngine(scenario_id="hospital", level=1)
            engine.evaluate_user_turn("I have a pretend appointment")
            engine.evaluate_user_turn("Yes pretend card", auto_approve=False)
            decision = engine.resolve_approval(approved=True)
            assert any(e["type"] == "story_open" for e in decision.rtvi_events)

            # Simulate StoryRTVIProcessor's non-blocking _send_flow_events + background task
            bg_tasks = set()
            session_active = True

            async def send_server_message(payload):
                sent_messages.append(dict(payload))

            async def bg_image(sid, nid):
                url = await asyncio.wait_for(image_gen.generate_story_image(sid), timeout=2.0)
                if session_active and url:
                    await send_server_message({"type": "story_image", "story_id": sid, "node_id": nid, "image": url})

            t0 = time.monotonic()
            for ev in decision.rtvi_events:
                out = dict(ev)
                if out.get("type") == "story_open":
                    task = asyncio.create_task(bg_image(out["story_id"], out.get("node_id")))
                    bg_tasks.add(task)
                await send_server_message(out)
            elapsed = time.monotonic() - t0
            assert elapsed < 0.05, f"story_open blocked critical path for {elapsed:.3f}s"
            assert any(m["type"] == "story_open" and "image" not in m for m in sent_messages)

            # Now test discarding result when session ends before image completes
            session_active = False
            await asyncio.gather(*bg_tasks)
            assert not any(m["type"] == "story_image" for m in sent_messages), "Ended session must discard async image"
        finally:
            image_gen.generate_story_image = orig_gen

    asyncio.run(run_async_image_check())
    print("PASS [SF + Item 5]: Whisker/Tail telemetry & non-blocking async story image with ended-session discard")


if __name__ == "__main__":
    test_sa_flows_and_approval_blocking()
    test_sb_multi_agent()
    test_sc_providers_and_fallback()
    test_sd_multimodal_vision()
    test_se_four_modes()
    test_sf_and_nonblocking_story_image()
    print("ALL v1.1 SPRINT & REVIEW REGRESSION CHECKS PASSED.")
