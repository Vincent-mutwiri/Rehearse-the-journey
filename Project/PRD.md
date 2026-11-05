# PRD — Rehearse the Journey (Problem Statement 6)

**Status:** Draft for team review · **Source:** `Project/opensource-integration-research.md`
**Team:** Austin Obimbo, Gathoni Karume, Bakhoya Audry Imbukwa, John Mokaya, Vincent Mutwiri (Team 6)
**Co-designer:** A person with a cognitive or psychosocial disability who finds Nairobi journeys stressful
**Hackathon:** Sat 7 Nov 2026, 08:00–23:00, Senses Hub, Nairobi
**Build state:** Greenfield Next.js app (no companion app exists yet)

---

## 1. Executive Summary

### Problem Statement
A person with a cognitive or psychosocial disability can find a real Nairobi journey — a matatu stage, a hospital reception, a public-service visit — confusing, stressful, and difficult to plan. They have no safe, self-paced way to *learn the steps in advance*, *practise the moments that worry them*, and *control the pace and sensory load* of that practice.

### Proposed Solution
A personalised AI companion web app — **Rehearse the Journey** — built on Next.js App Router + the Vercel AI SDK v7 + Gemini (key provisioned by the hub) that lets a person rehearse *their own* journey as a series of `RehearsalStep`s they control. One assistant surface routes to purpose-specific services (text Gemini for Learn, Gemini Live for spoken role-play, Maps grounding + Routes for Explore, the app DB for what they save). Every journey advance — `go_to_step`, `exit_rehearsal`, `save_checklist` — is a **tool call paused behind a tool-approval gate**, so nothing the person did not approve ever happens or is ever saved. The person's access preferences live in the toolkit's existing `AbilityModel` profile (a view over `mine.profile`) and drive the toolkit's pure-DOM adapters (`read-aloud`, `simplify-text`, `stop-auto-advance`, `confirm-actions`, `calm-browsing`) running on the rendered page.

