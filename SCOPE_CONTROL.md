# Kioo Companion Scope Control

## Source of truth

Exact frontend replication of `d:\downloads\Audry\kioo_companion.html`, audited in full
before implementation. The attached master prompt is treated as project instructions;
the user's request is to proceed step by step and avoid hallucinating.

## In scope

- Exact replication of the five source application screens.
- Header, footer, inline logo and mascot.
- Existing CSS tokens, layout, responsive behaviour, focus states and animations.
- Four source scenarios and all four source levels for each scenario.
- Existing local scripted conversation engine and its branching behaviour.
- Browser speech recognition and speech synthesis with existing fallbacks.
- Existing conversation state, navigation, controls and summary behaviour.
- Both existing modals and all existing accessibility controls.
- Persistence under `kioo_companion_prefs`.
- Verification at desktop and mobile sizes, including keyboard and supported/unsupported
  speech environments.
- Necessary fixes only when required to preserve verified prototype behaviour.

## Out of scope

- New features, scenarios, levels, scoring, rankings or progression systems.
- Accounts, authentication, analytics, maps/GPS, databases or backend endpoints.
- New AI providers or a generic chatbot replacement.
- New design systems, UI redesigns or unrequested accessibility controls.
- Invented ambient audio implementation for the existing `soundEffects` preference.
- Claiming AI for Accessibility Toolkit integration where the prototype only contains a
  reference or future integration hook.

## Proposed but not implemented

- React + Vite + JavaScript + CSS as the target frontend stack, pending approval because
  the repository currently exposes an existing toolkit package rather than an established
  frontend stack.
- A component structure based on the source boundaries, only where it preserves exact
  behaviour and does not add unnecessary abstractions.

## Change gate

Work proceeds in small stages. Before each stage, state the source section, files,
functions/interactions and acceptance criteria. After each stage, report changed files,
implemented behaviour, tests, visual comparison, discrepancies and blockers. Stop and
wait for approval before beginning the next stage.
