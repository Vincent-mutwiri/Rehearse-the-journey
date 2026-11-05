# Open-Source Integration Research — Rehearse the Journey (Problem Statement 6)

## The problem, restated

Build a short virtual rehearsal of a Nairobi journey (matatu stage, hospital
reception, public service) that adapts to a person's access preferences,
self-paced, with the ability to exit at any time — for a person with a
cognitive or psychosocial disability who finds such journeys stressful.

The AI for Accessibility Toolkit adapts *any web page* via pure-DOM,
reversible adapters (see `tools/adapters/_primitives.js`). This document picks
an open-source stack that the rehearsal runs on, and lists the libraries and
data sources that plug into it. The hackathon hub provisions a budgeted Gemini
key, so the AI layer uses Gemini through the Vercel AI SDK with the key kept
server-side.

## The spine: Next.js App Router + Vercel AI SDK v7 + Gemini

The rehearsal is a Next.js App Router app in which a streaming chat drives
the journey, and each journey action is a **tool call** the model proposes
and the person approves. This makes consent a first-class primitive instead
of a hand-rolled gate, which matches both the problem statement ("exit
whenever I choose", "without the system guessing what they meant") and the
toolkit's consent-gated `AbilityModel`.

- **Next.js (App Router) + React 19** — the host page. RSC-first, with a
  `"use client"` boundary for the chat surface. The toolkit's pure-DOM
  adapters run on its rendered DOM exactly as they would on any web page.
- **Vercel AI SDK v7** (`ai`, `@ai-sdk/react`, Apache-2.0) —
  `streamText` in a route handler (`app/api/chat/route.ts`) streams the
  Gemini response to a `useChat` hook. Tools are declared with `zod`
  schemas; the model calls them, the client renders typed `tool-*` parts.
  Reference: <https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-with-tool-calling>.
- **Google Gemini via `@google/genai`** — the hub provides a short-lived
  `GEMINI_API_KEY` with a live spend meter. Keep it server-side in
  `.env.local` (gitignored) and never expose it to the client. The AI SDK's
  `google` provider wraps `@google/genai`. Use the hub's `extract` /
  `reflect` / `interpretNeedsPrompt` lane on the toolkit's own `server/`
  for any profile inference, so the key stays in one place.

### Tool-approval as the consent gate

This is the architectural choice that ties the stack to the problem.

- Declare rehearsal actions as tools: `go_to_step`, `describe_surroundings`,
  `pause_rehearsal`, `exit_rehearsal`.
- Mark sensitive ones with `toolApproval: { exit_rehearsal: 'user-approval',
  go_to_step: 'user-approval' }`. Streaming pauses, the UI shows
  `approval-requested`, and the person presses **Approve** or **Deny** via
  `addToolApprovalResponse`. Deny = stay put; the journey does not advance
  unless the person says so.
- For an extra layer on a shared device, sign approvals with
  `experimental_toolApprovalSecret` so a modified client cannot forge an
  approval. This mirrors the hackathon code of conduct: "submission and
  payment happen only after the user explicitly confirms", and the toolkit's
  rule that any write an inference could be wrong about goes through
  proposal/consent, never silently.

The sibling project `BjornMelin/tripsage-ai` (MIT, Next.js 16 + AI SDK v7 +
Supabase + Upstash, <https://github.com/BjornMelin/tripsage-ai>) documents
the same pattern in production as "Tool Approval Gates: critical operations
pause streaming and require explicit user consent." Use it as a reference
architecture for route handlers, streaming, and BYOK key handling.

## The UX blueprint: an exposure ladder

`CYPIAPT-LNDSE/anxiety-ladder` (<https://github.com/CYPIAPT-LNDSE/anxiety-ladder>,
open-source, HTML/CSS/JS) is a web app for managing anxiety through exposure
ladders. Its user journeys are almost exactly the Rehearse-the-Journey spec,
and porting its model to React gives the rehearsal its shape for free:

- **Ladder creation** — a journey goal (e.g. "go to Mbagathi Hospital
  reception") broken into ordered steps, each with an anticipated-distress
  rating the person sets in their own words, saved as they go.
- **Reviewing a step** — "I want a comforting message to be displayed once
  I signal start", "I want a cancel button to appear after clicking start",
  "I want an input field when reviewing an exercise so that I can reflect
  and record the experience in my own words", "I want to scroll up the steps
  and visualise one to three at a time so I'm not intimidated by all the steps".
- **Outcome monitoring** — before/after exposure ratings visible in a
  diagram, so the person sees their anxiety shift across sessions.

Map this onto the rehearsal as: a ladder = a journey; a step = a
`RehearsalStep` (see data model below); the model narrates each step, the
person approves advancing, and `pause_rehearsal` / `exit_rehearsal` are the
cancel and back buttons the ladder already specifies.

## The accessibility layer: paced screen-reader narration

`@generative-a11y/react` and `@generative-a11y/ai-sdk`
(<https://generativea11y.com/docs/integrations/ai-sdk>, open-source, npm)
are a purpose-built accessibility layer for the AI SDK. Wrap `useChat` in
`useChatAccessibility` and `A11yProvider` and you get:

- **Paced live-region updates** — assistant text is announced to screen
  readers as it streams, without moving focus, so a TalkBack or VoiceOver
  user hears the step narration without being yanked around the page.
- **Composed `onFinish` / `onError` callbacks** — it layers on top of
  existing chat logic rather than replacing it.
- **Tool, approval, and citation reports** — the adapter surfaces tool
  parts, approval IDs, and source IDs to assistive tech, which matters here
  because every journey advance is a tool approval.

This covers the cognitive and low-vision co-designer dimension the toolkit's
own `read-aloud` adapter targets, but at the chat-stream layer where the
narration actually lives. The toolkit's DOM adapters (below) still handle
text size, simplification, and calm.

## Nairobi journey data — the real-world anchor

- **Digital Matatus** (<https://www.digitalmatatus.com>) — free, public GTFS
  data + transit map of Nairobi matatu routes, collected by the University
  of Nairobi. The factual backbone for the "matatu stage" scenario.
- **`aaronfrank254-oss/matatu-tracker`**
  (<https://github.com/aaronfrank254-oss/matatu-tracker>) — open-source,
  mobile-first Nairobi matatu finder (HTML/CSS/JS + Leaflet + OSM), 80
  routes, stages, fares, crowdsourced updates. Lift its `data/` and the
  Leaflet map for the route panel, then wrap each route step as a
  `RehearsalStep`. Check repo for license before bundling code; the `data/`
  directory is the most reusable part.
- **`ma3map/api`** (<https://github.com/ma3map/api>) — Node.js Nairobi
  transit routing API, if live routing is wanted instead of static data.
- **`punitshah/Nairobi-Matatu-Map`**
  (<https://github.com/punitshah/Nairobi-Matatu-Map>) — additional Nairobi
  matatu map reference.
- **OpenTripPlanner** (<https://github.com/opentripplanner/OpenTripPlanner>)
  — general multi-modal trip planner that consumes GTFS (heavier-weight).

For hospital and government-service scenarios, encode the steps by hand as
`RehearsalStep`s from the co-designer's own account of the journey; the
point is to rehearse *their* journey, not a generic one.

## Mapping / rendering

- **Leaflet + OpenStreetMap** — lightweight, mobile-friendly, already used
  by `matatu-tracker`. Render the real route on a real Nairobi map inside
  the rehearsal step panel.
- **Three.js / A-Frame** (MIT) — optional, for an immersive 3D walkthrough
  of a hospital reception or matatu stage forecourt. Runs in any browser, no
  headset required, matching the hackathon's "laptops and phones, no extra
  hardware" rule. Use only if the co-designer wants it; the chat-driven
  path is the default and works without it.

## Narration / text support — already in this toolkit, apply directly

The toolkit ships these adapters; no external dependency is needed, and
they run on the Next.js page's DOM:

- `tools/adapters/read-aloud.js` — text-to-speech for the step instructions.
- `tools/adapters/simplify-text.js` — plain-language rewrites of the step text.
- `tools/adapters/define-words.js` — inline word definitions for comprehension.
- `tools/adapters/bionic-reading.js` — emphasis-aided reading.
- `tools/adapters/stop-auto-advance.js` — pace control (no forced progression).
- `tools/adapters/confirm-actions.js` — exit/commit consent gate.
- `toolkit/skills/builtin/calm-browsing.md` skill — `motion-reducer` +
  `dark-mode` + `focus-mode` for sensory calm.

`@generative-a11y/ai-sdk` complements these: it paces the *streaming chat*
narration, while the toolkit's adapters handle the *rendered page*.

## Reference patterns from sibling hackathon projects (non-open-source, hub-provisioned)

Two projects in the same workspace (`MCP-maps-3d`,
`Remix-City-Immersive-Tour`) are not open-source, but their architecture
transfers and the hub provisions their dependencies.

- **Google Maps Platform Web Components — Maps 3D + Places UI Kit**
  (`Remix-City-Immersive-Tour`) — `<gmp-map-3d>` photoreal 3D mesh tiles and
  `<gmp-advanced-place-details-compact>` place cards. A higher-fidelity
  exterior option (hospital approach, matatu stage forecourt);
  `flyCameraTo` gives smooth, eased step transitions. Caveats: Nairobi 3D
  mesh coverage is limited — verify before relying on it;
  `ROADMAP`/`SATELLITE` are the safe fallback. Maps Platform needs its own
  API key (the Demo Key is prototyping-only); confirm one is provisioned
  alongside the Gemini key, or fall back to Leaflet/OSM.
- **MCP tool-driven rehearsal** (`MCP-maps-3d`) — the sibling exposes
  `view_location_google_maps` and `directions_on_google_maps` as MCP tools.
  The same idea is expressed here with AI SDK v7 native tool calling, which
  is simpler in a Next.js app; reach for `@modelcontextprotocol/sdk` only if
  the rehearsal needs to call an external MCP server.
- **Server-side Gemini proxy** (both siblings) — an Express app keeps
  `GEMINI_API_KEY` server-side and streams responses as ndjson. The
  toolkit's own `server/` already has a server-side LLM lane
  (`GEMINI_API_KEY` enables `extract`/`reflect`/`interpretNeedsPrompt` so
  clients never see the key) — prefer that lane over a new proxy.
- **`Landmark` data model + per-step camera calibration**
  (`Remix-City-Immersive-Tour` `landmarksData.ts`, `calculateCameraParameters`)
  — a ready template for a `RehearsalStep` (see below).
- **Budgeted API-key UX** — `.env` for the build-time key plus an in-app
  modal that pastes the team's short-lived hub key into `localStorage`, with
  a "Reset to demo key" escape. Matches the hub's "short-lived API token
  with a live spend meter" without hardcoding it.

## The `RehearsalStep` data model

Adapted from `Remix-City-Immersive-Tour`'s `Landmark` interface and
`anxiety-ladder`'s step model:

```ts
interface RehearsalStep {
  id: string;            // stable slug, e.g. "mbagathi-reception"
  name: string;          // "Mbagathi Hospital reception"
  placeId?: string;      // Google Place ID if exteriors use Maps Platform
  lat?: number;
  lng?: number;
  camRange?: number;     // camera framing if rendered in 3D
  camTilt?: number;
  camHeading?: number;
  category: string;      // "matatu-stage" | "hospital-reception" | ...
  description: string;   // what happens here, in plain language
  highlights: string[];  // key things to notice, used by describe_surroundings
  anticipatedDistress: number;   // 0–10, set by the person (anxiety-ladder)
  svgIcon?: string;
  narrationPrompt: string;       // seed text for the model's narration of this step
}
```

`anticipatedDistress` is the anxiety-ladder field that makes the ladder
*the person's* ladder, not a fixed difficulty curve. The model uses it to
pace its narration (more reassurance on higher-rated steps) and the UI uses
it to colour the ladder rungs.

## How it fits together (suggested integration)

1. **Build the rehearsal as a Next.js App Router page.** The page renders the
   current `RehearsalStep` (name, description, map or 3D view, distress
   rating) and a `useChat` surface driven by `app/api/chat/route.ts`. The
   chat *is* the journey controller.
2. **Declare the journey as tools.** `go_to_step(id)`,
   `describe_surroundings()`, `pause_rehearsal()`, `exit_rehearsal()` — all
   `zod`-schema'd, with `go_to_step` and `exit_rehearsal` under
   `toolApproval`. Deny = stay put.
3. **Wire `@generative-a11y/ai-sdk`.** Wrap `useChat` in
   `useChatAccessibility` + `A11yProvider` so step narration is paced to
   screen readers without focus theft.
4. **Compose a new toolkit skill**, e.g.
   `toolkit/skills/builtin/rehearse-journey.md`, modeled on
   `calm-browsing.md`, that wires:
   - `motion-reducer` + `dark-mode` + `focus-mode` — calm (sensory)
   - `simplify-text` + `read-aloud` — comprehension (cognitive)
   - `stop-auto-advance` — pace control
   - `confirm-actions` — exit control (psychosocial), backup to the
     AI SDK tool-approval gate
   All of these already exist; no new adapters required for a first cut.
5. **Drive from the AbilityModel.** The person's stored preferences (already
   in `toolkit/core/`) set the adapter strengths; the `controller/` surface
   gives voice/text control to "go to the next step" or "exit now", which
   the AI SDK routes to the corresponding tool call.

## License notes

- Vercel AI SDK (`ai`, `@ai-sdk/react`): Apache-2.0 — safe to bundle.
- `@generative-a11y/react`, `@generative-a11y/ai-sdk`: open-source (check
  repo for license before bundling).
- `anxiety-ladder`: open-source (check repo for license; the code is
  reusable as a UX blueprint even if not bundled).
- `tripsage-ai`: MIT — usable as a reference architecture.
- Leaflet, Three.js, A-Frame: MIT — safe to bundle.
- Digital Matatus data: released free for public use (GTFS-compatible).
- `matatu-tracker`: check repo for license before bundling code; the `data/`
  directory is the most reusable part.
- Google Maps Platform and Gemini are not open-source; the hub provisions
  short-lived, budgeted keys for the hackathon day.
