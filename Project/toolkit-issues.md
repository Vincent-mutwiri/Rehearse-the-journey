# Toolkit Issues — Rehearse the Journey (Problem Statement 6)

A log of issues found while **interacting with the AI for Accessibility Toolkit** during the Rehearse the Journey build and demo. This is also a hackathon deliverable: the judging criterion "Use of the toolkit and contribution back" expects **≥ 1 genuine toolkit issue logged from co-designer testing**, and the PRD (`Project/PRD.md` §1 success criterion 6) lists it in the delivery checklist.

> Only log **genuine, reproducible** issues. If none are found, report that honestly rather than fabricate one to satisfy a count. (Per `Project/rehearse-journey-implementation-plan.md` S7.)

---

## How to add or update an entry

Use the local skill: ask the coding agent to **"log a toolkit issue"** (skill: `log-toolkit-issue`). It will gather the fields below and append/update an entry in this file following the format.

Or edit this file by hand — copy the template block at the bottom and fill it in. **One entry per issue.** IDs are sequential: `TKI-001`, `TKI-002`, …

## Fields

| Field | Meaning |
|---|---|
| `ID` | `TKI-NNN`, sequential, never reused |
| `Date` | `YYYY-MM-DD` (EAT) the issue was found |
| `Found by` | Who hit it: co-designer, teammate name, or dev |
| `Area` | Which part of the toolkit — `adapters/<name>`, `core` (AbilityModel/Librarian), `surfaces`, `server`, `extension`, `docs`, `other` |
| `Title` | One-line summary |
| `What happened` | Steps to reproduce; what you did |
| `Expected` | What should have happened |
| `Actual` | What happened instead |
| `Severity` | `blocker` / `major` / `minor` / `note` |
| `Status` | `open` / `investigating` / `filed-upstream` / `resolved` / `wontfix` |
| `Upstream` | Link to the GitHub issue if filed upstream; `—` if not |
| `Notes` | Anything else; the co-designer's own words where relevant |

## Index

| ID | Date | Area | Title | Severity | Status |
|---|---|---|---|---|---|
| TKI-001 | 2026-11-07 | adapters/stop-auto-advance | Stopping auto-advance also pauses the rehearsal's speech audio | major | open |
| TKI-002 | 2026-11-07 | adapters/motion-reducer | Canvas animation needs a separate app-level reduced-motion bridge | minor | open |
| TKI-003 | 2026-11-07 | adapters / TypeScript integration | Browser adapter imports have no TypeScript declarations | minor | open |
| TKI-004 | 2026-11-07 | core | `createAdapterProvider` rejects `catalogDescriptor` defaults and skill snippet `application` shape without `supportedPlatforms`, `platform`, and `surfaces` | minor | open |
| TKI-005 | 2026-11-07 | core | `librarian.replaceProfile()` + `getAbilityModel()` returns an empty `supportAreas: []` array when profile fields are nested under `profile.fields` | minor | open |

---

## Entries

<!-- New entries go below this line. Copy the template block, fill it in, and add a row to the index above. -->

These entries are **developer integration findings**, reproduced on 2026-11-07 while incorporating the toolkit into Rehearse the Journey. They are not attributed to co-designer testing and do not establish that the co-designer-testing deliverable above is complete. `open` refers to the toolkit-level issue or integration gap; an app workaround is recorded separately where present. No upstream issues have been filed.

### TKI-001 — Stopping auto-advance also pauses the rehearsal's speech audio

