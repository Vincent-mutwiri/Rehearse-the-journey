/**
 * Client-side representations of v1.1 Sprints SA–SE:
 *   - SA: Structured Pipecat Flows across 4 scenarios & 4 levels (with L3 diversion branch)
 *   - SB: Multi-agent chaos levels (Joy <-> Patient Amani handoff + parallel fan-out)
 *   - SC: Vendor-agnostic provider stacks + runtime fallback chain
 *   - SD: Multimodal camera "Explain this sign" with strict non-navigation boundary
 *   - SE: Four modes (Learn, Practise, Explore, Live help) sharing one AbilityModel profile
 */

import type { JoyPersona } from '@/components/JoyMascot'

export type RehearsalMode = 'learn' | 'practise' | 'explore' | 'live-help'
export type ScenarioId = 'hospital' | 'matatu' | 'government' | 'directions'

export interface FlowStepDef {
  id: string
  title: string
  speaker: JoyPersona
  speakerLabel: string
  description: string
  simplifiedDescription: string
  requiresApproval?: boolean
  handoffTo?: JoyPersona
  parallelFanout?: boolean
}

export interface ScenarioDef {
  id: ScenarioId
  name: string
  persona: JoyPersona
  personaLabel: string
  badge: string
  stepsByLevel: Record<1 | 2 | 3 | 4, FlowStepDef[]>
}

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4, { title: string; subtitle: string }> = {
  1: { title: 'Level 1 · Easy Start', subtitle: 'Short, predictable 4-step Flow' },
  2: { title: 'Level 2 · Everyday Practice', subtitle: 'Department & follow-up questions' },
  3: { title: 'Level 3 · Handling Changes', subtitle: 'Includes room-move / queue diversion branch' },
  4: { title: 'Level 4 · Busy Environment', subtitle: 'Multi-agent handoff (Joy ↔ Amani) + parallel fan-out' },
}

const HOSPITAL_BASE_STEPS: FlowStepDef[] = [
  {
    id: 'greet',
    title: '1. Arrive & greet Receptionist Joy',
    speaker: 'joy',
    speakerLabel: 'Receptionist Joy',
    description:
      'During this rehearsal you will interact with Receptionist Joy at the front desk of a fictional hospital. You will be asked to present a National ID or clinic registration card and to state the reason for your visit. The exchange follows a fixed sequence and will not proceed until you choose to continue.',
    simplifiedDescription:
      'You will talk to the receptionist at a practice hospital. Have your ID or clinic card ready, and say why you are visiting. The chat goes one step at a time — nothing moves on until you say so.',
  },
  {
    id: 'ask_for_card',
    title: '2. Pretend clinic card check',
    speaker: 'joy',
    speakerLabel: 'Receptionist Joy',
    description:
      'Joy asks whether you brought a pretend clinic card. You can say yes, no, or use a made-up detail; never share a real ID or phone number.',
    simplifiedDescription:
      'Joy asks if you have a pretend clinic card. Saying yes or no is fine. Never share real ID numbers.',
    requiresApproval: true,
  },
  {
    id: 'direct_to_waiting_area',
    title: '3. Directions to Waiting Area B',
    speaker: 'joy',
    speakerLabel: 'Receptionist Joy',
    description:
      'Joy explains how to reach Waiting Area B on the left and checks whether you want to repeat the step or wrap up.',
    simplifiedDescription:
      'Joy points you to Waiting Area B on the left. You can repeat or finish when ready.',
  },
  {
    id: 'close',
    title: '4. Complete or repeat practice',
    speaker: 'joy',
    speakerLabel: 'Receptionist Joy',
    description:
      'The fictional reception exchange is complete. You can save a rehearsal checklist or repeat any step.',
    simplifiedDescription:
      'Practice is done! You can save your checklist or try a step again.',
    requiresApproval: true,
  },
]

