# Rehearse the Journey — Sprint Implementation Plan

**Plan date:** Thursday, November 5, 2026  
**Architecture decision:** Client-side React + TypeScript + esbuild; independent Vercel functions; shared local Node backend<br>
**Demo date:** Saturday, November 7, 2026  
**Status:** Ready for implementation; sprint tasks are not yet complete  
**Delivery model:** One developer, sequential execution  
**Scheduling timezone:** East Africa Time (EAT, UTC+3)  
**Primary environment:** Linux + Chrome, laptop-first

> This is an active research project in pre-alpha, and its accessibility adapters are unvalidated. It is not a replacement for assistive technology. People must be able to check changes, undo them, stop practice, and use a typed alternative when voice is unavailable.

## 1. Goal, scope, and honest success criteria

Build a companion demonstrating seven experience stages: state intent, set preferences, review steps, explore a location, rehearse a conversation, pause or exit, and optionally save a checklist. These are seven experience stages, not seven journey steps.

### Required scope

- A clearly labelled fictional hospital-visit journey remains the demo journey.
- Five authored rehearsal steps: prepare, approach the location, find reception, practise asking for help, and review preparation.
- Gemini text narration and independent typed role-play.
- Gemini Live spoken role-play through backend-issued ephemeral credentials.
- Maps-grounded location answers with sources and explicitly requested candidate routes.
- At least four demonstrably working toolkit adaptations driven by explicit preferences.
- Approval-gated navigation, session ending, and exact-content checklist persistence.
- Vercel HTTPS deployment and a tested local production startup procedure.
- A labelled fixture mode that completes the experience without external services.

### Deferred scope

Learn mode, camera input, NotebookLM, accounts, journey history, profile inference, approval signing, and a backend database. Google 3D Maps is a stretch item only after every required gate passes; it has no reserved sprint capacity.

### Limitations that must remain visible

- The fictional fixture demonstrates functionality but does not satisfy the PRD criterion requiring a real co-designer journey.
- A fictional reception process must never be represented as the procedure of the real institution shown in Explore.
- Co-designer participation and independent usability are reported separately from developer testing. Do not claim a co-designer outcome without an actual session and permission to report it.
- A fallback does not count as a successful required integration. A blocked integration remains an MVP gap.
- Unsigned approvals provide application-level consent in an unmodified single-device demo, not protection against a modified client.
- Local hosting still needs internet for live services. Only fixture mode is network-free.

## 2. Repository placement and implementation boundaries

| Artifact | Absolute path |
|---|---|
| Repository root | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit` |
| This plan | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/Project/rehearse-journey-implementation-plan.md` |
| Existing PRD | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/Project/PRD.md` |
| Planned app root | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey` |
| Planned app README | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/README.md` |
| Planned evidence directory | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/Project/rehearse-journey-evidence` |
| Planned toolkit recipe | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/toolkit/skills/builtin/rehearse-journey.md` |
| Toolkit package manifest | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/toolkit/package.json` |
| Adapter catalog manifest | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/tools/package.json` |
| Toolkit consumption guide | `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/docs/using-in-your-project.md` |

Use a static HTML entry, client-side React + TypeScript, plain CSS, esbuild, npm, and a pinned compatible Node 22 patch release. Do not introduce Next.js, App Router, React Server Components, server rendering, a client router, or an additional backend framework for this MVP. The inspected shell runs Node 24.3.0; aligning the implementation shell, CI, and deployment is a Sprint 0 task, not an assumption already satisfied.

The repository does not currently declare npm workspaces. Preserve the existing root install and test behavior. Give the app an explicit lockfile and CI job rather than converting the repository into a monorepo as incidental work.

Consume the toolkit and catalog through their package exports. First prove local file dependencies can be installed and built on Vercel with access to the repository root. If that fails, use reproducibly packed local tarballs following the toolkit consumption guide. Do not duplicate the core or import browser-incompatible Node ports.

Treat AI SDK 7.0.x and `@ai-sdk/react` 4.0.x as the proposed compatibility target, not a verified dependency set. Verify published versions, peer dependencies, Google provider support, accessibility-package compatibility, and licenses, then lock the exact tested versions. Do not substitute versions silently.

### 2.1 Lighter React architecture

Keep React for the selected `useChat`, approval-response, and generative-accessibility integrations. Removing Next.js is not a decision to replace those with a custom chat protocol or a framework-free UI. The independent controller, not React or chat, owns protected state.

| Layer | Planned responsibility |
|---|---|
| Static HTML + React shell | Mount once; display all seven stages as controller state; keep Pause and Exit available without route changes |
| Controller and approval coordinator | Framework-independent TypeScript; validated commands, revisions, cancellation, and once-only approved effects |
| Toolkit integration and adaptation manager | Browser-local profile, explicit mappings, reversible adapter lifecycles, and React-safe prose ownership |
| Media coordinator | Exclusive app audio, microphone lifetime, and immediate shutdown |
| Shared schemas | Browser/server contracts with no server-only imports or credentials |
| Shared backend services | Chat, token issuance, Explore/Routes, and simplification logic; no browser-state persistence |
| Vercel entrypoints | Thin independent functions adapting requests, streaming responses, and cancellation to shared backend services |
| Local Node host | Serve the built client and the same four API services on one origin; not a proxy to the deployed app |
| Build and tests | esbuild for bundling; separate TypeScript checks; existing Node assertions, jsdom, and Playwright patterns |

The repository already uses esbuild, TypeScript, jsdom, and Playwright. Declare the app's own required tooling/dependencies explicitly; do not rely on accidental resolution from the root installation. React, AI SDK, and provider packages remain planned app dependencies, to be installed and verified in S0.

### 2.2 Planned app layout and runtime contracts

All entries below are proposed beneath the planned app root, not files already implemented:

- Static entry: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/index.html`.
- Browser modules: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/src/client` for React components, toolkit integration, adaptations, and media ownership.
- Independent controller: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/src/controller`.
- Shared contracts: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/src/shared`.
- Backend services: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/src/server`.
- Thin Vercel functions: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/api`, with chat, live-token, explore, and simplify entrypoints.
- Build tooling and local host: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/scripts`.
- Tests: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/test`.
- Static build output: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/apps/rehearse-journey/dist`, containing only public client assets and bundled fixtures, never backend output or secrets.

