/**
 * SA.3, SB.4, SD.4, SE.5 — Deterministic Rehearsal & Approval Controller
 *
 * Enforces all 20 approval cases (A01–A20) from the PRD / Sprint Plan:
 *   - Sole authority for journey step position, session lifecycle, camera consent,
 *     and durable checklist writes.
 *   - Prompt instructions asking to bypass approval ("please just go to the next step")
 *     can never advance without an explicit human approval decision.
 *   - Binds every proposal to sessionId, actionId, toolCallId, approvalId,
 *     stateRevision, and checklistRevision.
 */

export type ControllerLifecycle = 'setup' | 'active' | 'paused' | 'ended'
export type ApprovalActionType =
  | 'go_to_step'
  | 'exit_rehearsal'
  | 'save_checklist'
  | 'enable_camera'

export interface ApprovalProposal {
  sessionId: string
  approvalId: string
  actionId: string
  toolCallId: string
  type: ApprovalActionType
  origin: 'direct' | 'model'
  targetStepId?: string
  targetStepTitle?: string
  checklistSnapshot?: string[]
  stateRevision: number
  checklistRevision: number
  description: string
  resolved: boolean
  completed: boolean
}

export interface ControllerState {
  sessionId: string
  lifecycle: ControllerLifecycle
  validSteps: string[]
  currentStepIndex: number
  stateRevision: number
  checklistDraft: string[]
  checklistRevision: number
  savedChecklist: string[] | null
  cameraApproved: boolean
  pendingProposal: ApprovalProposal | null
  appliedIds: Set<string>
  handoffInProgress: boolean
  lastError: string | null
}

const DEFAULT_STEPS = [
  'greet',
  'ask_for_card',
  'direct_to_waiting_area',
  'close',
]

export class RehearsalApprovalController {
  private state: ControllerState
  private idCounter = 0
  private simulateWriteFailure = false

  constructor(steps: string[] = DEFAULT_STEPS, initialDraft: string[] = []) {
    this.state = {
      sessionId: `session-1`,
      lifecycle: 'active',
      validSteps: [...steps],
      currentStepIndex: 0,
      stateRevision: 1,
      checklistDraft: [...initialDraft],
      checklistRevision: 1,
      savedChecklist: null,
      cameraApproved: false,
      pendingProposal: null,
      appliedIds: new Set(),
      handoffInProgress: false,
      lastError: null,
    }
  }

  public getSnapshot(): Readonly<ControllerState> {
    return {
      ...this.state,
      validSteps: [...this.state.validSteps],
      checklistDraft: [...this.state.checklistDraft],
      savedChecklist: this.state.savedChecklist ? [...this.state.savedChecklist] : null,
      pendingProposal: this.state.pendingProposal ? { ...this.state.pendingProposal } : null,
    }
  }

  public get currentStepId(): string {
    return this.state.validSteps[this.state.currentStepIndex] ?? this.state.validSteps[0]
  }

  public setSteps(steps: string[], resetIndex = 0): void {
    this.state.validSteps = [...steps]
    this.state.currentStepIndex = Math.max(0, Math.min(resetIndex, steps.length - 1))
    this.state.stateRevision++
    this.state.pendingProposal = null
  }

  public setSimulateWriteFailure(fail: boolean): void {
    this.simulateWriteFailure = fail
  }

  public setHandoffInProgress(active: boolean): void {
    // SB.4: Handoff mid-approval does not drop the session or double-fire
    this.state.handoffInProgress = active
  }

  /**
   * A05: Prompt asking to bypass approval ("please just go to the next step")
   * only creates a proposal; it NEVER mutates step position directly.
   */
  public handleBypassAttemptPrompt(targetStepId: string): ApprovalProposal | null {
    return this.proposeNavigation(targetStepId, 'model', 'Model requested step advance (approval required)')
  }

  public proposeNavigation(
    targetStepId: string,
    origin: 'direct' | 'model' = 'direct',
    description?: string,
  ): ApprovalProposal | null {
    // A11: Unknown or disallowed target step rejected immediately
    if (!this.state.validSteps.includes(targetStepId)) {
      this.state.lastError = `Rejected unknown target step: ${targetStepId}`
      return null
    }
    if (this.state.lifecycle === 'ended') {
      this.state.lastError = 'Cannot propose navigation after session ended.'
      return null
    }
    const id = ++this.idCounter
    const proposal: ApprovalProposal = {
      sessionId: this.state.sessionId,
      approvalId: `apr-${id}`,
      actionId: `act-${id}`,
      toolCallId: `tool-${id}`,
      type: 'go_to_step',
      origin,
      targetStepId,
      targetStepTitle: targetStepId,
      stateRevision: this.state.stateRevision,
      checklistRevision: this.state.checklistRevision,
      description: description ?? `Advance rehearsal to "${targetStepId}"?`,
      resolved: false,
      completed: false,
    }
    this.state.pendingProposal = proposal
    this.state.lastError = null
    return { ...proposal }
  }