- **ID:** TKI-001
- **Date:** 2026-11-07
- **Found by:** Vincent and Imbukwa (Rehearse the Journey integration)
- **Area:** adapters/stop-auto-advance
- **What happened:** The rehearsal uses `PipecatClientAudio` for the companion's voice. To reproduce the adapter behavior on a page with a playing `<audio>` element, import `StopAutoAdvance` from `tools/adapters/stop-auto-advance.js`, then call `StopAutoAdvance.enable()`. Inspect whether the audio's `pause()` is called and whether it enters `StopAutoAdvance.pausedMedia`.
- **Expected:** The host app can stop distracting automatic content while explicitly preserving the companion's speech. An exclusion option or documented host integration hook would let the app distinguish essential speech from background media.
- **Actual:** `sweep()` selects every `video, audio` element, and `considerMedia()` pauses any playing element it has not already tracked. There is no host-provided exclusion option in `enable()`. The rehearsal's audio is eligible for the same treatment as background autoplay.
- **Severity:** major
- **Status:** open
- **Upstream:** —
- **Notes:** **App mitigation exists; the toolkit API is unchanged.** [`enableStopAutoAdvance()` in toolkitAdapters.ts](../apps/rehearse-journey/client/src/toolkitAdapters.ts) calls the adapter and then hands audio back, including deleting audio elements from the adapter's `pausedMedia` set. This couples the app to adapter internals and needs care with late-loading media. A focused Chromium reproduction used a stubbed playing audio element: `pause()` was called and the element was tracked. This verifies adapter behavior, not a live Pipecat/provider audio session. Suggested toolkit improvement: an exclusion predicate or explicit media-preservation option, with coverage for both existing and newly inserted media.

### TKI-002 — Canvas animation needs a separate app-level reduced-motion bridge

- **ID:** TKI-002
- **Date:** 2026-11-07
- **Found by:** Vincent and Imbukwa (Rehearse the Journey integration)
- **Area:** adapters/motion-reducer
- **What happened:** The companion mascots animate inside a Three.js canvas. To reproduce the integration boundary independently, start a canvas drawing loop with `requestAnimationFrame`, import `MotionReducer` from `tools/adapters/motion-reducer.js`, call `MotionReducer.enable()`, and compare the frame counter before and after enabling it.
- **Expected:** Integrators can discover which animation types the adapter controls and how to connect the preference to a custom renderer, so enabling Reduce motion also stills the mascots.
- **Actual:** The adapter handles CSS/WAAPI animation and supported media, but does not stop the app's canvas drawing loop. In a focused Chromium reproduction, the loop advanced another nine frames during a 150 ms observation after `enable()`. Applying the DOM adapter alone is insufficient for the mascot animation.
- **Severity:** minor
- **Status:** open
- **Upstream:** —
- **Notes:** **Scope/documentation gap, not a claim that the toolkit can safely cancel arbitrary render loops.** The app already bridges its motion preference into [`JoyMascot.tsx`](../apps/rehearse-journey/client/src/components/JoyMascot.tsx) and [`JoyScene.tsx`](../apps/rehearse-journey/client/src/components/JoyScene.tsx) through the renderer's `still` state. That bridge is separate from `MotionReducer.enable()`. The rehearsal browser regression checks that reduced-motion canvas screenshots remain still. Suggested toolkit improvement: document the canvas/WebGL boundary and provide an example subscription or callback pattern for host-controlled renderers.

### TKI-003 — Browser adapter imports have no TypeScript declarations

- **ID:** TKI-003
- **Date:** 2026-11-07
- **Found by:** Vincent and Imbukwa (Rehearse the Journey integration)
- **Area:** adapters / TypeScript integration
- **What happened:** Import `ReadAloud` directly from `tools/adapters/read-aloud.js` in a TypeScript file and compile with `strict` enabled, without a declaration shim or suppression. From the client directory, a minimal probe was compiled with `./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2020 --module ESNext --moduleResolution bundler <probe.ts>`.
- **Expected:** The browser adapter entry points provide declarations for their exported methods and options, allowing a strict React/TypeScript app to consume them with type checking.
- **Actual:** The compiler reports `TS7016: Could not find a declaration file for module .../tools/adapters/read-aloud.js` and treats the module as implicitly `any`. `tools/package.json` exports the adapter JavaScript paths without corresponding type declarations.
- **Severity:** minor
- **Status:** open
- **Upstream:** —
- **Notes:** **App mitigation exists; adapter typings remain missing.** [`toolkitAdapters.ts`](../apps/rehearse-journey/client/src/toolkitAdapters.ts) and [`rehearsalToolkit.ts`](../apps/rehearse-journey/client/src/rehearsalToolkit.ts) use `@ts-expect-error` on single-line JavaScript imports, so the app can build but those imports lose static API checking. The minimal strict-compilation probe reproduced TS7016. Suggested toolkit improvement: ship declarations for the adapter entry points and verify a strict TypeScript consumer in CI.

