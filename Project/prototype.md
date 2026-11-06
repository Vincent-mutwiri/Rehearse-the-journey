Your kioo_companion.html[kioo_companion.html](sandbox:/workspace/scratch/8250740778ec/upload/kioo_companion.html) is a **self-contained conversation rehearsal web app prototype** called **Kioo Companion**. It turns your discussion into a usable flow: choose an everyday situation, select a practice level, speak or type a response, and review the session.

The most important distinction is that **speech input and spoken playback use browser capabilities, while the conversation responses come from predefined scripts—not a connected AI model**.

Below is a detailed explanation based on reading the code. I have not run it in a browser.

**1. How the file is organised**

The file contains three parts:

| Part | What it does in this app |
|---|---|
| HTML | Defines the screens, buttons, text boxes, settings, and mascot drawings |
| CSS inside `<style>` | Controls colours, sizing, layout, animations, and visual accessibility preferences |
| JavaScript inside `<script>` | Switches screens, manages conversations, handles speech, and saves preferences |

Everything is in one file. There are no imported JavaScript frameworks, external stylesheets, backend endpoints, or database connections.

The mascots and logo are **inline SVG drawings**: shapes described directly in the HTML, rather than downloaded image files.

**2. The user journey**

There are **five main screens**, despite comments in the code saying six.

| Screen | What the user does |
|---|---|
| Welcome | Reads the introduction and starts practising |
| Scenario selection | Chooses a situation to rehearse |
| Difficulty selection | Chooses one of four practice levels |
| Conversation | Listens, speaks or types, uses hints, pauses, or exits |
| Summary | Reviews recent phrases and chooses what to practise next |

Two additional overlays provide **Accessibility Settings** and **How It Works**.

These are not separate web pages. They are `<section>` elements in the same document. JavaScript hides and shows them using:

```css
.hidden {
  display: none !important;
}
```

The `showScreen()` function stops current voice activity, hides the other screens, reveals the requested one, and attempts to move keyboard focus to its heading.

There is no URL-based routing, so the browser’s Back button does not track these screen changes.

**3. The four practice scenarios**

The `SCENARIOS` object contains all the dialogue content.

| Scenario | Main character | Practice focus |
|---|---|---|
| Hospital Reception | Receptionist Joy | Explaining a visit, providing information, asking where to go |
| Matatu Stage | Conductor Otieno | Asking about fares, payment, boarding, and stops |
| Government Service Office | Customer Officer Wanjiku | Asking about documents, queues, and service steps |
| Asking for Directions | Passerby Maina | Asking about landmarks, turns, and alternative routes |

Each scenario has four levels, giving **16 scenario-and-level combinations**.

The Nairobi references make the rehearsal locally recognisable. However, fares, hospital rooms, payment details, and directions are **hardcoded practice content**. The app does not check them against real services or live maps.

**4. How the “chaos levels” are represented**

The interface uses gentler practice-level names:

| Level | Intended experience | Actual implementation |
|---|---|---|
| 1: Easy Start | Short, predictable exchanges | Simple scripted questions and suggested responses |
| 2: Everyday Practice | More detailed conversation | Longer scripted exchanges and follow-up questions |
| 3: Handling Changes | Minor unexpected changes | Scenarios such as a room move, diversion, or queue-system outage |
| 4: Busy Environment | Interacting with multiple people | Alternates between named characters in sequence |

Level 4 does **not** generate overlapping conversations, simultaneous voices, or a noisy crowd. It changes the speaker label and dialogue—for example, from a receptionist to a waiting patient and back again.

All characters use the same selected speech-synthesis voice.

The user can choose any level immediately. There are no locked stages, scores, or automatic increases in difficulty.

One behavioural detail: **changing level starts a new conversation and clears the existing history**. It does not preserve the current conversation while adjusting its complexity.

**5. What happens during a conversation**

When the user selects a level, `startConversation()`:

1. Finds the selected scenario and level.
2. Resets the turn counter and conversation history.
3. Sets the opening speaker and message.
4. Updates the screen labels.
5. Clears the response box.
6. Displays suggested replies.
7. Opens the conversation screen.
8. Schedules spoken playback after 500 milliseconds.

The conversation screen contains:

- A badge identifying the scenario and level.
- A mascot.
- The current speaker’s name.
- The latest companion message.
- A status indicator such as “Listening” or “Preparing a response”.
- Suggested response buttons.
- A microphone button.
- An editable response box.
- Pause, restart, and exit controls.

It displays **only the latest companion message**, rather than a scrolling chat transcript.

The hint buttons fill the response box. They do not submit automatically, allowing the user to edit the wording first.

**6. How speech input works**

The code looks for either of these browser interfaces:

```javascript
window.SpeechRecognition || window.webkitSpeechRecognition
```

If available, it creates a recognition instance with:

```javascript
recognition.continuous = false;
recognition.interimResults = true;
recognition.lang = 'en-KE';
```

In practical terms:

- `continuous = false` requests a single recognition session rather than indefinite listening.
- `interimResults = true` allows provisional recognition results.
- `en-KE` requests Kenyan English recognition.

Provisional words appear in the text box’s placeholder. Final recognised words are added to the editable response.

The user must then press **Send Response**. Speech is not automatically submitted.

The code also handles microphone permission denial, no detected speech, and other recognition errors. When recognition is unavailable, it directs the user to type.

The file itself contains no audio-upload code, but it also does not establish how a browser’s speech-recognition service processes audio. It should not be presented as guaranteed fully local voice processing.

