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
  storyId?: string
}

export interface ScenarioDef {
  id: ScenarioId
  name: string
  persona: JoyPersona
  personaLabel: string
  badge: string
  defaultStoryId: string
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
    storyId: 'hospital-waiting-area',
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
    defaultStoryId: 'hospital-waiting-area',
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
        {
          id: 'confirm_morning_slot',
          title: '3. Confirming morning vs afternoon slot',
          speaker: 'joy',
          speakerLabel: 'Receptionist Joy',
          description:
            'Joy asks whether your pretend appointment is for the morning session or afternoon session.',
          simplifiedDescription:
            'Say whether your pretend visit is for the morning or afternoon session.',
        },
        {
          ...HOSPITAL_BASE_STEPS[2],
          title: '4. Directions to Waiting Area B',
        },
        {
          ...HOSPITAL_BASE_STEPS[3],
          title: '5. Complete or repeat practice',
        },
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
          storyId: 'hospital-room-4',
        },
        {
          ...HOSPITAL_BASE_STEPS[2],
          storyId: 'hospital-room-4',
        },
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
          storyId: 'hospital-waiting-area',
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
    defaultStoryId: 'matatu-stage-route',
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
          storyId: 'matatu-stage-route',
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
      2: [
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
          title: '2. Pretend payment method & seat choice',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Choose between pretend M-Pesa or pretend cash for the 50 shillings fare, and pick a door or window seat.',
          simplifiedDescription: 'Pick pretend M-Pesa or cash, and choose a door or window seat.',
          requiresApproval: true,
        },
        {
          id: 'confirm_landmark_alert',
          title: '3. Ask conductor for a stage reminder',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Ask Otieno to alert you when the matatu passes the roundabout just before your pretend stage.',
          simplifiedDescription: 'Ask Otieno to tell you when the matatu passes the roundabout.',
        },
        {
          id: 'request_stop',
          title: '4. Calling out your stage (Shukisha)',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Practise politely calling out your pretend drop-off stage before the matatu arrives.',
          simplifiedDescription: 'Say "Stop at the next stage please" when your pretend stop is near.',
          storyId: 'matatu-stage-route',
        },
        {
          id: 'close',
          title: '5. Matatu practice complete',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Your fictional matatu journey rehearsal is complete.',
          simplifiedDescription: 'Matatu practice is finished!',
          requiresApproval: true,
        },
      ],
      3: [
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
          title: '2. Fare check + stage diversion notice',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Otieno mentions roadworks closed Stage 3, so passengers are alighting at the Roundabout Stage 100 metres earlier.',
          simplifiedDescription: 'Stage 3 is closed for roadworks, so you will alight at the Roundabout Stage nearby.',
          requiresApproval: true,
        },
        {
          id: 'stage_diversion',
          title: '2b. Diversion branch: Roundabout Stage drop-off',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Otieno explains the shaded walkway from the Roundabout Stage and checks that you feel ready.',
          simplifiedDescription: 'Otieno explains the easy walkway from the Roundabout Stage.',
          storyId: 'matatu-stage-route',
        },
        {
          id: 'request_stop',
          title: '3. Alighting at the Roundabout Stage',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Call out your stop calmly as the matatu approaches the Roundabout Stage.',
          simplifiedDescription: 'Say "Shukisha at the roundabout stage, please."',
          storyId: 'matatu-stage-route',
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
      4: [
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
          title: '2. Boarding a busy matatu',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Confirm your seat near the door next to fellow passenger Amani.',
          simplifiedDescription: 'Take the seat by the door next to Amani.',
          requiresApproval: true,
        },
        {
          id: 'passenger_handoff',
          title: '3. Seat chat (Handoff to Passenger Amani)',
          speaker: 'amani',
          speakerLabel: 'Passenger Amani',
          handoffTo: 'amani',
          description: 'Fellow passenger Amani greets you warmly and asks if you are also alighting at the Hospital Road stage.',
          simplifiedDescription: 'Chat briefly with Amani about watching for the stage sign together.',
          storyId: 'matatu-stage-route',
        },
        {
          id: 'parallel_stage_call',
          title: '4. Parallel overlap: Otieno & Amani speak at the stage',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno & Passenger Amani',
          handoffTo: 'otieno',
          parallelFanout: true,
          description: 'Otieno calls out "Hospital Stage next!" while Amani offers to let you pass first. Reply to either person.',
          simplifiedDescription: 'Otieno calls your stage while Amani steps aside. Reply to either one.',
          requiresApproval: true,
        },
        {
          id: 'close',
          title: '5. Matatu practice complete',
          speaker: 'otieno',
          speakerLabel: 'Conductor Otieno',
          description: 'Your fictional matatu journey rehearsal is complete.',
          simplifiedDescription: 'Matatu practice is finished!',
          requiresApproval: true,
        },
      ],
    },
  },
  government: {
    id: 'government',
    name: 'Government Service',
    persona: 'wanjiku',
    personaLabel: 'Officer Wanjiku',
    badge: 'Government Service Desk',
    defaultStoryId: 'gov-counter-directions',
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
          storyId: 'gov-counter-directions',
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
      2: [
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
          title: '2. Pretend slip & service category (Desk A or B)',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Confirm your pretend slip and choose Desk A (Pretend ID Replacement) or Desk B (Pretend Certificate Inquiry).',
          simplifiedDescription: 'Say yes or no for the pretend slip and pick Desk A or Desk B.',
          requiresApproval: true,
        },
        {
          id: 'confirm_counter_steps',
          title: '3. What to expect at Counter 3',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Wanjiku explains how Counter 3 calls numbers and offers to write Counter 3 on your pretend slip.',
          simplifiedDescription: 'Ask Wanjiku to write Counter 3 on your pretend slip.',
        },
        {
          id: 'queue_ticket',
          title: '4. Receive pretend counter ticket B-12',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Wanjiku gives you pretend ticket B-12 for Counter 3 and checks if the directions are clear.',
          simplifiedDescription: 'Take pretend ticket B-12 for Counter 3 and ask to repeat if needed.',
          storyId: 'gov-counter-directions',
        },
        {
          id: 'close',
          title: '5. Service desk practice complete',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Your fictional government desk rehearsal is complete.',
          simplifiedDescription: 'Service desk practice is finished!',
          requiresApproval: true,
        },
      ],
      3: [
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
          title: '2. Slip check + ticket screen outage notice',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'The digital ticket printer is offline, so Wanjiku issues paper queue card B-12 for Counter 5 instead of Counter 3.',
          simplifiedDescription: 'The ticket screen is off, so Wanjiku gives you a paper card for Counter 5.',
          requiresApproval: true,
        },
        {
          id: 'queue_outage_diversion',
          title: '2b. Diversion branch: Paper queue at Counter 5',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Wanjiku reassures you that staff at Counter 5 call numbers aloud from the paper queue.',
          simplifiedDescription: 'Staff at Counter 5 will call your ticket number out loud.',
          storyId: 'gov-counter-directions',
        },
        {
          id: 'queue_ticket',
          title: '3. Confirming Counter 5 paper queue',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Take pretend paper card B-12 for Counter 5 and confirm the hallway directions.',
          simplifiedDescription: 'Take pretend paper card B-12 and head to Counter 5.',
          storyId: 'gov-counter-directions',
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
      4: [
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
          title: '2. Pretend slip check (busy service hall)',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Wanjiku hands you pretend ticket B-12 and points you toward the waiting bench where Citizen Amani is seated.',
          simplifiedDescription: 'Take pretend ticket B-12 to the waiting bench near Amani.',
          requiresApproval: true,
        },
        {
          id: 'waiting_bench_handoff',
          title: '3. Waiting bench (Handoff to Citizen Amani)',
          speaker: 'amani',
          speakerLabel: 'Citizen Amani',
          handoffTo: 'amani',
          description: 'Fellow citizen Amani greets you on the waiting bench and compares pretend ticket numbers.',
          simplifiedDescription: 'Chat with Amani on the bench while waiting for ticket B-12.',
          storyId: 'gov-counter-directions',
        },
        {
          id: 'parallel_counter_call',
          title: '4. Parallel overlap: Wanjiku & Amani speak together',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku & Citizen Amani',
          handoffTo: 'wanjiku',
          parallelFanout: true,
          description: 'Officer Wanjiku calls ticket B-12 for Counter 3 while Amani points out the window. Reply to either person.',
          simplifiedDescription: 'Wanjiku calls B-12 while Amani points to Counter 3. Reply to either one.',
          requiresApproval: true,
        },
        {
          id: 'close',
          title: '5. Service desk practice complete',
          speaker: 'wanjiku',
          speakerLabel: 'Officer Wanjiku',
          description: 'Your fictional government desk rehearsal is complete.',
          simplifiedDescription: 'Service desk practice is finished!',
          requiresApproval: true,
        },
      ],
    },
  },
  directions: {
    id: 'directions',
    name: 'Asking for Directions',
    persona: 'maina',
    personaLabel: 'Passerby Maina',
    badge: 'Street Landmarks',
    defaultStoryId: 'directions-landmarks',
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
          storyId: 'directions-landmarks',
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
      2: [
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
          title: '2. Landmarks & pedestrian zebra crossing',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Repeat back the green bookshop, the zebra crossing, and the left turn at the clock tower.',
          simplifiedDescription: 'Repeat: green bookshop, zebra crossing, then left at the clock tower.',
          requiresApproval: true,
          storyId: 'directions-landmarks',
        },
        {
          id: 'ask_backup_landmark',
          title: '3. Confirming a backup landmark (yellow bakery)',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Maina shares a backup landmark (if you see the yellow bakery, you went one block too far).',
          simplifiedDescription: 'Remember: if you see the yellow bakery, step back to the clock tower.',
          storyId: 'directions-landmarks',
        },
        {
          id: 'close',
          title: '4. Directions practice complete',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Your fictional directions rehearsal is complete.',
          simplifiedDescription: 'Directions practice is finished!',
          requiresApproval: true,
        },
      ],
      3: [
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
          title: '2. Landmark check + footpath detour notice',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'The clock-tower sidewalk is fenced for paving, so Maina suggests turning left one block earlier at the Post Office Arcade.',
          simplifiedDescription: 'The clock-tower sidewalk is closed; turn left at the Post Office Arcade instead.',
          requiresApproval: true,
          storyId: 'directions-landmarks',
        },
        {
          id: 'detour_diversion',
          title: '2b. Diversion branch: Post Office Arcade walkway',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Maina explains the wide, quiet walkway through the Post Office Arcade to the library courtyard.',
          simplifiedDescription: 'Walk past the green bookshop and turn left through the Post Office Arcade.',
          storyId: 'directions-landmarks',
        },
        {
          id: 'confirm_detour',
          title: '3. Reviewing the detour landmarks',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Confirm the two detour landmarks (green bookshop, then Post Office Arcade).',
          simplifiedDescription: 'Repeat back: green bookshop, then Post Office Arcade.',
          storyId: 'directions-landmarks',
        },
        {
          id: 'close',
          title: '4. Directions practice complete',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Your fictional directions rehearsal is complete.',
          simplifiedDescription: 'Directions practice is finished!',
          requiresApproval: true,
        },
      ],
      4: [
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
          title: '2. First landmark on a busy street corner',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Walk up to the green bookshop where Shopkeeper Amani can point out the clock-tower turn.',
          simplifiedDescription: 'Walk to the green bookshop and check in with Shopkeeper Amani.',
          requiresApproval: true,
          storyId: 'directions-landmarks',
        },
        {
          id: 'shopkeeper_handoff',
          title: '3. At the bookshop (Handoff to Shopkeeper Amani)',
          speaker: 'amani',
          speakerLabel: 'Shopkeeper Amani',
          handoffTo: 'amani',
          description: 'Shopkeeper Amani greets you outside the green bookshop and points out the clock tower ahead on the left.',
          simplifiedDescription: 'Amani points out the clock tower at the end of the block.',
          storyId: 'directions-landmarks',
        },
        {
          id: 'parallel_direction_check',
          title: '4. Parallel overlap: Maina & Amani reassure you at the corner',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina & Shopkeeper Amani',
          handoffTo: 'maina',
          parallelFanout: true,
          description: 'Maina waves to confirm the turn while Amani wishes you a pleasant walk. Reply to either helper.',
          simplifiedDescription: 'Maina and Amani both encourage you at the corner. Reply to either one.',
          requiresApproval: true,
        },
        {
          id: 'close',
          title: '5. Directions practice complete',
          speaker: 'maina',
          speakerLabel: 'Passerby Maina',
          description: 'Your fictional directions rehearsal is complete.',
          simplifiedDescription: 'Directions practice is finished!',
          requiresApproval: true,
        },
      ],
    },
  },
}

