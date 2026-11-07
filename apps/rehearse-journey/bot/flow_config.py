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
    # Optional interactive story the client shows when this node is entered.
    # Must match a key in the client's stories registry.
    story_id: Optional[str] = None


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
    "what should i say", "repeat", "say that again", "again please", "slower",
    "slow down", "simplify", "plain words", "not sure", "sijui", "pole",
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
        story_id="hospital-waiting-area",
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
        story_id="hospital-waiting-area",
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
        story_id="hospital-waiting-area",
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
        next_node_id="confirm_morning_slot",
        requires_approval=True,
        approval_target_step="confirm_morning_slot",
    ),
    "confirm_morning_slot": FlowNode(
        id="confirm_morning_slot",
        step_title="Step 3 · Confirming morning vs afternoon slot",
        speaker="joy",
        entry_prompt=(
            "Thank them and ask whether their pretend appointment is for the morning session or afternoon session."
        ),
        expected_keywords=["morning", "afternoon", "session", "today", "now", "early", "yes", "okay"],
        fallback_prompt="Invite them to say 'the morning session' or 'the afternoon session.'",
        next_node_id="direct_to_waiting_area",
    ),
    "direct_to_waiting_area": HOSPITAL_L1_NODES["direct_to_waiting_area"],
    "close": HOSPITAL_L1_NODES["close"],
}


HOSPITAL_L3_NODES: Dict[str, FlowNode] = {
    "greet": FlowNode(
        id="greet",
        step_title="Step 1 · Arrive & state your visit",
        speaker="joy",
        entry_prompt=HOSPITAL_L1_NODES["greet"].entry_prompt,
        expected_keywords=HOSPITAL_L1_NODES["greet"].expected_keywords,
        fallback_prompt=HOSPITAL_L1_NODES["greet"].fallback_prompt,
        next_node_id="ask_for_card",
        story_id="hospital-room-4",
    ),
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
        story_id="hospital-room-4",
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
        story_id="hospital-room-4",
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
        story_id="hospital-room-4",
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
        story_id="hospital-waiting-area",
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


MATATU_L1_NODES: Dict[str, FlowNode] = {
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
        story_id="matatu-stage-route",
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
        story_id="matatu-stage-route",
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
        story_id="matatu-stage-route",
    ),
    "close": FlowNode(
        id="close",
        step_title="Step 4 · Matatu practice complete",
        speaker="otieno",
        entry_prompt="Congratulate the passenger on completing the fictional matatu rehearsal.",
        expected_keywords=["thanks", "repeat", "done"],
        fallback_prompt="Practice complete. You can repeat or exit whenever ready.",
        next_node_id=None,
        requires_approval=True,
        approval_target_step="close",
    ),
}

MATATU_L2_NODES: Dict[str, FlowNode] = {
    "greet": MATATU_L1_NODES["greet"],
    "confirm_payment": FlowNode(
        id="confirm_payment",
        step_title="Step 2 · Pretend payment method & seat choice",
        speaker="otieno",
        entry_prompt=(
            "Say the pretend fare is 50 shillings. Ask whether they prefer pretend M-Pesa or pretend cash, "
            "and whether they want the seat by the door or window."
        ),
        expected_keywords=["mpesa", "m-pesa", "cash", "door", "window", "seat", "50", "yes", "okay"],
        fallback_prompt="Say they can pick 'pretend cash or pretend M-Pesa' and 'seat by the door or window.'",
        next_node_id="confirm_landmark_alert",
        requires_approval=True,
        approval_target_step="confirm_landmark_alert",
    ),
    "confirm_landmark_alert": FlowNode(
        id="confirm_landmark_alert",
        step_title="Step 3 · Ask conductor for a stage reminder",
        speaker="otieno",
        entry_prompt=(
            "Welcome them aboard and ask if they would like you to call out when the matatu passes the pretend roundabout before their stage."
        ),
        expected_keywords=["yes", "please", "remind", "alert", "roundabout", "stage", "thanks", "okay"],
        fallback_prompt="Suggest saying: 'Yes please, let me know when we pass the roundabout.'",
        next_node_id="request_stop",
    ),
    "request_stop": MATATU_L1_NODES["request_stop"],
    "close": MATATU_L1_NODES["close"],
}

