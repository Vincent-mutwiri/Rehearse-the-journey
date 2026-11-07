import { useState } from 'react'
import { Activity, BookOpen, Camera, Layers, MapPin, Users, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { JoyPersona } from '@/components/JoyMascot'
import {
  PROVIDER_STACK_OPTIONS,
  SIGN_CARDS,
  buildLearnStepsForGoal,
  type FlowStepDef,
  type LearnStepDraft,
  type ProviderStackOption,
  type RehearsalMode,
  type ScenarioId,
} from '@/controller/v11ScenariosAndModes'

export interface CompanionModesPanelProps {
  mode: RehearsalMode
  onSelectMode: (mode: RehearsalMode) => void
  scenarioId: ScenarioId
  chaosLevel: 1 | 2 | 3 | 4
  currentStepIndex: number
  currentSteps: FlowStepDef[]
  currentStepDef: FlowStepDef | undefined
  plainWords: boolean
  savedChecklist: string[] | null
  audioPref: boolean
  onToggleAudioPref: () => void
  cameraConsent: boolean
  onRequestCameraConsent: () => void
  onRevokeCameraConsent: () => void
  onProposeNext: () => void
  onProposeBack: () => void
  onProposeSaveChecklist: () => void
  onOpenStory?: () => void
  onApproveLearnPlan: (titles: string[]) => void
  // Dev-only diagnostics & simulations (hidden unless ?dev=1 or VITE_DEV_DIAGNOSTICS=1)
  isDevMode: boolean
  activePersona: JoyPersona
  parallelOverlap: boolean
  onTriggerDevParallelOverlap: () => void
  activeProviderStack: ProviderStackOption
  providerStackId: string
  onSimulateProviderFallback: () => void
  providerNotice: string
  whiskerTraces: string[]
}

export default function CompanionModesPanel({
  mode,
  onSelectMode,
  scenarioId,
  chaosLevel,
  currentStepIndex,
  currentSteps,
  currentStepDef,
  plainWords,
  savedChecklist,
  audioPref,
  onToggleAudioPref,
  cameraConsent,
  onRequestCameraConsent,
  onRevokeCameraConsent,
  onProposeNext,
  onProposeBack,
  onProposeSaveChecklist,
  onOpenStory,
  onApproveLearnPlan,
  isDevMode,
  activePersona,
  parallelOverlap,
  onTriggerDevParallelOverlap,
  activeProviderStack,
  onSimulateProviderFallback,
  providerNotice,
  whiskerTraces,
}: CompanionModesPanelProps) {
  const [learnGoal, setLearnGoal] = useState('prepare for my first hospital visit')
  const [learnSteps, setLearnSteps] = useState<LearnStepDraft[]>(() =>
    buildLearnStepsForGoal('prepare for my first hospital visit'),
  )
  const [exploreQuery, setExploreQuery] = useState('Where is the Hospital Road bus stage?')
  const [exploreLang, setExploreLang] = useState<'en' | 'sw'>('en')
  const [routeRequested, setRouteRequested] = useState(false)
  const [selectedSignId, setSelectedSignId] = useState<string>('outpatient_b')
  const [devFrameOverlay, setDevFrameOverlay] = useState(false)
  const [whiskerOpen, setWhiskerOpen] = useState(false)

  return (
    <section
      aria-label="Rehearsal journey and companion modes"
      className="pt-4 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {currentStepDef?.title ?? 'Rehearsal Step'}
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sage/30 px-3 py-0.5 text-xs font-semibold">
            Step {currentStepIndex + 1} of {currentSteps.length}
          </span>
          <button
            type="button"
            aria-pressed={!audioPref}
            onClick={onToggleAudioPref}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-ink/15 bg-white px-3 py-1 text-xs font-medium"
          >
            {audioPref ? (
              <>
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                Voice output: On
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                Voice output: Off (Text-only)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Participant Mode Switcher (Practise / Learn / Explore / Live help) */}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Companion modes">
        {(
          [
            { id: 'practise', label: 'Practise', icon: Layers },
            { id: 'learn', label: 'Learn (Step Planner)', icon: BookOpen },
            { id: 'explore', label: 'Explore (Maps & Routes)', icon: MapPin },
            { id: 'live-help', label: 'Live help (Sign Reader)', icon: Camera },
          ] as const
        ).map(m => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => onSelectMode(m.id)}
            className={
              'inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ' +
              (mode === m.id
                ? 'border-lavender bg-lavender/30'
                : 'border-ink/15 bg-white/70 hover:border-lavender/50')
            }
          >
            <m.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Practise Mode: participant step navigation & checklist approval */}
      {mode === 'practise' && (
        <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
          <p className="text-xs leading-relaxed opacity-85">
            {plainWords ? currentStepDef?.simplifiedDescription : currentStepDef?.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={onProposeNext}
            >
              Next Step (Approve/Deny)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={onProposeBack}
            >
              Previous Step
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={onProposeSaveChecklist}
            >
              Save Rehearsal Checklist
            </Button>
            {onOpenStory && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={onOpenStory}
              >
                Open Interactive Story &amp; Map
              </Button>
            )}
          </div>
          {savedChecklist && (
            <p className="rounded-xl bg-sage/20 px-3 py-2 text-xs">
              <strong>Saved checklist ({savedChecklist.length} items):</strong>{' '}
              {savedChecklist.join(' · ')}
            </p>
          )}
        </div>
      )}

      {/* Learn Mode: Goal -> RehearsalSteps with editable distress ratings */}
      {mode === 'learn' && (
        <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
          <label htmlFor="learn-goal-input" className="block text-xs font-semibold">
            Learn Mode — Turn a goal into an approved rehearsal plan (no voice required):
          </label>
          <div className="flex gap-2">
            <input
              id="learn-goal-input"
              type="text"
              value={learnGoal}
              onChange={e => setLearnGoal(e.target.value)}
              className="min-h-[40px] flex-1 rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setLearnSteps(buildLearnStepsForGoal(learnGoal))}
            >
              Build Steps
            </Button>
          </div>
          <ul className="space-y-2">
            {learnSteps.map((ls, idx) => (
              <li key={ls.id} className="rounded-xl border border-ink/10 bg-mist/30 p-3 text-xs">
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <span>{ls.title}</span>
                  <label className="flex items-center gap-1 font-normal">
                    <span>Distress (0–10):</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={ls.distressRating}
                      aria-label={`Distress rating for ${ls.title}`}
                      onChange={e => {
                        const v = Math.max(0, Math.min(10, Number(e.target.value) || 0))
                        setLearnSteps(prev =>
                          prev.map((item, i) => (i === idx ? { ...item, distressRating: v } : item)),
                        )
                      }}
                      className="w-14 rounded border border-ink/20 bg-white px-1.5 py-0.5 text-center"
                    />
                  </label>
                </div>
                <p className="mt-1 opacity-85">
                  {plainWords ? ls.plainDescription : ls.description}
                </p>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            className="rounded-full text-xs"
            onClick={() => onApproveLearnPlan(learnSteps.map(s => s.title))}
          >
            Approve Plan & Load in Practise Mode
          </Button>
        </div>
      )}

      {/* Explore Mode: Maps grounding + Candidate Routes + Kiswahili translation label */}
      {mode === 'explore' && (
        <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold">
              Explore Mode — Grounded Nairobi Location Q&A & Candidate Routes
            </span>
            <button
              type="button"
              onClick={() => setExploreLang(l => (l === 'en' ? 'sw' : 'en'))}
              className="min-h-[32px] rounded-full border border-ink/15 bg-white px-3 py-1 text-xs font-medium"
            >
              Language: {exploreLang === 'en' ? 'English' : 'Kiswahili (labelled translation)'}
            </button>
          </div>
          <input
            type="text"
            aria-label="Ask a location question"
            value={exploreQuery}
            onChange={e => setExploreQuery(e.target.value)}
            className="min-h-[40px] w-full rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs"
          />
          {(() => {
            const q = exploreQuery.toLowerCase()
            const isUnknown = ['step-free', 'wheelchair', 'queue', 'fee', 'procedure', 'ramp'].some(
              k => q.includes(k),
            )
            return (
              <div className="space-y-1.5 rounded-xl border border-ink/10 bg-mist/30 p-3 text-xs">
                <p>
                  <strong>Retrieved Map Fact:</strong>{' '}
                  {isUnknown
                    ? 'Unknown from verified public map sources.'
                    : 'Kenyatta National Hospital Campus Bus Stage is on Hospital Road, Upper Hill, Nairobi (-1.3008, 36.8070), served by public matatu routes 7C and 46.'}
                </p>
                <p>
                  <strong>Generated Explanation:</strong>{' '}
                  {isUnknown
                    ? 'Public map data does not verify step-free entrances, live queue lengths, or internal hospital procedures. Please confirm directly with facility reception.'
                    : 'Visitors alighting at Hospital Road stage follow the signed pedestrian walkway. Fictional rehearsal here does not represent real hospital procedures.'}
                </p>
                {exploreLang === 'sw' && (
                  <p className="rounded-lg bg-peach/25 p-2">
                    <strong>Generated Kiswahili Translation (from English-grounded source):</strong>{' '}
                    {isUnknown
                      ? 'Haijulikani kwenye vyanzo vya ramani: tafadhali thibitisha lango au foleni moja kwa moja na mapokezi.'
                      : 'Kituo cha basi cha Hospital Road kiko Upper Hill, Nairobi (njia 7C na 46).'}
                  </p>
                )}
                <p className="opacity-75">
                  Sources:{' '}
                  <a
                    href="https://www.openstreetmap.org/#map=16/-1.3008/36.8070"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    OpenStreetMap Nairobi Upper Hill
                  </a>{' '}
                  ·{' '}
                  <a
                    href="https://www.openstreetmap.org/relation/3492650"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Digital Matatus Route 46
                  </a>
                </p>
              </div>
            )
          })()}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setRouteRequested(r => !r)}
            >
              {routeRequested ? 'Hide Candidate Route' : 'Request Candidate Route (CBD → Upper Hill)'}
            </Button>
          </div>
          {routeRequested && (
            <div className="rounded-xl border border-peach bg-peach/15 p-3 text-xs">
              <strong>Candidate path — confirm with your co-designer (3.4 km, ~18 min):</strong>
              <ol className="mt-1 list-inside list-decimal space-y-0.5">
                <li>Board Route 7C or 46 at Kencom Stage, CBD.</li>
                <li>Alight at Hospital Road Stage, Upper Hill.</li>
                <li>Confirm roadside signage with your co-designer (never advances rehearsal).</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Live Help Mode: Honest description of sample sign fixtures + approval-gated consent */}
      {mode === 'live-help' && (
        <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
          <div
            role="note"
            className="rounded-xl border border-peach bg-peach/20 p-3 text-xs font-medium"
          >
            <strong>Safety boundary:</strong> Explanation only; confirm with staff or signage.
            Never used for obstacle detection, location truth, or navigation advice.{' '}
            <span className="opacity-85">
              (Uses sample hospital sign fixtures for rehearsal; no live camera video is transmitted.)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!cameraConsent ? (
              <Button size="sm" className="rounded-full text-xs" onClick={onRequestCameraConsent}>
                <Camera className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Request Sign-Reader Consent (Approve/Deny)
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={onRevokeCameraConsent}
              >
                Turn Sign-Reader Consent Off (Voice & Typed Continue)
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {SIGN_CARDS.map(sc => (
              <button
                key={sc.id}
                type="button"
                aria-pressed={selectedSignId === sc.id}
                onClick={() => setSelectedSignId(sc.id)}
                className={
                  'min-h-[34px] rounded-full border px-3 py-1 text-xs font-medium ' +
                  (selectedSignId === sc.id
                    ? 'border-lavender bg-lavender/25'
                    : 'border-ink/15 bg-white')
                }
              >
                {sc.title}
              </button>
            ))}
          </div>
          {(() => {
            const card = SIGN_CARDS.find(c => c.id === selectedSignId) ?? SIGN_CARDS[0]
            return (
              <div className="space-y-1.5 rounded-xl border border-ink/10 bg-mist/30 p-3 text-xs">
                <p className="opacity-75">
                  <strong>Sample sign fixture text:</strong> {card.signText}
                </p>
                <p>
                  <strong>
                    Joy’s Sign Explanation ({plainWords ? 'Plainer words' : 'Standard'}):
                  </strong>{' '}
                  {plainWords ? card.plainExplanation : card.standardExplanation}
                </p>
              </div>
            )
          })()}
        </div>
      )}

      {providerNotice && (
        <p role="status" className="mt-3 rounded-xl bg-peach/25 px-3 py-1.5 text-xs">
          ⚡ {providerNotice}
        </p>
      )}

      {/* Developer Diagnostics & Simulations — ONLY rendered when ?dev=1 or VITE_DEV_DIAGNOSTICS=1 */}
      {isDevMode && (
        <div
          aria-label="Developer diagnostics"
          className="mt-4 space-y-2 border-t border-dashed border-ink/20 pt-3 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong>[Dev] Provider Stack:</strong> {activeProviderStack.label}{' '}
              <span className="opacity-75">({activeProviderStack.reason})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {chaosLevel === 4 && (
                <button
                  type="button"
                  onClick={onTriggerDevParallelOverlap}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-ink/15 bg-white px-3 py-1 font-medium"
                >
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {parallelOverlap ? 'Resolve Two-Voice Overlap' : 'Simulate L4 Parallel Overlap'}
                </button>
              )}
              <button
                type="button"
                onClick={onSimulateProviderFallback}
                className="min-h-[32px] rounded-full border border-ink/15 bg-white px-3 py-1 font-medium"
              >
                Simulate Provider Fallback
              </button>
              <button
                type="button"
                aria-pressed={devFrameOverlay}
                onClick={() => setDevFrameOverlay(d => !d)}
                className="min-h-[32px] rounded-full border border-ink/15 bg-white px-3 py-1 font-medium"
              >
                {devFrameOverlay ? 'Hide Fixture Inspector' : 'Inspect Sign Fixture'}
              </button>
              <button
                type="button"
                aria-pressed={whiskerOpen}
                onClick={() => setWhiskerOpen(w => !w)}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-ink/15 bg-white px-3 py-1 font-medium"
              >
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                Whisker / Tail
              </button>
            </div>
          </div>
          {devFrameOverlay && (
            <div className="rounded-lg border border-dashed border-ink/30 bg-white/80 p-2 font-mono text-[11px]">
              [Dev Sign Fixture · consent={cameraConsent ? 'granted' : 'off'}]:{' '}
              {(SIGN_CARDS.find(c => c.id === selectedSignId) ?? SIGN_CARDS[0]).signText}
            </div>
          )}
          {whiskerOpen && (
            <div className="rounded-xl border border-ink/15 bg-ink p-3 font-mono text-[11px] text-cream">
              <div className="mb-1 font-semibold">
                [Tail Session Dashboard] scenario={scenarioId} level=L{chaosLevel} mode={mode}{' '}
                speaker={activePersona} stack={activeProviderStack.id}
              </div>
              {whiskerTraces.map((tr, i) => (
                <div key={i} className="opacity-85">
                  [Whisker] {tr}
                </div>
              ))}
            </div>
          )}
          <div className="opacity-65">
            Available stacks:{' '}
            {PROVIDER_STACK_OPTIONS.map(s =>
              s.previewOnly ? `${s.id} (preview)` : s.id,
            ).join(', ')}
          </div>
        </div>
      )}
    </section>
  )
}