Define app scripts during implementation: `dev` for watched client builds plus the local API host; `typecheck` for browser/server TypeScript checks; `build` for production assets; `start` for serving the built app and local APIs; `test` for deterministic unit/contract suites; and `test:e2e` for Playwright. These commands are planned acceptance requirements, not commands claimed to exist today. esbuild bundling does not replace type checking.

Keep browser and server entry graphs separate. No backend imports or server environment values may enter a client bundle. Keep server functions and shared service imports outside the public static output, and configure Vercel's app root, build/output settings, function inclusion, and repository-root dependency access explicitly.

Use relative same-origin API URLs in the browser. The local host must run the same service implementations and AI SDK stream protocol as Vercel; transport-specific wrappers may differ, but prompts, schemas, tools, validation, timeouts, and errors must not be duplicated. Test both paths, including client disconnects and upstream aborts. Static Python hosting alone is not the local production backup.

### 2.3 Redbird patterns adopted and excluded

Use the reviewed Redbird checkout as a reference for static frontend/function separation, an isolated toolkit bridge, reversible adapter lifecycles, authored fallbacks, and one announcement channel. Do not copy its whole workshop loader, planted accessibility issues, runtime CDN module loading, reload-to-undo behavior, token persistence, remote observation learning, prompt-content cache, or wildcard-CORS policy.

Bundle selected toolkit/catalog modules locally. Hosted toolkit console/MCP connectivity is deferred; adopting Redbird's structural pattern does not authorize accounts, tokens, observations, or profile sharing. React DOM ownership boundaries remain required despite removing Next.js.

## 3. Non-negotiable architecture contracts

### 3.1 Controller and approval ownership

The browser rehearsal controller is the sole authority for journey position, session lifecycle, and approved checklist writes. Chat, Live, maps, and direct controls can propose actions but cannot mutate those values directly.

- Lifecycle states: `setup`, `active`, `paused`, and `ended`. The completion view is an ended session with an optional in-memory checklist draft.
- Allow at most one unresolved action proposal at a time; Pause and Exit remain available while it is pending.
- Bind each proposal to session ID, action ID, tool-call ID, approval ID, validated arguments, and the relevant state or checklist revision.
- A proposal changes nothing. A positive approval grants permission. Only a completed, validated command applies its effect, exactly once.
- Validate step IDs against the authored journey and the allowed lifecycle transition. Ignore duplicates, stale revisions, old sessions, and mismatched approvals.
- Direct controls generate deterministic proposals through the pinned SDK UI stream. They must not need a model to interpret the click or decide what approved command to complete.
- Verify approval APIs for the exact pinned SDK. Do not describe `toolApproval` as a spelling error: investigate call-level policy and tool-level `needsApproval`, including precedence and default behavior. Use `addToolApprovalResponse` for captured decisions where supported.
- Apply explicit human approval to `go_to_step`, `exit_rehearsal`, and `save_checklist`. Mandatory approval cannot be disabled by a preference.
- Back, Next, Skip, and selectable ladder steps all use `go_to_step`. No automatic progression. Repeat narrates the current step without advancing.
- Denied navigation and save leave position and persisted content unchanged. Denied Exit deliberately leaves the session paused.
- Fixture-mode controls and approvals operate locally without an external model or hosted API dependency.