**7. How spoken playback works**

The companion’s messages are read using:

```javascript
new SpeechSynthesisUtterance(text)
```

The code first tries to find a Kenyan English voice, then another English voice. If neither is selected, it leaves voice selection to the browser.

Speech speed can be set to:

- `0.8` — slower.
- `1.0` — normal.
- `1.2` — faster.

While speaking, the app animates the mascot’s mouth and changes the status indicator. While listening, it animates the antenna and ears.

These animations indicate application state; they are not lip-sync or emotion detection.

The **Repeat Message** button reads the latest response again. There is no dedicated setting to disable automatic spoken playback.

**8. How the conversation “engine” works**

The function name suggests AI:

```javascript
generateAIResponse(userMessage, conversationHistory, scenario, level)
```

Its current implementation selects a local branching function:

```javascript
const branchFunction = scenarioData.levels[level].branch;
const turnResult = branchFunction(userMessage, appState.conversationTurn);
```

Each branch returns an object resembling:

```javascript
{
  speaker: "Receptionist Joy",
  text: "Do you have your National ID or clinic registration card?",
  hints: [
    "Yes, I have my ID right here.",
    "No, I forgot it at home."
  ]
}
```

Responses are selected using:

- The number of turns already completed.
- Simple keyword checks such as `includes("appointment")`.
- Fixed fallback responses.

For example, Hospital Level 1 checks for phrases such as “not sure”, “lost”, or “confused” and returns a reassuring response.

However, many branches depend mainly on turn number. In Government Level 1, the first response gives National ID instructions even if the user asked about another service. Some other levels return the same response repeatedly.

Although `conversationHistory` is passed into `generateAIResponse()`, it is **not used to understand the conversation**.

This makes the prototype predictable for demonstrations, but it cannot reliably interpret arbitrary replies, remember details meaningfully, or answer unexpected questions.

**9. How state and storage work**

The `appState` object acts as the app’s working memory. It tracks:

| State | Purpose |
|---|---|
| `scenario` and `level` | Current practice selection |
| `conversationTurn` | Which scripted turn comes next |
| `conversationHistory` | Submitted replies and subsequent companion responses |
| `currentSpeaker` and `currentAiMessage` | What is currently displayed |
| `isListening`, `isSpeaking`, `isPaused` | Interaction status |
| `preferences` | Accessibility settings |

Preferences are saved with `localStorage` under:

```javascript
kioo_companion_prefs
```

They can persist when the user reloads the page in the same browser.

Conversation history is kept only in memory. This code does not save sessions, recordings, progress reports, or transcripts to persistent storage.

The GitHub link to the AI for Accessibility Toolkit is simply a link. No toolkit integration or preference synchronisation has been implemented.

**10. Accessibility features and their limitations**

The file includes useful accessibility foundations:

- Native buttons and labelled form controls.
- Visible keyboard focus outlines.
- Mostly large button targets.
- Text alongside status colours.
- Editable speech transcription.
- Suggested response hints.
- Reduced-motion styles.
- Named dialog overlays.
- Screen-reader announcements for changing content.
- An exit that does not require confirmation.

However, several features need correction:

| Feature | Issue in the code |
|---|---|
| Text-size settings | They change the body font size, but most text uses `rem`, which refers to the root `<html>` size. Much of the interface will not enlarge as intended. |
| Hide transcript | Hides the entire response container, including **Send Response**. This removes the normal way to submit a reply. |
| Settings dialogs | Do not move focus inside when opened or trap keyboard focus, despite the comment claiming a keyboard trap. |
| Home logo | Uses a clickable `<div>` with `role="link"` but has no Enter-key handler. |
| Hints setting | Does not immediately rerender hints; the change takes effect when hints are next rendered. |
| Ambient sounds | The setting is saved, but no sound playback implementation exists. |
| Screen announcements | The whole main region and individual message areas are live regions, which could produce excessive announcements. |

“Enhanced contrast” mainly thickens borders and adds outlines. It does not switch to a different colour palette.

**11. Pause and exit need stronger handling**

The code stops current microphone activity and speech when the user pauses or exits. However, delayed actions are not cancelled.

For example:

1. A user submits a response.
2. The app schedules a reply after 600 milliseconds.
3. The user immediately exits.
4. The scheduled reply can still run and speak.

Similarly:

- **Send Response** still works while paused.
- **Repeat Message** can speak while paused.
- Restarting clears the paused state but does not reset the pause button’s label and styling.
- Multiple submissions are not blocked while a response is pending.

For this particular app, these are important fixes because dependable pause and exit controls are central to the intended experience.

**12. What the summary actually measures**

The summary shows the scenario, level, number of recorded messages, and the user’s last three replies.

It does not assess anxiety, confidence, conversation quality, or learning gains.

The phrase “Exchanges Recorded” is slightly misleading: the count is the number of stored individual messages, not complete back-and-forth exchanges. The opening companion message is also missing from the recorded history.

The displayed “Useful Phrases Practised” are simply the latest user replies; the code does not evaluate their usefulness.

**What this means for your project**

This file provides a substantial **scripted prototype of the conversation-first experience** you and Audry discussed. It already expresses scenario choice, user-selected difficulty, speech and text interaction, suggested replies, and a supportive summary.

Before extending it with AI or navigation, the highest-priority work is to make pause and exit reliable, preserve response submission when the transcript is hidden, fix text scaling and dialog keyboard behaviour, and clearly label the scenario details as practice examples.