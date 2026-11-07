import { useCallback, useRef, useState } from 'react'
import type { PipecatClient } from '@pipecat-ai/client-js'
import {
  RehearsalApprovalController,
  type ApprovalProposal,
  type ControllerState,
} from '@/controller/approvalController'
import { SCENARIO_CATALOG, type FlowStepDef } from '@/controller/v11ScenariosAndModes'
import type { JoyPersona } from '@/components/JoyMascot'

export interface UseApprovalGateOptions {
  client: PipecatClient | undefined
  currentSteps: FlowStepDef[]
  onStepApproved: (speaker: JoyPersona, parallelFanout: boolean) => void
  onCameraConsentChanged: (consented: boolean) => void
}

export interface UseApprovalGateReturn {
  controllerSnap: Readonly<ControllerState>
  backendApprovalId: string | null
  syncController: () => void
  startNewSession: (stepIds: string[], initialDraft: string[]) => void
  pauseController: () => void
  proposeModelNavigation: (targetNode: string, targetTitle: string, approvalId?: string) => void
  proposeNext: () => void
  proposeBack: () => void
  proposeSaveChecklist: () => void
  proposeEnableCamera: () => void
  editChecklistDraft: (items: string[]) => void
  respondToProposal: (proposal: ApprovalProposal, approved: boolean) => void
}

/**
 * Approval module (`src/approval/useApprovalGate.ts`).
 *
 * Bridges the React `RehearsalApprovalController` with the Pipecat backend's
 * `FlowEngine.resolve_approval` via RTVI `approval_response` client messages.
 */
export function useApprovalGate({
  client,
  currentSteps,
  onStepApproved,
  onCameraConsentChanged,
}: UseApprovalGateOptions): UseApprovalGateReturn {
  const controllerRef = useRef<RehearsalApprovalController>(
    new RehearsalApprovalController(
      SCENARIO_CATALOG.hospital.stepsByLevel[1].map(s => s.id),
      [
        'Carry pretend clinic card or appointment note',
        'Ask Receptionist Joy to repeat directions if needed',
      ],
    ),
  )
  const [controllerSnap, setControllerSnap] = useState<Readonly<ControllerState>>(() =>
    controllerRef.current.getSnapshot(),
  )
  const [backendApprovalId, setBackendApprovalId] = useState<string | null>(null)

  const syncController = useCallback(() => {
    setControllerSnap(controllerRef.current.getSnapshot())
  }, [])

  const startNewSession = useCallback(
    (stepIds: string[], initialDraft: string[]) => {
      setBackendApprovalId(null)
      controllerRef.current.startNewSession(stepIds, initialDraft)
      syncController()
    },
    [syncController],
  )

  const pauseController = useCallback(() => {
    setBackendApprovalId(null)
    controllerRef.current.pause()
    syncController()
  }, [syncController])

  const proposeModelNavigation = useCallback(
    (targetNode: string, targetTitle: string, approvalId?: string) => {
      setBackendApprovalId(approvalId ?? null)
      controllerRef.current.proposeNavigation(
        targetNode,
        'model',
        `Advance rehearsal to "${targetTitle}"?`,
      )
      syncController()
    },
    [syncController],
  )

  const proposeNext = useCallback(() => {
    setBackendApprovalId(null)
    controllerRef.current.proposeNext('direct')
    syncController()
  }, [syncController])

  const proposeBack = useCallback(() => {
    setBackendApprovalId(null)
    controllerRef.current.proposeBack()
    syncController()
  }, [syncController])

  const proposeSaveChecklist = useCallback(() => {
    setBackendApprovalId(null)
    controllerRef.current.proposeSaveChecklist()
    syncController()
  }, [syncController])

  const proposeEnableCamera = useCallback(() => {
    setBackendApprovalId(null)
    controllerRef.current.proposeEnableCamera()
    syncController()
  }, [syncController])

  const editChecklistDraft = useCallback(
    (items: string[]) => {
      controllerRef.current.editChecklistDraft(items)
      syncController()
    },
    [syncController],
  )

  const respondToProposal = useCallback(
    (proposal: ApprovalProposal, approved: boolean) => {
      const res = controllerRef.current.respondToProposal({
        approvalId: proposal.approvalId,
        actionId: proposal.actionId,
        toolCallId: proposal.toolCallId,
        sessionId: proposal.sessionId,
        approved,
      })
      syncController()

      if (proposal.type === 'enable_camera') {
        onCameraConsentChanged(approved && res.applied)
      } else if (proposal.type === 'go_to_step') {
        try {
          client?.sendClientMessage?.('approval_response', {
            approved: Boolean(approved && res.applied),
            target_node: proposal.targetStepId,
            approval_id: backendApprovalId,
          })
        } catch {
          /* transport may not support sendClientMessage in unit mock */
        }
        setBackendApprovalId(null)
        if (approved && res.applied && proposal.targetStepId) {
          const matchedStep = currentSteps.find(s => s.id === proposal.targetStepId)
          if (matchedStep) {
            onStepApproved(matchedStep.speaker, Boolean(matchedStep.parallelFanout))
          }
        }
      }
    },
    [backendApprovalId, client, currentSteps, onCameraConsentChanged, onStepApproved, syncController],
  )

  return {
    controllerSnap,
    backendApprovalId,
    syncController,
    startNewSession,
    pauseController,
    proposeModelNavigation,
    proposeNext,
    proposeBack,
    proposeSaveChecklist,
    proposeEnableCamera,
    editChecklistDraft,
    respondToProposal,
  }
}
