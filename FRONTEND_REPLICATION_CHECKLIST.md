# Kioo Companion Frontend Replication Checklist

## Audit scope and source

This is an audit of the supplied prototype at `d:\downloads\Audry\kioo_companion.html`.
The file was read in full: 2,182 lines, one inline `<style>` block, and one inline
`<script>` block. The prototype is the source of truth. No frontend implementation
code has been added during this audit.

Status vocabulary: `NOT STARTED`, `IN PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `BLOCKED`.
All replication items below are `NOT STARTED` because the target frontend has not yet
been scaffolded or implemented.

## Application shell and visual system

| Item | Source location | Intended behaviour | Implementation | Verification |
|---|---:|---|---|---|
| Sticky accessible header | 540-569 | Remains visible; contains brand and two modal controls | NOT STARTED | NOT STARTED |
| Brand logo inline SVG | 545-552 | High-contrast speech-bubble logo; clicking brand returns home | NOT STARTED | NOT STARTED |
| Brand name/subtitle | 553-554 | `KIOO COMPANION` / `Nairobi Voice Rehearsal` | NOT STARTED | NOT STARTED |
| Main container | 570-571 | Full-height main region, max width 1000px | NOT STARTED | NOT STARTED |
| Footer | 1060-1071 | Contentinfo footer with prototype copy | NOT STARTED | NOT STARTED |
| Four-colour palette | 8-20 | Red `#C62828`, black `#111111`, white `#FFFFFF`, teal `#006B5B` | NOT STARTED | NOT STARTED |
| Typography | 12-19, 73-101 | System font; 20px base, 23px large, 26px extra-large; line-height 1.5 | NOT STARTED | NOT STARTED |
| Shared buttons/cards/badges/grids | 126-259 | Preserve sizes, borders, radii, hover/active states and responsive wrapping | NOT STARTED | NOT STARTED |
| Mascot SVG and animation CSS | 261-313 | Preserve shape, colours, idle/listening/speaking states | NOT STARTED | NOT STARTED |
| Responsive/reduced-motion CSS | 35-53, 518-526 | Respect media preference and calm-mode class | NOT STARTED | NOT STARTED |

## Screens

### 1. Welcome / home (`screen-welcome`, lines 572-637)

| Component/action | Intended behaviour | Implementation | Verification |
|---|---|---|---|
| Friendly mascot | Inline SVG, idle state | NOT STARTED | NOT STARTED |
| Heading | `Practise Conversations. Build Confidence.` | NOT STARTED | NOT STARTED |
| Introductory copy | Self-paced Nairobi conversation rehearsal explanation | NOT STARTED | NOT STARTED |
| Start Practising Now | Navigates to scenario selection | NOT STARTED | NOT STARTED |
| Customise Accessibility | Opens settings modal | NOT STARTED | NOT STARTED |
| How It Works | Opens guide modal | NOT STARTED | NOT STARTED |
| Safe & Predictable card | Reassurance about no scoring/rankings/countdown | NOT STARTED | NOT STARTED |
| Always In Control card | Reassurance about pause/repeat/exit | NOT STARTED | NOT STARTED |

### 2. Scenario selection (`screen-scenarios`, lines 639-701)

| Component/action | Exact source value | Intended behaviour | Implementation | Verification |
|---|---|---|---|---|
| Back to Home | `showScreen('welcome')` | Return home | NOT STARTED | NOT STARTED |
| Hospital Reception | key `hospital` | Select scenario, then show difficulty | NOT STARTED | NOT STARTED |
| Matatu Stage | key `matatu` | Select scenario, then show difficulty | NOT STARTED | NOT STARTED |
| Government Service Office | key `government` | Select scenario, then show difficulty | NOT STARTED | NOT STARTED |
| Asking for Directions | key `directions` | Select scenario, then show difficulty | NOT STARTED | NOT STARTED |
| Scenario descriptions/icons/buttons | Lines 654-696 | Preserve exact source copy and layout | NOT STARTED | NOT STARTED |

### 3. Difficulty selection (`screen-difficulty`, lines 703-769)

All four levels are unlocked and selectable. The selected scenario badge updates before
this screen is shown.

