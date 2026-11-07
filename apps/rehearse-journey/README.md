# Rehearse the Journey (Kioo Companion) — Application Guide

**Hackathon:** AI for Accessibility Hackathon · Sat Nov 7, 2026 · Senses Hub, Nairobi  
**Problem Statement 6:** Rehearse the Journey  
**Team 6:** Austin Obimbo, Gathoni Karume, Bakhoya Audry Imbukwa, John Mokaya, Vincent Mutwiri

See the root [`README.md`](../../README.md) for the full project overview and architecture diagram.

---

## Structure

```text
apps/rehearse-journey/
├── bot/        Python Pipecat WebRTC backend — FlowEngine, MultiAgentBus, Maps Routes v2, Gemini Image Gen
├── client/     React 18 + TypeScript + Three.js (R3F) + Leaflet + AI for Accessibility Toolkit integration
└── mobile/     React Native companion view & native toolkit adapter bridge
```

## Quick Start

### 1. Bot (Python — Terminal 1)
```bash
cd apps/rehearse-journey/bot
uv sync
uv run bot.py          # serves on http://localhost:7860
```

### 2. Client (React — Terminal 2)
```bash
cd apps/rehearse-journey/client
pnpm install
pnpm dev --port 3000   # serves on http://localhost:3000
```

Open **http://localhost:3000** in Chrome.

---

## Core Experiences

1. **Practice Arena (`RehearsalView` & `JoyCenterpiece`):**
   - Two-mascot 3D stage (**Receptionist Joy / Conductor Otieno / Officer Wanjiku / Passerby Maina** on the left, **Visitor/Passenger Amani** on the right) with live speech bubbles beneath each speaker.
   - Side-by-side **Interactive StoryCard & Practice Map** rail with manual slide navigation (`Back` / `Next` / `Done`), SVG floor plans, live Google Maps Routes API (v2) Leaflet routes, and async Gemini illustrations.
   - **Ask for Clarity** toggle (20% / 40% / 60% ambiguity practice) and 20-case **Approval Gate** (`RehearsalApprovalController`).
2. **Interactive Stories:**
   - Dedicated story & map browser accessible from the Dashboard for all 8 scenario and diversion stories.
3. **Get Directions (`Directions.tsx`):**
   - Real-time route search (`Google Maps Routes API v2` + `Leaflet`), step-by-step navigator, **Nairobi Matatu Saccos & Fare Estimates** (with exact Kiswahili conductor phrases), **Google Places** visual previews & landmarks, **Open-Meteo** live weather, and **Sensory Environment Estimates** (crowd busyness, quiet hours, and noise dB levels).
4. **Decompress (`CalmMe.tsx`):**
   - Persistent top-right grounding button that pauses active rehearsal audio and speaks Kenyan Swahili/Sheng affirmations followed by a slow count from *Moja* to *Tano*.
5. **AI for Accessibility Toolkit Integration (`rehearsalToolkit.ts` & `ToolkitProfileAndSkillsPanel.tsx`):**
   - Embedded `createToolkit` (`Librarian` + `Datastore`), 5 `AbilityModel` profile presets, 4 composable `SKILL.md` playbooks (`librarian.resolveSkill`), 9 live accessibility adapters (`ReadAloud`, `PlainerWords`, `StopAutoAdvance`, `MotionReducer`, `SensoryCalmAdapter`, `BigTargets`, `DarkMode`, `ReadingRuler`, `BionicReading`), and `AdapterProvider` MCP registration.