### 3.2 Pause, Exit, and cancellation precedence

- Pause immediately aborts generation and pending location/simplification work, stops speech, clears owned playback/announcement queues, closes Live, and releases microphone tracks.
- Invalidate pending proposals and increment the session work generation so late callbacks cannot restart work or change the view.
- Exit performs the immediate stop and invalidation first, then creates a fresh exit proposal in the paused state. Approve ends the session; Deny leaves it paused.
- Resume is explicit. It does not automatically restart microphone capture, speech, or a disconnected Live session.
- A media coordinator prevents simultaneous app read-aloud and Live playback/capture. Announcements are paced, not emitted per token; do not attempt to detect whether a screen reader is running.
- Preference restoration cannot override an explicit stop. Disabling an adapter must not restart microphone capture or media stopped by Pause or Exit.
- Starting a new session invalidates all old work and clears the unsaved draft. It does not delete an approved checklist.

### 3.3 Journey, presentation, and provenance

- Preserve the PRD's `RehearsalStep` interface. Add companion metadata rather than silently changing the shared shape.
- For content, track origin (`fictional`, `verified`, or `generated`), evidence/source IDs for factual claims, and source-check time.
- Anchor Explore to a verified public Nairobi exterior. Keep its factual content separate from the fictional reception practice.
- A generated explanation or translation is not evidence. Unsupported requests must be acknowledged and offered the supported fictional journey, not silently converted into an invented real journey.
- Show the current step, a ladder of up to three visible steps, one assistant panel, and stable Back, Next, Repeat, Pause, Exit, and Save controls. Provide Skip where planned without bypassing approval.
- Explain seeded distress ratings as examples; edits remain session-only and range from 0–10. Do not require rating entry to continue or infer readiness from a score.
- Default to English, short explanations, audio off, and reduced motion. Offer Kiswahili and longer explanations explicitly. Apply correct document/content language metadata.
- Review bilingual authored text and control labels. Report unreviewed generated translation limitations rather than claiming language parity.

### 3.4 Preferences and toolkit adaptations

- Initialize `createToolkit` in the browser with a KV port. Persist only the profile record; keep every other toolkit partition in memory, including migration bookkeeping where applicable.
- Run required initialization/migrations against that port without persisting extra partitions. The port must reject failed durable writes rather than pretending they succeeded.
- Explicit preference edits use Librarian setters, preferably a batched write for related fields. Defaults are effective UI values, not silently persisted profile edits.
- Read the resulting AbilityModel to drive narration and adaptations. Do not enable observation logging, automatic profile inference, sharing, or hosted toolkit account connections in this MVP.
- Document each preference's profile field, AbilityModel representation, derived setting, adapter action, reversal, and test.
- Existing web derivation maps `reduceMotion`, `simplify`, and `readAloud`. The inspected implementation does not map `stopAutoAdvance` or `confirmActions`; add a documented, tested app-owned mapping or a narrowly reviewed toolkit change. Do not claim an upstream mapping exists.
- Integrate read-aloud, simplify-text, stop-auto-advance, motion-reducer, and confirm-actions. Demonstrate at least four observable effects with explicit demo preferences; an enabled flag or an inert adapter is not proof.
- Resolve Confirm Actions interception before enabling it: the existing document-wide listener has no exclusion option and can match labels such as Confirm or Send. Protect Pause, Exit, approval controls, and existing consent interactions from extra confirmation.
- Connect simplification using `setAIProvider` and a bounded server endpoint. Rewrite only completed plain-text prose containers whose children React does not reconcile. Never rewrite approval previews, controls, citations, or streamed text.
- On preference removal, restore original content immediately and reject any late rewrite. Keep notices and source links outside the rewrite boundary.
- Prefer current-step `ReadAloud.speak` integration over narrating the whole page. Missing system voices, including Kiswahili voices, must degrade honestly to text.
- Contribute the planned recipe and validate its IDs/settings. Update the existing skill-test registry fixture if the recipe references real adapters absent from that fixture; do not weaken validation to make it pass.

