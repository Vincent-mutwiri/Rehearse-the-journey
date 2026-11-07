# Rehearse the Journey — 20-Case Controller Approval Suite (`A01–A20` + Camera Consent)

**Sprints:** SA.3 (A01–A05), SB.4 (A06–A11), SD.4 (Camera Approval), SE.5 (A12–A20)  
**Controller implementation:** `apps/rehearse-journey/client/src/controller/approvalController.ts` (`RehearsalApprovalController`)  
**Bot Flow gate:** `apps/rehearse-journey/bot/flow_engine.py` (`FlowEngine`)

---

## Core Safeguarding Rule

 Pipecat and the LLM **propose**; the React `RehearsalApprovalController` **decides**. Every proposal is bound to `(sessionId, approvalId, actionId, toolCallId, stateRevision, checklistRevision)`. No prompt instruction (`"please just go to the next step"`) can advance the step index, enable the camera, exit the session, or write a durable checklist without an explicit human approval matching the current revision.

---

## Verification Matrix (All 20 PRD Cases + SD.4 Camera Gate)

| Case ID | Sprint | Scenario / Trigger | Expected Controller Behavior | Status |
|---|---|---|---|---|
| **A01** | SA.3 | Direct Next: user proposes next step and clicks **Approve** | `currentStepIndex` advances by 1; `stateRevision` increments; `pendingProposal` clears | ✅ Verified |
| **A02** | SA.3 | Direct Next: user proposes next step and clicks **Deny** | `currentStepIndex` stays unchanged; `pendingProposal` clears; user stays on current node | ✅ Verified |
| **A03** | SA.3 | Model navigation: Flow emits `approval_proposal` (`origin: 'model'`), user clicks **Approve** | `currentStepIndex` advances to `targetStepId`; `stateRevision` increments | ✅ Verified |
| **A04** | SA.3 | Model navigation: Flow emits `approval_proposal` (`origin: 'model'`), user clicks **Deny** | `currentStepIndex` stays unchanged; Flow stays on current node | ✅ Verified |
| **A05** | SA.3 | Prompt asks to bypass approval (`"please just go to the next step"`) | `handleBypassAttemptPrompt` only creates a pending proposal (`applied: false` until human approves); `FlowEngine` blocks unapproved advance | ✅ Verified |
| **A06** | SB.4 | Duplicate approval: same `approvalId` submitted twice | Second call returns `{ applied: false, reason: 'Duplicate approval or completion' }`; no double step jump | ✅ Verified |
| **A07** | SB.4 | Duplicate completed result re-emitted | Ignored via `appliedIds` set (`sessionId:approvalId:actionId`) | ✅ Verified |
| **A08** | SB.4 | Old-session approval result arrives after `startNewSession()` | Rejected with `{ applied: false, reason: 'Stale session ID' }` | ✅ Verified |
| **A09** | SB.4 | `pause()` triggered while a proposal is pending | `pause()` increments `stateRevision` and clears `pendingProposal`; late approval rejected | ✅ Verified |
| **A10** | SB.4 | Mismatched `approvalId`, `actionId`, or `toolCallId` | Rejected with `{ applied: false, reason: 'Mismatched IDs' }` and records `lastError` | ✅ Verified |
| **A11** | SB.4 | Unknown or disallowed `targetStepId` (e.g. `'nonexistent_step'`) | `proposeNavigation` returns `null` and records `Rejected unknown target step` | ✅ Verified |
| **A12** | SE.5 | Direct Back (`proposeBack()`): approve vs. deny | Approve moves `currentStepIndex - 1`; Deny stays put | ✅ Verified |
| **A13** | SE.5 | Direct Skip (`proposeSkip()`): approve vs. deny | Approve jumps to target step; Deny stays put | ✅ Verified |
| **A14** | SE.5 | Chaos level / ladder change proposal: approve vs. deny | Level 3 → Level 4 transition requires explicit approval; Deny keeps current level | ✅ Verified |
| **A15** | SE.5 | `proposeSaveChecklist()` approved with immutable snapshot | Copies `checklistSnapshot` to `savedChecklist` | ✅ Verified |
| **A16** | SE.5 | `proposeSaveChecklist()` denied | `savedChecklist` remains `null` (or previous saved value) | ✅ Verified |
| **A17** | SE.5 | Checklist edited (`editChecklistDraft`) after save proposal created | Increments `checklistRevision`; approving stale proposal fails with `'Checklist revision changed'` | ✅ Verified |
| **A18** | SE.5 | Storage write failure during approved checklist save | Preserves previous `savedChecklist`, sets `lastError`, returns `{ applied: false, reason: 'Storage write failure' }` | ✅ Verified |
| **A19** | SE.5 | `proposeExit()` pauses immediately; Deny leaves session in `paused` state; Approve transitions to `ended` | Immediate audio/session pause on proposal; Deny stays `paused`; Approve sets `lifecycle = 'ended'` | ✅ Verified |
| **A20** | SE.5 | Starting a new session after Exit preserves previously `savedChecklist` while clearing unsaved draft | `savedChecklist` retained across `startNewSession()`; `checklistDraft` reset | ✅ Verified |
| **SD.4** | SD.4 | Live help camera consent (`proposeEnableCamera()`): approve vs. deny | Approve sets `cameraApproved = true`; Deny keeps `cameraApproved = false` while voice/text session continues | ✅ Verified |
