"""SA.1–SA.4 — Deterministic Pipecat Flow Engine for Rehearse the Journey.

Owns conversation node progression, confusion/decline fallbacks, and approval-gated
step proposals without letting the LLM hallucinate or skip steps.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from flow_config import (
    CONFUSION_KEYWORDS,
    DECLINE_KEYWORDS,
    FlowNode,
    ScenarioFlow,
    get_scenario_flow,
)


@dataclass
class FlowTurnDecision:
    node_id: str
    step_title: str
    speaker: str
    used_fallback: bool
    branched_diversion: bool
    proposed_approval_step: Optional[str]
    handoff_to: Optional[str]
    parallel_fanout: bool
    instruction_for_llm: str
    rtvi_events: List[Dict[str, Any]]


VALID_SCENARIOS = {"hospital", "matatu", "government", "directions"}
VALID_MODES = {"learn", "practise", "explore", "live-help"}


class FlowEngine:
    """State machine managing structured conversation nodes for a scenario + level."""

    def __init__(self, scenario_id: str = "hospital", level: int = 1, base_prompt: str = ""):
        self.flow: ScenarioFlow = get_scenario_flow(scenario_id, level, base_prompt)
        self.current_node_id: str = self.flow.initial_node_id
        self.pending_approval_node_id: Optional[str] = None
        self.pending_approval_id: Optional[str] = None
        self._approval_counter: int = 0
        self.history: List[str] = [self.current_node_id]

    @staticmethod
    def validate_session_config(raw: Any) -> Dict[str, Any]:
        """Validate incoming session configuration from offer body or RTVI client-message."""
        data = raw if isinstance(raw, dict) else {}
        raw_scenario = str(data.get("scenario_id") or "hospital").strip().lower()
        scenario_id = raw_scenario if raw_scenario in VALID_SCENARIOS else "hospital"
        try:
            level = max(1, min(4, int(data.get("level", 1))))
        except (TypeError, ValueError):
            level = 1
        raw_mode = str(data.get("mode") or "practise").strip().lower()
        mode = raw_mode if raw_mode in VALID_MODES else "practise"
        raw_audio = data.get("audio_enabled", True)
        if isinstance(raw_audio, str):
            audio_enabled = raw_audio.strip().lower() not in ("0", "false", "no", "off")
        else:
            audio_enabled = bool(raw_audio)
        return {
            "scenario_id": scenario_id,
            "level": level,
            "mode": mode,
            "audio_enabled": audio_enabled,
        }

    @staticmethod
    def _story_events(node: FlowNode) -> List[Dict[str, Any]]:
        """Interactive-story trigger for the client, if this node declares one."""
        if not node.story_id:
            return []
        return [
            {
                "type": "story_open",
                "story_id": node.story_id,
                "node_id": node.id,
            }
        ]

    @property
    def current_node(self) -> FlowNode:
        return self.flow.nodes[self.current_node_id]

    def reset(self, scenario_id: Optional[str] = None, level: Optional[int] = None) -> FlowNode:
        self.flow = get_scenario_flow(
            scenario_id or self.flow.scenario_id,
            level or self.flow.level,
            self.flow.character_prompt,
        )
        self.current_node_id = self.flow.initial_node_id
        self.pending_approval_node_id = None
        self.pending_approval_id = None
        self.history = [self.current_node_id]
        return self.current_node

    def opening_instruction(self) -> FlowTurnDecision:
        node = self.current_node
        events = [
            {
                "type": "flow_node_transition",
                "scenario_id": self.flow.scenario_id,
                "level": self.flow.level,
                "node_id": node.id,
                "step_title": node.step_title,
                "speaker": node.speaker,
            }
        ]
        events.extend(self._story_events(node))
        return FlowTurnDecision(
            node_id=node.id,
            step_title=node.step_title,
            speaker=node.speaker,
            used_fallback=False,
            branched_diversion=False,
            proposed_approval_step=None,
            handoff_to=node.handoff_to,
            parallel_fanout=node.parallel_fanout,
            instruction_for_llm=node.entry_prompt,
            rtvi_events=events,
        )

    def evaluate_user_turn(self, user_text: str, auto_approve: bool = False) -> FlowTurnDecision:
        cleaned = (user_text or "").strip().lower()
        node = self.current_node
        events: List[Dict[str, Any]] = []

        # SA.3: Prompt asking to bypass approval ("please just go to the next step")
        # must NEVER bypass a pending approval gate.
        if self.pending_approval_node_id and not auto_approve:
            events.append(
                {
                    "type": "approval_required",
                    "from_node": node.id,
                    "target_node": self.pending_approval_node_id,
                    "reason": "Controller approval required before advancing to the next step.",
                }
            )
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=True,
                branched_diversion=False,
                proposed_approval_step=self.pending_approval_node_id,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=(
                    "The visitor has a pending step-advance approval card on screen. "
                    "Politely remind them they can approve or deny the step card on the page, "
                    "or keep practising this step."
                ),
                rtvi_events=events,
            )

        # Confusion / repeat / simplify requests stay on the current node and trigger fallback
        if any(k in cleaned for k in CONFUSION_KEYWORDS) or not cleaned:
            events.append(
                {
                    "type": "flow_fallback",
                    "node_id": node.id,
                    "reason": "confusion_or_repeat",
                }
            )
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=True,
                branched_diversion=False,
                proposed_approval_step=None,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=node.fallback_prompt or node.entry_prompt,
                rtvi_events=events,
            )

        # Level 3 diversion branch check
        if node.diversion_node_id and any(k in cleaned for k in node.diversion_trigger_keywords):
            self.current_node_id = node.diversion_node_id
            self.history.append(self.current_node_id)
            div_node = self.current_node
            events.append(
                {
                    "type": "flow_node_transition",
                    "scenario_id": self.flow.scenario_id,
                    "level": self.flow.level,
                    "node_id": div_node.id,
                    "step_title": div_node.step_title,
                    "speaker": div_node.speaker,
                    "branched": True,
                }
            )
            events.extend(self._story_events(div_node))
            return FlowTurnDecision(
                node_id=div_node.id,
                step_title=div_node.step_title,
                speaker=div_node.speaker,
                used_fallback=False,
                branched_diversion=True,
                proposed_approval_step=None,
                handoff_to=div_node.handoff_to,
                parallel_fanout=div_node.parallel_fanout,
                instruction_for_llm=div_node.entry_prompt,
                rtvi_events=events,
            )

        # Check if user declined a card/detail — reassure and still allow gentle progression
        declined = any(k in cleaned for k in DECLINE_KEYWORDS)
        matched = declined or any(k in cleaned for k in node.expected_keywords) or len(cleaned.split()) >= 2

        if not matched:
            events.append({"type": "flow_fallback", "node_id": node.id, "reason": "unmatched_utterance"})
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=True,
                branched_diversion=False,
                proposed_approval_step=None,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=node.fallback_prompt or node.entry_prompt,
                rtvi_events=events,
            )

        next_id = node.next_node_id
        if not next_id or next_id not in self.flow.nodes:
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=False,
                branched_diversion=False,
                proposed_approval_step=None,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=node.entry_prompt,
                rtvi_events=events,
            )

        # If advancing from this node requires approval and auto_approve is False,
        # record the pending proposal, emit approval_proposal, and STAY on the current
        # step until the backend receives a matching approval response.
        if node.requires_approval and not auto_approve:
            self._approval_counter += 1
            approval_id = f"apr-{self._approval_counter}"
            self.pending_approval_node_id = next_id
            self.pending_approval_id = approval_id
            next_node_preview = self.flow.nodes[next_id]
            events.append(
                {
                    "type": "approval_proposal",
                    "approval_id": approval_id,
                    "action": "go_to_step",
                    "from_node": node.id,
                    "target_node": next_id,
                    "target_title": next_node_preview.step_title,
                }
            )
            reassurance = (
                "The visitor declined or had no pretend card—reassure them warmly that it is completely okay. "
                if declined
                else "Acknowledge the visitor's reply warmly. "
            )
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=False,
                branched_diversion=False,
                proposed_approval_step=next_id,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=(
                    f"{reassurance}Let them know they can approve advancing to "
                    f"'{next_node_preview.step_title}' on screen whenever they are ready, "
                    "or keep practising this step."
                ),
                rtvi_events=events,
            )

        # Un-gated node (or auto_approve=True): advance immediately to next_id
        return self._advance_to_node(next_id, declined=declined, extra_events=events)

    def _advance_to_node(
        self,
        next_id: str,
        declined: bool = False,
        extra_events: Optional[List[Dict[str, Any]]] = None,
    ) -> FlowTurnDecision:
        events: List[Dict[str, Any]] = list(extra_events or [])
        self.current_node_id = next_id
        self.pending_approval_node_id = None
        self.pending_approval_id = None
        self.history.append(self.current_node_id)
        next_node = self.current_node

        if next_node.handoff_to:
            events.append(
                {
                    "type": "speaker_changed",
                    "speaker": next_node.speaker,
                    "handoff_to": next_node.handoff_to,
                    "parallel_fanout": next_node.parallel_fanout,
                }
            )
        events.append(
            {
                "type": "flow_node_transition",
                "scenario_id": self.flow.scenario_id,
                "level": self.flow.level,
                "node_id": next_node.id,
                "step_title": next_node.step_title,
                "speaker": next_node.speaker,
            }
        )
        events.extend(self._story_events(next_node))

        reassurance = (
            "The visitor declined or had no pretend card—reassure them warmly that it is completely okay. "
            if declined
            else ""
        )
        return FlowTurnDecision(
            node_id=next_node.id,
            step_title=next_node.step_title,
            speaker=next_node.speaker,
            used_fallback=False,
            branched_diversion=False,
            proposed_approval_step=None,
            handoff_to=next_node.handoff_to,
            parallel_fanout=next_node.parallel_fanout,
            instruction_for_llm=reassurance + next_node.entry_prompt,
            rtvi_events=events,
        )

    def resolve_approval(
        self,
        approved: bool,
        target_node_id: Optional[str] = None,
        approval_id: Optional[str] = None,
    ) -> FlowTurnDecision:
        """Apply or reject a controller approval decision and return the resulting FlowTurnDecision."""
        node = self.current_node
        if not self.pending_approval_node_id:
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=True,
                branched_diversion=False,
                proposed_approval_step=None,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=node.entry_prompt,
                rtvi_events=[
                    {
                        "type": "approval_rejected",
                        "reason": "No pending approval proposal.",
                        "node_id": node.id,
                    }
                ],
            )

        if target_node_id and target_node_id != self.pending_approval_node_id:
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=True,
                branched_diversion=False,
                proposed_approval_step=self.pending_approval_node_id,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=node.entry_prompt,
                rtvi_events=[
                    {
                        "type": "approval_rejected",
                        "reason": f"Target node mismatch: expected {self.pending_approval_node_id}, got {target_node_id}.",
                        "node_id": node.id,
                    }
                ],
            )

        if approval_id and self.pending_approval_id and approval_id != self.pending_approval_id:
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=True,
                branched_diversion=False,
                proposed_approval_step=self.pending_approval_node_id,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=node.entry_prompt,
                rtvi_events=[
                    {
                        "type": "approval_rejected",
                        "reason": "Approval ID mismatch.",
                        "node_id": node.id,
                    }
                ],
            )

        dest = self.pending_approval_node_id
        resolved_id = self.pending_approval_id
        if not approved:
            self.pending_approval_node_id = None
            self.pending_approval_id = None
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=False,
                branched_diversion=False,
                proposed_approval_step=None,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=(
                    f"The visitor chose to stay on '{node.step_title}'. "
                    "Continue practising this step calmly without advancing."
                ),
                rtvi_events=[
                    {
                        "type": "approval_resolved",
                        "approval_id": resolved_id,
                        "approved": False,
                        "node_id": node.id,
                        "step_title": node.step_title,
                        "speaker": node.speaker,
                    }
                ],
            )

        if dest not in self.flow.nodes:
            self.pending_approval_node_id = None
            self.pending_approval_id = None
            return FlowTurnDecision(
                node_id=node.id,
                step_title=node.step_title,
                speaker=node.speaker,
                used_fallback=True,
                branched_diversion=False,
                proposed_approval_step=None,
                handoff_to=None,
                parallel_fanout=False,
                instruction_for_llm=node.entry_prompt,
                rtvi_events=[{"type": "approval_rejected", "reason": "Unknown target node."}],
            )

        return self._advance_to_node(
            dest,
            declined=False,
            extra_events=[
                {
                    "type": "approval_resolved",
                    "approval_id": resolved_id,
                    "approved": True,
                    "node_id": dest,
                    "step_title": self.flow.nodes[dest].step_title,
                    "speaker": self.flow.nodes[dest].speaker,
                }
            ],
        )
