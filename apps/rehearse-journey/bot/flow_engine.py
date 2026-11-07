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


class FlowEngine:
    """State machine managing structured conversation nodes for a scenario + level."""

    def __init__(self, scenario_id: str = "hospital", level: int = 1, base_prompt: str = ""):
        self.flow: ScenarioFlow = get_scenario_flow(scenario_id, level, base_prompt)
        self.current_node_id: str = self.flow.initial_node_id
        self.pending_approval_node_id: Optional[str] = None
        self.history: List[str] = [self.current_node_id]

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
        # record proposal and emit approval_proposal event.
        if node.requires_approval and not auto_approve:
            self.pending_approval_node_id = next_id
            next_node_preview = self.flow.nodes[next_id]
            events.append(
                {
                    "type": "approval_proposal",
                    "action": "go_to_step",
                    "from_node": node.id,
                    "target_node": next_id,
                    "target_title": next_node_preview.step_title,
                }
            )

        # Advance to the next node
        self.current_node_id = next_id
        self.pending_approval_node_id = None
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
            proposed_approval_step=node.approval_target_step if node.requires_approval else None,
            handoff_to=next_node.handoff_to,
            parallel_fanout=next_node.parallel_fanout,
            instruction_for_llm=reassurance + next_node.entry_prompt,
            rtvi_events=events,
        )

    def resolve_approval(self, approved: bool, target_node_id: Optional[str] = None) -> FlowNode:
        """Apply or reject a controller approval decision."""
        if approved:
            dest = target_node_id or self.pending_approval_node_id
            if dest and dest in self.flow.nodes:
                self.current_node_id = dest
                self.history.append(dest)
        self.pending_approval_node_id = None
        return self.current_node