export const SCENARIO_CATALOG: Record<ScenarioId, ScenarioDef> = {
  hospital: {
    id: 'hospital',
    name: 'Hospital Reception',
    persona: 'joy',
    personaLabel: 'Receptionist Joy',
    badge: 'Hospital Reception',
    stepsByLevel: {
      1: HOSPITAL_BASE_STEPS,
      2: [
        HOSPITAL_BASE_STEPS[0],
        {
          ...HOSPITAL_BASE_STEPS[1],
          title: '2. Pretend card & clinic desk selection',
          description:
            'Joy asks for your pretend clinic card and whether you are visiting the pretend General Clinic or Dental Desk today.',
          simplifiedDescription:
            'Say yes or no for the pretend card, and pick General Clinic or Dental Desk.',
        },
        HOSPITAL_BASE_STEPS[2],
        HOSPITAL_BASE_STEPS[3],
      ],
      3: [
        HOSPITAL_BASE_STEPS[0],
        HOSPITAL_BASE_STEPS[1],
        {
          id: 'room_move_diversion',
          title: '2b. Diversion branch: Room 4 relocation',
          speaker: 'joy',
          speakerLabel: 'Receptionist Joy',
          description:
            'Waiting Area B is being cleaned and the ticket screen is paused, so Joy calmly guides you across the hall to Room 4.',
          simplifiedDescription:
            'Waiting Area B moved to Room 4 across the hall. Joy helps you adjust calmly.',
          requiresApproval: true,
        },
        HOSPITAL_BASE_STEPS[2],
        HOSPITAL_BASE_STEPS[3],
      ],
      4: [
        HOSPITAL_BASE_STEPS[0],
        HOSPITAL_BASE_STEPS[1],
        {
          id: 'waiting_area_handoff',
          title: '3. Waiting Area B (Handoff to Patient Amani)',
          speaker: 'amani',
          speakerLabel: 'Patient Amani',
          handoffTo: 'amani',
          description:
            'Joy hands the conversation to fellow visitor Amani in Waiting Area B for calm waiting-room small talk.',
          simplifiedDescription:
            'You chat briefly with Amani, a friendly visitor in Waiting Area B.',
          requiresApproval: true,
        },
        {
          id: 'parallel_call_back',
          title: '4. Parallel overlap: Joy & Amani speak together',
          speaker: 'joy',
          speakerLabel: 'Receptionist Joy & Patient Amani',
          handoffTo: 'joy',
          parallelFanout: true,
          description:
            'Joy calls your name for Desk 1 while Amani wishes you well. Choose who to reply to—the other person yields.',
          simplifiedDescription:
            'Joy and Amani both speak briefly. Reply to either one and the other waits.',
          requiresApproval: true,
        },
        HOSPITAL_BASE_STEPS[3],
      ],
    },
  },
  matatu: {
    id: 'matatu',
    name: 'Matatu Stage',
    persona: 'otieno',
    personaLabel: 'Conductor Otieno',
    badge: 'Matatu Stage · Route 46',
    stepsByLevel: {
      1: [
        {
          id: 'greet',
          title: '1. Ask Conductor Otieno the route & fare',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Ask Conductor Otieno if the matatu goes toward town and check the pretend off-peak fare.',
          simplifiedDescription: 'Ask Otieno if this matatu goes to town and how much the pretend fare is.',
        },
        {
          id: 'confirm_payment',
          title: '2. Pretend fare & choosing a seat',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Confirm the 50 pretend shillings fare and ask for a seat near the door.',
          simplifiedDescription: 'Agree to the pretend fare and ask for a seat by the door.',
          requiresApproval: true,
        },
        {
          id: 'request_stop',
          title: '3. Calling out your stage (Shukisha)',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Practise politely calling out your pretend drop-off stage before the matatu arrives.',
          simplifiedDescription: 'Say "Stop at the next stage please" when your pretend stop is near.',
        },
        {
          id: 'close',
          title: '4. Matatu practice complete',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Your fictional matatu journey rehearsal is complete.',
          simplifiedDescription: 'Matatu practice is finished!',
          requiresApproval: true,
        },
      ],
      2: [],
      3: [],
      4: [],
    },
  },
  government: {
    id: 'government',
    name: 'Government Service',
    persona: 'wanjiku',
    personaLabel: 'Officer Wanjiku',
    badge: 'Government Service Desk',
    stepsByLevel: {
      1: [
        {
          id: 'greet',
          title: '1. Arrive at the inquiry counter',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Greet Officer Wanjiku and state which pretend public service inquiry you are making today.',
          simplifiedDescription: 'Say hello to Wanjiku and name the pretend form you need help with.',
        },
        {
          id: 'check_documents',
          title: '2. Pretend checklist slip review',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Confirm whether you brought a pretend reference slip without sharing real personal numbers.',
          simplifiedDescription: 'Say yes or no about your pretend slip. Never share real ID numbers.',
          requiresApproval: true,
        },
        {
          id: 'queue_ticket',
          title: '3. Receive pretend counter ticket B-12',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Wanjiku gives you pretend ticket B-12 for Counter 3 and checks if the directions are clear.',
          simplifiedDescription: 'Take pretend ticket B-12 for Counter 3 and ask to repeat if needed.',
        },
        {
          id: 'close',
          title: '4. Service desk practice complete',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Your fictional government desk rehearsal is complete.',
          simplifiedDescription: 'Service desk practice is finished!',
          requiresApproval: true,
        },
      ],
      2: [],
      3: [],
      4: [],
    },
  },
  directions: {
    id: 'directions',
    name: 'Asking for Directions',
    persona: 'maina',
    personaLabel: 'Passerby Maina',
    badge: 'Street Landmarks',
    stepsByLevel: {
      1: [
        {
          id: 'greet',
          title: '1. Ask Passerby Maina for a landmark',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Politely ask Maina for directions to the pretend community library or clinic stage.',
          simplifiedDescription: 'Ask Maina which way the pretend library is.',
        },
        {
          id: 'confirm_landmark',
          title: '2. Repeat back the two landmarks',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Repeat back Maina’s two landmarks: past the green bookshop, then left at the clock tower.',
          simplifiedDescription: 'Repeat back: past the green bookshop, left at the clock tower.',
          requiresApproval: true,
        },
        {
          id: 'close',
          title: '3. Directions practice complete',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Your fictional directions rehearsal is complete.',
          simplifiedDescription: 'Directions practice is finished!',
          requiresApproval: true,
        },
      ],
      2: [],
      3: [],
      4: [],
    },
  },
}

