"""Stateful controller for optional Ask for Clarity practice.

The controller is deliberately session-local. It schedules only safe,
non-critical directions and keeps the specific meaning available for a later
clarification answer. The LLM still voices the turn, but it receives a
structured instruction from this controller rather than an unsupported
"be vague X percent of the time" request alone.
"""

from dataclasses import dataclass
import re


ALLOWED_PERCENTAGES = (20, 40, 60)


@dataclass(frozen=True)
class ClarificationOpportunity:
    id: str
    specific_instruction: str
    vague_instruction: str
    missing_detail: str
    clarification_hint: str


OPPORTUNITIES = (
    ClarificationOpportunity(
        "hospital_card_table",
        "Please place your card on the small table beside the reception desk.",
        "Please put your card on the table.",
        "which table and where it is",
        "Which table should I use?",
    ),
    ClarificationOpportunity(
        "hospital_room_direction",
        "Please go to Room 12 on the first floor.",
        "Please go upstairs.",
        "the floor and room number",
        "Which floor and room should I go to?",
    ),
    ClarificationOpportunity(
        "hospital_waiting_area",
        "Please wait on the chairs beside the blue door.",
        "Please wait over there.",
        "which waiting place",
        "Where exactly should I wait?",
    ),
)


CLARIFICATION_PATTERNS = re.compile(
    r"\b(what do you mean|be specific|which one|which table|which floor|which room|"
    r"where exactly|where should i go|explain|more detail|didn't understand|"
    r"did not understand|sijaelewa|unamaanisha nini|eleza vizuri|ni wapi hasa|"
    r"ni meza gani|hiyo .* gani)\b",
    re.IGNORECASE,
)


def validate_settings(raw: object) -> tuple[bool, int]:
    """Return safe settings; malformed client data falls back to disabled."""
    if not isinstance(raw, dict):
        return False, 40
    enabled = raw.get("enabled") is True
    percentage = raw.get("ambiguityPercentage", 40)
    try:
        percentage = int(percentage)
    except (TypeError, ValueError):
        percentage = 40
    if percentage not in ALLOWED_PERCENTAGES:
        percentage = 40
    return enabled, percentage


class ClarificationPractice:
    def __init__(self) -> None:
        self.enabled = False
        self.percentage = 40
        self.eligible_opportunities = 0
        self.planned_opportunities = 0
        self.vague_planned = 0
        self.delivered_opportunities = 0
        self.questions_attempted = 0
        self.resolved_opportunities = 0
        self.pending: ClarificationOpportunity | None = None
        self._last_was_vague = False

    def configure(self, raw: object) -> dict[str, object]:
        self.enabled, self.percentage = validate_settings(raw)
        self.reset()
        return self.snapshot()

    def reset(self) -> None:
        self.eligible_opportunities = 0
        self.planned_opportunities = 0
        self.vague_planned = 0
        self.delivered_opportunities = 0
        self.questions_attempted = 0
        self.resolved_opportunities = 0
        self.pending = None
        self._last_was_vague = False

    def next_instruction(self) -> dict[str, str] | None:
        """Schedule the next safe direction using a converging target ratio."""
        if not self.enabled or self.pending is not None:
            return None
        self.eligible_opportunities += 1
        target = self.percentage / 100
        should_be_vague = (
            (self.vague_planned + 1) / self.eligible_opportunities <= target
            and not self._last_was_vague
        )
        opportunity = OPPORTUNITIES[self.planned_opportunities % len(OPPORTUNITIES)]
        self.planned_opportunities += 1
        if should_be_vague:
            self.vague_planned += 1
        self._last_was_vague = should_be_vague
        if not should_be_vague:
            return {"specific_instruction": opportunity.specific_instruction}
        self.pending = opportunity
        return {
            "vague_instruction": opportunity.vague_instruction,
            "specific_instruction": opportunity.specific_instruction,
            "missing_detail": opportunity.missing_detail,
            "clarification_hint": opportunity.clarification_hint,
        }

    def record_delivered(self) -> None:
        if self.pending is not None:
            self.delivered_opportunities += 1

    def handle_user_message(self, text: str) -> dict[str, object]:
        """Recognise a natural clarification request and preserve its answer."""
        if not self.enabled or not self.pending or not CLARIFICATION_PATTERNS.search(text):
            return {"is_clarification": False}
        self.questions_attempted += 1
        opportunity = self.pending
        self.resolved_opportunities += 1
        self.pending = None
        self._last_was_vague = False
        return {
            "is_clarification": True,
            "specific_instruction": opportunity.specific_instruction,
            "missing_detail": opportunity.missing_detail,
        }

    def prompt_instruction(self) -> str:
        if not self.enabled:
            return "Ask for Clarity is OFF. Give all ordinary directions clearly and specifically."
        return (
            f"Ask for Clarity is ON at {self.percentage} percent. The session controller "
            "schedules only mild, safe directions for practice. Never make medical, "
            "safety, consent, privacy, pause, help, repeat, or exit information vague. "
            "If the user asks for clarification, answer the missing detail specifically "
            "and do not introduce a new ambiguity in that answer."
        )

    def snapshot(self) -> dict[str, object]:
        return {
            "enabled": self.enabled,
            "ambiguityPercentage": self.percentage,
            "opportunities": self.eligible_opportunities,
            "questions": self.questions_attempted,
            "resolved": self.resolved_opportunities,
            "pending": self.pending.id if self.pending else None,
        }