MATATU_L3_NODES: Dict[str, FlowNode] = {
    "greet": MATATU_L1_NODES["greet"],
    "confirm_payment": FlowNode(
        id="confirm_payment",
        step_title="Step 2 · Fare check + stage diversion notice",
        speaker="otieno",
        entry_prompt=(
            "Confirm the 50 pretend shillings fare, then calmly mention a route change: roadworks closed Stage 3, "
            "so the matatu is dropping passengers at the Roundabout Stage 100 metres earlier."
        ),
        expected_keywords=["roundabout", "where", "why", "closed", "diversion", "change", "okay", "yes", "far"],
        diversion_trigger_keywords=["where", "why", "closed", "diversion", "change", "far", "walk"],
        diversion_node_id="stage_diversion",
        fallback_prompt="Reassure them: 'The Roundabout Stage is right by the pedestrian crossing—very easy to spot.'",
        next_node_id="request_stop",
        requires_approval=True,
        approval_target_step="request_stop",
    ),
    "stage_diversion": FlowNode(
        id="stage_diversion",
        step_title="Step 2b · Handling the stage diversion",
        speaker="otieno",
        entry_prompt=(
            "Explain calmly that traffic marshals redirected Route 46 for twenty minutes, and point out the "
            "shaded walkway from the Roundabout Stage. Ask if they feel ready to continue to the Roundabout Stage."
        ),
        expected_keywords=["yes", "ready", "okay", "roundabout", "thanks", "got it"],
        fallback_prompt="Reassure them there is no rush and you will announce the Roundabout Stage clearly.",
        next_node_id="request_stop",
        story_id="matatu-diversion-route",
    ),
    "request_stop": FlowNode(
        id="request_stop",
        step_title="Step 3 · Alighting at the Roundabout Stage",
        speaker="otieno",
        entry_prompt=(
            "Announce that the Roundabout Stage is up ahead and invite the passenger to call out their stop."
        ),
        expected_keywords=["shukisha", "stop", "stage", "roundabout", "here", "thank"],
        fallback_prompt="Invite them to say 'Shukisha at the roundabout stage, please.'",
        next_node_id="close",
        story_id="matatu-diversion-route",
    ),
    "close": MATATU_L1_NODES["close"],
}

MATATU_L4_NODES: Dict[str, FlowNode] = {
    "greet": MATATU_L1_NODES["greet"],
    "confirm_payment": FlowNode(
        id="confirm_payment",
        step_title="Step 2 · Boarding a busy matatu",
        speaker="otieno",
        entry_prompt=(
            "Welcome them onto the pretend matatu and mention that a friendly fellow passenger named Amani is seated next to the door."
        ),
        expected_keywords=["yes", "okay", "seat", "door", "50", "thanks"],
        fallback_prompt="Say yes or okay to take the seat next to Amani.",
        next_node_id="passenger_handoff",
        requires_approval=True,
        approval_target_step="passenger_handoff",
    ),
    "passenger_handoff": FlowNode(
        id="passenger_handoff",
        step_title="Step 3 · Seat chat (Handoff to Passenger Amani)",
        speaker="amani",
        handoff_to="amani",
        entry_prompt=(
            "You are now Fellow Passenger Amani seated beside the visitor on Route 46. "
            "Greet them warmly and ask if they are also alighting at the pretend Hospital Road stage."
        ),
        expected_keywords=["yes", "hospital", "stage", "alighting", "too", "hello", "hi", "okay"],
        fallback_prompt="As Amani, say kindly: 'We can watch for the stage sign together.'",
        next_node_id="parallel_stage_call",
    ),
    "parallel_stage_call": FlowNode(
        id="parallel_stage_call",
        step_title="Step 4 · Two voices at the stage (Otieno & Amani)",
        speaker="otieno",
        handoff_to="otieno",
        parallel_fanout=True,
        entry_prompt=(
            "Conductor Otieno calls out 'Hospital Stage next!' while Passenger Amani offers to step aside so the visitor can alight first. "
            "Invite the visitor to reply to either person."
        ),
        expected_keywords=["otieno", "amani", "shukisha", "stop", "thanks", "alighting", "okay", "yes"],
        fallback_prompt="You can tell Otieno 'Shukisha please' or thank Amani for letting you pass.",
        next_node_id="close",
        requires_approval=True,
        approval_target_step="close",
        story_id="matatu-stage-route",
    ),
    "close": MATATU_L1_NODES["close"],
}
MATATU_NODES = MATATU_L1_NODES