### 3.5 Checklist and retention

- Keep one immutable preview snapshot per save proposal. Approval binds to that exact content and revision; edits or regeneration require a fresh proposal.
- Persist only the approved snapshot, separately from AbilityModel. Show it in the preferences/storage surface and support deletion.
- Failed replacement preserves the previous saved checklist. Show success only after the durable write succeeds.
- Keep an unsaved draft on completion so Save can be approved after exiting. Do not retain chat or Live state solely to preserve the draft.
- By default, exclude transcripts, distress ratings, clinical details, and unverified location claims from the checklist.
- Reset Preferences and Delete Checklist are separate explicit operations. Deletion uses a deterministic, accessible confirmation and must not acquire an accidental second adapter confirmation.
- After reload, retain only explicitly edited preferences and the approved checklist. Conversation, position, audio, generated explanations, distress edits, pending approvals, and unsaved drafts disappear.
- Browser storage is specific to that browser/device/origin, not an account or backup. Test the local and deployed origins separately; do not auto-transfer saved data between them.

### 3.6 Service, privacy, and deployment boundaries

| Interface | Responsibility and boundary |
|---|---|
| `POST /api/chat` | Typed conversation, narration, deterministic proposals, and approval continuation; returns validated commands rather than directly mutating local state |
| `POST /api/live-token` | Issue a short-lived credential constrained to the configured Live model and intended use; verify expiry, allowed-use, and reconnect semantics against the actual API |
| `POST /api/explore` | Discriminated location-question or explicitly requested candidate-route operation; return sources and attribution |
| `POST /api/simplify` | Bounded plain-language rewrite or no replacement; preserve names, numbers, and meaning |

- Use shared Zod schemas, bounded history and input/output sizes, allowlisted operation types, request timeouts, cancellation, and safe errors.
- Keep Gemini and Routes credentials server-side. Any browser map key is separate, website/API restricted, and never reused as a backend secret.
- Minimize outgoing data: send selected presentation settings rather than the entire AbilityModel. Do not send distress ratings by default.
- Explain what leaves the device before text, location, or microphone features start. Memory-only describes app persistence, not a promise about external provider retention.
- Verify the hub credential's applicable paid/unpaid terms and data handling before real disclosures. Use fictional prompts and public example locations in smoke tests and evidence.
- Do not record audio. Exclude chat, profiles, prompts, tokens, recordings, and location query content from application logs; inspect SDK error logging as well.
- Use same-origin checks, protected deployment access, bounded spend, and concrete request/token-issuance limits. A process-local counter is not a deployment-wide rate limiter.
- Select available platform protection or a shared limiter during Sprint 0. If that needs external state, document the explicit infrastructure exception to the no-app-database decision.
- Deploy a minimal build early. Document the app root, repository-root package access, environment variables, HTTPS requirements, and local production commands.
- Serve the static React build with independent Vercel functions. The local Node host serves the same built client and shared backend services; neither runtime requires Next.js or an external deployed proxy. Verify stream headers, cancellation, and error behavior on both runtimes.
- Fixture mode must not call AI, token, routing, map-tile, or simplification services. Use bundled text/static location context and a visible fixture label.

### 3.7 Maps and Live contracts

**Maps:** Use one 2D map implementation. The revised default is Google 2D for the integrated Routes experience, subject to Sprint 0 credential/license verification. Leaflet/OSM remains an alternative only with a verified compliant separation of Google content. Do not draw Google Routes results on Leaflet/OSM. Verify current display, grounding, attribution, caching, Terms of Use, and Privacy Policy requirements before shipping.

- Keep Maps grounding distinct from Routes. Verify the exact model, API/SDK support, provisioned project, billing, and quota for each; a working Gemini text call proves none of these.
- Check grounding language support explicitly. If English-only, keep source-grounded answers in English or label a separate generated Kiswahili translation with unchanged evidence links. Do not imply native bilingual grounding without proof.
- Candidate routes are requested, labelled “candidate path — confirm,” and never advance rehearsal. Use public, person-selected origins/destinations; no automatic geolocation is required.
- Never infer entrances, step-free access, safety, queues, opening conditions, or hospital procedures without supporting evidence. Missing evidence produces an unknown, not a guess.
- Include an equivalent textual location view and usable failure view. The rehearsal must still work if the map cannot render.

