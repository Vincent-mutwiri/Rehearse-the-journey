/**
 * AI for Accessibility Toolkit Integration for Rehearse the Journey
 * (Practice Arena & Directions)
 *
 * Connects:
 * 1. Toolkit Adapters (`tools/adapters/*.js`):
 *    - Core 4: ReadAloud, PlainerWords (simplify), StopAutoAdvance, MotionReducer
 *    - Visual & Motor: BigTargets (44px+ WCAG 2.5.8), DarkMode (high contrast), ReadingRuler, BionicReading
 *    - Domain Adapter: SensoryCalmAdapter (promotes quiet hours, low-noise comfort tips, and simplified steps)
 * 2. Toolkit Profile & Librarian Core (`toolkit/index.js` + `toolkit/surfaces/web.js`):
 *    - Embedded `createToolkit({ kv, toolsRegistry, builtinSkills })` with localStorage persistence
 *    - Built-in `AbilityModel` profile presets (`sensory-calm`, `low-vision-audio`, `reading-focus`, `motor-targets`, `standard`)
 *    - Automatic observation logging (`librarian.logObservation`) when a user switches an adaptation
 * 3. Toolkit Skills (`toolkit/core/skill.js` via `librarian.listSkills`, `librarian.resolveSkill`, `librarian.findSkillForNeed`):
 *    - Composable SKILL.md playbooks for Directions & Practice Arena that deterministically compile into adapter + setting plans
 * 4. Adapter MCP Live Control (`toolkit/adapter-mcp/index.js`):
 *    - Wraps every adapter with `defineDescriptor` + `fromToggleAdapter` into `createAdapterProvider`
 *    - Optional live connection via `connectToToolkit` when `VITE_TOOLKIT_URL` & `VITE_TOOLKIT_TOKEN` are set
 */

// @ts-expect-error Plain browser JavaScript modules from tools/adapters/
import { ReadAloud } from '../../../../tools/adapters/read-aloud.js'
// @ts-expect-error Plain browser JavaScript modules from tools/adapters/
import { StopAutoAdvance } from '../../../../tools/adapters/stop-auto-advance.js'
// @ts-expect-error Plain browser JavaScript modules from tools/adapters/
import { MotionReducer } from '../../../../tools/adapters/motion-reducer.js'
// @ts-expect-error Plain browser JavaScript modules from tools/adapters/
import { BigTargets } from '../../../../tools/adapters/big-targets.js'
// @ts-expect-error Plain browser JavaScript modules from tools/adapters/
import { DarkMode } from '../../../../tools/adapters/dark-mode.js'
// @ts-expect-error Plain browser JavaScript modules from tools/adapters/
import { ReadingRuler } from '../../../../tools/adapters/reading-ruler.js'
// @ts-expect-error Plain browser JavaScript modules from tools/adapters/
import { BionicReading } from '../../../../tools/adapters/bionic-reading.js'
// @ts-expect-error Plain browser JavaScript module from toolkit/
import { createToolkit } from '../../../../toolkit/index.js'
// @ts-expect-error Plain browser JavaScript module from toolkit/surfaces/
import { renderWebSettings } from '../../../../toolkit/surfaces/web.js'
// @ts-expect-error Plain browser JavaScript module from toolkit/adapter-mcp/
import { createAdapterProvider, fromToggleAdapter, defineDescriptor, detectBrowserPlatform, connectToToolkit } from '../../../../toolkit/adapter-mcp/index.js'
import {
  enableStopAutoAdvance,
  ORIGINAL_STEP_TEXT,
  simplifyStepText,
} from './toolkitAdapters'

export {
  ReadAloud,
  StopAutoAdvance,
  MotionReducer,
  BigTargets,
  DarkMode,
  ReadingRuler,
  BionicReading,
  enableStopAutoAdvance,
  ORIGINAL_STEP_TEXT,
  simplifyStepText,
}

// ── Sensory-Calm Domain Adapter (for Directions & Simulations) ───────────────
export const SensoryCalmAdapter = {
  enabled: false,
  bodyClass: 'ai4a11y-sensory-calm',
  enable() {
    if (this.enabled) return
    this.enabled = true
    try {
      document.body?.classList.add(this.bodyClass)
    } catch {
      /* detached */
    }
  },
  disable() {
    if (!this.enabled) return
    this.enabled = false
    try {
      document.body?.classList.remove(this.bodyClass)
    } catch {
      /* detached */
    }
  },
  toggle() {
    if (this.enabled) this.disable()
    else this.enable()
  },
}

/**
 * Rewrites navigation & route instructions into plain, landmark-friendly English
 * when the `plainWords` (`simplify`) adapter is active in Directions.
 */
export function simplifyDirectionInstruction(instruction: string): string {
  if (!instruction) return instruction
  return instruction
    .replace(/\bHead\s+(north|south|east|west|northeast|northwest|southeast|southwest)\s+on\b/gi, 'Start along')
    .replace(/\bContinue\s+onto\b/gi, 'Keep going onto')
    .replace(/\bAt the roundabout,\s*take the\s*(\d+\w*)\s*exit\s*onto\b/gi, 'At the roundabout, take exit $1 onto')
    .replace(/\bAt the roundabout,\s*continue straight\b/gi, 'Go straight past the roundabout')
    .replace(/\bSlight\s+(left|right)\b/gi, 'Bear gently $1')
    .replace(/\bMake a U-turn\b/gi, 'Turn back the other way')
    .replace(/\bDestination will be on the\s+(left|right)\b/gi, 'Your stop is on the $1')
}