  public proposeNext(origin: 'direct' | 'model' = 'direct'): ApprovalProposal | null {
    const nextIdx = this.state.currentStepIndex + 1
    if (nextIdx >= this.state.validSteps.length) return null
    return this.proposeNavigation(this.state.validSteps[nextIdx], origin, 'Advance to next rehearsal step?')
  }

  public proposeBack(): ApprovalProposal | null {
    const prevIdx = this.state.currentStepIndex - 1
    if (prevIdx < 0) return null
    return this.proposeNavigation(this.state.validSteps[prevIdx], 'direct', 'Return to previous rehearsal step?')
  }

  public proposeSkip(targetStepId?: string): ApprovalProposal | null {
    const fallbackIdx = Math.min(this.state.validSteps.length - 1, this.state.currentStepIndex + 2)
    const dest = targetStepId ?? this.state.validSteps[fallbackIdx]
    return this.proposeNavigation(dest, 'direct', `Skip ahead to "${dest}"?`)
  }

  public proposeExit(): ApprovalProposal {
    // A19: Exit performs immediate pause/stop first, then creates fresh exit proposal in paused state
    this.pause()
    const id = ++this.idCounter
    const proposal: ApprovalProposal = {
      sessionId: this.state.sessionId,
      approvalId: `apr-${id}`,
      actionId: `act-${id}`,
      toolCallId: `tool-${id}`,
      type: 'exit_rehearsal',
      origin: 'direct',
      stateRevision: this.state.stateRevision,
      checklistRevision: this.state.checklistRevision,
      description: 'Exit rehearsal and end this session?',
      resolved: false,
      completed: false,
    }
    this.state.pendingProposal = proposal
    return { ...proposal }
  }

  public proposeSaveChecklist(): ApprovalProposal | null {
    if (this.state.checklistDraft.length === 0) {
      this.state.lastError = 'Checklist draft is empty.'
      return null
    }
    const id = ++this.idCounter
    const proposal: ApprovalProposal = {
      sessionId: this.state.sessionId,
      approvalId: `apr-${id}`,
      actionId: `act-${id}`,
      toolCallId: `tool-${id}`,
      type: 'save_checklist',
      origin: 'direct',
      checklistSnapshot: [...this.state.checklistDraft],
      stateRevision: this.state.stateRevision,
      checklistRevision: this.state.checklistRevision,
      description: 'Save this exact checklist preview to browser storage?',
      resolved: false,
      completed: false,
    }
    this.state.pendingProposal = proposal
    this.state.lastError = null
    return { ...proposal }
  }

  public proposeEnableCamera(): ApprovalProposal {
    // SD.4: Enabling camera is an approved action
    const id = ++this.idCounter
    const proposal: ApprovalProposal = {
      sessionId: this.state.sessionId,
      approvalId: `apr-${id}`,
      actionId: `act-${id}`,
      toolCallId: `tool-${id}`,
      type: 'enable_camera',
      origin: 'direct',
      stateRevision: this.state.stateRevision,
      checklistRevision: this.state.checklistRevision,
      description: 'Joy wants to use your camera for Live help ("Explain this sign") — approve or deny?',
      resolved: false,
      completed: false,
    }
    this.state.pendingProposal = proposal
    return { ...proposal }
  }

  public editChecklistDraft(items: string[]): void {
    // A17: Editing checklist after proposal increments checklistRevision, invalidating old save proposal
    this.state.checklistDraft = [...items]
    this.state.checklistRevision++
  }

  public pause(): void {
    // A09: Pause immediately invalidates pending proposals and increments stateRevision
    this.state.lifecycle = 'paused'
    this.state.stateRevision++
    this.state.pendingProposal = null
  }

  public resume(): void {
    if (this.state.lifecycle === 'paused') {
      this.state.lifecycle = 'active'
      this.state.stateRevision++
    }
  }