**Live:** Token issuance alone does not complete spoken role-play. Prove capture/encoding, playback, supported transcript behavior, session lifetime, expiry, disconnects, cleanup, and deliberate restart. Live has no navigation or storage authority. Keep typed role-play independent of microphone permission and Live availability.

## 4. Sprint execution rules and schedule

These are short sequential delivery sprints, not parallel assignments. Each has a timebox, task list, and completion gate. Estimates total approximately 21 focused hours before contingency; they are planning estimates, not a guarantee. Confirm available working hours and presentation time at Sprint 0. The full scope is ambitious for one developer.

- Record actual start/end, gate results, and blockers in the evidence directory as work happens.
- Timebox investigation of a blocked external dependency to approximately 30 minutes, record the failure, and continue with a labelled fallback where safe. Revisit blocked required integrations before freeze.
- A sprint with an unmet gate remains blocked or partial; do not mark it complete because later work began.
- Correctness, immediate stopping, and accessibility take precedence over decoration and 3D.
- Reserve at least two additional hours for contingency if available. If capacity is insufficient, report a scope gap instead of compressing safety tests out of the plan.
- Freeze features at least two hours before the confirmed presentation, even if the deadline changes. After freeze, permit only blocker fixes followed by targeted regression and a new recorded build ID.

| Sprint | Target window | Budget | Depends on | Gate |
|---|---|---:|---|---|
| S0 — Risk retirement | Thu Nov 5, first | 2 h | None | Lighter React/function/local-host foundation and capability decisions recorded |
| S1 — Offline vertical slice | Thu Nov 5, next | 3 h | S0 app foundation | Seven stages usable with the five-step fictional fixture |
| S2 — Approvals and retention | Fri Nov 6, first | 3 h | S1; S0 approval spike | Exactly-once approved effects; safe denial and storage |
| S3 — Toolkit and typed AI | Fri Nov 6, next | 4 h | S2 | Reversible adaptations and independent typed role-play |
| S4 — Grounded Explore and Routes | Fri Nov 6, next | 2.5 h | S3; S0 Maps decision | Sourced answers and requested candidate routes |
| S5 — Live audio | Fri Nov 6, next | 2.5 h | S4; S0 Live capability | Spoken exchange, shutdown, and explicit restart |
| S6 — Verification and rehearsal | Sat Nov 7, first | 2.5 h | S1–S5 evidence | Accessibility, races, failures, and performance recorded |
| S7 — Freeze and handoff | Sat Nov 7, before presentation | 1.5 h | S6; remaining blocker decisions | Reproducible demo and honest final status |

### S0 — Retire integration and deployment risks

- [ ] Confirm working hours, actual presentation slot, credential availability, and remaining test capacity.
- [ ] Pin a compatible Node 22 patch and prove the selected React, AI SDK, accessibility, provider, esbuild, and TypeScript set installs and builds; record exact versions and licenses.
- [ ] Within the first 90 minutes, prove a static React/esbuild app, local toolkit import, independent HTTPS function with a streamed response, approve/deny continuation, and the equivalent local Node service. Do not build custom routing or a new chat protocol to pass this spike.
- [ ] Configure an app lockfile, separate client/server build boundaries, static output, four thin Vercel API entrypoints, and shared backend services. Record clean-checkout install, build, typecheck, and local production commands.
- [ ] Prove one deterministic and one model-originated approval through the actual SDK on local and deployed transports. Test approve and deny; prove deterministic completion does not invoke a model. If the local fixture approval transport differs, verify the same SDK message/approval semantics without a hosted API dependency.
- [ ] Smoke-test text generation, Live credential/session setup, Maps grounding, and Routes separately with provisioned credentials if available. Never store secret values in evidence.
- [ ] If credentials are not yet available, assign a verification deadline no later than the start of the relevant integration sprint and mark capability unverified.
- [ ] Choose the compliant 2D map design, grounding-language policy, external-data notice, deployment access protection, and request-limit mechanism.
- [ ] Start a baseline of relevant repository tests so pre-existing failures can be distinguished from regressions.

**Gate:** The lighter React build, independent Vercel function, local Node backend, toolkit import, and streamed approvals work with no Next.js dependency. Verify local/deployed stream parity and browser/server separation. External capabilities are either verified or explicitly blocked/unverified with a revisit deadline. Unverified capability is not a pass on the full MVP. If the 90-minute foundation spike fails, stop infrastructure expansion, record the blocker, and explicitly revisit the architecture decision; do not silently change stacks or mark the gate passed.

### S1 — Complete the offline journey