export const PlainerWordsAdapter = {
  enabled: false,
  enable() {
    this.enabled = true
  },
  disable() {
    this.enabled = false
  },
}

// ── Toolkit Adapter Keys & Metadata ──────────────────────────────────────────
export type ToolkitAdapterKey =
  | 'readAloud'
  | 'plainWords'
  | 'stopAuto'
  | 'reduceMotion'
  | 'bigTargets'
  | 'darkMode'
  | 'readingRuler'
  | 'bionicReading'
  | 'sensoryCalm'

export interface ToolkitAdapterMeta {
  key: ToolkitAdapterKey
  id: string
  label: string
  activeLabel?: string
  hint: string
  supportArea: 'vision' | 'motor' | 'cognitive' | 'sensory' | 'reading'
  core: boolean
}

export const TOOLKIT_ADAPTER_CATALOG: ToolkitAdapterMeta[] = [
  {
    key: 'readAloud',
    id: 'read-aloud',
    label: '🔊 Read page aloud',
    activeLabel: '⏹ Stop reading aloud',
    hint: 'Speaks the text on this page',
    supportArea: 'vision',
    core: true,
  },
  {
    key: 'plainWords',
    id: 'simplify-text',
    label: 'Aa Plainer words',
    activeLabel: 'Aa Plainer words — on',
    hint: 'Rewrites the step card and route directions in plain language',
    supportArea: 'cognitive',
    core: true,
  },
  {
    key: 'stopAuto',
    id: 'stop-auto-advance',
    label: '⏸ Stop auto-advance',
    hint: 'Holds still anything that moves on a timer',
    supportArea: 'cognitive',
    core: true,
  },
  {
    key: 'reduceMotion',
    id: 'motion-reducer',
    label: '🐢 Reduce motion',
    hint: 'Stops animations and transitions on this page',
    supportArea: 'sensory',
    core: true,
  },
  {
    key: 'sensoryCalm',
    id: 'sensory-calm',
    label: '🌿 Sensory-calm mode',
    activeLabel: '🌿 Sensory-calm mode — on',
    hint: 'Highlights quiet hours, low-noise route tips, and calm pacing',
    supportArea: 'sensory',
    core: false,
  },
  {
    key: 'bigTargets',
    id: 'big-targets',
    label: '🎯 Bigger click targets (44px+)',
    activeLabel: '🎯 Bigger click targets — on',
    hint: 'Enlarges buttons, links, and route chips for easier tapping',
    supportArea: 'motor',
    core: false,
  },
  {
    key: 'darkMode',
    id: 'dark-mode',
    label: '🌙 High contrast / Dark mode',
    activeLabel: '🌙 High contrast / Dark mode — on',
    hint: 'Applies a soft dark theme while preserving maps and photos',
    supportArea: 'vision',
    core: false,
  },
  {
    key: 'readingRuler',
    id: 'reading-ruler',
    label: '📏 Reading ruler',
    activeLabel: '📏 Reading ruler — on',
    hint: 'Adds a cursor-following highlight band to anchor your eye on each line',
    supportArea: 'reading',
    core: false,
  },
  {
    key: 'bionicReading',
    id: 'bionic-reading',
    label: '🅱️ Bionic reading',
    activeLabel: '🅱️ Bionic reading — on',
    hint: 'Bolds the start of words in route steps and cards for faster reading',
    supportArea: 'reading',
    core: false,
  },
]

// ── Profile Presets (AbilityModel schema) ────────────────────────────────────
export interface ToolkitProfilePreset {
  id: string
  name: string
  badge: string
  description: string
  supportAreas: string[]
  profile: {
    supportAreas: string[]
    fields: {
      visionKind?: 'lowVision' | 'blind' | 'colorBlind'
      readingLevel?: number
      largeTargets?: boolean
      needs: Array<{
        dimension: string
        value: unknown
        strength: 'preference' | 'need' | 'hardFloor'
        source: string
      }>
    }
  }
  adapters: Partial<Record<ToolkitAdapterKey, boolean>>
}

