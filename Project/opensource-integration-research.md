# Open-Source Integration Research — Rehearse the Journey (Problem Statement 6)

## The problem, restated

Build a short virtual rehearsal of a Nairobi journey (matatu stage, hospital
reception, public service) that adapts to a person's access preferences,
self-paced, with the ability to exit at any time — for a person with a
cognitive or psychosocial disability who finds such journeys stressful.

The AI for Accessibility Toolkit adapts *any web page* via pure-DOM, reversible
adapters (see `tools/adapters/_primitives.js`), so the rehearsal should be a
web experience the adapters then run on. This document lists open-source
projects that are compatible with the toolkit and can be integrated to build
the rehearsal experience.

## Compatible open-source projects

### 1. Nairobi journey data — the real-world anchor

- **Digital Matatus** (https://www.digitalmatatus.com) — free, public GTFS data
  + transit map of Nairobi matatu routes, collected by the University of
  Nairobi. The factual backbone for the "matatu stage" scenario.
- **`aaronfrank254-oss/matatu-tracker`**
  (https://github.com/aaronfrank254-oss/matatu-tracker) — open-source,
  mobile-first Nairobi matatu finder (HTML/CSS/JS + Leaflet + OSM), 80 routes,
  stages, fares, crowdsourced updates. You can lift its `data/` and the Leaflet
  map directly, then wrap each route step as a rehearsal "step."
- **`ma3map/api`** (https://github.com/ma3map/api) — Node.js Nairobi transit
  routing API, if you want live routing instead of static data.
- **`punitshah/Nairobi-Matatu-Map`**
  (https://github.com/punitshah/Nairobi-Matatu-Map) — additional Nairobi matatu
  map reference.
- **OpenTripPlanner** (https://github.com/opentripplanner/OpenTripPlanner) —
  general multi-modal trip planner that can consume GTFS data (heavier-weight
  than the others).

### 2. The rehearsal engine — how the person steps through

- **Twine** (https://www.twinery.org, MIT-licensed) — open-source interactive
  nonlinear storytelling; exports standalone HTML with branching scenarios,
  self-paced, exit-anytime. This is the closest match to "practise the steps at
  your own pace," and its HTML output is exactly what the toolkit's adapters
  operate on.
- **A-Frame** (https://aframe.io, MIT) — open-source WebXR framework (HTML
  entity-component over Three.js). For an optional immersive 3D rehearsal of a
  hospital reception / matatu stage. Runs in any browser, no headset required —
  matches the hackathon constraint of "laptops and phones, no extra hardware."

### 3. Psychosocial / cognitive angle — informed by prior work

- **SafeSpaceVR** (Frontiers in VR, 2026; open-source)
  (https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2026.1785069/full)
  — open-source, clinician-guided VR for social anxiety with an asymmetric
  "guide outside the headset" architecture. Strong reference for the
  self-paced, exit-anytime, supported-rehearsal pattern the problem asks for.
- **Sensorium** (https://d9.army/work/sensorium) — live, no-install browser
  condition simulators (including dementia/cognition) with adjustable
  intensity dials. Good model for the "control the sensory demands" dial the
  statement mentions.
- **`vrapeutic/EllieTale-WebXR`**
  (https://github.com/vrapeutic/EllieTale-WebXR, GPL-3.0) — gamified WebXR
  therapeutic application addressing attention skills; another reference for
  paced, therapeutic browser experiences.
- **`ian030590/StrokeTrainer`**
  (https://github.com/ian030590/StrokeTrainer) — web-based React rehab app for
  motor, cognitive, and speech practice with local settings and calibration.
  Reference for self-paced cognitive practice patterns.

### 4. Mapping / rendering

- **Leaflet + OpenStreetMap** — already used by matatu-tracker; render the real
  route on a real Nairobi map inside the rehearsal, lightweight and
  mobile-friendly.
- **Three.js** — if you want a 3D reception walkthrough without A-Frame's full
  entity model.

### 5. Narration / text support — already in this toolkit, apply directly

The toolkit already ships these adapters; no external dependency is needed:

- `tools/adapters/read-aloud.js` — text-to-speech for the step instructions.
- `tools/adapters/simplify-text.js` — plain-language rewrites of the step text.
- `tools/adapters/define-words.js` — inline word definitions for comprehension.
- `tools/adapters/bionic-reading.js` — emphasis-aided reading.
- `tools/adapters/stop-auto-advance.js` — pace control (no forced progression).
- `tools/adapters/confirm-actions.js` — exit/commit consent gate.
- `toolkit/skills/builtin/calm-browsing.md` skill — `motion-reducer` +
  `dark-mode` + `focus-mode` for sensory calm.

## How it fits together (suggested integration)

The toolkit's adapters are pure-DOM and reversible (see
`tools/adapters/_primitives.js`), so the cleanest path is:

1. **Build the rehearsal as a normal web page.** Twine export HTML for a
   step-by-step branch, or an A-Frame scene for a 3D walk-through, or a Leaflet
   panel that steps along a Digital Matatus route.
2. **Compose a new skill**, e.g. `toolkit/skills/builtin/rehearse-journey.md`,
   modeled on `calm-browsing.md`, that wires:
   - `motion-reducer` + `dark-mode` + `focus-mode` — calm (sensory)
   - `simplify-text` + `read-aloud` — comprehension (cognitive)
   - `stop-auto-advance` — pace control
   - `confirm-actions` — exit control (psychosocial)
   All of these already exist — no new adapters required for a first cut.
3. **Drive from the AbilityModel.** The person's stored preferences (already in
   `toolkit/core/`) set the adapter strengths; the `controller/` surface gives
   the text/voice control to "go to the next step" or "exit now."

## License notes

- Twine, A-Frame, Leaflet: MIT — safe to bundle and distribute.
- Digital Matatus data: released free for public use (GTFS-compatible).
- SafeSpaceVR: open-source (check repo for license before bundling).
- EllieTale-WebXR: GPL-3.0 — derivative works must also be GPL-3.0.
- matatu-tracker: check repo for license before bundling code directly; the
  `data/` directory is the most reusable part.
