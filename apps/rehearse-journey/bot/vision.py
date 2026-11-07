"""SD.1–SD.4 — Multimodal Camera ('Explain this sign') for Live Help Mode.

Enforces the PRD §2.2 US-4 / §4.5 safety boundary:
- Per-session approval-gated camera consent
- Plain-language sign explanation only
- NEVER obstacle detection, location truth, or navigation advice
"""

from dataclasses import dataclass
from typing import Dict

VISION_SYSTEM_PROMPT = (
    "You are explaining a visible sign in plain language. "
    "You are not detecting obstacles, reading the person's location, or giving navigation advice. "
    "If you can't see the sign clearly, say so. "
    "Always remind the person: 'Explanation only; confirm with staff or signage.'"
)

BOUNDARY_NOTICE = "Explanation only; confirm with staff or signage. Not obstacle detection or navigation."


@dataclass(frozen=True)
class SignFixture:
    id: str
    label: str
    raw_sign_text: str
    explanation: str
    simplified_explanation: str


SIGN_FIXTURES: Dict[str, SignFixture] = {
    "outpatient_b": SignFixture(
        id="outpatient_b",
        label="Hospital Sign: Outpatient Waiting Area B / Registration",
        raw_sign_text="OUTPATIENT REGISTRATION — COUNTER 1 & 2 | WAITING BAY B (LEFT CORRIDOR)",
        explanation=(
            "This sign says Outpatient Registration is at Counters 1 and 2, and Waiting Bay B "
            "is along the left corridor. Explanation only; confirm with staff or signage."
        ),
        simplified_explanation=(
            "Check in at Counter 1 or 2. Waiting Area B is down the hall to the left. "
            "Explanation only; confirm with staff or signage."
        ),
    ),
    "pharmacy_queue": SignFixture(
        id="pharmacy_queue",
        label="Hospital Sign: Pharmacy & Cashier Queue Numbers",
        raw_sign_text="DISPENSARY WINDOW A: TICKET REQUIRED | CASHIER WINDOW C BEFORE COLLECTION",
        explanation=(
            "This sign means you need a queue ticket for Dispensary Window A, and any payment happens "
            "at Cashier Window C first. Explanation only; confirm with staff or signage."
        ),
        simplified_explanation=(
            "Get a ticket first. Visit Cashier Window C before picking up medicine at Window A. "
            "Explanation only; confirm with staff or signage."
        ),
    ),
    "unclear_blur": SignFixture(
        id="unclear_blur",
        label="Unclear / Angled Sign (Boundary Test)",
        raw_sign_text="[BLURRED / GLARE ON SIGN BOARD]",
        explanation=(
            "I cannot see this sign clearly enough to read the words safely. "
            "Please hold the camera steadier or ask a staff member nearby. "
            "Explanation only; confirm with staff or signage."
        ),
        simplified_explanation=(
            "I cannot read this sign clearly. Please ask a staff member nearby to be sure. "
            "Explanation only; confirm with staff or signage."
        ),
    ),
}


def explain_sign(sign_id: str, simplify: bool = False) -> Dict[str, str]:
    fixture = SIGN_FIXTURES.get(sign_id, SIGN_FIXTURES["outpatient_b"])
    text = fixture.simplified_explanation if simplify else fixture.explanation
    return {
        "sign_id": fixture.id,
        "label": fixture.label,
        "raw_sign_text": fixture.raw_sign_text,
        "explanation": text,
        "boundary_notice": BOUNDARY_NOTICE,
        "system_prompt": VISION_SYSTEM_PROMPT,
    }