| Level | Exact title/badge | Intended behaviour | Implementation | Verification |
|---|---|---|---|---|
| 1 | `Easy Start` / `Calm & Predictable` | Start local scripted conversation | NOT STARTED | NOT STARTED |
| 2 | `Everyday Practice` / `Natural Conversation` | Start local scripted conversation | NOT STARTED | NOT STARTED |
| 3 | `Handling Changes` / `Gentle Variations` | Start local scripted conversation | NOT STARTED | NOT STARTED |
| 4 | `Busy Environment` / `Multi-Character Interaction` | Start local scripted conversation | NOT STARTED | NOT STARTED |
| Back to Scenarios | `showScreen('scenarios')` | Return to scenario selection | NOT STARTED | NOT STARTED |

### 4. Main conversation (`screen-conversation`, lines 771-889)

| Component/action | Intended behaviour | Implementation | Verification |
|---|---|---|---|
| Scenario/level HUD badges | Show current selections | NOT STARTED | NOT STARTED |
| Change Level | Stop voice activity and show difficulty screen | NOT STARTED | NOT STARTED |
| End Practice | Stop voice activity and populate summary | NOT STARTED | NOT STARTED |
| Live mascot/dialogue card | Show current speaker, message, hints and animated state | NOT STARTED | NOT STARTED |
| Repeat Message | Speak latest AI response again | NOT STARTED | NOT STARTED |
| Status strip/dot | Show ready, listening, speaking, paused, processing or error text | NOT STARTED | NOT STARTED |
| Suggested response hints | Render hint buttons; clicking one fills and focuses textarea | NOT STARTED | NOT STARTED |
| Main microphone | Start/stop recognition or focus typed fallback | NOT STARTED | NOT STARTED |
| Live transcript textarea | Populate from speech; permit editing and typing | NOT STARTED | NOT STARTED |
| Clear Text | Empty textarea and restore placeholder | NOT STARTED | NOT STARTED |
| Send Response | Validate, store user turn, generate next scripted response | NOT STARTED | NOT STARTED |
| Pause/Resume | Stop activity, change label/status, resume safely | NOT STARTED | NOT STARTED |
| Restart Scenario | Confirm then reset conversation | NOT STARTED | NOT STARTED |
| Finish / Exit | End practice and show summary | NOT STARTED | NOT STARTED |

### 5. Practice summary (`screen-summary`, lines 891-937)

| Component/action | Intended behaviour | Implementation | Verification |
|---|---|---|---|
| Completion illustration/heading/message | Supportive completion state | NOT STARTED | NOT STARTED |
| Scenario/level/turn badges | Reflect current session | NOT STARTED | NOT STARTED |
| Useful phrases list | Show up to last three user phrases, or opening-dialogue fallback | NOT STARTED | NOT STARTED |
| Practise This Scenario Again | Restart same scenario/level | NOT STARTED | NOT STARTED |
| Try Another Level | Navigate to difficulty | NOT STARTED | NOT STARTED |
| Choose Another Scenario | Navigate to scenarios | NOT STARTED | NOT STARTED |
| Return to Home | Navigate to welcome | NOT STARTED | NOT STARTED |

## Modals and form controls

### Accessibility settings modal (`modal-settings`, lines 939-1037)

| Control | Source values/default | Intended behaviour | Implementation | Verification |
|---|---|---|---|---|
| Text size radios | `normal` default, `large`, `xlarge` | Apply 20px/23px/26px body classes | NOT STARTED | NOT STARTED |
| AI speech speed radios | `0.8`, `1.0` default, `1.2` | Apply speech synthesis rate | NOT STARTED | NOT STARTED |
| Enhanced High Contrast Borders | false default | Apply enhanced border/shadow class | NOT STARTED | NOT STARTED |
| Reduce Animations / Calm Mode | false default | Disable animations/transitions and mascot mood animation | NOT STARTED | NOT STARTED |
| Show Suggested Response Hints | true default | Show/hide hints container | NOT STARTED | NOT STARTED |
| Show Response Textarea & Review Box | true default | Show/hide transcript container | NOT STARTED | NOT STARTED |
| Enable Level 3/4 Ambient Stage Sounds | false default | Persist `soundEffects` preference; source contains no audio implementation | NOT STARTED | NOT STARTED |
| Close / Save & Close | Close modal, restore focus to opener | NOT STARTED | NOT STARTED |
| Toolkit reference | Existing non-integration reference copy | Preserve without claiming integration | NOT STARTED | NOT STARTED |