// Fill levels 2-4 for non-hospital scenarios from level 1 so every combination is valid
for (const sid of ['matatu', 'government', 'directions'] as const) {
  const base = SCENARIO_CATALOG[sid].stepsByLevel[1]
  SCENARIO_CATALOG[sid].stepsByLevel[2] = base
  SCENARIO_CATALOG[sid].stepsByLevel[3] = base
  SCENARIO_CATALOG[sid].stepsByLevel[4] = base
}

export interface ProviderStackOption {
  id: 'gemini_proxy' | 'gemini_live' | 'deepgram_openai_cartesia' | 'openai' | 'text_only'
  label: string
  reason: string
}

export const PROVIDER_STACK_OPTIONS: ProviderStackOption[] = [
  {
    id: 'gemini_proxy',
    label: 'Gemini REST + Gemini TTS (Browser STT)',
    reason: 'audio on, Lovable Gemini proxy active → REST LLM + Gemini TTS + Web Speech STT',
  },
  {
    id: 'gemini_live',
    label: 'Gemini Live (Speech-to-Speech)',
    reason: 'audio on, Gemini Live eligible → direct bidirectional speech-to-speech',
  },
  {
    id: 'deepgram_openai_cartesia',
    label: 'Deepgram STT + OpenAI LLM + Cartesia TTS',
    reason: 'audio on, vendor-neutral low-latency text pipeline',
  },
  {
    id: 'openai',
    label: 'OpenAI Stack (Whisper + GPT-4o + TTS-1)',
    reason: 'audio on, OpenAI fallback stack',
  },
  {
    id: 'text_only',
    label: 'Text-only LLM (No voice)',
    reason: 'audio off or provider voice unavailable → guaranteed typed path',
  },
]

