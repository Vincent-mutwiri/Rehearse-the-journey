import { useState } from 'react'
import {
  Sparkles,
  ShieldCheck,
  BookOpen,
  Compass,
  Volume2,
  Eye,
  CheckCircle2,
  Circle,
  ArrowRight,
  Users,
  SlidersHorizontal,
  HeartHandshake,
  MessageSquarePlus,
} from 'lucide-react'
import {
  PERSONA_PROFILES,
  getPersonaProfile,
  setToolkitAdapter,
  setUiPersonalizationSetting,
  type PersonaProfileDef,
  type PersonaProfileId,
  type PersonaUiMode,
  type UiConversationAidMode,
  type UiLayoutMode,
  type UiMotionControlMode,
  type UiReadingAidMode,
} from '@/rehearsalToolkit'
import { useToolkitPreferences } from './ToolkitProfileAndSkillsPanel'
import { CALM_ME_OPEN_EVENT } from '@/components/CalmMe'

export function PersonaAvatar({
  personaId,
  size = 64,
}: {
  personaId: PersonaProfileId
  size?: number
}) {
  if (personaId === 'zawadi') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
        className="shrink-0 rounded-full border border-ink/15 shadow-xs"
      >
        <circle cx="40" cy="40" r="40" fill="#DCECE2" />
        {/* Calm sage halo */}
        <circle cx="40" cy="40" r="32" fill="#EEF6F0" />
        {/* Hair buns / braids */}
        <circle cx="23" cy="28" r="9" fill="#2A2633" />
        <circle cx="57" cy="28" r="9" fill="#2A2633" />
        <path d="M22 34C22 22 58 22 58 34V44H22V34Z" fill="#2A2633" />
        {/* Headband of noise-cancelling headphones */}
        <path
          d="M17 38C17 21 63 21 63 38"
          stroke="#4F7F65"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Face */}
        <ellipse cx="40" cy="41" rx="15" ry="16" fill="#8D5B3E" />
        {/* Headphone ear cups (sensory protection) */}
        <rect x="13" y="33" width="8" height="15" rx="4" fill="#4F7F65" stroke="#2C3A33" strokeWidth="1.5" />
        <rect x="59" y="33" width="8" height="15" rx="4" fill="#4F7F65" stroke="#2C3A33" strokeWidth="1.5" />
        {/* Calm gentle eyes */}
        <path d="M32 39Q34.5 37 37 39" stroke="#221D29" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M43 39Q45.5 37 48 39" stroke="#221D29" strokeWidth="2.2" strokeLinecap="round" />
        {/* Warm peaceful smile */}
        <path d="M35 47Q40 50.5 45 47" stroke="#221D29" strokeWidth="2.2" strokeLinecap="round" />
        {/* Soft sage sweater & scarf */}
        <path d="M18 76C20 60 60 60 62 76" fill="#5D8E73" />
        <rect x="29" y="55" width="22" height="8" rx="4" fill="#B8D8C4" />
      </svg>
    )
  }

  if (personaId === 'kamau') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
        className="shrink-0 rounded-full border border-ink/15 shadow-xs"
      >
        <circle cx="40" cy="40" r="40" fill="#F6E5C8" />
        <circle cx="40" cy="40" r="32" fill="#FDF6E9" />
        {/* Short cropped hair */}
        <path d="M24 34C24 20 56 20 56 34V38H24V34Z" fill="#231F2E" />
        {/* Face */}
        <ellipse cx="40" cy="42" rx="15.5" ry="16.5" fill="#7A4B31" />
        {/* Amber-tinted focus glasses */}
        <rect
          x="26"
          y="35"
          width="12"
          height="9"
          rx="3"
          fill="#F9D99A"
          fillOpacity="0.45"
          stroke="#231F2E"
          strokeWidth="2.2"
        />
        <rect
          x="42"
          y="35"
          width="12"
          height="9"
          rx="3"
          fill="#F9D99A"
          fillOpacity="0.45"
          stroke="#231F2E"
          strokeWidth="2.2"
        />
        <line x1="38" y1="39" x2="42" y2="39" stroke="#231F2E" strokeWidth="2.2" />
        <circle cx="32" cy="39.5" r="1.8" fill="#231F2E" />
        <circle cx="48" cy="39.5" r="1.8" fill="#231F2E" />
        {/* Confident smile */}
        <path d="M34.5 48.5Q40 52.5 45.5 48.5" stroke="#231F2E" strokeWidth="2.2" strokeLinecap="round" />
        {/* Warm amber jacket & collar */}
        <path d="M17 76C19 59 61 59 63 76" fill="#C97C2B" />
        <path d="M33 57L40 67L47 57" fill="#FDF8EC" />
      </svg>
    )
  }

  // Baraka (standard baseline)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className="shrink-0 rounded-full border border-ink/15 shadow-xs"
    >
      <circle cx="40" cy="40" r="40" fill="#E6DFF2" />
      <circle cx="40" cy="40" r="32" fill="#F5F0FA" />
      {/* Hair */}
      <path d="M24 33C24 19 56 19 56 33V38H24V33Z" fill="#262235" />
      {/* Face */}
      <ellipse cx="40" cy="42" rx="15" ry="16" fill="#845339" />
      {/* Eyes */}
      <circle cx="33.5" cy="39.5" r="2.1" fill="#262235" />
      <circle cx="46.5" cy="39.5" r="2.1" fill="#262235" />
      {/* Smile */}
      <path d="M34 47.5Q40 52 46 47.5" stroke="#262235" strokeWidth="2.2" strokeLinecap="round" />
      {/* Lavender shirt */}
      <path d="M18 76C20 60 60 60 62 76" fill="#8B7BBF" />
    </svg>
  )
}