export const TOOLKIT_PROFILE_PRESETS: ToolkitProfilePreset[] = [
  {
    id: 'standard',
    name: 'Standard Profile (Default)',
    badge: 'Balanced',
    description: 'Default settings with all manual adaptations off until you turn them on.',
    supportAreas: [],
    profile: {
      supportAreas: [],
      fields: { needs: [] },
    },
    adapters: {
      readAloud: false,
      plainWords: false,
      stopAuto: false,
      reduceMotion: false,
      sensoryCalm: false,
      bigTargets: false,
      darkMode: false,
      readingRuler: false,
      bionicReading: false,
    },
  },
  {
    id: 'sensory-calm',
    name: 'Sensory & Calm Commute',
    badge: 'Sensory · Cognitive',
    description: 'Reduces motion, pauses timers, simplifies directions, and highlights quiet hours & low-noise tips.',
    supportAreas: ['sensory', 'cognitive'],
    profile: {
      supportAreas: ['sensory', 'cognitive'],
      fields: {
        readingLevel: 6,
        needs: [
          { dimension: 'reduceMotion', value: true, strength: 'need', source: 'profile' },
          { dimension: 'simplify', value: true, strength: 'preference', source: 'profile' },
        ],
      },
    },
    adapters: {
      readAloud: false,
      plainWords: true,
      stopAuto: true,
      reduceMotion: true,
      sensoryCalm: true,
      bigTargets: false,
      darkMode: false,
      readingRuler: false,
      bionicReading: false,
    },
  },
  {
    id: 'low-vision-audio',
    name: 'Low Vision & Audio Guide',
    badge: 'Vision · Audio',
    description: 'Enables Read Aloud narration, 44px+ click targets, and high-contrast dark mode.',
    supportAreas: ['vision', 'reading'],
    profile: {
      supportAreas: ['vision', 'reading'],
      fields: {
        visionKind: 'lowVision',
        largeTargets: true,
        needs: [
          { dimension: 'readAloud', value: true, strength: 'need', source: 'profile' },
          { dimension: 'darkTheme', value: true, strength: 'preference', source: 'profile' },
        ],
      },
    },
    adapters: {
      readAloud: true,
      plainWords: false,
      stopAuto: false,
      reduceMotion: false,
      sensoryCalm: false,
      bigTargets: true,
      darkMode: true,
      readingRuler: false,
      bionicReading: false,
    },
  },
  {
    id: 'reading-focus',
    name: 'Dyslexia & Focus Reading',
    badge: 'Reading · Cognitive',
    description: 'Combines Plainer Words, Bionic Reading word anchors, and the cursor Reading Ruler.',
    supportAreas: ['reading', 'cognitive'],
    profile: {
      supportAreas: ['reading', 'cognitive'],
      fields: {
        readingLevel: 6,
        needs: [
          { dimension: 'simplify', value: true, strength: 'need', source: 'profile' },
          { dimension: 'dyslexiaFont', value: true, strength: 'preference', source: 'profile' },
        ],
      },
    },
    adapters: {
      readAloud: false,
      plainWords: true,
      stopAuto: false,
      reduceMotion: false,
      sensoryCalm: false,
      bigTargets: true,
      darkMode: false,
      readingRuler: true,
      bionicReading: true,
    },
  },
  {
    id: 'motor-targets',
    name: 'Motor & Touch Comfort',
    badge: 'Motor · Pacing',
    description: 'Enlarges all buttons and route chips to 44px+, stops auto-advance, and steadies motion.',
    supportAreas: ['motor'],
    profile: {
      supportAreas: ['motor'],
      fields: {
        largeTargets: true,
        needs: [
          { dimension: 'reduceMotion', value: true, strength: 'preference', source: 'profile' },
        ],
      },
    },
    adapters: {
      readAloud: false,
      plainWords: false,
      stopAuto: true,
      reduceMotion: true,
      sensoryCalm: false,
      bigTargets: true,
      darkMode: false,
      readingRuler: false,
      bionicReading: false,
    },
  },
]

// ── Built-in Toolkit Skills (SKILL.md Playbooks) ─────────────────────────────
export interface RehearsalSkill {
  name: string
  title: string
  description: string
  supportAreas: string[]
  siteRelevance: string[]
  targetContext: 'both' | 'directions' | 'simulations'
  recipe: {
    adapters: Array<{ id: string; settings?: Record<string, unknown> }>
  }
  body: string
}

export const BUILTIN_REHEARSAL_SKILLS: RehearsalSkill[] = [
  {
    name: 'calm-commute-navigator',
    title: 'Calm Commute & Matatu Navigator',
    description: 'For sensory overload, crowded matatu stages, or busy hospital corridors: turns on Sensory-Calm mode, Plainer Words, Reduce Motion, and Stop Auto-Advance.',
    supportAreas: ['sensory', 'cognitive'],
    siteRelevance: ['general'],
    targetContext: 'directions',
    recipe: {
      adapters: [
        { id: 'sensory-calm', settings: { sensoryCalm: true } },
        { id: 'simplify-text', settings: { autoSimplify: true } },
        { id: 'motion-reducer', settings: { motionReducer: true } },
        { id: 'stop-auto-advance', settings: { stopAutoAdvance: true } },
      ],
    },
    body: 'Applies sensory-calm route framing, plain-English turn-by-turn directions, and still visuals.',
  },
  {
    name: 'audio-landmark-guide',
    title: 'Audio-First Landmark & Step Reader',
    description: 'For low-vision travellers or eyes-free navigation: speaks route steps, matatu fares, and Joy’s dialogue aloud while enlarging click targets.',
    supportAreas: ['vision', 'reading', 'motor'],
    siteRelevance: ['general'],
    targetContext: 'both',
    recipe: {
      adapters: [
        { id: 'read-aloud', settings: { readAloud: true } },
        { id: 'big-targets', settings: { bigTargets: true } },
        { id: 'simplify-text', settings: { autoSimplify: true } },
      ],
    },
    body: 'Speaks directions, landmarks, and rehearsal turns aloud and enlarges interactive targets to 44px+.',
  },
  {
    name: 'focus-reading-kit',
    title: 'Dyslexia & Focus Reading Kit',
    description: 'For dense route instructions, matatu stage cards, or long transcripts: enables Bionic Reading prefixes, the Reading Ruler guide, and Plainer Words.',
    supportAreas: ['reading', 'cognitive'],
    siteRelevance: ['general'],
    targetContext: 'both',
    recipe: {
      adapters: [
        { id: 'bionic-reading', settings: { bionicReading: true } },
        { id: 'reading-ruler', settings: { readingRuler: true } },
        { id: 'simplify-text', settings: { autoSimplify: true } },
      ],
    },
    body: 'Anchors reading saccades with bold word prefixes, a horizontal reading ruler, and plain wording.',
  },
  {
    name: 'calm-rehearsal-pace',
    title: 'Calm Rehearsal Pace',
    description: 'For unhurried role-play with Joy & Amani: enlarges controls, stops timers/animations, and rewrites rehearsal guidance in plain words.',
    supportAreas: ['cognitive', 'sensory', 'motor'],
    siteRelevance: ['general'],
    targetContext: 'simulations',
    recipe: {
      adapters: [
        { id: 'stop-auto-advance', settings: { stopAutoAdvance: true } },
        { id: 'motion-reducer', settings: { motionReducer: true } },
        { id: 'big-targets', settings: { bigTargets: true } },
        { id: 'simplify-text', settings: { autoSimplify: true } },
      ],
    },
    body: 'Steadies rehearsal pacing with 44px+ buttons, reduced motion, paused timers, and plain language.',
  },
]