### Success Criteria (Nov 7 demo)
1. The co-designer runs the **complete 7-step flow live, on stage**, without a teammate driving for them: states intent → sets preferences → walks reviewed steps → explores location → rehearses a role-play → exits/pauses/saves via the approval gate. *(Hits judging weights: Fit-to-person 30% + Working solution shown by co-designer 30%.)*
2. **100% of journey-advancing actions** go through `toolApproval`; deny = stay put; nothing is written to storage without an approved `save_checklist` call. *(Auditable in the demo write-up.)*
3. Both **text and spoken** paths work end-to-end for role-play (Gemini Live with a guaranteed typed alternative); a screen-reader user hears paced step narration without focus theft (`@generative-a11y/ai-sdk`).
4. The companion is grounded in the **co-designer's real journey** (authored `RehearsalStep` set from their own account), not a generic template.
5. **≥ 4 toolkit adapters** are wired and visibly active on the page (read-aloud, simplify-text, stop-auto-advance, confirm-actions or calm-browsing), driven from the AbilityModel — contributing back to the toolkit per the "Use of the toolkit" criterion (20%).
6. Repo contains: working code, README + short write-up, short demo video, ≥ 1 toolkit issue logged from co-designer testing (the hackathon's delivery checklist).

---

## 2. User Experience & Functionality

### 2.1 User Personas

**Primary — The Co-designer (the person this is for)**
A person with a cognitive or psychosocial disability who finds a specific Nairobi journey stressful. They are a full team member, not a test subject. They use a phone or laptop, may use a screen reader, may prefer audio, may need reduced motion, may need plain language. They must be able to drive the demo themselves on Nov 7. Their journey is the demo journey.

**Secondary — A teammate on the day**
Runs the laptop, watches the spend meter on the hub key, logs toolkit issues as they surface. Does **not** drive the demo for the co-designer.

### 2.2 User Stories & Acceptance Criteria

> All stories assume the four-mode framing (Learn / Practise / Explore / Live help) but the **MVP ships only the Practise + Explore + Live-help path of one journey.** Learn-mode lesson generation and NotebookLM audio are explicitly post-MVP (§5).

---

**US-1 · State a journey intent**
As a person, I want to tell the assistant, in my own words, which journey I want to practise, so the rehearsal is about *my* real situation.

Acceptance criteria:
- A text input is always available as the entry point (voice is optional, not required, on Nov 7).
- The assistant confirms the journey back in plain language before authoring steps, and never invents steps the co-designer did not describe.
- A seeded `RehearsalStep` set, authored from the co-designer's real account **before** the hackathon day, can be loaded instantly so the live demo does not depend on generation latency.
- If generation is used, the model produces steps grounded in supplied sources (co-designer's words + Maps context) and labels them as generated, not confirmed.

---

**US-2 · Set my access preferences once**
As a person, I want to set my preferences (language, explanation length, audio, sensory) once and have every part of the experience honour them, so I do not have to re-explain myself.

Acceptance criteria:
- Preferences are stored in the toolkit's `AbilityModel` profile (the view over `mine.profile` — `supportAreas`, `freeText`, `metaPreferences.language`, `fields.needs[]`), not a new parallel store.
- The toolkit adapters and the model's narration length/language both read from this one profile; there is no second source of truth.
- Inspect / change / delete all work from the same surface; deleting a preference immediately stops the corresponding adaptation.
- The profile is the **only** thing the assistant remembers by default; nothing else is written without an approved `save_checklist`.

---

**US-3 · Walk my journey as reviewed steps**
As a person, I want my journey broken into manageable ordered steps I can see one-to-three at a time, each with my own anticipated-distress rating, so I am not intimidated by the whole journey at once.

Acceptance criteria:
- The UI renders the current `RehearsalStep` (name, plain-language description, highlights, my distress rating 0–10) and offers a scrollable view of the ladder showing 1–3 steps at a time (the anxiety-ladder pattern).
- The model paces its narration using `anticipatedDistress` (more reassurance on higher-rated steps).
- `go_to_step(id)` is the only way to advance; it is declared as a tool with `toolApproval: 'user-approval'`. Streaming pauses, the UI shows `approval-requested`, and the person presses **Approve** or **Deny**. Deny = stay on the current step.
- A typed back/exit control is always present and is **not** hidden behind the chat.

---

**US-4 · Explore the location**
As a person, I want to see where this step happens on a map and what is around it, so the rehearsal is anchored to a real place I will recognise.

Acceptance criteria:
- Explore renders a map (Maps Platform 3D where coverage + key allow; Leaflet/OSM + Digital Matatus data as the documented fallback) centred on the step's `lat`/`lng`/`placeId`.
- Maps grounding answers "what is near", "where is the entrance" and **displays source links**, distinguishing retrieved Maps facts from generated explanations.
- Maps Routes API produces a candidate route only after the person asks for one; the UI labels it "candidate path — confirm with your co-designer", and the rehearsal reflects the person's confirmation, not the API's word.
- The hospital's internal process (who to talk to, which queue, what to bring) is **never** inferred from Maps; it comes only from the co-designer's account or separately verified info, and the UI says so.

---

**US-5 · Rehearse the conversation**
As a person, I want to practise talking to the person at this step (e.g. the receptionist) so I know what to say before I get there.

Acceptance criteria:
- A `rolePlayRole` on the `RehearsalStep` switches the same step from Explore ("show me the reception") to Practise ("be the receptionist") — no new data structure.
- Practise uses **Gemini Live** for spoken role-play when the person has opted into audio; a **typed input is always available** as the guaranteed path (Live's own transcription is the floor, not the ceiling).
- Microphone/camera consent are explicit, per-session controls; camera input, if used, supports "explain this sign" but is never presented as obstacle detection or navigation truth.
- The person can end the role-play and return to the ladder with one action; ending does not advance the journey.

---

**US-6 · Pause, skip, repeat, or exit — always**
As a person, I want to pause, skip, repeat, or exit at any time without the assistant pushing me forward, so the practice stays under my control.

Acceptance criteria:
- `pause_rehearsal`, `exit_rehearsal`, and skip/repeat are direct controls on the page, not buried in chat.
- `exit_rehearsal` is under `toolApproval: 'user-approval'`; exiting is the person's call and is final for the session.
- `stop-auto-advance` (toolkit adapter) is active: no step ever auto-progresses on a timer.
- `confirm-actions` (toolkit adapter) backs up the AI SDK approval gate at the DOM layer for shared-device safety.

---

**US-7 · Save only what I approve**
As a person, I want to optionally save a short preparation checklist so I can come back to it, and I want nothing else saved unless I say so.

Acceptance criteria:
- `save_checklist` is under `toolApproval: 'user-approval'`; the person sees exactly what will be saved before approving.
- Only the approved checklist is persisted (app DB / local); no chat transcript, no inferred needs, no journey state is saved without an explicit save.
- Saved checklists appear in the profile surface and can be deleted there in one action.
- On a shared device, approvals may be signed with `experimental_toolApprovalSecret` so a modified client cannot forge one (stretch for Nov 7; default off unless time allows).

---

**US-8 · A teammate watches the spend meter**
As a teammate, I want to see the hub's live spend meter for our Gemini key so the demo does not run out of budget mid-flow.

Acceptance criteria:
- The Gemini key is server-side only (`.env.local`, gitignored, hub-issued, short-lived); the client never sees it.
- For Live sessions, the backend issues short-lived **ephemeral tokens** to the browser; the long-lived key never reaches the client.
- The hub's spend meter is visible to the team on a second screen, not in the person's UI.

---

### 2.3 Non-Goals (Nov 7)

- **Learn mode as a first-class mode.** The four-mode vision is the north star, but only Practise + Explore + Live-help ship for one journey on Nov 7. Learn-mode lesson generation is stubbed behind the same intent router.
- **NotebookLM Enterprise Podcast API.** Enterprise, separately billed from the Gemini key. Post-hackathon. Audio on Nov 7 comes from the toolkit `read-aloud` adapter + `@generative-a11y/ai-sdk` paced live-regions on the streamed narration.
- **Multiple saved journeys / multi-journey history.** One journey, one saved checklist at most. Profile holds preferences + optionally one checklist.
- **Before/after distress-shift outcome diagrams** (the anxiety-ladder outcome view). Authored as a v1.1 feature; `anticipatedDistress` is captured but not charted on Nov 7.
- **Obstacle detection / navigation.** Camera input supports "explain this sign"; it is never sold as a way-finding aid.
- **Gamification** (streaks, badges, challenges). Explicitly de-prioritised per the research differentiator: clear progress, repeatable practice, personal choice first.
- **Mobile-native build.** Responsive web app, phone- and laptop-usable. No native app, no app store.
- **Multi-tenant / accounts.** Single-device, single-session for the demo. Auth is out of scope; the profile is local to the device.

---

## 3. AI System Requirements

### 3.1 Tools & APIs

| Service | Used for | Provisioning | Nov 7? |
| :-- | :-- | :-- | :-- |
| **Gemini API** (text) | Narrate steps, adapt explanations, generate steps from co-designer's account (grounded). | Hub short-lived `GEMINI_API_KEY`, server-side only. | ✅ |
| **Gemini Live API** | Spoken role-play, Live help; optional camera. | Long-lived key server-side; browser gets short-lived ephemeral tokens via backend. | ✅ (typed alternative always available) |
| **Vercel AI SDK v7** (`ai`, `@ai-sdk/react`) | `streamText` in `app/api/chat/route.ts`; `useChat` on the client; `zod` tool schemas; `toolApproval` + `addToolApprovalResponse`. | Apache-2.0, bundled. | ✅ |
| **`@generative-a11y/ai-sdk` + `@generative-a11y/react`** | Paced live-region narration without focus theft; tool/approval/citation reports to AT. | Open-source (license-check before bundle). | ✅ |
| **Google Maps grounding** | "What's near / where is the entrance" — answers grounded in Maps, with source links. | Maps Platform key — **confirmed provisioned** alongside Gemini. | ✅ |
| **Google Maps Routes API** | Candidate route between locations. | Same Maps key. | ✅ (labelled "candidate, confirm") |
| **Maps Platform 3D (`<gmp-map-3d>`)** | Higher-fidelity exterior Explore (hospital approach, matatu forecourt); `flyCameraTo` step transitions. | Maps Platform key. | ✅ if Nairobi mesh coverage verifies on the day; **fallback Leaflet/OSM + Digital Matatus** |
| **Toolkit `server/` LLM lane** (`extract` / `reflect` / `interpretNeedsPrompt`) | Any profile inference, kept server-side so the key never leaves one place. | Existing toolkit code. | ✅ prefer over a new proxy |
| **Digital Matatus GTFS** | Nairobi matatu routes/stages — the factual backbone for the matatu-stage scenario. | Free public data. | ✅ (Explore fallback / enrichment) |
| **NotebookLM Enterprise Podcast API** | Audio lesson from a goal/doc/rehearsal. | Enterprise, separate billing. | ❌ post-hackathon |

### 3.2 Evaluation Strategy

The research is explicit that AI output here can be wrong about things that matter (a hospital's internal process, a route's accessibility), so evaluation is a first-class deliverable, not an afterthought.

**A. Grounding & citation accuracy (automated, before demo)**
- Build a 5-case benchmark from the co-designer's real journey + 4 generic Nairobi scenarios (1 hospital, 1 matatu stage, 1 public-service visit, 1 mixed).
- For each, assert: every factual claim in step narration is either (i) sourced from supplied co-designer text or Maps grounding, or (ii) explicitly labelled "generated — confirm".
- **Pass bar:** ≥ 90% of claims are sourced or labelled; 0 unlabelled claims about a hospital's internal process.

**B. Tool-approval integrity (automated, in CI)**
- A test harness drives the chat with a scripted persona and asserts that **no** `go_to_step`, `exit_rehearsal`, or `save_checklist` call ever executes without a positive `addToolApprovalResponse`. Deny must leave journey state unchanged.
- **Pass bar:** 100% over a 20-script suite including adversarial "please just go to the next step" prompts.

**C. Consent / data-retention audit (manual, in write-up)**
- Inspect storage after a full demo run; assert only the approved checklist is present. No chat transcript, no inferred needs, no step state.
- **Pass bar:** clean storage; documented in the write-up with a screenshot.

**D. Co-designer usability (live, on the day)**
- The co-designer completes the 7-step flow unaided; time-on-task and any points where they needed help are logged as toolkit issues.
- **Pass bar:** the co-designer completes the flow; logged issues feed the "toolkit issues logged" deliverable.

**E. Accessibility (live + Lighthouse)**
- `@generative-a11y/ai-sdk` paced narration verified with TalkBack/VoiceOver on the phone: step narration is announced without focus moving.
- Lighthouse Accessibility ≥ 95 on the companion page.
- **Pass bar:** both.

**F. Latency budget**
- Step narration first token ≤ 2s on hub Wi-Fi; full step narration ≤ 8s for a 120-word step.
- Maps grounding answer ≤ 3s.
- **Pass bar:** met on the demo laptop/phone over hub Wi-Fi.

---

## 4. Technical Specifications

### 4.1 Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │            Browser (one UI)              │
                      │  Next.js App Router page (RSC-first)     │
                      │  ┌──────────────────────────────────┐   │
                      │  │  useChat (AI SDK v7)              │   │
                      │  │  + useChatAccessibility           │   │
                      │  │  + A11yProvider (generative-a11y) │   │
                      │  │  → tool-* parts, approval-requested│  │
                      │  └──────────────────────────────────┘   │
                      │  Toolkit DOM adapters (run on the page): │
                      │  read-aloud · simplify-text · stop-auto- │
                      │  advance · confirm-actions · calm-browse│
                      │  (driven by AbilityModel profile)        │
                      └────────────┬────────────────────────────┘
                                   │ streamText (SSE) + tool calls
                                   │ + ephemeral Live tokens
                                   ▼
                      ┌─────────────────────────────────────────┐
                      │   app/api/chat/route.ts (intent router)  │
                      │   zod tool schemas, toolApproval gates    │
                      └──┬───────────┬───────────┬───────────┬───┘
                         │           │           │           │
                         ▼           ▼           ▼           ▼
                   text Gemini   Gemini Live  Maps ground  app DB
                   (Learn/      (Practise/   + Routes     (approved
                   explain)     Live help)   (Explore)    checklist only)
                         │           │           │
                         └───── toolkit/server LLM lane (extract/reflect/
                                interpretNeedsPrompt) — key stays here
```

- **One assistant surface, several purpose-specific services.** The route handler routes by intent (mode), not by wiring every API into one conversation.
- The chat *is* the journey controller; the mode switch picks which services the route handler calls.
- The toolkit's DOM adapters run on the rendered page exactly as on any web page — the companion is just another host.

### 4.2 Data Model — `RehearsalStep`

Adopted verbatim from the research (it merges `Remix-City-Immersive-Tour`'s `Landmark` and `anxiety-ladder`'s step model):

```ts
interface RehearsalStep {
  id: string;            // stable slug, e.g. "co-designer-step-3"
  name: string;          // "Hospital reception"
  placeId?: string;      // Google Place ID
  lat?: number;
  lng?: number;
  camRange?: number;     // camera framing for 3D
  camTilt?: number;
  camHeading?: number;
  category: string;      // "matatu-stage" | "hospital-reception" | "public-service" | ...
  description: string;   // plain language, what happens here
  highlights: string[];  // key things to notice → feeds describe_surroundings
  anticipatedDistress: number;   // 0–10, set by the person
  svgIcon?: string;
  narrationPrompt: string;       // seed for model narration of this step
  rolePlayRole?: string;         // e.g. "receptionist"; drives Practise
}
```

`anticipatedDistress` makes the ladder *the person's* ladder, not a fixed curve. `rolePlayRole` lets one step switch Explore→Practise without a new structure.

### 4.3 Profile — the AbilityModel (existing toolkit structure)

The MVP uses the **existing** `AbilityModel` (`toolkit/core/ability.js`), not a new store. It is a pure view over `mine.profile`:

- `supportAreas: string[]` — from the controlled vocabulary `['vision','hearing','motor','cognitive','reading','sensory']` (`SUPPORT_AREAS`).
- `freeText: string` — the person's own words.
- `language: string` — from `metaPreferences.language` (default `'standard'`; the toolkit already supports Sheng-adjacent values per Problem 1).
- `needs: Need[]` — modality-neutral needs; each surface derives its concrete setting. `dimension`/`value`/`strength` (`floor` | `preference` | `hint`)/`unit`.
- `readingLevel`, `confidence` — optional, projected from `fields`.

Writes go through the existing `setProfileField('fields.needs', …)` path — zero new plumbing. The companion reads the AbilityModel to set adapter strengths and the model's explanation length/language/audio prefs; it never writes to it without consent.

### 4.4 Integration Points

- **Vercel AI SDK v7** — `streamText` in `app/api/chat/route.ts`, `useChat` on the client, `zod` tool schemas, `toolApproval` + `addToolApprovalResponse`. Reference architecture: `BjornMelin/tripsage-ai` (MIT) for route handlers, streaming, BYOK key handling.
- **Toolkit adapters** — import from `tools/adapters/*` and `toolkit/skills/builtin/calm-browsing.md`. No new adapters required for the first cut.
- **Toolkit server LLM lane** — `server/` with `GEMINI_API_KEY` enabled; prefer `extract`/`reflect`/`interpretNeedsPrompt` over a new proxy. The companion's route handler calls this lane for any profile inference.
- **Toolkit skill (new)** — `toolkit/skills/builtin/rehearse-journey.md`, modeled on `calm-browsing.md`, composing `motion-reducer` + `dark-mode` + `focus-mode` + `simplify-text` + `read-aloud` + `stop-auto-advance` + `confirm-actions`. This is the team's contribution back to the toolkit (judging: "Use of the toolkit and contribution back" 20%).
- **Maps Platform** — `<gmp-map-3d>` + `flyCameraTo` for Explore if Nairobi mesh coverage + provisioned key verify on the day; else Leaflet + OSM + Digital Matatus data. Maps grounding + Routes via the same key.
- **Digital Matatus** — GTFS data + transit map for the matatu-stage scenario; the `data/` directory of `aaronfrank254-oss/matatu-tracker` is the most reusable part (license-check before bundling code).
- **App DB** — local storage for the MVP (one device, one session). Persist only approved checklists. No backend DB on Nov 7.

### 4.5 Security & Privacy

- **Key handling.** Hub-issued `GEMINI_API_KEY` and the Maps Platform key live server-side only (`.env.local`, gitignored, short-lived). The client never sees either. For Gemini Live, the backend mints short-lived **ephemeral tokens** for the browser; the long-lived key stays on the server.
- **No-memory zones.** The toolkit's taxonomy (`toolkit/core/taxonomy.js`) marks `health`, `finance`, `government` as **no-memory-by-default**. The hospital scenario falls under `health`: the Librarian must not log observations or extract memories unless the person explicitly opts in. The companion inherits this — no chat transcript, no inferred needs, no journey state is saved without an approved `save_checklist`.
- **Consent gate.** `toolApproval: 'user-approval'` on `go_to_step`, `exit_rehearsal`, `save_checklist`. Deny = stay put / nothing saved. Optional `experimental_toolApprovalSecret` signs approvals on a shared device so a modified client cannot forge one (stretch).
- **Co-designer data.** Made-up test profiles only, per the hackathon code of conduct. The co-designer's real journey is used with their consent for the demo; their personal data is not persisted beyond the demo without explicit opt-in. Photo/video consent respected.
- **Camera/mic.** Explicit per-session consent; clear on/off controls. Camera input supports "explain this sign" and is never presented as obstacle detection.

---

## 5. Risks & Roadmap

### 5.1 Phased Rollout

**MVP — Nov 7 demo (the hard done-bar)**
The co-designer runs the complete 7-step flow live, unaided:
1. States intent ("I want to practise visiting this hospital" — the co-designer's real journey).
2. Sets preferences (written to the AbilityModel profile via the existing `setProfileField` path).
3. Walks reviewed steps (seeded `RehearsalStep` set authored before the day from the co-designer's account).
4. Explores the location (Maps Platform 3D if coverage+key verify, else Leaflet/OSM + Digital Matatus).
5. Rehearses the role-play (Gemini Live spoken, with a typed alternative always available).
6. Pauses / skips / repeats / exits via direct controls — `go_to_step` and `exit_rehearsal` under `toolApproval`.
7. Optionally saves a checklist (`save_checklist` under `toolApproval`); only the approved checklist is kept.

Deliverables shipped: working code in a public repo (or PR to the toolkit), README + write-up, demo video, ≥ 1 toolkit issue logged, `toolkit/skills/builtin/rehearse-journey.md` contributed back.

**Pre-hackathon build order (Fri 6 Nov brief → Sat 7 Nov)**
- *Thu 5 Nov (today):* PRD signed off; co-designer interview scheduled to author the seeded `RehearsalStep` set; repo scaffolded.
- *Fri 6 Nov:* Next.js + AI SDK v7 scaffold; route handler with intent router; 5 tools declared; tool-approval gate wired; AbilityModel read path; toolkit adapters wired; seeded step set authored; Maps key verified for Nairobi coverage; spend meter visible.
- *Sat 7 Nov AM:* Co-designer dry-run; fix what breaks; log toolkit issues; record demo video.
- *Sat 7 Nov PM:* Live demo by the co-designer.

**v1.1 — Weeks after the hackathon**
- Learn mode as a first-class mode (lesson outlines from a goal/document).
- Before/after distress-shift outcome diagrams (the anxiety-ladder outcome view) across sessions.
- Multi-journey history in the profile; revisit saved checklists.
- `experimental_toolApprovalSecret` for shared-device approval signing.
- NotebookLM Enterprise Podcast API for audio lessons (same `RehearsalStep` outline feeds the Podcast API — no data-model change).

**v2.0 — The four-mode vision**
- Learn / Practise / Explore / Live help all first-class, sharing one profile, one assistant, one tool-approval gate.
- Extends to interview preparation, learning a practical skill, understanding a document, preparing for a public-service visit.
- Spaced-repetition progress spine (Wondering-style) applied to real situations.
- Optional: MCP tool-driven rehearsal (`@modelcontextprotocol/sdk`) only if the rehearsal needs to call an external MCP server; AI SDK v7 native tool calling is simpler and is the default.

### 5.2 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
| :-- | :-- | :-- | :-- |
| Nairobi 3D mesh coverage missing for the co-designer's actual hospital | Medium | Medium | Explore is built behind an interface; Leaflet/OSM + Digital Matatus fallback verified before the day. The rehearsal works on either. |
| Gemini Live fails mid-role-play on hub Wi-Fi | Medium | High | Typed alternative is the guaranteed path, always available, never gated behind voice working. Live is an enhancement, not a dependency. |
| Hub Gemini key spend runs out mid-demo | Medium | High | Spend meter on a second screen; seeded `RehearsalStep` set loads instantly so the demo does not depend on generation; narration capped at 120 words/step. |
| Model invents the hospital's internal process from Maps | High | High (fit-to-person, safeguarding) | Maps grounding is for location only; internal process comes only from the co-designer's account or separately verified info. UI labels Maps facts vs. generated explanation. Eval §3.2-A enforces 0 unlabelled claims. |
| Approval gate bypassed by a prompt-injection-style "just go to the next step" | Low | Critical | Tool-approval is enforced in the SDK, not the prompt. Eval §3.2-B asserts no `go_to_step`/`exit_rehearsal`/`save_checklist` ever fires without a positive `addToolApprovalResponse`. |
| Co-designer cannot drive the demo unaided | Medium | Critical (30% of judging) | Co-designer is a full team member from Thu; seeded step set is *their* journey; dry-run on Sat AM; direct controls (pause/exit) are DOM buttons, not chat commands. |
| `@generative-a11y` license not bundlable | Low | Medium | License-check before bundle (research flags this). If blocked, fall back to manual aria-live pacing; the toolkit's own `read-aloud` adapter still covers the rendered page. |
| `matatu-tracker` code license blocks bundling | Medium | Low | Only the `data/` directory is needed (research's explicit guidance); code is reimplemented in React. |
| Profile inference writes without consent | Low | High (safeguarding) | Companion never writes to the AbilityModel without an approved save; inference, if any, goes through the toolkit `server/` lane which already enforces the no-memory zones. |

---

## 6. Differentiator (carry-forward from research)

The strongest differentiator is **learning that leads into supported practice, with accessibility built into the experience.** For this audience, prioritise clear progress, repeatable practice, and personal choice before streaks, badges, or competitive challenges. Rehearse the Journey is the first complete use case; the four-mode vision is where it grows after it works.

---

## Appendix A — Judging criteria mapped to this PRD

| Criterion | Weight | Where this PRD addresses it |
| :-- | :-- | :-- |
| Fit to the problem and the person it serves | 30% | §1 Problem, §2.1 Personas, US-1 (co-designer's real journey), §3.2-D co-designer usability eval |
| Working solution, shown by the co-designer | 30% | §1 Success criterion 1, US-3..7, §5.1 MVP done-bar |
| Use of the toolkit and contribution back | 20% | §2.2 US-2 (AbilityModel), §4.4 new `rehearse-journey` skill, §4.3 existing toolkit adapters, §1 success criterion 5 |
| Documentation and potential to continue | 20% | This PRD, README + write-up, demo video, logged toolkit issues, §5.1 v1.1/v2.0 roadmap |

## Appendix B — Open questions for the team

1. **Co-designer interview slot.** When (Thu 5 or Fri 6 Nov) do we sit with the co-designer to author the seeded `RehearsalStep` set from their real journey? This is on the critical path.
2. **Maps Platform key confirmation.** "Confirmed provisioned" — what is the key's daily quota, and does it include Maps 3D? If quota is tight, default to Leaflet/OSM and treat 3D as a v1.1 stretch.
3. **Demo device.** Phone or laptop for the on-stage demo? The companion must be tested on that exact device + the co-designer's preferred AT (TalkBack/VoiceOver) before Sat AM.
4. **Repo home.** New public repo, or a PR to the toolkit? A PR to the toolkit scores higher on "contribution back" but adds review overhead; a new repo is faster. Recommend: new repo + a PR for the `rehearse-journey` skill only.
5. **`experimental_toolApprovalSecret` on Nov 7?** Default off (timeline risk); turn on only if §5.2 risks materialise and time allows.
