# SB.1 — Multi-Agent Handoff & Parallel Fan-Out Spike Notes

**Sprint:** SB.1–SB.4 · **Status:** Completed & Verified  
**Implementation files:** `apps/rehearse-journey/bot/multi_agent.py`, `apps/rehearse-journey/bot/flow_config.py`, `apps/rehearse-journey/bot/bot.py`, `apps/rehearse-journey/client/src/App.tsx`

---

## 1. Architecture: Shared Session Bus (`MultiAgentBus`)

In the scripted Kioo Companion prototype, Level 4 ("Busy Environment") only swapped a text label. In the Pipecat v1.1 architecture, `MultiAgentBus` (`bot/multi_agent.py`) coordinates distinct agent personas sharing a single SmallWebRTC session and conversation history:

- **`joy` (Receptionist Joy):** Primary hospital reception persona (`voice_gemini="Leda"`, `voice_openai="nova"`, Lavender `#a89bd4` rig).
- **`amani` (Patient Amani):** Fellow visitor in Waiting Area B (`voice_gemini="Aoede"`, `voice_openai="shimmer"`, Sage `#8fb39b` rig).
- **`otieno` (Conductor Otieno):** Matatu Stage Route 46 conductor (`voice_gemini="Puck"`, `voice_openai="onyx"`, Ochre `#d9a477` rig).
- **`wanjiku` (Officer Wanjiku):** Government Service Desk officer (`voice_gemini="Kore"`, `voice_openai="alloy"`, Periwinkle `#8e9ed6` rig).
- **`maina` (Passerby Maina):** Street landmark directions persona (`voice_gemini="Charon"`, `voice_openai="echo"`, Teal `#82b3a8` rig).

---

## 2. Handoff Sequence (Hospital Level 4 — `HOSPITAL_L4_NODES`)

1. **`greet` → `ask_for_card` (Joy):** Receptionist Joy checks the visitor in and notes that Waiting Area B is lively today.
2. **`waiting_area_handoff` (Joy → Amani):**
   - `FlowNode.handoff_to = "amani"` triggers `MultiAgentBus.handoff("amani")`.
   - The bot emits RTVI server message `{ "type": "speaker_changed", "previous_speaker": "joy", "active_speaker": "amani", ... }`.
   - Because `MultiAgentBus.shared_transcript` records every turn, Amani's system instruction includes the shared context without resetting STT/TTS or dropping the WebRTC connection.
   - The React client updates `activePersona` to `"amani"`, tinting the 3D mascot to Sage (`#8fb39b`) and updating the persona badge to `Patient Amani`.
3. **`parallel_call_back` (Parallel Fan-Out — Joy + Amani Overlap):**
   - `FlowNode.parallel_fanout = True` triggers `MultiAgentBus.build_parallel_fanout_turn()`.
   - Receptionist Joy calls the visitor to Desk 1 while Patient Amani offers to hold their seat.
   - The bot emits `{ "type": "parallel_fanout", "speakers": [...] }`.
   - The React centerpiece column renders **both** `Receptionist Joy` and `Patient Amani` 3D mascots side-by-side (`data-parallel-overlap="true"`).
4. **Barge-In / Selection Resolution (`resolve_parallel_barge_in`):**
   - When the visitor replies (e.g., `"Coming to the desk, Joy"` or `"Thanks Amani, I will wait a moment"`), `MultiAgentBus.resolve_parallel_barge_in(user_text)` selects the addressed persona while the other yields.
   - Emits `{ "type": "parallel_resolved", "chosen_speaker": "joy" | "amani", "yielded_speaker": ... }`, collapsing the UI back to a single mascot.

---

## 3. Approval Safety During Handoff (SB.4)

- Advancing into `waiting_area_handoff` or `close` is gated by `RehearsalApprovalController` (`requires_approval=True`).
- `controller.setHandoffInProgress(true)` ensures that a speaker handoff occurring while an approval card is displayed never invalidates or double-fires the pending approval ID (`A06–A11`).