// ── Embedded Toolkit Instance (`createToolkit`) ──────────────────────────────
const STORAGE_PREFIX = 'rtj_toolkit_kv:'
const memFallback = new Map<string, unknown>()

function createBrowserKV() {
  return {
    async get(key: string) {
      try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
        if (raw !== null) return JSON.parse(raw)
      } catch {
        /* storage blocked */
      }
      return memFallback.get(key)
    },
    async set(key: string, value: unknown) {
      memFallback.set(key, value)
      try {
        window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
      } catch {
        /* storage blocked */
      }
    },
    async remove(key: string) {
      memFallback.delete(key)
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + key)
      } catch {
        /* storage blocked */
      }
    },
    async getAll() {
      const out: Record<string, unknown> = {}
      for (const [k, v] of memFallback.entries()) out[k] = v
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const fullKey = window.localStorage.key(i)
          if (fullKey && fullKey.startsWith(STORAGE_PREFIX)) {
            const shortKey = fullKey.slice(STORAGE_PREFIX.length)
            const raw = window.localStorage.getItem(fullKey)
            if (raw !== null) out[shortKey] = JSON.parse(raw)
          }
        }
      } catch {
        /* ignore */
      }
      return out
    },
  }
}

const TOOLS_REGISTRY = {
  version: 1,
  list: TOOLKIT_ADAPTER_CATALOG.map(a => ({
    id: a.id,
    name: a.label.replace(/^[^\wA-Za-z]+\s*/, ''),
    description: a.hint,
    supportAreas: [a.supportArea],
    siteRelevance: ['general'],
    settings: { [a.key]: true },
  })),
  settingsMeta: {
    readAloud: { type: 'boolean', default: false },
    autoSimplify: { type: 'boolean', default: false },
    stopAutoAdvance: { type: 'boolean', default: false },
    motionReducer: { type: 'boolean', default: false },
    sensoryCalm: { type: 'boolean', default: false },
    bigTargets: { type: 'boolean', default: false },
    darkMode: { type: 'boolean', default: false },
    readingRuler: { type: 'boolean', default: false },
    bionicReading: { type: 'boolean', default: false },
  },
  byId(id: string) {
    return this.list.find(entry => entry.id === id) ?? null
  },
  settingsFor(ids: string[]) {
    const merged: Record<string, boolean> = {}
    for (const id of ids) {
      const found = TOOLKIT_ADAPTER_CATALOG.find(a => a.id === id)
      if (found) merged[found.key] = true
    }
    return merged
  },
}

export const rehearsalToolkit = createToolkit({
  kv: createBrowserKV(),
  toolsRegistry: TOOLS_REGISTRY,
  builtinSkills: BUILTIN_REHEARSAL_SKILLS,
})

void rehearsalToolkit.datastore.runMigrations().catch(() => {})

// ── Problem Statement 6 Persona Profiles (Login & UI Personalization) ────────
export type PersonaProfileId = 'baraka' | 'zawadi' | 'kamau'
export type PersonaUiMode = 'standard' | 'sensory-calm' | 'reading-focus'

export interface PersonaProfileDef {
  id: PersonaProfileId
  name: string
  shortName: string
  ageAndCity: string
  role: string
  conditionBadge: string
  uiMode: PersonaUiMode
  uiModeLabel: string
  toolkitPresetId: string
  recommendedLevel: 1 | 2 | 3 | 4
  recommendedClarity: boolean
  accentColor: string
  surfaceTint: string
  quote: string
  problemContext: string
  uiChanges: string[]
  activeAdapterLabels: string[]
}

