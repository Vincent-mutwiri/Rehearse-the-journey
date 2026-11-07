"""SA.2 & SA.4 — Structured Pipecat Flow node graphs per scenario and chaos level.

Separates character instructions (scenario.py) from conversation sequence (FlowNode).
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class FlowNode:
    id: str
    step_title: str
    speaker: str  # 'joy' | 'amani' | 'otieno' | 'wanjiku' | 'maina'
    entry_prompt: str
    expected_keywords: List[str] = field(default_factory=list)
    fallback_prompt: str = ""
    next_node_id: Optional[str] = None
    diversion_trigger_keywords: List[str] = field(default_factory=list)
    diversion_node_id: Optional[str] = None
    requires_approval: bool = False
    approval_target_step: Optional[str] = None
    handoff_to: Optional[str] = None
    parallel_fanout: bool = False


@dataclass(frozen=True)
class ScenarioFlow:
    scenario_id: str
    scenario_name: str
    level: int
    level_name: str
    primary_persona: str
    character_prompt: str
    initial_node_id: str
    nodes: Dict[str, FlowNode]


CONFUSION_KEYWORDS = [
    "confused", "don't understand", "do not understand", "what do i say",
    "help", "repeat", "again", "slower", "slow down", "simplify", "plain",
    "not sure", " sijui", "pole",
]

DECLINE_KEYWORDS = [
    "no card", "don't have", "do not have", "forgot", "lost", "prefer not",
    "decline", "skip", "no id",
]


HOSPITAL_L1_NODES: Dict[str, FlowNode] = {
    "greet": FlowNode(
        id="greet",
        step_title="Step 1 · Arrive & state your visit",
        speaker="joy",
        entry_prompt=(
            "Introduce yourself as Joy at this fictional practice hospital reception. "
            "Remind the visitor this is fictional practice and ask how you can help today."
        ),
        expected_keywords=[
            "appointment", "visit", "see", "doctor", "clinic", "checkup",
            "help", "here", "arrived", "morning", "hello", "hi", "jambo", "habari",
        ],
        fallback_prompt=(
            "Reassure the visitor warmly without advancing. Give one simple example "
            "reply they can try, such as: 'I am here for a pretend clinic checkup.'"
        ),
        next_node_id="ask_for_card",
    ),
    "ask_for_card": FlowNode(
        id="ask_for_card",
        step_title="Step 2 · Pretend clinic card check",
        speaker="joy",
        entry_prompt=(
            "Thank the visitor. Ask whether they brought a pretend clinic card today. "
            "Remind them never to share a real ID or phone number—yes, no, or a made-up card is fine."
        ),
        expected_keywords=[
            "yes", "no", "have", "here", "pretend", "card", "forgot", "none", "okay", "sure",
        ],
        fallback_prompt=(
            "Reassure them that no real card is needed. They can simply say 'Yes, here is "
            "my pretend card' or 'No, I do not have one today.'"
        ),
        next_node_id="direct_to_waiting_area",
        requires_approval=True,
        approval_target_step="direct_to_waiting_area",
    ),
    "direct_to_waiting_area": FlowNode(
        id="direct_to_waiting_area",
        step_title="Step 3 · Directions to Waiting Area B",
        speaker="joy",
        entry_prompt=(
            "Welcome their answer warmly. Explain that in this fictional exercise they can "
            "take a seat in Waiting Area B on the left, and ask if they would like to finish or repeat."
        ),
        expected_keywords=[
            "thank", "thanks", "okay", "ok", "waiting", "repeat", "done", "finish", "ready", "asante",
        ],
        fallback_prompt=(
            "Explain gently in plain words: 'Waiting Area B is just past the desk on the left. "
            "Say thank you when you are ready to finish.'"
        ),
        next_node_id="close",
    ),
    "close": FlowNode(
        id="close",
        step_title="Step 4 · Practice complete",
        speaker="joy",
        entry_prompt=(
            "Congratulate the visitor warmly on completing the fictional hospital reception "
            "rehearsal. Offer to repeat any step whenever they choose."
        ),
        expected_keywords=["repeat", "again", "thanks", "bye", "done"],
        fallback_prompt="Remind them the practice is complete and they can pause, exit, or repeat.",
        next_node_id=None,
        requires_approval=True,
        approval_target_step="close",
    ),
}


HOSPITAL_L2_NODES: Dict[str, FlowNode] = {
    "greet": HOSPITAL_L1_NODES["greet"],
    "ask_for_card": FlowNode(
        id="ask_for_card",
        step_title="Step 2 · Pretend clinic card & department",
        speaker="joy",
        entry_prompt=(
            "Ask if they have a pretend clinic card and whether they are visiting the "
            "pretend General Clinic or Dental Desk today."
        ),
        expected_keywords=["general", "dental", "clinic", "card", "yes", "no", "pretend"],
        fallback_prompt=(
            "Say they can pick either 'General Clinic' or 'Dental Desk' and say yes or no for the pretend card."
        ),
        next_node_id="direct_to_waiting_area",
        requires_approval=True,
        approval_target_step="direct_to_waiting_area",
    ),
    "direct_to_waiting_area": HOSPITAL_L1_NODES["direct_to_waiting_area"],
    "close": HOSPITAL_L1_NODES["close"],
}


HOSPITAL_L3_NODES: Dict[str, FlowNode] = {
    "greet": HOSPITAL_L1_NODES["greet"],
    "ask_for_card": FlowNode(
        id="ask_for_card",
        step_title="Step 2 · Card check + room-move change",
        speaker="joy",
        entry_prompt=(
            "Ask for their pretend clinic card, then mention a gentle change: Waiting Area B "
            "is being cleaned, so the pretend queue moved to Room 4 across the hall."
        ),
        expected_keywords=["room", "where", "okay", "card", "yes", "no", "change", "hall"],
        diversion_trigger_keywords=["where", "which room", "changed", "why", "outage", "moved"],
        diversion_node_id="room_move_diversion",
        fallback_prompt=(
            "Reassure them: 'No problem at all—Room 4 is right across the hall with a green sign.'"
        ),
        next_node_id="direct_to_waiting_area",
        requires_approval=True,
        approval_target_step="direct_to_waiting_area",
    ),
    "room_move_diversion": FlowNode(
        id="room_move_diversion",
        step_title="Step 2b · Handling the room change",
        speaker="joy",
        entry_prompt=(
            "Calmly explain the diversion: the digital ticket screen is offline for ten minutes, "
            "so staff are guiding visitors directly to Room 4. Ask if they feel ready to head to Room 4."
        ),
        expected_keywords=["yes", "ready", "okay", "thanks", "room 4", "got it"],
        fallback_prompt="Reassure them they can take their time and ask any question about Room 4.",
        next_node_id="direct_to_waiting_area",
    ),
    "direct_to_waiting_area": FlowNode(
        id="direct_to_waiting_area",
        step_title="Step 3 · Confirming new waiting area",
        speaker="joy",
        entry_prompt=(
            "Confirm they are all set for Room 4 in this fictional exercise and ask if they "
            "would like to wrap up the practice."
        ),
        expected_keywords=["yes", "thanks", "okay", "done", "finish"],
        fallback_prompt="Say: 'You did great handling the room change. Say thank you to finish.'",
        next_node_id="close",
    ),
    "close": HOSPITAL_L1_NODES["close"],
}


HOSPITAL_L4_NODES: Dict[str, FlowNode] = {
    "greet": HOSPITAL_L1_NODES["greet"],
    "ask_for_card": FlowNode(
        id="ask_for_card",
        step_title="Step 2 · Pretend card check (busy lobby)",
        speaker="joy",
        entry_prompt=(
            "Ask for their pretend clinic card and let them know Waiting Area B is lively today; "
            "a fellow visitor named Amani is sitting nearby."
        ),
        expected_keywords=["yes", "no", "card", "okay", "here", "pretend"],
        fallback_prompt="Tell them yes or no for the pretend card is completely fine.",
        next_node_id="waiting_area_handoff",
        requires_approval=True,
        approval_target_step="waiting_area_handoff",
    ),
    "waiting_area_handoff": FlowNode(
        id="waiting_area_handoff",
        step_title="Step 3 · Waiting Area B (Handoff to Patient Amani)",
        speaker="amani",
        handoff_to="amani",
        entry_prompt=(
            "You are now Patient Amani, a warm fellow visitor in Waiting Area B. "
            "Greet the person kindly and ask if they are also waiting for the pretend morning clinic."
        ),
        expected_keywords=["yes", "waiting", "morning", "clinic", "hello", "hi", "too", "okay"],
        fallback_prompt="As Amani, smile warmly and say: 'No rush—we can just sit quietly until Joy calls your name.'",
        next_node_id="parallel_call_back",
    ),
    "parallel_call_back": FlowNode(
        id="parallel_call_back",
        step_title="Step 4 · Two people speak at once (Joy & Amani)",
        speaker="joy",
        handoff_to="joy",
        parallel_fanout=True,
        entry_prompt=(
            "Receptionist Joy calls the visitor back to the desk while Amani wishes them good luck. "
            "Wait for the visitor to choose who to reply to."
        ),
        expected_keywords=["joy", "amani", "coming", "thanks", "ready", "desk", "okay", "yes"],
        fallback_prompt="You can reply to Joy ('Coming to the desk') or thank Amani ('Thanks Amani').",
        next_node_id="close",
        requires_approval=True,
        approval_target_step="close",
    ),
    "close": HOSPITAL_L1_NODES["close"],
}


MATATU_NODES: Dict[str, FlowNode] = {
    "greet": FlowNode(
        id="greet",
        step_title="Step 1 · Ask Conductor Otieno the route & fare",
        speaker="otieno",
        entry_prompt=(
            "Introduce yourself as Conductor Otieno at a fictional Nairobi matatu stage. "
            "Say this is fictional practice and ask which stop the passenger is heading to."
        ),
        expected_keywords=["town", "cbd", "hospital", "westlands", "stage", "how much", "fare", "going"],
        fallback_prompt="Suggest a simple phrase: 'Are you going toward town, and how much is the pretend fare?'",
        next_node_id="confirm_payment",
    ),
    "confirm_payment": FlowNode(
        id="confirm_payment",
        step_title="Step 2 · Pretend fare & boarding",
        speaker="otieno",
        entry_prompt=(
            "Say the pretend off-peak fare is 50 pretend shillings and ask if they would like a seat near the door."
        ),
        expected_keywords=["yes", "okay", "door", "seat", "50", "pretend", "thanks"],
        fallback_prompt="Reassure them: 'Just say yes please, I will take the seat near the door.'",
        next_node_id="request_stop",
        requires_approval=True,
        approval_target_step="request_stop",
    ),
    "request_stop": FlowNode(
        id="request_stop",
        step_title="Step 3 · Calling out your stop",
        speaker="otieno",
        entry_prompt=(
            "Let the passenger know the matatu is approaching their pretend stage and invite them to call out their stop."
        ),
        expected_keywords=["shukisha", "stop", "stage", "here", "next", "dropoff", "thank"],
        fallback_prompt="Invite them to say 'Stop at the next stage please' or 'Shukisha hapa tafadhali.'",
        next_node_id="close",
    ),
    "close": FlowNode(
        id="close",
        step_title="Step 4 · Matatu practice complete",
        speaker="otieno",
        entry_prompt="Congratulate the passenger on completing the fictional matatu rehearsal.",
        expected_keywords=["thanks", "repeat", "done"],
        fallback_prompt="Practice complete. You can repeat or exit whenever ready.",
        next_node_id=None,
    ),
}


GOVERNMENT_NODES: Dict[str, FlowNode] = {
    "greet": FlowNode(
        id="greet",
        step_title="Step 1 · Arrive at Customer Desk",
        speaker="wanjiku",
        entry_prompt=(
            "Introduce yourself as Officer Wanjiku at a fictional Huduma-style service desk. "
            "Remind the visitor this is fictional practice and ask which pretend service they are inquiring about."
        ),
        expected_keywords=["renewal", "inquiry", "form", "help", "desk", "service", "queue", "ticket"],
        fallback_prompt="Suggest: 'I am here to ask about a pretend form inquiry.'",
        next_node_id="check_documents",
    ),
    "check_documents": FlowNode(
        id="check_documents",
        step_title="Step 2 · Pretend checklist confirmation",
        speaker="wanjiku",
        entry_prompt=(
            "Ask if they have their pretend reference slip, reminding them never to share real personal numbers."
        ),
        expected_keywords=["yes", "no", "slip", "pretend", "form", "have", "okay"],
        fallback_prompt="Say: 'You can answer yes or no—this is only a fictional rehearsal.'",
        next_node_id="queue_ticket",
        requires_approval=True,
        approval_target_step="queue_ticket",
    ),
    "queue_ticket": FlowNode(
        id="queue_ticket",
        step_title="Step 3 · Counter number & waiting",
        speaker="wanjiku",
        entry_prompt=(
            "Hand them pretend ticket B-12 for Counter 3 and ask if they would like the directions repeated."
        ),
        expected_keywords=["no", "thanks", "thank you", "counter", "okay", "repeat", "clear"],
        fallback_prompt="Say: 'Counter 3 is straight ahead. Say thank you when ready to finish.'",
        next_node_id="close",
    ),
    "close": FlowNode(
        id="close",
        step_title="Step 4 · Service desk practice complete",
        speaker="wanjiku",
        entry_prompt="Warmly wrap up the fictional government service desk practice.",
        expected_keywords=["thanks", "done", "repeat"],
        fallback_prompt="Practice complete.",
        next_node_id=None,
    ),
}


DIRECTIONS_NODES: Dict[str, FlowNode] = {
    "greet": FlowNode(
        id="greet",
        step_title="Step 1 · Ask Passerby Maina for a landmark",
        speaker="maina",
        entry_prompt=(
            "Introduce yourself as Maina, a friendly passerby in a fictional Nairobi street rehearsal. "
            "Ask which pretend landmark the visitor is looking for."
        ),
        expected_keywords=["clinic", "bus", "stage", "library", "post office", "where", "direction", "looking"],
        fallback_prompt="Try asking: 'Excuse me, which way is the pretend community library?'",
        next_node_id="confirm_landmark",
    ),
    "confirm_landmark": FlowNode(
        id="confirm_landmark",
        step_title="Step 2 · Repeat back the two-step direction",
        speaker="maina",
        entry_prompt=(
            "Give a simple two-step pretend direction: walk past the green bookshop and turn left at the clock tower. "
            "Ask if they would like to repeat those two landmarks back."
        ),
        expected_keywords=["bookshop", "clock", "tower", "left", "green", "yes", "got it", "okay"],
        fallback_prompt="Remind them: 'Past the green bookshop, then left at the clock tower.'",
        next_node_id="close",
        requires_approval=True,
        approval_target_step="close",
    ),
    "close": FlowNode(
        id="close",
        step_title="Step 3 · Directions practice complete",
        speaker="maina",
        entry_prompt="Wish them a safe pretend walk and offer to practise again anytime.",
        expected_keywords=["thanks", "asante", "done"],
        fallback_prompt="Practice complete.",
        next_node_id=None,
    ),
}


LEVEL_NAMES: Dict[int, str] = {
    1: "Level 1 · Easy Start",
    2: "Level 2 · Everyday Practice",
    3: "Level 3 · Handling Changes",
    4: "Level 4 · Busy Environment",
}


def get_scenario_flow(scenario_id: str = "hospital", level: int = 1, base_prompt: str = "") -> ScenarioFlow:
    sid = (scenario_id or "hospital").lower().strip()
    lvl = max(1, min(4, int(level or 1)))

    if sid == "matatu":
        return ScenarioFlow(
            scenario_id="matatu",
            scenario_name="Matatu Stage",
            level=lvl,
            level_name=LEVEL_NAMES[lvl],
            primary_persona="otieno",
            character_prompt=base_prompt,
            initial_node_id="greet",
            nodes=MATATU_NODES,
        )
    if sid == "government":
        return ScenarioFlow(
            scenario_id="government",
            scenario_name="Government Service",
            level=lvl,
            level_name=LEVEL_NAMES[lvl],
            primary_persona="wanjiku",
            character_prompt=base_prompt,
            initial_node_id="greet",
            nodes=GOVERNMENT_NODES,
        )
    if sid == "directions":
        return ScenarioFlow(
            scenario_id="directions",
            scenario_name="Asking for Directions",
            level=lvl,
            level_name=LEVEL_NAMES[lvl],
            primary_persona="maina",
            character_prompt=base_prompt,
            initial_node_id="greet",
            nodes=DIRECTIONS_NODES,
        )

    hospital_nodes = {
        1: HOSPITAL_L1_NODES,
        2: HOSPITAL_L2_NODES,
        3: HOSPITAL_L3_NODES,
        4: HOSPITAL_L4_NODES,
    }[lvl]
    return ScenarioFlow(
        scenario_id="hospital",
        scenario_name="Hospital Reception",
        level=lvl,
        level_name=LEVEL_NAMES[lvl],
        primary_persona="joy",
        character_prompt=base_prompt,
        initial_node_id="greet",
        nodes=hospital_nodes,
    )