- [ ] Add shared schemas, five authored steps, source/provenance metadata, and labelled example distress values.
- [ ] Build intent confirmation and an explicit offer of the fictional journey for unsupported requests.
- [ ] Build preferences, reviewed steps, textual Explore, scripted typed practice, pause/exit, completion, and checklist preview in one mounted React shell; stages are controller state, not routes or page reloads.
- [ ] Add the controller lifecycle, stable direct controls, keyboard focus rules, up-to-three-step ladder, and in-memory session boundaries.
- [ ] Wire fixture proposal/approval behavior through the validated local path; do not temporarily permit ungated state mutation.
- [ ] Bundle all fixture assets and verify zero external network dependence during the fixture flow.

**Gate:** A person can complete all seven experience stages without external services. Five authored steps remain visibly fictional, navigation remains consent-gated, and a stopped session stays stopped.

### S2 — Lock down approvals, cancellation, and storage

- [ ] Implement shared proposal handling for direct controls and model proposals, including revision binding and exactly-once application.
- [ ] Cover Back/Next/Skip/ladder navigation, Repeat, Pause, Exit, explicit Resume, and new-session invalidation.
- [ ] Implement immutable checklist preview/save/replace/delete, post-exit draft saving, and separate preference reset.
- [ ] Implement profile-only durable KV behavior, storage-failure reporting, and failed-replacement preservation.
- [ ] Add the 20-case approval suite in Section 5 plus automated cancellation and retention checks.

**Gate:** Zero unapproved transitions or checklist writes; denial semantics are correct; stale/duplicate work is inert; failed storage does not report success or destroy previous content.

### S3 — Integrate toolkit adaptations and typed AI

- [ ] Implement a separate browser-local toolkit bridge and adaptation manager; document explicit preference mappings, AbilityModel reads, and reversal/cleanup behavior. Do not introduce Redbird's hosted-token/observation workflow.
- [ ] Resolve missing surface mappings and Confirm Actions exclusions with focused tests before enabling those integrations.
- [ ] Wire Gemini narration and independent typed role-play through React `useChat` and shared backend services using bounded prompts/history and fictional-process instructions. Retain the selected AI SDK/generative-accessibility integration rather than implementing a custom stream client.
- [ ] Wire simplification with original-text restoration, race protection, plain-text DOM ownership, and a fixture-mode replacement path that makes no AI calls.
- [ ] Add paced announcements and app audio coordination. Verify enabling/disabling preferences never defeats Pause.
- [ ] Demonstrate at least four real adapter effects without introducing unwanted autoplay or removing mandatory approvals.
- [ ] Add the planned toolkit recipe, update affected test fixtures, and run skill validation.

**Gate:** Typed AI works on HTTPS, four adaptations have observable evidence, removal restores correctly, and profile edits are the only durable toolkit data.

### S4 — Deliver grounded Explore and candidate routes

- [ ] Verify and display the selected public Nairobi exterior using the agreed 2D design and textual equivalent.
- [ ] Implement separate grounded-answer and candidate-route operations with validated inputs, sources, provider attribution, and timeouts.
- [ ] Implement the English/Kiswahili location-answer policy and distinguish generated translations from source evidence.
- [ ] Add missing-data, quota, timeout, and map-rendering failure states without inventing facts or advancing rehearsal.
- [ ] Run the five grounding scenarios and inspect every real-world factual claim.

**Gate:** A live sourced location answer and a requested candidate route work under the provisioned credentials. Presentation complies with verified provider requirements; unsupported accessibility/process facts remain unknown.

### S5 — Deliver spoken role-play safely

- [ ] Implement constrained ephemeral credentials, microphone permission, capture/encoding, playback, and listening/speaking/stopped indicators.
- [ ] Verify transcript support for the selected model and disclose limitations; preserve an independent typed path regardless.
- [ ] Implement maximum session duration, expired-token handling, disconnect messaging, and explicit restart rather than automatic microphone resumption.
- [ ] Stop tracks, queued playback, sockets, and pending setup on Pause/Exit, failed setup, navigation/unmount, and new session.
- [ ] Test late token/audio events and audio exclusivity with read-aloud. Verify no Live tool can change journey state or storage.

**Gate:** A live spoken exchange succeeds on the demo machine over HTTPS; all shutdown cases leave no owned active microphone tracks or queued playback; typed practice still works with Live disabled.

### S6 — Verify accessibility, resilience, and performance