export interface ProviderStackOption {
  id: 'gemini_proxy' | 'gemini_direct' | 'gemini_live' | 'deepgram_openai_cartesia' | 'openai' | 'text_only'
  label: string
  reason: string
  usesBrowserStt: boolean
  previewOnly?: boolean
}

export const PROVIDER_STACK_OPTIONS: ProviderStackOption[] = [
  {
    id: 'gemini_proxy',
    label: 'Gemini REST + Gemini TTS (Browser STT)',
    reason: 'audio on, Lovable Gemini proxy active → REST LLM + Gemini TTS + Web Speech STT',
    usesBrowserStt: true,
  },
  {
    id: 'gemini_direct',
    label: 'Gemini REST + Gemini TTS (Browser STT, direct)',
    reason: 'audio on, Gemini REST + TTS direct → Web Speech STT',
    usesBrowserStt: true,
  },
  {
    id: 'gemini_live',
    label: 'Gemini Live (Speech-to-Speech)',
    reason: 'audio on, Gemini Live eligible → direct bidirectional speech-to-speech',
    usesBrowserStt: false,
  },
  {
    id: 'openai',
    label: 'OpenAI Stack (Whisper + GPT-4o + TTS-1)',
    reason: 'audio on, OpenAI server STT + GPT-4o + TTS',
    usesBrowserStt: false,
  },
  {
    id: 'text_only',
    label: 'Text-only Rehearsal Mode (No voice)',
    reason: 'audio off or voice unavailable → deterministic Flow text rehearsal mode',
    usesBrowserStt: false,
  },
  {
    id: 'deepgram_openai_cartesia',
    label: 'Deepgram STT + OpenAI LLM + Cartesia TTS (Preview)',
    reason: 'preview only — scheduled for v1.1 cloud deployment',
    usesBrowserStt: false,
    previewOnly: true,
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
