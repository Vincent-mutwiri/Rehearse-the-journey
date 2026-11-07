"""SB.1–SB.4 — Multi-Agent Handoff & Parallel Fan-Out over a shared session bus.

Supports Level 4 (Busy Environment):
- Receptionist Joy ('joy') hands off to Fellow Patient Amani ('amani') in Waiting Area B
- Parallel fan-out: both Joy and Amani speak briefly in the same turn, and the user's
  response selects which agent continues while the other yields.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class AgentPersona:
    id: str
    display_name: str
    role_badge: str
    voice_gemini: str
    voice_openai: str
    character_instructions: str


PERSONAS: Dict[str, AgentPersona] = {
    "joy": AgentPersona(
        id="joy",
        display_name="Receptionist Joy",
        role_badge="Hospital Reception",
        voice_gemini="Leda",
        voice_openai="nova",
        character_instructions=(
            "You are Receptionist Joy at a fictional Nairobi hospital reception. "
            "Warm, patient, plain English, maximum two short sentences per turn."
        ),
    ),
    "amani": AgentPersona(
        id="amani",
        display_name="Patient Amani",
        role_badge="Waiting Area B · Fellow Visitor",
        voice_gemini="Aoede",
        voice_openai="shimmer",
        character_instructions=(
            "You are Amani, a calm, friendly fellow patient sitting in Waiting Area B "
            "at the fictional practice hospital. Make gentle, reassuring small talk in "
            "at most two short sentences and never ask for real personal details."
        ),
    ),
    "otieno": AgentPersona(
        id="otieno",
        display_name="Conductor Otieno",
        role_badge="Matatu Stage · Route 46",
        voice_gemini="Puck",
        voice_openai="onyx",
        character_instructions=(
            "You are Conductor Otieno at a fictional Nairobi matatu stage. "
            "Friendly, clear, patient, maximum two short sentences per turn."
        ),
    ),
    "wanjiku": AgentPersona(
        id="wanjiku",
        display_name="Officer Wanjiku",
        role_badge="Government Service Desk",
        voice_gemini="Kore",
        voice_openai="alloy",
        character_instructions=(
            "You are Customer Officer Wanjiku at a fictional public service desk. "
            "Calm, respectful, plain language, maximum two short sentences per turn."
        ),
    ),
    "maina": AgentPersona(
        id="maina",
        display_name="Passerby Maina",
        role_badge="Asking for Directions",
        voice_gemini="Charon",
        voice_openai="echo",
        character_instructions=(
            "You are Maina, a helpful pedestrian in a fictional Nairobi street practice. "
            "Give clear landmark-based practice directions in at most two short sentences."
        ),
    ),
}


@dataclass
class SharedBusTurn:
    speaker_id: str
    speaker_name: str
    text: str


@dataclass
class MultiAgentBus:
    """Shared context bus across multiple Pipecat agent personas in one session."""

    active_speaker_id: str = "joy"
    secondary_speaker_id: Optional[str] = None
    parallel_overlap_active: bool = False
    pending_approval_lock: bool = False
    shared_transcript: List[SharedBusTurn] = field(default_factory=list)

    @property
    def active_persona(self) -> AgentPersona:
        return PERSONAS.get(self.active_speaker_id, PERSONAS["joy"])

    def record_turn(self, speaker_id: str, text: str) -> None:
        persona = PERSONAS.get(speaker_id)
        name = persona.display_name if persona else "Visitor"
        self.shared_transcript.append(SharedBusTurn(speaker_id=speaker_id, speaker_name=name, text=text))

    def handoff(self, target_speaker_id: str, parallel: bool = False) -> Dict[str, Any]:
        """SB.2 & SB.4: Handoff to target agent; safe even if an approval is pending."""
        if target_speaker_id not in PERSONAS:
            target_speaker_id = "joy"
        previous = self.active_speaker_id
        self.active_speaker_id = target_speaker_id
        self.parallel_overlap_active = parallel
        self.secondary_speaker_id = "amani" if (parallel and target_speaker_id != "amani") else None
        return {
            "type": "speaker_changed",
            "previous_speaker": previous,
            "active_speaker": self.active_speaker_id,
            "active_display_name": self.active_persona.display_name,
            "role_badge": self.active_persona.role_badge,
            "parallel_fanout": self.parallel_overlap_active,
            "secondary_speaker": self.secondary_speaker_id,
        }

    def build_parallel_fanout_turn(self, primary_id: Optional[str] = None) -> Dict[str, Any]:
        """SB.3: Primary scenario persona and Amani speak in the same turn; user response selects one."""
        primary = primary_id if (primary_id and primary_id in PERSONAS and primary_id != "amani") else (
            self.active_speaker_id if self.active_speaker_id != "amani" else "joy"
        )
        self.parallel_overlap_active = True
        self.active_speaker_id = primary
        self.secondary_speaker_id = "amani"
        primary_persona = PERSONAS[primary]

        lines_by_primary = {
            "joy": (
                "Receptionist Joy: Your pretend clinic turn is ready at Desk 1 whenever you would like to step up.",
                "Patient Amani: Take your time, friend—I can hold your seat here if you want another moment.",
            ),
            "otieno": (
                "Conductor Otieno: Hospital Road Stage is next—let me know if you are alighting here!",
                "Passenger Amani: I can step aside by the door so you have plenty of room to step down.",
            ),
            "wanjiku": (
                "Officer Wanjiku: Calling pretend ticket B-12 for Counter 3 whenever you are ready.",
                "Citizen Amani: That is your ticket number, friend—Counter 3 is the window straight ahead.",
            ),
            "maina": (
                "Passerby Maina: You are right on track—turn left at the clock tower just ahead.",
                "Shopkeeper Amani: Have a lovely walk—the library entrance is right past the tower.",
            ),
        }
        primary_line, amani_line = lines_by_primary.get(primary, lines_by_primary["joy"])
        return {
            "type": "parallel_fanout",
            "speakers": [
                {"id": primary, "name": primary_persona.display_name, "text": primary_line},
                {"id": "amani", "name": PERSONAS["amani"].display_name, "text": amani_line},
            ],
            "combined_prompt": (
                f"Produce a brief two-voice overlap turn: first {primary_persona.display_name}, "
                "then Amani offering a kind word, and invite the visitor to answer either person."
            ),
        }

    def resolve_parallel_barge_in(self, user_text: str, default_primary: Optional[str] = None) -> Dict[str, Any]:
        """SB.3: User response selects which agent continues while the other yields."""
        cleaned = (user_text or "").lower()
        primary = default_primary or (self.active_speaker_id if self.active_speaker_id != "amani" else "joy")
        if "amani" in cleaned or "seat" in cleaned or "wait" in cleaned or "hold" in cleaned:
            chosen = "amani"
            yielded = primary
        else:
            chosen = primary
            yielded = "amani"
        self.active_speaker_id = chosen
        self.secondary_speaker_id = None
        self.parallel_overlap_active = False
        return {
            "type": "parallel_resolved",
            "chosen_speaker": chosen,
            "chosen_display_name": PERSONAS[chosen].display_name,
            "yielded_speaker": yielded,
        }