export const PERSONA_PROFILES: PersonaProfileDef[] = [
  {
    id: 'baraka',
    name: 'Baraka Mwangi',
    shortName: 'Baraka',
    ageAndCity: '29 · Nairobi CBD Commuter',
    role: 'Everyday Traveller (Baseline)',
    conditionBadge: 'Neurotypical Baseline · Standard UI',
    uiMode: 'standard',
    uiModeLabel: 'Standard Full-Feature UI',
    toolkitPresetId: 'standard',
    recommendedLevel: 1,
    recommendedClarity: false,
    accentColor: '#a89bd4',
    surfaceTint: '#fbf7f2',
    quote:
      'I navigate busy matatu stages and hospital queues every week without sensory or reading barriers. The standard interface works great for me.',
    problemContext:
      'Represents a neurotypical Nairobi commuter used as the baseline comparison — comfortable with standard text density, animated 3D mascots, and multi-panel route data.',
    uiChanges: [
      'Classic Soft-Mirror palette (#FBF7F2) with standard information density',
      'Live 3D bone-rigged animations on Joy & Amani mascots',
      'All 4 practice levels and full multi-metric route panels shown simultaneously',
      'Standard Geist typography without reading overlays or step locks',
    ],
    activeAdapterLabels: ['Default Web Surface (0 manual adapters)'],
  },
  {
    id: 'zawadi',
    name: 'Zawadi Wanjiku',
    shortName: 'Zawadi',
    ageAndCity: '24 · Westlands, Nairobi',
    role: 'Sensory Overload & Journey Anxiety',
    conditionBadge: 'Autism & Psychosocial Support · Calm UI',
    uiMode: 'sensory-calm',
    uiModeLabel: 'Sensory-Calm Sanctuary UI',
    toolkitPresetId: 'sensory-calm',
    recommendedLevel: 1,
    recommendedClarity: true,
    accentColor: '#6b9e82',
    surfaceTint: '#f1f6f3',
    quote:
      'Loud matatu touts, sudden queue changes, and busy screens make my heart race. I need a calm, still space where nothing moves on its own and I can pause anytime.',
    problemContext:
      'Represents a co-designer with sensory processing sensitivity and journey anxiety who finds unpredictable public spaces overwhelming.',
    uiChanges: [
      '🌿 Soothing Sage Sanctuary palette (#F1F6F3) with low-glare cards & generous spacing',
      '🐢 All 3D mascot motion, pulsing indicators & auto-advancing timers frozen still',
      '🧘 Dedicated Sensory Sanctuary Bar with live Sensory Load meter & 1-tap Decompress',
      '🔒 De-cluttered "One Step at a Time" layout pre-set to Level 1 Easy Start + Plainer Words',
    ],
    activeAdapterLabels: [
      '🌿 Sensory-Calm Mode',
      '🐢 Reduce Motion',
      '⏸ Stop Auto-Advance',
      'Aa Plainer Words',
    ],
  },
  {
    id: 'kamau',
    name: 'Kamau Ochieng',
    shortName: 'Kamau',
    ageAndCity: '34 · Embakasi, Nairobi',
    role: 'Dyslexia, ADHD & Executive Function',
    conditionBadge: 'Dyslexia & ADHD Support · Focus UI',
    uiMode: 'reading-focus',
    uiModeLabel: 'Structured Focus & Audio-Visual UI',
    toolkitPresetId: 'reading-focus',
    recommendedLevel: 1,
    recommendedClarity: true,
    accentColor: '#d48b3b',
    surfaceTint: '#fdf8ec',
    quote:
      'Dense paragraphs and fast spoken hospital directions scramble in my head when I am stressed. Bold word-anchors, visual maps, and tap-to-send replies keep me focused.',
    problemContext:
      'Represents a co-designer with dyslexia and ADHD who needs structured visual checklists, eye-tracking reading aids, and low-typing conversation support.',
    uiChanges: [
      '📖 Warm Amber Paper theme (#FDF8EC) with wider dyslexia-friendly letter & word spacing',
      '🅱️ Bionic Reading bold word-prefixes + cursor-following Reading Ruler highlight band',
      '📋 Interactive 3-Step Executive Function Checklist & 44px+ enlarged tactile buttons',
      '🗺️ Visual Floor-Plan Map opened automatically + 1-Tap Quick-Reply starter chips',
    ],
    activeAdapterLabels: [
      '🅱️ Bionic Reading',
      '📏 Reading Ruler',
      'Aa Plainer Words',
      '🎯 44px+ Big Targets',
    ],
  },
]

// ── Shared Reactive State Across Simulations & Directions ────────────────────
export type UiLayoutMode = 'standard' | 'calm-sanctuary' | 'structured-steps'
export type UiReadingAidMode = 'default' | 'plain-words' | 'bionic-focus' | 'bionic-with-ruler'
export type UiMotionControlMode = 'animated' | 'still'
export type UiConversationAidMode = 'standard' | 'calm-starters' | 'quick-reply-chips'

export interface UiPersonalizationSettings {
  theme: PersonaUiMode
  layoutDensity: UiLayoutMode
  readingAid: UiReadingAidMode
  motionControl: UiMotionControlMode
  conversationAid: UiConversationAidMode
}

export interface ToolkitRuntimeState {
  adapters: Record<ToolkitAdapterKey, boolean>
  activeProfileId: string
  activePersonaId: PersonaProfileId
  showPersonaLogin: boolean
  uiSettings: UiPersonalizationSettings
  activeSkillName: string | null
  lastObservation: string | null
  abilitySummary: {
    supportAreas: string[]
    webSettings: Record<string, unknown>
  }
}

const PERSONA_UI_SETTINGS_PRESETS: Record<PersonaProfileId, UiPersonalizationSettings> = {
  baraka: {
    theme: 'standard',
    layoutDensity: 'standard',
    readingAid: 'default',
    motionControl: 'animated',
    conversationAid: 'standard',
  },
  zawadi: {
    theme: 'sensory-calm',
    layoutDensity: 'calm-sanctuary',
    readingAid: 'plain-words',
    motionControl: 'still',
    conversationAid: 'calm-starters',
  },
  kamau: {
    theme: 'reading-focus',
    layoutDensity: 'structured-steps',
    readingAid: 'bionic-with-ruler',
    motionControl: 'animated',
    conversationAid: 'quick-reply-chips',
  },
}

const state: ToolkitRuntimeState = {
  adapters: {
    readAloud: false,
    plainWords: false,
    stopAuto: false,
    reduceMotion: false,
    sensoryCalm: false,
    bigTargets: false,
    darkMode: false,
    readingRuler: false,
    bionicReading: false,
  },
  activeProfileId: 'standard',
  activePersonaId: 'baraka',
  showPersonaLogin: false,
  uiSettings: { ...PERSONA_UI_SETTINGS_PRESETS.baraka },
  activeSkillName: null,
  lastObservation: null,
  abilitySummary: {
    supportAreas: [],
    webSettings: {},
  },
}

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of Array.from(listeners)) {
    listener()
  }
}

