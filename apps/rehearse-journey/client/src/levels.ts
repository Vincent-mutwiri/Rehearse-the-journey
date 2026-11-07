export type LevelId = '1' | '2' | '3' | '4' | '5'

export interface HospitalLevel {
  id: LevelId
  name: string
  description: string
  people: string
  characters: string[]
}

export const HOSPITAL_LEVELS: HospitalLevel[] = [
  {
    id: '1',
    name: 'Easy Start',
    description: 'Practise arriving, asking for help, and talking to a friendly receptionist.',
    people: '1',
    characters: ['Receptionist Joy'],
  },
  {
    id: '2',
    name: 'Everyday Conversation',
    description: 'Practise a longer conversation with more questions and instructions.',
    people: '1',
    characters: ['Receptionist Joy'],
  },
  {
    id: '3',
    name: 'Multiple People',
    description: 'Practise speaking with two people and responding to occasional interruptions.',
    people: '2',
    characters: ['Receptionist Joy', 'Patient Amani'],
  },
  {
    id: '4',
    name: 'Busy Environment',
    description: 'Practise communicating in a busy reception with several people and distractions.',
    people: '3–4',
    characters: ['Receptionist Joy', 'Patient Amani', 'Nurse Wanjiku', 'Attendant'],
  },
  {
    id: '5',
    name: 'Unpredictable Environment',
    description: 'Practise responding to changing situations and unexpected conversations.',
    people: 'Variable',
    characters: ['Joy', 'Amani', 'Nurse Wanjiku', 'Attendant'],
  },
]

export function getHospitalLevel(id: LevelId): HospitalLevel {
  return HOSPITAL_LEVELS.find(level => level.id === id) ?? HOSPITAL_LEVELS[0]
}