GOVERNMENT_L1_NODES: Dict[str, FlowNode] = {
    "greet": FlowNode(
        id="greet",
        step_title="Step 1 · Arrive at Customer Desk",
        speaker="wanjiku",
        entry_prompt=(
            "Introduce yourself as Officer Wanjiku at a fictional Huduma-style service desk. "
            "Remind the visitor this is fictional practice and ask which pretend service they are inquiring about."
        ),
        expected_keywords=["renewal", "inquiry", "form", "help", "desk", "service", "queue", "ticket", "id"],
        fallback_prompt="Suggest: 'I am here to ask about a pretend form inquiry.'",
        next_node_id="check_documents",
        story_id="gov-counter-directions",
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
        story_id="gov-counter-directions",
    ),
    "queue_ticket": FlowNode(
        id="queue_ticket",
        step_title="Step 3 · Counter number & waiting",
        speaker="wanjiku",
        entry_prompt=(
            "Hand them pretend ticket B-12 for Counter 3 and ask if they would like the directions repeated."
        ),
        expected_keywords=["no", "thanks", "thank you", "counter", "okay", "repeat", "clear", "yes"],
        fallback_prompt="Say: 'Counter 3 is straight ahead. Say thank you when ready to finish.'",
        next_node_id="close",
        story_id="gov-counter-directions",
    ),
    "close": FlowNode(
        id="close",
        step_title="Step 4 · Service desk practice complete",
        speaker="wanjiku",
        entry_prompt="Warmly wrap up the fictional government service desk practice.",
        expected_keywords=["thanks", "done", "repeat"],
        fallback_prompt="Practice complete.",
        next_node_id=None,
        requires_approval=True,
        approval_target_step="close",
    ),
}

GOVERNMENT_L2_NODES: Dict[str, FlowNode] = {
    "greet": GOVERNMENT_L1_NODES["greet"],
    "check_documents": FlowNode(
        id="check_documents",
        step_title="Step 2 · Pretend slip & service category",
        speaker="wanjiku",
        entry_prompt=(
            "Ask whether they brought their pretend reference slip and whether their inquiry is for "
            "Desk A (Pretend ID Replacement) or Desk B (Pretend Certificate Inquiry)."
        ),
        expected_keywords=["desk a", "desk b", "id", "certificate", "replacement", "inquiry", "yes", "no", "slip"],
        fallback_prompt="Invite them to choose 'Desk A or Desk B' and say yes or no for the pretend slip.",
        next_node_id="confirm_counter_steps",
        requires_approval=True,
        approval_target_step="confirm_counter_steps",
    ),
    "confirm_counter_steps": FlowNode(
        id="confirm_counter_steps",
        step_title="Step 3 · What to expect at Counter 3",
        speaker="wanjiku",
        entry_prompt=(
            "Explain that Counter 3 will stamp the pretend slip and call their ticket number on the screen. "
            "Ask if they would like you to write the counter number on the slip."
        ),
        expected_keywords=["yes", "please", "write", "counter", "thanks", "okay", "clear"],
        fallback_prompt="Suggest saying: 'Yes please, write Counter 3 on my pretend slip.'",
        next_node_id="queue_ticket",
    ),
    "queue_ticket": GOVERNMENT_L1_NODES["queue_ticket"],
    "close": GOVERNMENT_L1_NODES["close"],
}