export function subscribeToolkitState(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToolkitState(): ToolkitRuntimeState {
  return {
    ...state,
    adapters: { ...state.adapters },
    uiSettings: { ...state.uiSettings },
    abilitySummary: {
      supportAreas: [...state.abilitySummary.supportAreas],
      webSettings: { ...state.abilitySummary.webSettings },
    },
  }
}

let bionicReapplyTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSafeBionicEnable(enabled: boolean) {
  if (bionicReapplyTimer) {
    clearTimeout(bionicReapplyTimer)
    bionicReapplyTimer = null
  }
  try {
    if (BionicReading.enabled) BionicReading.disable()
  } catch {
    /* ignore detached node */
  }
  if (enabled) {
    bionicReapplyTimer = setTimeout(() => {
      bionicReapplyTimer = null
      if (state.adapters.bionicReading && !BionicReading.enabled) {
        try {
          BionicReading.enable({ boldRatio: 0.4 })
        } catch {
          /* ignore */
        }
      }
    }, 90)
  }
}

if (typeof window !== 'undefined') {
  const restoreBeforeReactEvent = () => {
    if (state.adapters.bionicReading && BionicReading.enabled) {
      scheduleSafeBionicEnable(true)
    }
  }
  window.addEventListener('click', restoreBeforeReactEvent, true)
  window.addEventListener('keydown', restoreBeforeReactEvent, true)
}

function syncDomAdapter(key: ToolkitAdapterKey, enabled: boolean, narrationText?: string) {
  switch (key) {
    case 'readAloud':
      if (enabled) {
        if (narrationText) ReadAloud.speak(narrationText)
      } else {
        ReadAloud.stop()
      }
      break
    case 'plainWords':
      if (enabled) PlainerWordsAdapter.enable()
      else PlainerWordsAdapter.disable()
      break
    case 'stopAuto':
      if (enabled) enableStopAutoAdvance()
      else StopAutoAdvance.disable()
      break
    case 'reduceMotion':
      if (enabled) MotionReducer.enable()
      else MotionReducer.disable()
      break
    case 'sensoryCalm':
      if (enabled) SensoryCalmAdapter.enable()
      else SensoryCalmAdapter.disable()
      break
    case 'bigTargets':
      if (enabled) BigTargets.enable({ minSize: 44 })
      else BigTargets.disable()
      break
    case 'darkMode':
      if (enabled) DarkMode.enable()
      else DarkMode.disable()
      break
    case 'readingRuler':
      if (enabled) ReadingRuler.enable({ height: 40, dim: false })
      else ReadingRuler.disable()
      break
    case 'bionicReading':
      scheduleSafeBionicEnable(enabled)
      break
  }
}

export function setToolkitAdapter(
  key: ToolkitAdapterKey,
  enabled: boolean,
  options?: { narrationText?: string; origin?: string; silentObservation?: boolean },
): void {
  state.adapters[key] = enabled
  syncDomAdapter(key, enabled, options?.narrationText)

  // Keep UI Personalization Settings & theme aligned when adapters are toggled directly
  if (key === 'sensoryCalm') {
    if (enabled) {
      state.uiSettings.theme = 'sensory-calm'
      state.uiSettings.layoutDensity = 'calm-sanctuary'
      state.uiSettings.conversationAid = 'calm-starters'
      state.activePersonaId = 'zawadi'
      syncPersonaBodyAttr('sensory-calm')
    } else if (!state.adapters.bionicReading && !state.adapters.readingRuler) {
      state.uiSettings.theme = 'standard'
      state.uiSettings.layoutDensity = 'standard'
      state.activePersonaId = 'baraka'
      syncPersonaBodyAttr('standard')
    }
  } else if (key === 'bionicReading' || key === 'readingRuler') {
    if (enabled) {
      state.uiSettings.theme = 'reading-focus'
      state.uiSettings.layoutDensity = 'structured-steps'
      state.uiSettings.conversationAid = 'quick-reply-chips'
      state.uiSettings.readingAid = state.adapters.readingRuler ? 'bionic-with-ruler' : 'bionic-focus'
      state.activePersonaId = 'kamau'
      syncPersonaBodyAttr('reading-focus')
    } else if (!state.adapters.bionicReading && !state.adapters.readingRuler) {
      state.uiSettings.readingAid = state.adapters.plainWords ? 'plain-words' : 'default'
    }
  } else if (key === 'reduceMotion' || key === 'stopAuto') {
    state.uiSettings.motionControl =
      state.adapters.reduceMotion || state.adapters.stopAuto ? 'still' : 'animated'
  } else if (key === 'plainWords') {
    if (!state.adapters.bionicReading && !state.adapters.readingRuler) {
      state.uiSettings.readingAid = enabled ? 'plain-words' : 'default'
    }
  }

  if (!options?.silentObservation) {
    const meta = TOOLKIT_ADAPTER_CATALOG.find(a => a.key === key)
    const obsText = `${enabled ? 'Enabled' : 'Disabled'} ${meta?.id ?? key} on Rehearse the Journey (${options?.origin ?? 'app'}).`
    state.lastObservation = obsText
    void rehearsalToolkit.librarian
      .logObservation({
        type: 'setting-change',
        origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        app: 'rehearse-journey',
        adapter: meta?.id ?? key,
        text: obsText,
        data: { key, enabled },
      })
      .catch(() => {})
  }
  emitChange()
}

export function setUiPersonalizationSetting(
  patch: Partial<UiPersonalizationSettings>,
  options?: { narrationText?: string },
): void {
  state.uiSettings = { ...state.uiSettings, ...patch }

  if (patch.theme) {
    syncPersonaBodyAttr(patch.theme)
    if (patch.theme === 'sensory-calm') {
      state.adapters.sensoryCalm = true
      syncDomAdapter('sensoryCalm', true)
      if (!patch.layoutDensity) state.uiSettings.layoutDensity = 'calm-sanctuary'
      if (!patch.conversationAid) state.uiSettings.conversationAid = 'calm-starters'
      state.activePersonaId = 'zawadi'
    } else if (patch.theme === 'reading-focus') {
      state.adapters.sensoryCalm = false
      syncDomAdapter('sensoryCalm', false)
      if (!patch.layoutDensity) state.uiSettings.layoutDensity = 'structured-steps'
      if (!patch.conversationAid) state.uiSettings.conversationAid = 'quick-reply-chips'
      state.activePersonaId = 'kamau'
    } else {
      state.adapters.sensoryCalm = false
      syncDomAdapter('sensoryCalm', false)
      if (!patch.layoutDensity) state.uiSettings.layoutDensity = 'standard'
      if (!patch.conversationAid) state.uiSettings.conversationAid = 'standard'
      state.activePersonaId = 'baraka'
    }
  }

  if (patch.layoutDensity) {
    if (patch.layoutDensity === 'calm-sanctuary') {
      state.activePersonaId = 'zawadi'
    } else if (patch.layoutDensity === 'structured-steps') {
      state.activePersonaId = 'kamau'
    } else {
      state.activePersonaId = 'baraka'
    }
  }

  if (patch.readingAid) {
    const plain = patch.readingAid !== 'default'
    const bionic = patch.readingAid === 'bionic-focus' || patch.readingAid === 'bionic-with-ruler'
    const ruler = patch.readingAid === 'bionic-with-ruler'
    state.adapters.plainWords = plain
    state.adapters.bionicReading = bionic
    state.adapters.readingRuler = ruler
    if (bionic) {
      state.adapters.bigTargets = true
      syncDomAdapter('bigTargets', true)
    }
    syncDomAdapter('plainWords', plain)
    syncDomAdapter('readingRuler', ruler)
    syncDomAdapter('bionicReading', bionic, options?.narrationText)
  }

  if (patch.motionControl) {
    const still = patch.motionControl === 'still'
    state.adapters.reduceMotion = still
    state.adapters.stopAuto = still
    syncDomAdapter('reduceMotion', still)
    syncDomAdapter('stopAuto', still)
  }

  state.showPersonaLogin = false
  state.lastObservation = `Updated UI personalization settings (${Object.entries(patch)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')}).`
  emitChange()
}

export function getPersonaProfile(id: PersonaProfileId = state.activePersonaId): PersonaProfileDef {
  return PERSONA_PROFILES.find(p => p.id === id) ?? PERSONA_PROFILES[0]
}

function syncPersonaBodyAttr(uiMode: PersonaUiMode) {
  try {
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.personaUi = uiMode
    }
  } catch {
    /* detached */
  }
}

