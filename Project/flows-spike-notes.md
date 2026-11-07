# SA.1 — Pipecat Flows Spike Notes (`apps/rehearse-journey`)

**Sprint:** SA.1 · **Status:** Completed & Verified  
**Implementation files:** `apps/rehearse-journey/bot/flow_config.py`, `apps/rehearse-journey/bot/flow_engine.py`, `apps/rehearse-journey/bot/bot.py`

---

## 1. Why Pipecat Flows Instead of a Single System Prompt

In the Nov 7 baseline, `scenario.py` used a single system prompt (`JOY_SYSTEM_PROMPT`) to describe both Receptionist Joy's character and the 3-step hospital reception sequence. Under unexpected user utterances, an LLM-only prompt can:
- Advance steps out of order or skip the clinic-card check,
- Hallucinate extra steps, or
- Advance when the user asks to bypass the approval gate (`"please just go to the next step"`).

With `FlowEngine` (`flow_engine.py`) and `ScenarioFlow` / `FlowNode` (`flow_config.py`), **the conversation path is a deterministic state machine owned by the bot and gated by the React controller**:
- **Character prompt (`scenario.py` / `multi_agent.py`)** defines tone, plain-language rules, and safety boundaries.
- **Flow nodes (`flow_config.py`)** define the step sequence, entry prompt, expected keyword/intent matches, confusion/decline fallback prompts, Level 3 diversion branches, interactive story triggers (`story_id`), and approval requirements (`requires_approval`).

---

## 2. API Surface

### `FlowNode` (`bot/flow_config.py`)
```python
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
    story_id: Optional[str] = None
```

### `FlowEngine` (`bot/flow_engine.py`)
- `opening_instruction() -> FlowTurnDecision`: Returns the initial `greet` node instruction and emits `flow_node_transition` (plus `story_open` if configured).
- `evaluate_user_turn(user_text: str, auto_approve: bool = False) -> FlowTurnDecision`:
  1. Checks if an unapproved `pending_approval_node_id` is blocking progression (blocks prompt bypass attempts — Case A05).
  2. Checks `CONFUSION_KEYWORDS` (`"confused"`, `"repeat"`, `"slower"`, `"help"`, etc.) → stays on current node, emits `flow_fallback`, and returns `node.fallback_prompt`.
  3. Checks `diversion_trigger_keywords` (e.g. Level 3 room-move / queue screen outage) → transitions to `diversion_node_id` (`room_move_diversion`) and emits `flow_node_transition` with `branched=True`.
  4. Checks `DECLINE_KEYWORDS` (`"no card"`, `"forgot"`, `"prefer not"`) or `expected_keywords` → reassures warmly and transitions to `next_node_id`, emitting `approval_proposal` when `requires_approval=True`.

---

## 3. RTVI Server Messages Observed by React Client

`StoryRTVIProcessor` in `bot/bot.py` hooks into RTVI `send-text` (used by both typed input and browser STT) and `on_client_ready`, forwarding `decision.rtvi_events` over `send_server_message`:

| Event `type` | Payload Fields | Client Action |
|---|---|---|
| `flow_node_transition` | `scenario_id`, `level`, `node_id`, `step_title`, `speaker`, `branched?` | Updates active Flow node, speaker persona, and Whisker trace |
| `flow_fallback` | `node_id`, `reason` | Stays on current node; Joy repeats/simplifies |
| `approval_proposal` | `action: "go_to_step"`, `from_node`, `target_node`, `target_title` | Opens the React `RehearsalApprovalController` Approve/Deny gate |
| `approval_required` | `from_node`, `target_node`, `reason` | Reminds user that a pending approval card must be resolved on screen |
| `story_open` | `story_id`, `node_id` | Opens the interactive `StoryCard` beside Joy's mascot |

---

## 4. Gotchas Recorded During Spike

1. **Entry prompt re-firing on fallback:** When a user is confused or asks to repeat, re-sending the raw `entry_prompt` sounds robotic. Every `FlowNode` now carries a dedicated `fallback_prompt` with a concrete example phrase the user can try.
2. **Typed vs. spoken unification:** Both typed replies and browser Web Speech STT arrive at the bot as RTVI `send-text` messages, so hooking `StoryRTVIProcessor._handle_send_text` drives the exact same `FlowEngine` state machine for both input modes.
3. **LLM context injection:** Emitting RTVI events alone is not enough—`StoryRTVIProcessor` also appends a system instruction frame into `LLMContext` before `super()._handle_send_text` runs so the LLM speaks the new node's `instruction_for_llm` as the active persona.