  public startNewSession(steps: string[] = this.state.validSteps, initialDraft: string[] = []): void {
    // A08 & A20: Starting a new session invalidates old session work & clears unsaved draft,
    // while preserving any previously saved checklist.
    const nextNum = parseInt(this.state.sessionId.replace('session-', ''), 10) + 1
    this.state.sessionId = `session-${nextNum}`
    this.state.lifecycle = 'active'
    this.state.validSteps = [...steps]
    this.state.currentStepIndex = 0
    this.state.stateRevision++
    this.state.checklistDraft = [...initialDraft]
    this.state.checklistRevision++
    this.state.cameraApproved = false
    this.state.pendingProposal = null
    this.state.lastError = null
  }

  public respondToProposal(params: {
    approvalId: string
    actionId?: string
    toolCallId?: string
    sessionId?: string
    approved: boolean
  }): { applied: boolean; reason?: string } {
    const pending = this.state.pendingProposal
    if (!pending) {
      return { applied: false, reason: 'No pending proposal' }
    }

    // A08: Old-session result after new session -> ignored
    if (params.sessionId && params.sessionId !== this.state.sessionId) {
      return { applied: false, reason: 'Stale session ID' }
    }

    // A10: Wrong approval / tool / action ID -> rejected
    if (
      params.approvalId !== pending.approvalId ||
      (params.actionId && params.actionId !== pending.actionId) ||
      (params.toolCallId && params.toolCallId !== pending.toolCallId)
    ) {
      this.state.lastError = 'Mismatched approval, action, or tool-call ID.'
      return { applied: false, reason: 'Mismatched IDs' }
    }

    // A06 & A07: Duplicate approval or duplicate completed result -> ignored
    const key = `${pending.sessionId}:${pending.approvalId}:${pending.actionId}`
    if (this.state.appliedIds.has(key) || pending.resolved || pending.completed) {
      return { applied: false, reason: 'Duplicate approval or completion' }
    }

    // Deny branch (A02, A04, A12, A13, A14, A16, A19, SD.4)
    if (!params.approved) {
      pending.resolved = true
      this.state.appliedIds.add(key)
      this.state.pendingProposal = null
      // A19: Denied exit deliberately leaves the session paused
      if (pending.type === 'exit_rehearsal') {
        this.state.lifecycle = 'paused'
      }
      return { applied: false, reason: 'Denied by user' }
    }

    // Verify revision binding
    if (pending.type === 'go_to_step' && pending.stateRevision !== this.state.stateRevision) {
      this.state.pendingProposal = null
      return { applied: false, reason: 'Stale state revision' }
    }

    if (pending.type === 'save_checklist') {
      // A17: Checklist edited after proposal -> old approval invalid
      if (pending.checklistRevision !== this.state.checklistRevision || !pending.checklistSnapshot) {
        this.state.pendingProposal = null
        this.state.lastError = 'Checklist was edited after proposal; please review a fresh preview.'
        return { applied: false, reason: 'Checklist revision changed' }
      }
      // A18: Failed write preserves previous saved checklist and does not report success
      if (this.simulateWriteFailure) {
        this.state.pendingProposal = null
        this.state.lastError = 'Storage write failed; previous saved checklist preserved.'
        return { applied: false, reason: 'Storage write failure' }
      }
      this.state.savedChecklist = [...pending.checklistSnapshot]
      pending.resolved = true
      pending.completed = true
      this.state.appliedIds.add(key)
      this.state.pendingProposal = null
      return { applied: true }
    }

    if (pending.type === 'exit_rehearsal') {
      this.state.lifecycle = 'ended'
      this.state.stateRevision++
      pending.resolved = true
      pending.completed = true
      this.state.appliedIds.add(key)
      this.state.pendingProposal = null
      return { applied: true }
    }

    if (pending.type === 'enable_camera') {
      this.state.cameraApproved = true
      this.state.stateRevision++
      pending.resolved = true
      pending.completed = true
      this.state.appliedIds.add(key)
      this.state.pendingProposal = null
      return { applied: true }
    }

    if (pending.type === 'go_to_step' && pending.targetStepId) {
      const idx = this.state.validSteps.indexOf(pending.targetStepId)
      if (idx === -1) {
        this.state.pendingProposal = null
        return { applied: false, reason: 'Unknown target step' }
      }
      this.state.currentStepIndex = idx
      this.state.stateRevision++
      pending.resolved = true
      pending.completed = true
      this.state.appliedIds.add(key)
      this.state.pendingProposal = null
      return { applied: true }
    }

    return { applied: false, reason: 'Unhandled proposal' }
  }
}