export async function selectPersonaProfile(
  personaId: PersonaProfileId,
  options?: { narrationText?: string },
): Promise<PersonaProfileDef> {
  const persona = getPersonaProfile(personaId)
  state.activePersonaId = persona.id
  state.showPersonaLogin = false
  state.uiSettings = { ...PERSONA_UI_SETTINGS_PRESETS[persona.id] }
  syncPersonaBodyAttr(persona.uiMode)
  await applyToolkitProfilePreset(persona.toolkitPresetId, options)
  state.lastObservation = `Signed in as ${persona.name} (${persona.uiModeLabel}).`
  emitChange()
  return persona
}

export function openPersonaLogin(): void {
  if (state.adapters.bionicReading && BionicReading.enabled) {
    scheduleSafeBionicEnable(true)
  }
  state.showPersonaLogin = true
  emitChange()
}

export async function applyToolkitProfilePreset(
  presetId: string,
  options?: { narrationText?: string },
): Promise<void> {
  const preset = TOOLKIT_PROFILE_PRESETS.find(p => p.id === presetId) ?? TOOLKIT_PROFILE_PRESETS[0]
  state.activeProfileId = preset.id
  state.activeSkillName = null

  const matchingPersona = PERSONA_PROFILES.find(p => p.toolkitPresetId === preset.id)
  if (matchingPersona) {
    state.activePersonaId = matchingPersona.id
    state.uiSettings = { ...PERSONA_UI_SETTINGS_PRESETS[matchingPersona.id] }
    syncPersonaBodyAttr(matchingPersona.uiMode)
  }

  try {
    await rehearsalToolkit.librarian.replaceProfile(preset.profile)
    const model = await rehearsalToolkit.librarian.getAbilityModel()
    const webSettings = renderWebSettings(model)
    state.abilitySummary = {
      supportAreas: model.supportAreas?.length ? model.supportAreas : preset.supportAreas,
      webSettings,
    }
  } catch {
    state.abilitySummary = {
      supportAreas: preset.supportAreas,
      webSettings: {},
    }
  }

  for (const meta of TOOLKIT_ADAPTER_CATALOG) {
    const nextVal = Boolean(preset.adapters[meta.key])
    state.adapters[meta.key] = nextVal
    syncDomAdapter(meta.key, nextVal, nextVal && meta.key === 'readAloud' ? options?.narrationText : undefined)
  }

  state.lastObservation = `Loaded profile preset "${preset.name}".`
  emitChange()
}