GOVERNMENT_L3_NODES: Dict[str, FlowNode] = {
    "greet": GOVERNMENT_L1_NODES["greet"],
    "check_documents": FlowNode(
        id="check_documents",
        step_title="Step 2 · Slip check + ticket screen outage",
        speaker="wanjiku",
        entry_prompt=(
            "Check their pretend reference slip, then explain a change: the electronic ticket dispenser is offline, "
            "so visitors are using a paper queue card for Counter 5 instead of Counter 3."
        ),
        expected_keywords=["counter 5", "paper", "why", "outage", "offline", "where", "change", "okay", "yes"],
        diversion_trigger_keywords=["why", "outage", "offline", "where", "changed", "paper", "counter 5"],
        diversion_node_id="queue_outage_diversion",
        fallback_prompt="Reassure them: 'Counter 5 is just to the right of Counter 3, and an usher is calling names aloud.'",
        next_node_id="queue_ticket",
        requires_approval=True,
        approval_target_step="queue_ticket",
    ),
    "queue_outage_diversion": FlowNode(
        id="queue_outage_diversion",
        step_title="Step 2b · Handling the ticket printer outage",
        speaker="wanjiku",
        entry_prompt=(
            "Calmly reassure the visitor that paper card B-12 holds their exact place in line at Counter 5, "
            "and staff will call numbers out loud. Ask if they feel ready to head to Counter 5."
        ),
        expected_keywords=["yes", "ready", "counter 5", "okay", "thanks", "got it"],
        fallback_prompt="Remind them they can ask any question before walking over to Counter 5.",
        next_node_id="queue_ticket",
        story_id="gov-counter-5-outage",
    ),
    "queue_ticket": FlowNode(
        id="queue_ticket",
        step_title="Step 3 · Confirming Counter 5 paper queue",
        speaker="wanjiku",
        entry_prompt=(
            "Hand them pretend paper card B-12 for Counter 5 and ask if they are ready to wrap up."
        ),
        expected_keywords=["yes", "thanks", "counter 5", "okay", "done"],
        fallback_prompt="Say thank you when you are ready to finish.",
        next_node_id="close",
        story_id="gov-counter-5-outage",
    ),
    "close": GOVERNMENT_L1_NODES["close"],
}

GOVERNMENT_L4_NODES: Dict[str, FlowNode] = {
    "greet": GOVERNMENT_L1_NODES["greet"],
    "check_documents": FlowNode(
        id="check_documents",
        step_title="Step 2 · Pretend slip check (busy service hall)",
        speaker="wanjiku",
        entry_prompt=(
            "Confirm their pretend slip and hand them ticket B-12. Mention that the waiting bench by Counter 3 is lively today, "
            "where a fellow citizen named Amani is seated."
        ),
        expected_keywords=["yes", "no", "slip", "ticket", "okay", "thanks"],
        fallback_prompt="Say yes or okay to take pretend ticket B-12 to the waiting bench.",
        next_node_id="waiting_bench_handoff",
        requires_approval=True,
        approval_target_step="waiting_bench_handoff",
    ),
    "waiting_bench_handoff": FlowNode(
        id="waiting_bench_handoff",
        step_title="Step 3 · Waiting bench (Handoff to Citizen Amani)",
        speaker="amani",
        handoff_to="amani",
        entry_prompt=(
            "You are now Fellow Citizen Amani sitting on the waiting bench outside Counter 3. "
            "Greet the visitor warmly and ask which pretend ticket number they are holding."
        ),
        expected_keywords=["b-12", "b12", "12", "ticket", "counter 3", "waiting", "hello", "yes"],
        fallback_prompt="As Amani, smile and say: 'I have B-11, so your pretend ticket B-12 is right after mine!'",
        next_node_id="parallel_counter_call",
    ),
    "parallel_counter_call": FlowNode(
        id="parallel_counter_call",
        step_title="Step 4 · Two voices in the hall (Wanjiku & Amani)",
        speaker="wanjiku",
        handoff_to="wanjiku",
        parallel_fanout=True,
        entry_prompt=(
            "Officer Wanjiku calls 'Ticket B-12 for Counter 3!' while Citizen Amani points toward the counter window. "
            "Invite the visitor to reply to either person."
        ),
        expected_keywords=["wanjiku", "amani", "coming", "counter 3", "thanks", "here", "okay", "yes"],
        fallback_prompt="You can reply to Officer Wanjiku ('Coming to Counter 3') or thank Amani.",
        next_node_id="close",
        requires_approval=True,
        approval_target_step="close",
        story_id="gov-counter-directions",
    ),
    "close": GOVERNMENT_L1_NODES["close"],
}
GOVERNMENT_NODES = GOVERNMENT_L1_NODES