export interface PersonaLoginScreenProps {
  activePersonaId: PersonaProfileId
  onSelectPersona: (persona: PersonaProfileDef) => void
}

export function PersonaLoginScreen({
  activePersonaId,
  onSelectPersona,
}: PersonaLoginScreenProps) {
  return (
    <main
      className="persona-login-shell mx-auto flex min-h-screen w-full max-w-[1140px] flex-col gap-8 px-5 py-8 sm:py-10"
      aria-labelledby="persona-login-heading"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/12 pb-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender/35 text-ink">
            <HeartHandshake className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <span className="text-xl font-bold tracking-tight">Kioo · Rehearse the Journey</span>
            <span className="block text-xs text-ink/70">
              AI for Accessibility Toolkit · Problem Statement 6 (Cognitive &amp; Psychosocial)
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-ink/15 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink">
            ✨ 1 Website · 3 Personalized UIs
          </span>
        </div>
      </header>

      <section className="space-y-3 text-left sm:text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-lavender/25 px-3.5 py-1 text-xs font-semibold text-ink">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Choose a Traveller Profile to Sign In
        </p>
        <h1
          id="persona-login-heading"
          className="text-3xl font-bold tracking-tight text-ink sm:text-4xl"
        >
          Who is rehearsing their Nairobi journey today?
        </h1>
        <p className="mx-auto max-w-[72ch] text-base leading-relaxed text-ink/80">
          Click on a person below to experience the website through their profile. When you select a
          person, the embedded <strong>AI for Accessibility Toolkit</strong> updates their{' '}
          <code>AbilityModel</code> and immediately transforms the interface’s theme, motion,
          reading scaffolding, and conversation tools.
        </p>
      </section>

      <section
        aria-label="Traveller profiles"
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {PERSONA_PROFILES.map((persona, idx) => {
          const isCurrent = activePersonaId === persona.id
          return (
            <article
              key={persona.id}
              data-persona-card={persona.id}
              style={{
                borderColor: persona.accentColor,
                backgroundColor: persona.surfaceTint,
              }}
              className="persona-login-card flex flex-col justify-between rounded-3xl border-2 p-6 shadow-xs transition-transform hover:-translate-y-0.5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <span
                    style={{ backgroundColor: `${persona.accentColor}28` }}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-ink"
                  >
                    Person {idx + 1} · {persona.conditionBadge}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-cream">
                      Selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <PersonaAvatar personaId={persona.id} size={68} />
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold tracking-tight text-ink">{persona.name}</h2>
                    <p className="text-xs font-semibold text-ink/70">{persona.ageAndCity}</p>
                    <p
                      style={{ color: '#2b253a' }}
                      className="mt-1 inline-block rounded-lg bg-white/80 px-2 py-0.5 text-xs font-bold"
                    >
                      {persona.role}
                    </p>
                  </div>
                </div>

                <blockquote className="rounded-2xl border border-ink/10 bg-white/85 p-3.5 text-sm leading-relaxed text-ink/90 italic">
                  “{persona.quote}”
                </blockquote>

                <p className="text-xs leading-relaxed text-ink/75">{persona.problemContext}</p>

                <div className="space-y-2 border-t border-ink/10 pt-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink uppercase">
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    What changes in {persona.shortName}’s UI ({persona.uiModeLabel}):
                  </h3>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-ink/90">
                    {persona.uiChanges.map(change => (
                      <li key={change} className="flex items-start gap-2">
                        <span className="mt-0.5 font-bold text-ink" aria-hidden="true">
                          •
                        </span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="block text-[11px] font-semibold text-ink/70">
                    Toolkit AbilityModel Adapters:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {persona.activeAdapterLabels.map(lbl => (
                      <span
                        key={lbl}
                        className="rounded-full border border-ink/15 bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => onSelectPersona(persona)}
                  aria-label={`Continue as ${persona.name} — ${persona.uiModeLabel}`}
                  style={{
                    backgroundColor: persona.accentColor,
                  }}
                  className="flex min-h-[50px] w-full cursor-pointer items-center justify-between rounded-2xl border border-ink/20 px-5 py-3 text-left text-sm font-bold text-ink shadow-xs transition-opacity hover:opacity-95"
                >
                  <span>
                    Continue as {persona.shortName} ({persona.uiModeLabel})
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </article>
          )
        })}
      </section>

      <section
        aria-label="Personalize UI through settings"
        className="rounded-3xl border-2 border-ink/15 bg-white/85 p-6 shadow-xs"
      >
        <UiPersonalizationSettingsStudio showLaunchButton />
      </section>

      <section
        aria-label="How personalization works across the three people"
        className="rounded-3xl border border-ink/12 bg-white/75 p-6"
      >
        <h2 className="text-base font-bold text-ink">
          How We Personalized the Website for Each Person (Problem Statement 6)
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-ink/75">
          Instead of forcing a one-size-fits-all layout, clicking a person loads their{' '}
          <code>AbilityModel</code> in the Toolkit Librarian and switches both DOM adapters and UI
          scaffolding:
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
          <div className="rounded-2xl border border-ink/10 bg-cream/70 p-3.5">
            <strong className="block text-ink">1. Baraka (Everyday Commuter)</strong>
            <span className="mt-1 block text-ink/80">
              Sees the baseline Soft-Mirror interface: animated 3D Joy &amp; Amani rigs, all 4
              practice levels, standard Geist typography, and full multi-panel route density.
            </span>
          </div>
          <div className="rounded-2xl border border-[#6b9e82]/40 bg-[#f1f6f3] p-3.5">
            <strong className="block text-ink">2. Zawadi (Sensory Overload &amp; Anxiety)</strong>
            <span className="mt-1 block text-ink/80">
              Gets a calm Sage Sanctuary theme, zero motion (still 3D mascots), frozen timers, a
              top Sensory Sanctuary Bar with 1-tap Decompress, Plainer Words, and Level 1 calm lock.
            </span>
          </div>
          <div className="rounded-2xl border border-[#d48b3b]/40 bg-[#fdf8ec] p-3.5">
            <strong className="block text-ink">
              3. Kamau (Dyslexia, ADHD &amp; Executive Function)
            </strong>
            <span className="mt-1 block text-ink/80">
              Gets a Warm Amber Paper theme with wider spacing, Bionic Reading word-anchors, a
              cursor Reading Ruler, a 3-step visual checklist, auto-opened floor maps, and 1-tap
              reply chips.
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}

export interface PersonaTopBarProps {
  activePersonaId: PersonaProfileId
  onSwitchPersona: (persona: PersonaProfileDef) => void
}

export function PersonaTopBar({
  activePersonaId,
  onSwitchPersona,
}: PersonaTopBarProps) {
  const persona = getPersonaProfile(activePersonaId)
  const personaIdx = PERSONA_PROFILES.findIndex(p => p.id === persona.id) + 1
  const toolkitSnap = useToolkitPreferences()
  const [showDetails, setShowDetails] = useState(false)
  const [showSettingsStudio, setShowSettingsStudio] = useState(false)

  const activeAdapterCount = Object.values(toolkitSnap.adapters).filter(Boolean).length

  return (
    <nav
      aria-label="Active traveller profile and personalized UI switcher"
      className="persona-top-bar mx-auto w-full max-w-[1140px] px-4 pt-3 sm:px-5"
    >
      <div
        style={{
          borderColor: persona.accentColor,
          backgroundColor: persona.surfaceTint,
        }}
        className="flex flex-col gap-3 rounded-2xl border-2 px-4 py-3 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PersonaAvatar personaId={persona.id} size={42} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-ink">
                  Person {personaIdx} · {persona.conditionBadge}
                </span>
                <span
                  style={{ backgroundColor: `${persona.accentColor}33` }}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-ink"
                >
                  {persona.name} ({persona.uiModeLabel})
                </span>
                <span className="rounded-full border border-ink/15 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-ink/80">
                  {activeAdapterCount === 0
                    ? 'Baseline (0 adapters)'
                    : `${activeAdapterCount} Toolkit adapters active`}
                </span>
              </div>
              <p className="text-xs text-ink/75">{persona.role} · {persona.ageAndCity}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Persona quick-switch buttons (Person 1/2/3) removed for now — keep the
                active-persona display + UI Settings + What changed? controls above.
                To restore: re-render the PERSONA_PROFILES.map(...) button group here. */}

            <button
              type="button"
              onClick={() => setShowSettingsStudio(v => !v)}
              aria-expanded={showSettingsStudio}
              className="min-h-[36px] cursor-pointer rounded-full border border-ink/25 bg-ink px-3.5 py-1 text-xs font-bold text-cream hover:opacity-90"
            >
              {showSettingsStudio ? '✕ Close UI Settings' : '⚙️ UI Settings'}
            </button>

            <button
              type="button"
              onClick={() => setShowDetails(v => !v)}
              aria-expanded={showDetails}
              className="min-h-[36px] cursor-pointer rounded-full border border-ink/20 bg-white/85 px-3 py-1 text-xs font-semibold text-ink hover:bg-white"
            >
              {showDetails ? 'Hide UI changes' : 'What changed?'}
            </button>
          </div>
        </div>

        {showSettingsStudio && (
          <div className="border-t border-ink/15 pt-3">
            <UiPersonalizationSettingsStudio compact />
          </div>
        )}

        {showDetails && (
          <div className="grid grid-cols-1 gap-3 border-t border-ink/12 pt-3 text-xs sm:grid-cols-2">
            <div>
              <strong className="block font-bold text-ink">
                Personalized UI Changes for {persona.name}:
              </strong>
              <ul className="mt-1 space-y-1 text-ink/85">
                {persona.uiChanges.map(item => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong className="block font-bold text-ink">
                Active Toolkit AbilityModel Adapters:
              </strong>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {persona.activeAdapterLabels.map(lbl => (
                  <span
                    key={lbl}
                    className="rounded-full border border-ink/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink/70">
                 quote: “{persona.quote}”
              </p>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export interface PersonaWorkspaceCalloutProps {
  activePersonaId: PersonaProfileId
  context: 'dashboard' | 'simulations' | 'rehearsal' | 'directions'
  onOpenStoryMap?: () => void
  onReadAloud?: () => void
}

export function PersonaWorkspaceCallout({
  activePersonaId,
  context,
  onOpenStoryMap,
  onReadAloud,
}: PersonaWorkspaceCalloutProps) {
  const toolkitSnap = useToolkitPreferences()
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({ 1: true })

  if (activePersonaId === 'zawadi') {
    return (
      <section
        aria-label="Zawadi's Sensory Sanctuary Controls"
        className="persona-sanctuary-banner rounded-2xl border-2 border-[#6b9e82] bg-[#e6f2ea] p-4 text-ink"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6b9e82]/30 px-3 py-0.5 text-xs font-bold text-ink">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Zawadi’s Sensory Sanctuary UI
              </span>
              <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-ink">
                🟢 Sensory Load: Low &amp; Steady
              </span>
              <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-ink">
                🐢 Motion &amp; Timers Frozen
              </span>
            </div>
            <p className="text-xs leading-relaxed text-ink/85">
              {context === 'rehearsal'
                ? 'Your microphone starts OFF. Joy speaks one short, predictable sentence at a time. Nothing moves forward unless you approve.'
                : context === 'directions'
                  ? 'Showing low-noise route guidance, quiet hours (10:00 AM – 12:00 PM), and simplified plain-English steps.'
                  : 'We simplified this screen for a calm, unhurried pace. All animations are still and Level 1 (Easy Start) is pre-selected for you.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(CALM_ME_OPEN_EVENT))}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-ink/25 bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-xs hover:bg-[#f1f6f3]"
            >
              🌿 Take a Breath (Decompress)
            </button>
            {onReadAloud && (
              <button
                type="button"
                onClick={onReadAloud}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-ink/20 bg-white/85 px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-white"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                {toolkitSnap.adapters.readAloud ? 'Stop Reading' : 'Read Gently Aloud'}
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (activePersonaId === 'kamau') {
    const checklistItems = [
      { id: 1, label: '1. Preview Visual Floor-Plan Map' },
      { id: 2, label: '2. Practise 1 Short Question with Joy' },
      { id: 3, label: '3. Review & Save Pocket Checklist' },
    ]
    return (
      <section
        aria-label="Kamau's Executive Function and Reading Focus Bar"
        className="persona-focus-banner rounded-2xl border-2 border-[#d48b3b] bg-[#faefd8] p-4 text-ink"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d48b3b]/30 px-3 py-0.5 text-xs font-bold text-ink">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Kamau’s Structured Focus &amp; Dyslexia UI
              </span>
              <span className="ai4a11y-bionic rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-ink">
                🅱️ Bionic Word-Anchors: {toolkitSnap.adapters.bionicReading ? 'ON' : 'OFF'}
              </span>
              <span className="ai4a11y-bionic rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-ink">
                📏 Reading Ruler: {toolkitSnap.adapters.readingRuler ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-ink/90">
              Wide letter spacing, bold word prefixes, and a cursor reading guide are active. Check
              off each step below to keep your place:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setToolkitAdapter('readingRuler', !toolkitSnap.adapters.readingRuler, {
                  origin: 'focus-bar',
                })
              }
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-ink/25 bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-amber-50"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {toolkitSnap.adapters.readingRuler ? 'Hide Reading Ruler' : 'Show Reading Ruler'}
            </button>
            {onOpenStoryMap && (
              <button
                type="button"
                onClick={onOpenStoryMap}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-ink/25 bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-amber-50"
              >
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                Show Visual Map
              </button>
            )}
            {onReadAloud && (
              <button
                type="button"
                onClick={onReadAloud}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-ink/25 bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-amber-50"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                {toolkitSnap.adapters.readAloud ? 'Stop Audio' : 'Read Step Aloud'}
              </button>
            )}
          </div>
        </div>

        <div
          className="mt-3 grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3"
          role="group"
          aria-label="Kamau's 3-step visual journey checklist"
        >
          {checklistItems.map(item => {
            const done = Boolean(checkedSteps[item.id])
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={done}
                onClick={() => setCheckedSteps(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                className={
                  'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-xs font-bold transition-colors ' +
                  (done
                    ? 'border-[#8a581c] bg-white text-ink'
                    : 'border-ink/15 bg-white/70 text-ink/80 hover:bg-white')
                }
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#8a581c]" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-ink/40" aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  // Baraka (standard baseline) — compact note showing baseline state
  return (
    <section
      aria-label="Baraka's Standard Baseline UI indicator"
      className="rounded-2xl border border-ink/12 bg-white/65 px-4 py-2.5 text-xs text-ink/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Sparkles className="h-3.5 w-3.5 text-lavender" aria-hidden="true" />
          <strong>Baraka’s Standard Baseline UI:</strong> Default Soft-Mirror theme, live 3D mascot
          animations, and full information density.
        </span>
        <span className="text-[11px] text-ink/65">
          Use the top bar above to switch to <strong>Zawadi</strong> or <strong>Kamau</strong> and
          compare the personalized UIs.
        </span>
      </div>
    </section>
  )
}

export function PersonaQuickReplyChips({
  activePersonaId,
  onSelectPhrase,
}: {
  activePersonaId: PersonaProfileId
  onSelectPhrase: (phrase: string) => void
}) {
  const toolkitSnap = useToolkitPreferences()
  const aidMode = toolkitSnap.uiSettings.conversationAid
  if (activePersonaId === 'baraka' && aidMode === 'standard') return null

  const isCalmStarters = activePersonaId === 'zawadi' || aidMode === 'calm-starters'
  const phrases = isCalmStarters
    ? [
        'Hello Joy, I am here for my pretend appointment.',
        'Could you repeat that slowly, one step at a time?',
        'I have my pretend clinic card ready.',
        'I need a quiet moment to check where Waiting Area B is.',
      ]
    : [
        'Hello Joy, I am here for my pretend appointment.',
        'Yes, I brought my pretend clinic card.',
        'Please tell me the 2 main landmarks to Waiting Area B.',
        'Can you break that instruction into shorter steps?',
      ]

  return (
    <div
      className={
        'rounded-2xl border-2 p-3.5 ' +
        (isCalmStarters
          ? 'border-[#6b9e82]/60 bg-[#e6f2ea]/85'
          : 'border-[#d48b3b]/70 bg-[#faefd8]/90')
      }
      role="group"
      aria-label="Quick reply starter phrases"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink">
        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
        {isCalmStarters
          ? 'Calm Starter Phrases (Tap to fill the message box without pressure):'
          : '1-Tap Quick-Reply Bank (No need to type or spell from scratch):'}
      </p>
      <div className="flex flex-wrap gap-2">
        {phrases.map(phrase => (
          <button
            key={phrase}
            type="button"
            onClick={() => onSelectPhrase(phrase)}
            className="min-h-[40px] cursor-pointer rounded-xl border border-ink/20 bg-white px-3 py-1.5 text-left text-xs font-semibold text-ink shadow-2xs transition-colors hover:bg-cream"
          >
            “{phrase}”
          </button>
        ))}
      </div>
    </div>
  )
}

export function UiPersonalizationSettingsStudio({
  compact = false,
  showLaunchButton = false,
}: {
  compact?: boolean
  showLaunchButton?: boolean
}) {
  const toolkitSnap = useToolkitPreferences()
  const { uiSettings, activePersonaId } = toolkitSnap
  const currentPersona = getPersonaProfile(activePersonaId)

  const themeOptions: Array<{ id: PersonaUiMode; label: string; desc: string; swatch: string }> = [
    {
      id: 'standard',
      label: 'Soft-Mirror (Standard)',
      desc: 'Cream & lavender baseline (#FBF7F2)',
      swatch: '#a89bd4',
    },
    {
      id: 'sensory-calm',
      label: 'Sage Sanctuary (Sensory-Calm)',
      desc: 'Low-glare eucalyptus & calm borders (#EEF5F1)',
      swatch: '#6b9e82',
    },
    {
      id: 'reading-focus',
      label: 'Warm Amber Paper (Focus/Dyslexia)',
      desc: 'Dyslexia paper tint & left accent stripe (#FDF8EC)',
      swatch: '#d48b3b',
    },
  ]

  const layoutOptions: Array<{ id: UiLayoutMode; label: string; desc: string }> = [
    {
      id: 'standard',
      label: 'Standard 2-Card Workspace',
      desc: 'Full density with Simulations & Directions',
    },
    {
      id: 'calm-sanctuary',
      label: 'Calm Sanctuary Layout',
      desc: 'De-cluttered + Sensory Load Meter + 1-Tap Decompress',
    },
    {
      id: 'structured-steps',
      label: '3-Step Numbered Checklist Layout',
      desc: 'Visual Story Map first + 3-step executive checklist',
    },
  ]

  const readingOptions: Array<{ id: UiReadingAidMode; label: string; desc: string }> = [
    { id: 'default', label: 'Standard Text', desc: 'Default Geist typography' },
    { id: 'plain-words', label: 'Plainer Words', desc: 'Simplified plain-English instructions' },
    {
      id: 'bionic-focus',
      label: 'Bionic Word-Anchors',
      desc: 'Bold word prefixes + 44px+ buttons',
    },
    {
      id: 'bionic-with-ruler',
      label: 'Bionic + Reading Ruler',
      desc: 'Bold prefixes + cursor highlight band',
    },
  ]

  const motionOptions: Array<{ id: UiMotionControlMode; label: string; desc: string }> = [
    { id: 'animated', label: 'Live 3D Motion', desc: 'Animated Joy & Amani rigs' },
    { id: 'still', label: 'Freeze Motion & Timers', desc: 'Still 3D poses + Stop Auto-Advance' },
  ]

  const conversationOptions: Array<{ id: UiConversationAidMode; label: string; desc: string }> = [
    { id: 'standard', label: 'Standard Input', desc: 'Type or speak freely' },
    {
      id: 'calm-starters',
      label: 'Calm Starter Prompts',
      desc: 'Reassuring slow-pace starter chips',
    },
    {
      id: 'quick-reply-chips',
      label: '1-Tap Quick-Reply Bank',
      desc: 'Tap-to-fill replies for low typing load',
    },
  ]

  return (
    <div className="space-y-4 text-left" role="region" aria-label="UI Personalization Settings Studio">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={compact ? 'text-sm font-bold text-ink' : 'text-base font-bold text-ink'}>
            ⚙️ UI Personalization Settings — Choose Settings to Switch the UI
          </h3>
          <p className="text-xs text-ink/75">
            Instead of only picking a person, adjust any setting below to reshape the website’s
            color theme, workspace layout, reading aids, 3D motion, and conversation scaffolding.
          </p>
        </div>
        <span className="rounded-full border border-ink/20 bg-white px-3 py-1 text-xs font-bold text-ink">
          Active UI: {currentPersona.uiModeLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Visual Theme */}
        <fieldset className="rounded-2xl border border-ink/15 bg-white/90 p-3">
          <legend className="px-1 text-xs font-bold text-ink">1. Visual Theme &amp; Surface</legend>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {themeOptions.map(opt => {
              const active = uiSettings.theme === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setUiPersonalizationSetting({ theme: opt.id })}
                  className={
                    'flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left text-xs transition-colors ' +
                    (active
                      ? 'border-ink bg-lavender/25 font-bold text-ink'
                      : 'border-ink/15 bg-white text-ink/85 hover:bg-cream')
                  }
                >
                  <span
                    style={{ backgroundColor: opt.swatch }}
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/30"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block font-bold">{opt.label}</span>
                    <span className="block text-[11px] font-normal opacity-75">{opt.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* 2. Workspace Layout */}
        <fieldset className="rounded-2xl border border-ink/15 bg-white/90 p-3">
          <legend className="px-1 text-xs font-bold text-ink">
            2. Workspace Layout &amp; Density
          </legend>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {layoutOptions.map(opt => {
              const active = uiSettings.layoutDensity === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setUiPersonalizationSetting({ layoutDensity: opt.id })}
                  className={
                    'flex min-h-[42px] cursor-pointer flex-col justify-center rounded-xl border px-3 py-1.5 text-left text-xs transition-colors ' +
                    (active
                      ? 'border-ink bg-lavender/25 font-bold text-ink'
                      : 'border-ink/15 bg-white text-ink/85 hover:bg-cream')
                  }
                >
                  <span className="font-bold">{opt.label}</span>
                  <span className="text-[11px] font-normal opacity-75">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* 3. Reading & Typography */}
        <fieldset className="rounded-2xl border border-ink/15 bg-white/90 p-3">
          <legend className="px-1 text-xs font-bold text-ink">
            3. Reading &amp; Typography Aid
          </legend>
          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-1">
            {readingOptions.map(opt => {
              const active = uiSettings.readingAid === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setUiPersonalizationSetting({ readingAid: opt.id })}
                  className={
                    'flex min-h-[38px] cursor-pointer flex-col justify-center rounded-xl border px-3 py-1 text-left text-xs transition-colors ' +
                    (active
                      ? 'border-ink bg-lavender/25 font-bold text-ink'
                      : 'border-ink/15 bg-white text-ink/85 hover:bg-cream')
                  }
                >
                  <span className="font-bold">{opt.label}</span>
                  <span className="text-[11px] font-normal opacity-75">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {/* 4. Motion & Pacing */}
        <fieldset className="rounded-2xl border border-ink/15 bg-white/90 p-3">
          <legend className="px-1 text-xs font-bold text-ink">4. 3D Motion &amp; Timers</legend>
          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {motionOptions.map(opt => {
              const active = uiSettings.motionControl === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setUiPersonalizationSetting({ motionControl: opt.id })}
                  className={
                    'flex min-h-[42px] cursor-pointer flex-col justify-center rounded-xl border px-3 py-1.5 text-left text-xs transition-colors ' +
                    (active
                      ? 'border-ink bg-lavender/25 font-bold text-ink'
                      : 'border-ink/15 bg-white text-ink/85 hover:bg-cream')
                  }
                >
                  <span className="font-bold">{opt.label}</span>
                  <span className="text-[11px] font-normal opacity-75">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* 5. Conversation Reply Scaffolding */}
        <fieldset className="rounded-2xl border border-ink/15 bg-white/90 p-3">
          <legend className="px-1 text-xs font-bold text-ink">
            5. Conversation Reply Scaffolding
          </legend>
          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            {conversationOptions.map(opt => {
              const active = uiSettings.conversationAid === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setUiPersonalizationSetting({ conversationAid: opt.id })}
                  className={
                    'flex min-h-[42px] cursor-pointer flex-col justify-center rounded-xl border px-2.5 py-1.5 text-left text-xs transition-colors ' +
                    (active
                      ? 'border-ink bg-lavender/25 font-bold text-ink'
                      : 'border-ink/15 bg-white text-ink/85 hover:bg-cream')
                  }
                >
                  <span className="font-bold">{opt.label}</span>
                  <span className="text-[10px] font-normal opacity-75">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>

      {showLaunchButton && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setUiPersonalizationSetting({ ...uiSettings })}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-ink/25 bg-ink px-5 py-2 text-xs font-bold text-cream hover:opacity-90"
          >
            <span>Open Workspace with These UI Settings</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