### TKI-004 — `createAdapterProvider` rejects `catalogDescriptor` defaults and skill snippet `application` shape without `supportedPlatforms`, `platform`, and `surfaces`

- **ID:** TKI-004
- **Date:** 2026-11-07
- **Found by:** Vincent and Imbukwa
- **Area:** core
- **What happened:** When registering Rehearse the Journey's 9 in-app adapters for Adapter MCP live control (`apps/rehearse-journey/client/src/rehearsalToolkit.ts`), we initially passed `{ appId: 'rehearse-journey', name: '...', version: '1.1.0', platform: 'web', visibility: 'user' }` to `createAdapterProvider` along with `catalogDescriptor` / `defineDescriptor` entries.
- **Expected:** `createAdapterProvider` should either apply sensible web defaults for `supportedPlatforms`, `platform`, and `surfaces` when `platform: 'web'` is given (matching `defineDescriptor`'s defaults), or the top-level skill instructions should show the required `supportedPlatforms: [{ environment: 'web-page' }]`, `platform: detectBrowserPlatform()`, and `surfaces: ['web']` fields up front.
- **Actual:** `createAdapterProvider` threw `AdapterMcpError: invalid application advertisement` until we inspected `toolkit/adapter-mcp/provider.js` and `toolkit/adapter-mcp/README.md` and supplied `supportedPlatforms: [{ environment: 'web-page' }]`, `platform: detectBrowserPlatform()`, `surfaces: ['web']`, and `targets` functions on each `fromToggleAdapter` registration.
- **Severity:** minor
- **Status:** open
- **Upstream:** —
- **Notes:** Mitigated in [`rehearsalToolkit.ts`](../apps/rehearse-journey/client/src/rehearsalToolkit.ts) by passing `detectBrowserPlatform()`, `supportedPlatforms: [{ environment: 'web-page' }]`, and `surfaces: ['web']`.

### TKI-005 — `librarian.replaceProfile()` + `getAbilityModel()` returns an empty `supportAreas: []` array when profile fields are nested under `profile.fields`

- **ID:** TKI-005
- **Date:** 2026-11-07
- **Found by:** Vincent and Imbukwa
- **Area:** core
- **What happened:** In `apps/rehearse-journey/client/src/rehearsalToolkit.ts`, we called `await rehearsalToolkit.librarian.replaceProfile(preset.profile)` with the console profile shape documented in the skill (`{ supportAreas: ['sensory', 'cognitive'], fields: { readingLevel: 6, needs: [...] } }`) and then called `const model = await rehearsalToolkit.librarian.getAbilityModel()`. We then used `model.supportAreas ?? preset.supportAreas` to display active support areas in the UI.
- **Expected:** `librarian.getAbilityModel()` should preserve the `supportAreas` written by `librarian.replaceProfile(...)` (or normalize both top-level and `fields.needs` shapes consistently) so `model.supportAreas` contains `['sensory', 'cognitive']`.
- **Actual:** `model.supportAreas` came back as an empty array `[]` when `toAbilityModel` inspected top-level `needs` vs. nested `fields.needs`, and because `[]` is truthy in JavaScript, `model.supportAreas ?? preset.supportAreas` evaluated to `[]` instead of falling back.
- **Severity:** minor
- **Status:** open
- **Upstream:** —
- **Notes:** Mitigated in [`rehearsalToolkit.ts`](../apps/rehearse-journey/client/src/rehearsalToolkit.ts) by checking `model.supportAreas?.length ? model.supportAreas : preset.supportAreas`.

### Template

```markdown
### TKI-NNN — <Title>

- **ID:** TKI-NNN
- **Date:** YYYY-MM-DD
- **Found by:** <who>
- **Area:** <area>
- **What happened:** <steps>
- **Expected:** <expected>
- **Actual:** <actual>
- **Severity:** blocker | major | minor | note
- **Status:** open | investigating | filed-upstream | resolved | wontfix
- **Upstream:** <link> | —
- **Notes:** <notes>
```