- [ ] Complete a keyboard-only run and a run with the available named screen reader, targeting Orca on Linux. Record version, browser, device, and any untested combination.
- [ ] Test 200% zoom, focus restoration, approval announcements, language labels, map text alternatives, preference removal, and immediate media shutdown.
- [ ] Run approval, retention, cancellation, grounding, and failure matrices. Record every deviation, not just successful paths.
- [ ] Measure first narration token ≤2 seconds, complete narration ≤8 seconds, and location answer ≤3 seconds; report observations separately for live and fixture modes, cold/warm runs, and sample sizes.
- [ ] Run separate app type checks, production build, automated browser flow, existing root tests, and toolkit skill validation. Check the public build for accidental server code/secrets and verify local/deployed service contract parity, stream cancellation, and fixture independence. Keep app CI coverage explicit because root tests do not discover the new app automatically.
- [ ] Target Lighthouse Accessibility ≥95, but do not substitute the score for keyboard or screen-reader evidence.
- [ ] Rehearse on the actual presentation laptop. If a co-designer participates, obtain permission and report their experience separately without replacing the fictional-fixture disclosure.

**Gate:** No known unapproved action, broken stop control, misleading storage success, or blocking keyboard failure. Remaining integration and accessibility gaps are visible and classified; the build is not described as full MVP if any required gate failed.

### S7 — Freeze, capture evidence, and hand off

- [ ] Freeze features and record commit/build ID, deployment URL, actual runtime, package versions, and integration status.
- [ ] Record the backup video from the tested build using fictional content and no exposed credentials or personal data.
- [ ] Finish the app README, short write-up, demo script, environment-variable names, local production instructions, privacy/terms notices, storage evidence, and failure recovery instructions.
- [ ] Update the existing PRD during implementation to reflect fictional-fixture scope, exact approval configuration, controller ownership, preference-consent exceptions, retention, map/key handling, and tested language support.
- [ ] Log only genuine reproducible toolkit issues. If none were found, report that honestly rather than fabricating an issue to satisfy a delivery count.
- [ ] Confirm local production startup and network-free fixture flow after freeze. Re-record evidence after any blocker fix.

**Gate:** The final artifact can be demonstrated and reproduced; every required integration has an honest evidence-backed status and every limitation is disclosed.

## 5. Verification matrices

### 5.1 Twenty approval cases

Each case must assert the actual controller position, session lifecycle, and durable checklist contents, not just the presence of an approval card. Use deterministic scripted model/transport fixtures for CI; live smoke tests supplement rather than replace these cases.

| ID | Case | Required outcome |
|---|---|---|
| A01 | Direct Next: approve | Navigate once after validated completion |
| A02 | Direct Next: deny | No position or storage change |
| A03 | Model navigation: approve | Same approval handler and once-only application |
| A04 | Model navigation: deny | No position or storage change |
| A05 | Prompt asks to bypass approval | Proposal only; no unauthorized effect |
| A06 | Duplicate approval response | No duplicate execution |
| A07 | Duplicate completed result | No duplicate application |
| A08 | Old-session result after new session | Ignored |
| A09 | Pause during proposal or continuation | Pending action invalidated; no late effect |
| A10 | Wrong approval/tool/action ID | Rejected |
| A11 | Unknown or disallowed target step | Rejected |
| A12 | Back: approve and deny branches | Moves only on valid approval |
| A13 | Skip: approve and deny branches | Same navigation gate; no bypass |
| A14 | Ladder selection: approve and deny branches | Same navigation gate; no bypass |
| A15 | Save approved immutable preview | Exactly previewed content written once |
| A16 | Save: deny | Existing checklist unchanged |
| A17 | Checklist edited after proposal | Old approval invalid; fresh preview required |
| A18 | Checklist replacement and write failure | Fresh approval required; previous saved content survives failure |
| A19 | Exit: approve and deny branches | Media stops immediately; approve ends, deny stays paused |
| A20 | Save after Exit, then new session | Ended-session draft can be approved; new session invalidates old draft/proposal |

**Pass bar:** Zero unapproved journey transitions or checklist writes. Repeat must never advance. Preference edits and explicit deletion/reset are separately authorized operations, not hidden exceptions to checklist saving.

### 5.2 Grounding scenarios

1. Exterior/address question with adequate evidence.
2. Reception or queue-process question unsupported by sources.
3. Entrance or step-free-access question without accessibility evidence.
4. Requested candidate route between public locations, including a no-route result.
5. Kiswahili location question under the chosen grounding/translation policy.

**Pass bar:** Every displayed real-world factual claim is supported by relevant evidence or clearly marked unverified; zero unsupported hospital-process claims presented as fact. Review generated translations as well as original answers. Track supported, unverified, and unsupported-presented-as-fact counts separately; an “AI-generated” badge does not satisfy sourcing.

