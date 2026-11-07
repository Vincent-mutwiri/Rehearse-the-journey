# S4.5 verification — 7 November 2026

| Check | Result | Evidence / remaining work |
|---|---|---|
| Keyboard-only session | Passed | Tab/Shift+Tab navigation and Enter/Space activation: start, typed reply, preference, mic toggle, pause, reconnect, exit, restart. Focus follows replaced controls. |
| Visible focus | Passed | Solid 3px ink outline on cream; `keyboard-landing.png` and `keyboard-session.png`. |
| Browser accessibility tree | Passed | Named transcript log, connection status, textbox, and companion image are exposed. This does not establish screen-reader usability. |
| Visualizer motion | Passed | Connecting, thinking, and generated-audio modes stop RAF and keep canvas pixels static for OS/page reduced motion. Source audio track remains live; animation resumes. |
| Joy reduced motion | Regression checked | Static pose snaps immediately instead of continuing damped motion on extra demand frames. See the conversation regression result. |
| Linux Orca control | User confirmed silent | User reported Orca continued reading after Pause/Exit. Orca was stopped; a desktop launcher named “Turn off screen reader” was installed. User confirmed they no longer hear the screen reader. |
| App narration stop | Passed | Stop page speech invokes browser speech cancellation; Pause resets the read-aloud preference. |
| Full Orca usability | Pending | Run with the co-designer’s preferred speech rate and confirm labels, reading order, live transcript, focus changes, and speech overlap. |
| Provider-backed voice | Blocked | Unmocked WebRTC reached the isolated OpenAI bot. The provider returned HTTP 401 for the configured key; no greeting or complete STT/LLM/TTS exchange was verified. Pause removed the audio element and paused the session. |
| Physical microphone and speaker | Pending | Synthetic microphone input does not prove laptop hardware or audible output. Retest after provider access is fixed. |
| Co-designer character acceptance | Pending | No acceptance of Joy’s appearance or gestures has been reported. |

`automated-results.json` records the local keyboard/tree/visualizer regression.
`provider-voice-results.json` records the incomplete provider attempt. The provider
rejection is recorded here without credential values or raw service logs.
Screenshots contain fictional SDK-mocked conversation only.

Run from `apps/rehearse-journey/client`, with Vite running:

```bash
pnpm build
python3 test/rehearsal-e2e.py http://127.0.0.1:3003
python3 test/s45-accessibility.py http://127.0.0.1:3003
```

The second regression uses `test/visualizer-fixture.html` for generated oscillator
audio; it makes no provider calls. Substitute the actual preview port.

## Linux co-designer review

1. Open `http://localhost:3003` on the laptop. Start Orca through the desktop’s
   Accessibility settings when the co-designer is ready. Orca is currently off.
2. Tab to Hospital Reception and press Enter. Confirm the scenario name and
   connection status are understandable, and typing works with the mic off.
3. Tab through preferences and controls. Confirm pressed states and the live
   transcript are announced without overwhelming the conversation.
4. Once provider access works, turn the mic on explicitly and say “I am here for
   my pretend appointment.” Check the transcript and audible reply. Use fictional
   details only. Pause during Joy’s voice, reconnect, then exit; confirm silence
   and no active microphone. Reconnect starts a fresh bot exchange.
5. For the app’s page narration, use “Stop page speech” or the read-aloud toggle.
   For Orca itself, activate the desktop **Turn off screen reader** launcher.
   Pause/Exit stop the conversation and page narration; Orca can continue reading
   the changed interface until the person turns it off.
6. Ask whether Joy’s expression, motion, and voice feel comfortable. Record
   acceptance or requested changes without personal or medical information.

## Desktop stop button

The installed launcher is `/home/vincent/Desktop/Turn off screen reader.desktop`.
It runs `../../linux/stop-screen-reader.sh` through Bash at this checkout’s absolute
path. The source launcher is in `../../linux/turn-off-screen-reader.desktop`.
It disables GNOME’s screen-reader setting and terminates Orca. It leaves general
accessibility support enabled. It does not stop Joy or browser page narration.
The launcher path must be regenerated if the checkout moves.