### How it works modal (`modal-guide`, lines 1039-1057)

Preserve all five instructions and text: Listen, Respond, Edit anytime, Unlimited time,
and Exit whenever you choose. Close button and `Got It!` both close the modal and restore
focus to the opener. Status: NOT STARTED / NOT STARTED.

## Application state and navigation

The source `appState` is at lines 1079-1108. Preserve scenario, level, turn count,
conversation history, current speaker/message, listening/speaking/paused flags, current
screen, speech capability flags, recognition instance, selected voice, and all seven
accessibility preferences.

Navigation paths: welcome → scenarios → difficulty → conversation → summary; brand/home
returns to welcome; back buttons return one step; change level returns to difficulty;
summary actions return to conversation restart, difficulty, scenarios, or welcome.
Screen transitions stop recognition and synthesis, scroll to top, and focus the first
heading for screen-reader awareness.

## Scenarios and conversation engine

`SCENARIOS` begins at line 1110 and contains exactly 4 scenarios × 4 levels = 16
combinations:

| Key | Title | Primary speaker | Secondary speaker |
|---|---|---|---|
| `hospital` | Hospital Reception | Receptionist Joy | Waiting Patient |
| `matatu` | Matatu Stage | Conductor Otieno | Fellow Passenger |
| `government` | Government Service Office | Customer Officer Wanjiku | Information Desk Officer |
| `directions` | Asking for Directions | Passerby Maina | Shopkeeper Amina |

Each level contains an opening, suggested hints, and a turn-aware branch function. Level 4
uses the secondary speaker where defined. Preserve every opening, hint, branch, keyword
condition, turn-dependent response, speaker, and response text from lines 1110-1508.
No generic chatbot replacement is allowed.

## JavaScript function inventory

All functions below are present in the prototype and require an observable-equivalence
mapping. Source locations are approximate line starts from the audited file.

| Function | Line | Implementation | Verification |
|---|---:|---|---|
| `initializeApp` | 1516 | NOT STARTED | NOT STARTED |
| `showScreen` | 1527 | NOT STARTED | NOT STARTED |
| `selectScenario` | 1553 | NOT STARTED | NOT STARTED |
| `selectLevel` | 1565 | NOT STARTED | NOT STARTED |
| `promptChangeDifficulty` | 1570 | NOT STARTED | NOT STARTED |
| `startConversation` | 1580 | NOT STARTED | NOT STARTED |
| `getLevelTitle` | 1613 | NOT STARTED | NOT STARTED |
| `renderHints` | 1623 | NOT STARTED | NOT STARTED |
| `detectSpeechCapabilities` | 1652 | NOT STARTED | NOT STARTED |
| `setupSpeechRecognition` | 1663 | NOT STARTED | NOT STARTED |
| `toggleMicrophone` | 1734 | NOT STARTED | NOT STARTED |
| `startListening` | 1759 | NOT STARTED | NOT STARTED |
| `stopListening` | 1768 | NOT STARTED | NOT STARTED |
| `updateMicUI` | 1780 | NOT STARTED | NOT STARTED |
| `setupTextToSpeech` | 1803 | NOT STARTED | NOT STARTED |
| `speakAIResponse` | 1823 | NOT STARTED | NOT STARTED |
| `stopAISpeech` | 1860 | NOT STARTED | NOT STARTED |
| `repeatLatestResponse` | 1868 | NOT STARTED | NOT STARTED |
| `submitUserResponse` | 1877 | NOT STARTED | NOT STARTED |
| `generateAIResponse` | 1919 | NOT STARTED | NOT STARTED |
| `handleNextAiTurn` | 1935 | NOT STARTED | NOT STARTED |
| `clearUserTranscript` | 1957 | NOT STARTED | NOT STARTED |
| `togglePauseConversation` | 1966 | NOT STARTED | NOT STARTED |
| `confirmRestartConversation` | 1987 | NOT STARTED | NOT STARTED |
| `endPracticeSession` | 1994 | NOT STARTED | NOT STARTED |
| `restartSameConversation` | 2024 | NOT STARTED | NOT STARTED |
| `updateStatusBadge` | 2031 | NOT STARTED | NOT STARTED |
| `setMascotMood` | 2045 | NOT STARTED | NOT STARTED |
| `loadAccessibilityPreferences` | 2062 | NOT STARTED | NOT STARTED |
| `saveAccessibilityPreferences` | 2074 | NOT STARTED | NOT STARTED |
| `updatePreference` | 2082 | NOT STARTED | NOT STARTED |
| `applyAllPreferences` | 2088 | NOT STARTED | NOT STARTED |
| `openAccessibilityModal` / `closeAccessibilityModal` | 2147 / 2152 | NOT STARTED | NOT STARTED |
| `openGuideModal` / `closeGuideModal` | 2158 / 2163 | NOT STARTED | NOT STARTED |