export interface SignExplanationCard {
  id: string
  title: string
  signText: string
  standardExplanation: string
  plainExplanation: string
}

export const SIGN_CARDS: SignExplanationCard[] = [
  {
    id: 'outpatient_b',
    title: 'Sign 1: Outpatient Registration & Waiting Bay B',
    signText: 'OUTPATIENT REGISTRATION — COUNTER 1 & 2 | WAITING BAY B (LEFT CORRIDOR)',
    standardExplanation:
      'Outpatient Registration is at Counters 1 and 2, and Waiting Bay B is down the left corridor. Explanation only; confirm with staff or signage.',
    plainExplanation:
      'Check in at Counter 1 or 2. Waiting Area B is down the hall to the left. Explanation only; confirm with staff or signage.',
  },
  {
    id: 'pharmacy_queue',
    title: 'Sign 2: Dispensary & Cashier Queue Notice',
    signText: 'DISPENSARY WINDOW A: TICKET REQUIRED | CASHIER WINDOW C BEFORE COLLECTION',
    standardExplanation:
      'Take a queue ticket for Dispensary Window A, and visit Cashier Window C before collecting medicine. Explanation only; confirm with staff or signage.',
    plainExplanation:
      'Get a ticket first. Go to Cashier Window C before picking up medicine at Window A. Explanation only; confirm with staff or signage.',
  },
  {
    id: 'unclear_blur',
    title: 'Sign 3: Unclear / Glare on Sign (Safety Boundary)',
    signText: '[BLURRED / GLARE ON SIGN BOARD]',
    standardExplanation:
      'I cannot see this sign clearly enough to read the words safely. Please ask a staff member nearby. Explanation only; confirm with staff or signage.',
    plainExplanation:
      'I cannot read this sign clearly. Please ask a staff member nearby to be sure. Explanation only; confirm with staff or signage.',
  },
]

export interface LearnStepDraft {
  id: string
  title: string
  description: string
  plainDescription: string
  distressRating: number
}

export function buildLearnStepsForGoal(goal: string): LearnStepDraft[] {
  const g = goal.trim() || 'prepare for my first hospital visit'
  return [
    {
      id: 'greet',
      title: 'Step 1 · Prepare your note & arrive at reception',
      description: `For "${g}", take a breath at the entrance and greet the receptionist with one short sentence about your visit.`,
      plainDescription: `For "${g}", pause at the door, say hello to the receptionist, and share why you came.`,
      distressRating: 3,
    },
    {
      id: 'ask_for_card',
      title: 'Step 2 · Answer the pretend clinic card question',
      description: 'Practise answering whether you have a clinic card (or saying you do not have one today) without sharing real ID numbers.',
      plainDescription: 'Say yes or no when asked for a pretend card. Never share real ID numbers.',
      distressRating: 4,
    },
    {
      id: 'direct_to_waiting_area',
      title: 'Step 3 · Confirm directions to the waiting area',
      description: 'Listen to the waiting area directions and repeat the room or bay name back so you feel confident.',
      plainDescription: 'Repeat the waiting area name back and ask to slow down if needed.',
      distressRating: 3,
    },
    {
      id: 'close',
      title: 'Step 4 · Review & save your rehearsal checklist',
      description: 'Wrap up the practice and optionally save a short preparation checklist in browser storage.',
      plainDescription: 'Finish practice and save your checklist if you want.',
      distressRating: 2,
    },
  ]
}