### 5.3 Failure and race coverage

- Microphone denied, unavailable device, token expiry, Live disconnect, and token arriving after Pause.
- Quota exhaustion, missing grounding data, route unavailable, timeout, aborted request, and failed map rendering.
- Unavailable/corrupt storage, failed replacement/deletion, reload, and isolated local/deployed origins.
- Simplification disabled before response; current step replaced before narration completes; new session while chat is streaming.
- Adapter disable after Pause must not resume media; pending read-aloud gesture handlers must not restart stopped speech.
- Provider text and source content requesting actions cannot authorize controller effects. Render generated text safely and allowlist safe source-link schemes.
- Fixture run with network unavailable and checks that no external services are requested.

## 6. Evidence and definition of done

Keep a concise evidence record per sprint with actual date/time, environment, build ID, command or manual steps, expected result, observed result, and sanitized failure details. Do not put personal prompts, audio, profiles, secret values, or private locations in evidence.

| Required integration | Initial status | Evidence needed |
|---|---|---|
| Gemini text and typed practice | Not tested | Live narration and independent typed exchange |
| Gemini Live | Not tested | Spoken exchange, expiry/disconnect handling, stopped media evidence |
| Maps grounding | Not tested | Relevant source-backed answer and language-policy result |
| Requested candidate Routes | Not tested | Valid request/result, candidate label, compliant display |
| Toolkit adaptations | Not tested | Four observable effects, explicit mapping, reversal tests |
| Approval controller | Not tested | Twenty-case suite plus race tests |
| Retention and checklist | Not tested | Reload, exact preview, replacement failure, deletion/reset evidence |
| HTTPS and local production | Not tested | Clean install/typecheck/build/start; independent Vercel functions and local shared-service stream parity; no server secrets in static output |

Use **Verified**, **Degraded**, **Blocked**, or **Not tested** in the final status table. “Verified” requires the stated gate on the tested build; a fixture or typed fallback cannot verify the corresponding Live or Maps integration.

Final demo must show the fictional disclosure, intent confirmation, preferences, reviewed steps, sourced Explore, typed and spoken practice, four observable adaptations, denied approval leaving protected state unchanged, immediate stopping, and exact checklist preview/save/delete.

## 7. Risk register and scope discipline

| Risk | Mitigation | Reporting rule |
|---|---|---|
| Required package/API combination does not work | S0 compatibility and approval spike; lock tested versions | Record actual combination and gap; no silent downgrade |
| Lighter stack turns into custom infrastructure work | 90-minute foundation spike; one React shell, esbuild, thin functions, shared Node services | Record blockers and explicitly revisit the decision; do not build a framework or silently revert to Next.js |
| Credentials arrive late or lack service capability | Separate service smoke tests and a revisit deadline | Mark capability unverified/blocked, not complete |
| Full scope exceeds one developer's hours | Sequential gates, diagnostic timeboxes, contingency, no 3D allocation | Preserve safety tests; disclose incomplete integrations |
| Google content mixed into incompatible map display | One 2D design; verify current provider policies before integration | Do not ship unverified mixed-provider rendering |
| DOM adapters compete with React or consent controls | Owned prose islands, scoped integration, exclusions, reversal tests | An enabled-but-inert adapter does not count |
| Cancellation races restart work or audio | Revision checks, work-generation invalidation, centralized media ownership | Any failure blocks a safe-demo claim |
| Fictional scenario mistaken for real guidance | Persistent fixture labels, evidence boundaries, unknowns instead of guesses | Real co-designer journey criterion remains unmet |
| Local-only privacy claim obscures provider processing | Pre-use notices and minimized outgoing data | Report app retention separately from provider terms |

## 8. Reference verification backlog

Sprint 0 must consult official primary documentation for the exact versions and account configuration in use: React client mounting; esbuild React/TypeScript bundling; AI SDK standalone Node streaming and approval protocol; Google provider support; generative accessibility compatibility and licenses; Gemini Maps grounding languages/model availability; Google Routes display/attribution policies; Gemini Live ephemeral credentials/audio/session lifecycle; Maps key restrictions; Gemini data-use terms; and Vercel static output, independent Node functions, repository-root package access, deployment protection, and rate limits.

Record the exact documentation references and verification date in implementation evidence. This document schedules that verification; it does not claim that credentials, package compatibility, provider policies, deployment protection, or live integrations have already been tested.