## Browser APIs, persistence, fallback and error handling

| Dependency/behaviour | Source | Intended behaviour | Implementation | Verification |
|---|---:|---|---|---|
| `DOMContentLoaded` | 1512 | Initialize once DOM is ready | NOT STARTED | NOT STARTED |
| `SpeechRecognition` / `webkitSpeechRecognition` | 1652-1798 | Kenyan English `en-KE`, interim results, start/stop/error/end handling | NOT STARTED | NOT STARTED |
| `speechSynthesis` / `SpeechSynthesisUtterance` | 1803-1865 | Prefer en-KE, then English voice; cancel/repeat; apply rate | NOT STARTED | NOT STARTED |
| Unsupported recognition | 1652-1660, 1734-1756 | Focus textarea and provide typed fallback message | NOT STARTED | NOT STARTED |
| Microphone errors | 1695-1710 | Distinguish blocked, no speech, and other unavailable states | NOT STARTED | NOT STARTED |
| `localStorage` key `kioo_companion_prefs` | 2062-2080 | Load/save merged preferences; catch unavailable-storage errors | NOT STARTED | NOT STARTED |
| `window.confirm` | 1987-1992 | Confirm scenario restart | NOT STARTED | NOT STARTED |
| `window.scrollTo` | 1540 | Scroll on navigation; obey reduced-motion preference | NOT STARTED | NOT STARTED |
| Escape key | 2169-2177 | Close either open modal | NOT STARTED | NOT STARTED |
| Error/empty response validation | 1877-1917 | Require text before submit; show user-facing status | NOT STARTED | NOT STARTED |

## Verification matrix

Not yet run because implementation has not started. Each cell must become `VERIFIED`
only after exercising the corresponding scenario and level in a browser.

| Scenario | Level 1 | Level 2 | Level 3 | Level 4 |
|---|---|---|---|---|
| Hospital Reception | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED |
| Matatu Stage | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED |
| Government Service Office | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED |
| Asking for Directions | NOT STARTED | NOT STARTED | NOT STARTED | NOT STARTED |

Additional required checks: desktop/mobile layout comparison, keyboard navigation, both
modals, settings persistence, text sizes, high contrast, reduced motion, hints,
transcript editing, typed input, speech recognition/synthesis where supported, pause,
resume, repeat, restart, level change, exit, and unsupported-microphone fallback.

## Proposed implementation sequence

1. Obtain approval for the proposed React + Vite + JavaScript + CSS stack and target
   location in this repository.
2. Section 1: implement and verify the global shell only.
3. Section 2: implement and verify the welcome screen.
4. Section 3: implement and verify scenario selection.
5. Section 4: implement and verify difficulty selection.
6. Section 5: implement and verify the conversation UI and state.
7. Section 6: implement and verify the summary screen.
8. Sections 7-8: implement and verify both modals and persistence.
9. Sections 9-11: migrate the complete engine, speech adapters, and state controls.
10. Run the full 16-combination and accessibility verification matrix, then update this
    checklist with evidence and discrepancies.

## Audit ambiguities requiring approval

- The supplied filename is `kioo_companion.html`; the attached prompt refers to
  `kioo_companion(1).html`. I used the supplied file as the source of truth.
- The existing repository is not a React/Vite frontend. React + Vite + JavaScript/CSS is
  therefore recorded as a proposal only; no scaffolding has been created.
- The prototype includes a `soundEffects` preference and setting label, but the audited
  source contains no actual ambient audio playback. Preserve the preference/UI first;
  do not invent audio behaviour without approval.
- The source contains emoji characters; terminal output may display mojibake depending on
  shell encoding. Browser-visible text should be checked from the source bytes during
  implementation rather than guessed from terminal rendering.