DIRECTIONS_L1_NODES: Dict[str, FlowNode] = {
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
        story_id="directions-landmarks",
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
        story_id="directions-landmarks",
    ),
    "close": FlowNode(
        id="close",
        step_title="Step 3 · Directions practice complete",
        speaker="maina",
        entry_prompt="Wish them a safe pretend walk and offer to practise again anytime.",
        expected_keywords=["thanks", "asante", "done", "repeat"],
        fallback_prompt="Practice complete.",
        next_node_id=None,
        requires_approval=True,
        approval_target_step="close",
    ),
}

DIRECTIONS_L2_NODES: Dict[str, FlowNode] = {
    "greet": DIRECTIONS_L1_NODES["greet"],
    "confirm_landmark": FlowNode(
        id="confirm_landmark",
        step_title="Step 2 · Landmarks & pedestrian crossing",
        speaker="maina",
        entry_prompt=(
            "Explain that the pretend library is a five-minute walk: go past the green bookshop, cross at the zebra crossing, "
            "and turn left at the clock tower. Ask them to repeat the landmarks back."
        ),
        expected_keywords=["bookshop", "zebra", "crossing", "clock", "tower", "left", "five", "yes", "okay"],
        fallback_prompt="Help them repeat: 'Green bookshop, zebra crossing, then left at the clock tower.'",
        next_node_id="ask_backup_landmark",
        requires_approval=True,
        approval_target_step="ask_backup_landmark",
    ),
    "ask_backup_landmark": FlowNode(
        id="ask_backup_landmark",
        step_title="Step 3 · Confirming a backup landmark",
        speaker="maina",
        entry_prompt=(
            "Mention a helpful backup landmark: if they see the yellow bakery, they have gone one block past the clock tower. "
            "Ask if they feel confident with those landmarks."
        ),
        expected_keywords=["yes", "bakery", "yellow", "confident", "thanks", "okay", "got it"],
        fallback_prompt="Say: 'If you spot the yellow bakery, just step back to the clock tower.'",
        next_node_id="close",
        story_id="directions-landmarks",
    ),
    "close": DIRECTIONS_L1_NODES["close"],
}

DIRECTIONS_L3_NODES: Dict[str, FlowNode] = {
    "greet": DIRECTIONS_L1_NODES["greet"],
    "confirm_landmark": FlowNode(
        id="confirm_landmark",
        step_title="Step 2 · Landmark check + footpath detour",
        speaker="maina",
        entry_prompt=(
            "Point out the green bookshop, then mention an unexpected change: the sidewalk by the clock tower is fenced off for paving, "
            "so pedestrians are turning left one block earlier at the quiet Post Office Arcade."
        ),
        expected_keywords=["post office", "arcade", "detour", "why", "closed", "fenced", "where", "left", "okay", "yes"],
        diversion_trigger_keywords=["why", "closed", "fenced", "detour", "arcade", "post office", "where", "change"],
        diversion_node_id="detour_diversion",
        fallback_prompt="Reassure them: 'The Post Office Arcade has a wide, step-free walkway right after the green bookshop.'",
        next_node_id="confirm_detour",
        requires_approval=True,
        approval_target_step="confirm_detour",
    ),
    "detour_diversion": FlowNode(
        id="detour_diversion",
        step_title="Step 2b · Navigating the Post Office Arcade detour",
        speaker="maina",
        entry_prompt=(
            "Calmly explain that the Post Office Arcade bypasses the noisy paving work and leads straight to the library courtyard. "
            "Ask if they would like to repeat the new turn ('left at the Post Office Arcade')."
        ),
        expected_keywords=["post office", "arcade", "left", "yes", "okay", "thanks", "got it"],
        fallback_prompt="Try repeating: 'Past the green bookshop, then left at the Post Office Arcade.'",
        next_node_id="confirm_detour",
        story_id="directions-detour",
    ),
    "confirm_detour": FlowNode(
        id="confirm_detour",
        step_title="Step 3 · Reviewing the detour map",
        speaker="maina",
        entry_prompt=(
            "Confirm they have the two detour landmarks (green bookshop, then Post Office Arcade) and ask if they are ready to finish."
        ),
        expected_keywords=["yes", "ready", "thanks", "okay", "done"],
        fallback_prompt="Say thank you when ready to complete the practice.",
        next_node_id="close",
        story_id="directions-detour",
    ),
    "close": DIRECTIONS_L1_NODES["close"],
}

