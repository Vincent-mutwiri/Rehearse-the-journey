"""Automated verification suite for v1.1 Pipecat Architecture Sprints (SA, SB, SC, SD, SE, SF).

Run: python3 apps/rehearse-journey/bot/test_v11_sprints.py
"""

import os
import sys
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


def test_sa_flows():
    # SA.2: Hospital Level 1 4-node progression + fallback + story trigger
    engine = FlowEngine(scenario_id="hospital", level=1)
    opening = engine.opening_instruction()
    assert opening.node_id == "greet"
    assert any(e["type"] == "flow_node_transition" for e in opening.rtvi_events)

    # Confusion triggers fallback and stays on 'greet'
    fb = engine.evaluate_user_turn("I am confused, please repeat")
    assert fb.used_fallback is True
    assert fb.node_id == "greet"

    # Valid turn advances greet -> ask_for_card
    d1 = engine.evaluate_user_turn("Hello Joy, I am here for my pretend clinic appointment")
    assert d1.node_id == "ask_for_card"

    # ask_for_card -> direct_to_waiting_area emits approval_proposal and story_open
    d2 = engine.evaluate_user_turn("Yes, I brought my pretend card", auto_approve=False)
    assert d2.node_id == "direct_to_waiting_area"
    assert any(e["type"] == "approval_proposal" for e in d2.rtvi_events)
    assert any(e["type"] == "story_open" and e["story_id"] == "hospital-waiting-area" for e in d2.rtvi_events)

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
    print("PASS [SA]: Pipecat Flows (Hospital L1-L4, Matatu, Government, Directions, L3 diversion, fallbacks)")


def test_sb_multi_agent():
    # SB.2 & SB.3: Level 4 handoff (Joy -> Amani) and parallel fan-out (Joy + Amani)
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
    # SC.1 & SC.2: Preference-driven selection (audio: off -> text_only)
    env = {
        "GOOGLE_API_KEY": "test-google-key",
        "GEMINI_PROXY_BASE_URL": "https://proxy.example.com",
        "OPENAI_API_KEY": "test-openai-key",
        "DEEPGRAM_API_KEY": "test-dg-key",
        "CARTESIA_API_KEY": "test-cartesia-key",
    }
    text_sel = ProviderRegistry.from_profile(audio_preference=False, env=env)
    assert text_sel.stack_id == "text_only"
    assert text_sel.audio_enabled is False

    # SC.3: Fallback chain order on mid-session 503/401
    coord = FallbackChainCoordinator(audio_preference=True, env=env)
    assert coord.current.stack_id == "deepgram_openai_cartesia"
    next_sel, notice = coord.handle_provider_error("HTTP 503 Service Unavailable")
    assert notice["type"] == "provider_switched"
    assert next_sel.stack_id == "gemini_proxy"
    next_sel2, _ = coord.handle_provider_error("HTTP 1011 Quota Depleted")
    assert next_sel2.stack_id == "openai"
    next_sel3, _ = coord.handle_provider_error("HTTP 401 Invalid Key")
    assert next_sel3.stack_id == "text_only"
    print("PASS [SC]: Vendor-agnostic provider selection (audio: on/off) and runtime fallback chain")


def test_sd_multimodal_vision():
    # SD.2 & SD.4: Sign explanation + simplify-text + explicit non-navigation boundary
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
    # SE.2: Learn mode goal -> 4 structured RehearsalSteps
    steps = generate_learn_steps("prepare for my first hospital visit", simplify=True)
    assert len(steps) == 4
    assert all("distress_rating" in s for s in steps)

    # SE.3: Explore mode grounded facts vs generated explanations + strict 'unknown' + Kiswahili notice
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


def test_sf_dev_tooling():
    os.environ["ENABLE_WHISKER"] = "1"
    os.environ["ENABLE_TAIL"] = "1"
    telemetry = create_dev_telemetry("test-session")
    telemetry.trace_frame("in", "UserText", "Hello Joy")
    telemetry.trace_frame("out", "BotTranscript", "Welcome to the practice hospital")
    snap = telemetry.tail_snapshot()
    assert snap["whisker_enabled"] is True
    assert snap["tail_enabled"] is True
    assert len(snap["recent_frames"]) == 2
    print("PASS [SF]: Whisker frame debugger and Tail session telemetry snapshot")


if __name__ == "__main__":
    test_sa_flows()
    test_sb_multi_agent()
    test_sc_providers_and_fallback()
    test_sd_multimodal_vision()
    test_se_four_modes()
    test_sf_dev_tooling()
    print("ALL v1.1 SPRINT BACKEND CHECKS PASSED.")
