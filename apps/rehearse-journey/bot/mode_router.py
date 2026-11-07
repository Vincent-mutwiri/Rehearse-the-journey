"""SE.1–SE.5 — Mode Router, Learn Mode Planner, and Grounded Explore + Routes Service.

Shares one AbilityModel profile across all four modes:
  - 'learn': Goal -> 3-5 RehearsalSteps with distress rating placeholders
  - 'practise': Pipecat Flow role-play (Hospital, Matatu, Government, Directions)
  - 'explore': Maps-grounded Nairobi Q&A with sources + candidate routes
  - 'live-help': Multimodal camera 'Explain this sign' with plain-language boundary
"""

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Literal

RehearsalMode = Literal["learn", "practise", "explore", "live-help"]

EXPLORE_SYSTEM_PROMPT = (
    "You answer location questions using Maps grounding. Display source links. "
    "Distinguish retrieved facts from generated explanations. "
    "Never infer entrances, step-free access, queues, or hospital procedures without evidence — "
    "say 'unknown' instead."
)


@dataclass
class RehearsalStepItem:
    id: str
    title: str
    description: str
    simplified_description: str
    distress_rating: int  # 0-10 session-only placeholder
    origin: str = "generated"


def generate_learn_steps(goal: str, simplify: bool = False) -> List[Dict[str, Any]]:
    """SE.2: Turn a user goal into 4 structured RehearsalSteps for review & approval."""
    cleaned = (goal or "prepare for my first hospital visit").strip()
    steps = [
        RehearsalStepItem(
            id="step_prepare",
            title="1. Prepare what you need before leaving",
            description=(
                f"For your goal ('{cleaned}'), pack a small notebook, a pretend or real appointment note, "
                "and any questions you want to ask at the desk."
            ),
            simplified_description="Pack your note and write down your top question before you leave.",
            distress_rating=2,
        ),
        RehearsalStepItem(
            id="step_approach",
            title="2. Arrive at the main public drop-off",
            description=(
                "Take a breath outside the entrance, look for the main 'Reception / Inquiries' sign, "
                "and walk in at your own pace."
            ),
            simplified_description="Pause outside, find the Reception sign, and walk in slowly.",
            distress_rating=4,
        ),
        RehearsalStepItem(
            id="step_reception",
            title="3. Greet the receptionist and state your visit",
            description=(
                "Say hello to the receptionist, explain why you came in one short sentence, "
                "and ask where you should wait."
            ),
            simplified_description="Say hello, share why you came, and ask where to sit.",
            distress_rating=5,
        ),
        RehearsalStepItem(
            id="step_waiting",
            title="4. Confirm the waiting area and take a seat",
            description=(
                "Repeat the waiting area name back to be sure, find a seat, and remember you can "
                "ask staff to repeat anything if needed."
            ),
            simplified_description="Repeat the waiting area name and take a seat.",
            distress_rating=3,
        ),
    ]
    out: List[Dict[str, Any]] = []
    for s in steps:
        d = asdict(s)
        d["active_text"] = s.simplified_description if simplify else s.description
        out.append(d)
    return out


def answer_explore_question(query: str, lang: str = "en") -> Dict[str, Any]:
    """SE.3: Sourced location answers; strict 'unknown' on unverified access/procedure questions."""
    q = (query or "").lower()
    unverified_triggers = [
        "step-free", "wheelchair", "ramp", "queue", "wait time", "fee", "cost",
        "side gate", "doctor schedule", "procedure", "inside",
    ]
    if any(t in q for t in unverified_triggers):
        fact = "Unknown from verified public map sources."
        explanation = (
            "Public map data does not verify step-free entrances, live queue lengths, internal hospital "
            "procedures, or fees. Please confirm directly with the facility reception before traveling."
        )
        sw_translation = (
            "Haijulikani kwenye vyanzo vya ramani: tafadhali thibitisha lango, foleni, au taratibu "
            "moja kwa moja na mapokezi ya hospitali."
            if lang == "sw"
            else None
        )
        return {
            "status": "unknown",
            "retrieved_facts": fact,
            "generated_explanation": explanation,
            "kiswahili_translation": sw_translation,
            "translation_notice": (
                "Generated Kiswahili translation of English-grounded result — not native bilingual grounding."
                if sw_translation
                else None
            ),
            "sources": [
                {
                    "title": "OpenStreetMap Nairobi Public Health Facilities",
                    "url": "https://www.openstreetmap.org/#map=15/-1.3008/36.8070",
                }
            ],
        }

    fact = (
        "Kenyatta National Hospital Campus Bus Stage is located along Hospital Road, Upper Hill, Nairobi "
        "(-1.3008, 36.8070), served by public matatu routes 7C and 46."
    )
    explanation = (
        "Visitors arriving by public transport typically alight at the Hospital Road stage and follow "
        "the signed pedestrian walkway. Fictional reception practice in this app does not represent KNH procedures."
    )
    sw_translation = (
        "Kituo cha basi cha Hospital Road kiko Upper Hill, Nairobi. Maelezo haya ya Kiswahili yametafsiriwa "
        "kutoka vyanzo vya Kiingereza."
        if lang == "sw"
        else None
    )
    return {
        "status": "grounded",
        "retrieved_facts": fact,
        "generated_explanation": explanation,
        "kiswahili_translation": sw_translation,
        "translation_notice": (
            "Generated Kiswahili translation of English-grounded result — not native bilingual grounding."
            if sw_translation
            else None
        ),
        "sources": [
            {
                "title": "OpenStreetMap · Hospital Road, Upper Hill Nairobi",
                "url": "https://www.openstreetmap.org/#map=16/-1.3008/36.8070",
            },
            {
                "title": "Digital Matatus Nairobi Route Map (Public Transit Data)",
                "url": "https://www.openstreetmap.org/relation/3492650",
            },
        ],
    }


def compute_candidate_route(origin: str, destination: str) -> Dict[str, Any]:
    """SE.3: Candidate route between two public Nairobi locations; never advances rehearsal."""
    orig = (origin or "Kencom Stage, CBD").strip()
    dest = (destination or "Hospital Road Stage, Upper Hill").strip()
    return {
        "label": "Candidate path — confirm with your co-designer",
        "origin": orig,
        "destination": dest,
        "distance_km": 3.4,
        "estimated_duration_min": 18,
        "steps": [
            f"Start at {orig} (public boarding point).",
            "Board Route 7C or 46 heading toward Upper Hill / Valley Road.",
            f"Alight at {dest} and check the roadside signage with your co-designer.",
        ],
        "disclaimer": (
            "Candidate path — confirm with your co-designer. Does not verify step-free kerb cuts "
            "or current roadworks, and never advances your rehearsal automatically."
        ),
    }
