import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApprovalProposal } from '@/controller/approvalController'

export interface ApprovalGateCardProps {
  proposal: ApprovalProposal | null
  onRespond: (proposal: ApprovalProposal, approved: boolean) => void
}

export default function ApprovalGateCard({ proposal, onRespond }: ApprovalGateCardProps) {
  if (!proposal) return null

  return (
    <section
      role="region"
      aria-label="Approval gate"
      className="rounded-2xl border-2 border-lavender bg-lavender/15 p-4 text-sm"
    >
      <div className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Action approval required ({proposal.type})</span>
      </div>
      <p className="mt-1.5 leading-relaxed">{proposal.description}</p>
      {proposal.checklistSnapshot && (
        <ul className="mt-2 list-inside list-disc rounded-xl bg-white/70 p-3 text-xs">
          {proposal.checklistSnapshot.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" className="rounded-full" onClick={() => onRespond(proposal, true)}>
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => onRespond(proposal, false)}
        >
          Deny (stay put)
        </Button>
      </div>
    </section>
  )
}