DIRECTIONS_L4_NODES: Dict[str, FlowNode] = {
    "greet": DIRECTIONS_L1_NODES["greet"],
    "confirm_landmark": FlowNode(
        id="confirm_landmark",
        step_title="Step 2 · First landmark (busy street corner)",
        speaker="maina",
        entry_prompt=(
            "Direct them past the green bookshop and mention that Shopkeeper Amani is standing outside the bookshop door "
            "and can point out the clock-tower turn."
        ),
        expected_keywords=["bookshop", "green", "amani", "okay", "yes", "thanks"],
        fallback_prompt="Say okay or thank you to walk up to the green bookshop.",
        next_node_id="shopkeeper_handoff",
        requires_approval=True,
        approval_target_step="shopkeeper_handoff",
    ),
    "shopkeeper_handoff": FlowNode(
        id="shopkeeper_handoff",
        step_title="Step 3 · At the bookshop (Handoff to Shopkeeper Amani)",
        speaker="amani",
        handoff_to="amani",
        entry_prompt=(
            "You are now Shopkeeper Amani outside the pretend green bookshop. "
            "Greet the walker warmly and point out the clock tower just ahead on the left."
        ),
        expected_keywords=["clock", "tower", "left", "see", "thanks", "hello", "yes", "okay"],
        fallback_prompt="As Amani, say warmly: 'The clock tower is right at the end of this block on your left.'",
        next_node_id="parallel_direction_check",
    ),
    "parallel_direction_check": FlowNode(
        id="parallel_direction_check",
        step_title="Step 4 · Two helpers at the corner (Maina & Amani)",
        speaker="maina",
        handoff_to="maina",
        parallel_fanout=True,
        entry_prompt=(
            "Passerby Maina waves to confirm the clock-tower turn while Shopkeeper Amani wishes the walker a pleasant visit. "
            "Invite the walker to reply to either person."
        ),
        expected_keywords=["maina", "amani", "thanks", "asante", "clock", "left", "okay", "yes"],
        fallback_prompt="You can thank Maina or thank Amani as you head toward the clock tower.",
        next_node_id="close",
        requires_approval=True,
        approval_target_step="close",
        story_id="directions-landmarks",
    ),
    "close": DIRECTIONS_L1_NODES["close"],
}
DIRECTIONS_NODES = DIRECTIONS_L1_NODES


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
        matatu_nodes = {
            1: MATATU_L1_NODES,
            2: MATATU_L2_NODES,
            3: MATATU_L3_NODES,
            4: MATATU_L4_NODES,
        }[lvl]
        return ScenarioFlow(
            scenario_id="matatu",
            scenario_name="Matatu Stage",
            level=lvl,
            level_name=LEVEL_NAMES[lvl],
            primary_persona="otieno",
            character_prompt=base_prompt,
            initial_node_id="greet",
            nodes=matatu_nodes,
        )
    if sid == "government":
        gov_nodes = {
            1: GOVERNMENT_L1_NODES,
            2: GOVERNMENT_L2_NODES,
            3: GOVERNMENT_L3_NODES,
            4: GOVERNMENT_L4_NODES,
        }[lvl]
        return ScenarioFlow(
            scenario_id="government",
            scenario_name="Government Service",
            level=lvl,
            level_name=LEVEL_NAMES[lvl],
            primary_persona="wanjiku",
            character_prompt=base_prompt,
            initial_node_id="greet",
            nodes=gov_nodes,
        )
    if sid == "directions":
        dir_nodes = {
            1: DIRECTIONS_L1_NODES,
            2: DIRECTIONS_L2_NODES,
            3: DIRECTIONS_L3_NODES,
            4: DIRECTIONS_L4_NODES,
        }[lvl]
        return ScenarioFlow(
            scenario_id="directions",
            scenario_name="Asking for Directions",
            level=lvl,
            level_name=LEVEL_NAMES[lvl],
            primary_persona="maina",
            character_prompt=base_prompt,
            initial_node_id="greet",
            nodes=dir_nodes,
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