const ADAPTER_ID_TO_KEY: Record<string, ToolkitAdapterKey> = {
  'read-aloud': 'readAloud',
  'simplify-text': 'plainWords',
  'stop-auto-advance': 'stopAuto',
  'motion-reducer': 'reduceMotion',
  'sensory-calm': 'sensoryCalm',
  'big-targets': 'bigTargets',
  'dark-mode': 'darkMode',
  'reading-ruler': 'readingRuler',
  'bionic-reading': 'bionicReading',
}

export function applyToolkitSkill(
  skillName: string,
  options?: { narrationText?: string },
): RehearsalSkill | null {
  const skill = BUILTIN_REHEARSAL_SKILLS.find(s => s.name === skillName)
  if (!skill) return null

  const resolved = rehearsalToolkit.librarian.resolveSkill(skill)
  const activeIds = new Set<string>(
    resolved?.adapterIds ?? skill.recipe.adapters.map(a => a.id),
  )

  for (const id of Array.from(activeIds)) {
    const key = ADAPTER_ID_TO_KEY[id]
    if (key) {
      state.adapters[key] = true
      syncDomAdapter(key, true, key === 'readAloud' ? options?.narrationText : undefined)
    }
  }

  state.activeSkillName = skill.name
  state.lastObservation = `Applied toolkit skill "${skill.title}" (${Array.from(activeIds).join(', ')}).`
  void rehearsalToolkit.librarian
    .logObservation({
      type: 'skill-apply',
      origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      app: 'rehearse-journey',
      text: state.lastObservation,
      data: { skill: skill.name, adapters: Array.from(activeIds) },
    })
    .catch(() => {})

  emitChange()
  return skill
}

export async function findAndApplySkillForNeed(
  needText: string,
  options?: { narrationText?: string },
): Promise<RehearsalSkill | null> {
  const q = needText.trim().toLowerCase()
  if (!q) return null

  try {
    const matched = await rehearsalToolkit.librarian.findSkillForNeed(needText)
    if (matched?.name) {
      const found = applyToolkitSkill(matched.name, options)
      if (found) return found
    }
  } catch {
    /* fallback to keyword match below */
  }

  if (q.includes('audio') || q.includes('aloud') || q.includes('blind') || q.includes('vision') || q.includes('speak')) {
    return applyToolkitSkill('audio-landmark-guide', options)
  }
  if (q.includes('dyslexia') || q.includes('read') || q.includes('ruler') || q.includes('bionic') || q.includes('focus')) {
    return applyToolkitSkill('focus-reading-kit', options)
  }
  if (q.includes('rehears') || q.includes('joy') || q.includes('button') || q.includes('motor')) {
    return applyToolkitSkill('calm-rehearsal-pace', options)
  }
  return applyToolkitSkill('calm-commute-navigator', options)
}

// ── Adapter MCP Provider Registration (Live Control) ─────────────────────────
export const rehearsalAdapterProvider = (() => {
  try {
    const originPattern =
      typeof window !== 'undefined' ? `${window.location.origin}/*` : 'http://localhost/*'
    const wrapped = TOOLKIT_ADAPTER_CATALOG.map(meta => {
      const descriptor = defineDescriptor({
        appId: 'rehearse-journey',
        id: meta.id,
        name: meta.label.replace(/^[^\wA-Za-z]+\s*/, ''),
        version: '0.1.0',
        description: meta.hint,
        targets: [{ platforms: ['*'], urls: [originPattern] }],
        operations: ['query', 'check', 'apply', 'revert', 'targets'],
      })
      const toggleObj = {
        get enabled() {
          return state.adapters[meta.key]
        },
        enable() {
          setToolkitAdapter(meta.key, true, { origin: 'adapter-mcp' })
        },
        disable() {
          setToolkitAdapter(meta.key, false, { origin: 'adapter-mcp' })
        },
      }
      return fromToggleAdapter({
        descriptor,
        adapter: toggleObj,
        targets: () => ({
          candidates: [
            { target: { url: typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000' } },
          ],
          coverage: 'complete',
        }),
      })
    })

    return createAdapterProvider({
      application: {
        appId: 'rehearse-journey',
        name: 'Rehearse the Journey (Kioo Companion)',
        version: '1.1.0',
        supportedPlatforms: [{ environment: 'web-page' }],
        platform: detectBrowserPlatform(),
        surfaces: ['web'],
        visibility: 'user',
      },
      adapters: wrapped,
    })
  } catch {
    return null
  }
})()

// Optional auto-connect to a live Toolkit server when VITE_TOOLKIT_URL and VITE_TOOLKIT_TOKEN are set
if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>
  w.__rehearseToolkit = {
    toolkit: rehearsalToolkit,
    provider: rehearsalAdapterProvider,
    getState: getToolkitState,
    applyProfilePreset: applyToolkitProfilePreset,
    applySkill: applyToolkitSkill,
    setAdapter: setToolkitAdapter,
  }

  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env
  const url = metaEnv?.VITE_TOOLKIT_URL
  const token = metaEnv?.VITE_TOOLKIT_TOKEN
  if (url && token && rehearsalAdapterProvider) {
    try {
      connectToToolkit({ url, token, provider: rehearsalAdapterProvider })
    } catch {
      /* offline or unconfigured */
    }
  }
}
