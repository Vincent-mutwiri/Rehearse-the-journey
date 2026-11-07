import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  BUILTIN_REHEARSAL_SKILLS,
  TOOLKIT_ADAPTER_CATALOG,
  TOOLKIT_PROFILE_PRESETS,
  applyToolkitProfilePreset,
  applyToolkitSkill,
  findAndApplySkillForNeed,
  getToolkitState,
  setToolkitAdapter,
  subscribeToolkitState,
  type ToolkitAdapterKey,
  type ToolkitRuntimeState,
} from '@/rehearsalToolkit'
import { UiPersonalizationSettingsStudio } from './PersonaLogin'

export function useToolkitPreferences(): ToolkitRuntimeState {
  const [snap, setSnap] = useState<ToolkitRuntimeState>(() => getToolkitState())

  useEffect(() => {
    return subscribeToolkitState(() => {
      setSnap(getToolkitState())
    })
  }, [])

  return snap
}

export interface ToolkitProfileAndSkillsPanelProps {
  context: 'simulations' | 'directions'
  aloudSpeaking?: boolean
  buildNarration: () => string
  defaultExpandToolkit?: boolean
}

export default function ToolkitProfileAndSkillsPanel({
  context,
  aloudSpeaking = false,
  buildNarration,
  defaultExpandToolkit = false,
}: ToolkitProfileAndSkillsPanelProps) {
  const toolkitState = useToolkitPreferences()
  const [needInput, setNeedInput] = useState('')
  const { adapters, activeProfileId, activeSkillName, lastObservation, abilitySummary } =
    toolkitState

  const coreAdapters = TOOLKIT_ADAPTER_CATALOG.filter(a => a.core)
  const extraAdapters = TOOLKIT_ADAPTER_CATALOG.filter(a => !a.core)

  const handleToggle = (key: ToolkitAdapterKey) => {
    const next = !adapters[key]
    setToolkitAdapter(key, next, {
      narrationText: key === 'readAloud' && next ? buildNarration() : undefined,
      origin: context,
    })
  }

  return (
    <div className="space-y-4">
      <fieldset className="min-w-0">
        <legend className="px-1.5 font-semibold">Accessibility preferences</legend>
        <div className="mt-3 grid gap-3">
          {coreAdapters.map(a => {
            const on = adapters[a.key]
            const label =
              a.key === 'readAloud'
                ? on
                  ? '⏹ Stop reading aloud'
                  : '🔊 Read page aloud'
                : a.key === 'plainWords'
                  ? on
                    ? 'Aa Plainer words — on'
                    : 'Aa Plainer words'
                  : a.label
            const hint =
              a.key === 'readAloud' && aloudSpeaking
                ? 'Reading this page’s text now…'
                : a.hint
            return (
              <button
                key={a.key}
                type="button"
                aria-pressed={on}
                onClick={() => handleToggle(a.key)}
                className={
                  'min-h-[56px] rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-colors ' +
                  (on
                    ? 'border-lavender bg-lavender/25'
                    : 'border-ink/15 bg-white/60 hover:border-lavender/60')
                }
              >
                {label}
                <span className="mt-1 block text-xs font-normal opacity-75">{hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <details className="rehearsal-disclosure" open={defaultExpandToolkit || undefined}>
        <summary>Toolkit Profile, Skills &amp; Visual/Sensory Adapters</summary>
        <div className="space-y-5 pt-4 text-sm">
          {/* 0. UI Personalization Settings Studio */}
          <div className="border-b border-ink/10 pb-4">
            <UiPersonalizationSettingsStudio compact />
          </div>

          {/* 1. AbilityModel Profile Presets */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h3 className="font-semibold">1. Toolkit Profile (AbilityModel)</h3>
              {abilitySummary.supportAreas.length > 0 && (
                <span className="rounded-full bg-sage/30 px-2.5 py-0.5 text-[11px] font-semibold">
                  Active areas: {abilitySummary.supportAreas.join(', ')}
                </span>
              )}
            </div>
            <p className="text-xs opacity-75">
              Selecting a profile writes to the embedded Librarian datastore (
              <code>librarian.replaceProfile</code>) and maps your <code>AbilityModel</code> needs to
              both Directions and Practice Arena.
            </p>
            <div className="grid gap-2">
              {TOOLKIT_PROFILE_PRESETS.map(preset => {
                const isSelected = activeProfileId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      void applyToolkitProfilePreset(preset.id, {
                        narrationText: buildNarration(),
                      })
                    }
                    className={
                      'rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors ' +
                      (isSelected
                        ? 'border-lavender bg-lavender/25 font-semibold'
                        : 'border-ink/15 bg-white/75 hover:border-lavender/50')
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{preset.name}</span>
                      <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold">
                        {preset.badge}
                      </span>
                    </div>
                    <span className="mt-1 block font-normal opacity-80">{preset.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Toolkit Skills (SKILL.md Playbooks) */}
          <div className="space-y-2 border-t border-ink/10 pt-4">
            <h3 className="font-semibold">2. Toolkit Skills (Playbook Recipes)</h3>
            <p className="text-xs opacity-75">
              Skills compose multiple adapters into a single recipe resolved via{' '}
              <code>librarian.resolveSkill(skill)</code>.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={needInput}
                onChange={e => setNeedInput(e.target.value)}
                placeholder="Describe your need (e.g. 'crowded matatu' or 'read steps aloud')"
                aria-label="Describe your accessibility need to match a skill"
                className="min-h-[38px] min-w-0 flex-1 rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  if (!needInput.trim()) return
                  void findAndApplySkillForNeed(needInput, {
                    narrationText: buildNarration(),
                  })
                }}
              >
                Match Skill
              </Button>
            </div>
            <div className="grid gap-2 pt-1">
              {BUILTIN_REHEARSAL_SKILLS.map(sk => {
                const isCurrent = activeSkillName === sk.name
                return (
                  <button
                    key={sk.name}
                    type="button"
                    aria-pressed={isCurrent}
                    onClick={() =>
                      applyToolkitSkill(sk.name, { narrationText: buildNarration() })
                    }
                    className={
                      'rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors ' +
                      (isCurrent
                        ? 'border-sage bg-sage/25 font-semibold'
                        : 'border-ink/15 bg-white/75 hover:border-lavender/50')
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">⚡ {sk.title}</span>
                      <span className="rounded-full bg-mist px-2 py-0.5 text-[10px]">
                        {sk.recipe.adapters.length} adapters
                      </span>
                    </div>
                    <span className="mt-1 block font-normal opacity-80">{sk.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Visual, Motor, Reading & Sensory-Calm Adapters */}
          <div className="space-y-2 border-t border-ink/10 pt-4">
            <h3 className="font-semibold">3. Visual, Motor, Reading &amp; Sensory Adapters</h3>
            <div className="grid gap-2.5">
              {extraAdapters.map(a => {
                const on = adapters[a.key]
                return (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => handleToggle(a.key)}
                    className={
                      'min-h-[50px] rounded-xl border px-3.5 py-2 text-left text-xs font-semibold transition-colors ' +
                      (on
                        ? 'border-lavender bg-lavender/25'
                        : 'border-ink/15 bg-white/60 hover:border-lavender/60')
                    }
                  >
                    {on && a.activeLabel ? a.activeLabel : a.label}
                    <span className="mt-0.5 block font-normal opacity-75">{a.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {lastObservation && (
            <div className="rounded-xl border border-ink/10 bg-mist/40 px-3 py-2 text-[11px] opacity-85">
              <strong>Librarian log:</strong> {lastObservation}
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
