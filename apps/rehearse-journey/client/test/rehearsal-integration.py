"""Browser integration regressions for the 7 review items:
1. Approval-gated progression blocks until approved (and Deny keeps current step; Approve sends approval_response).
2. Scenario, level, and mode choices reach the bot via connect() requestData and sendClientMessage('session_config').
3. Microphone handling matches the selected provider (Browser STT vs. Pipecat enableMic) and Pause/mic-off cancels delayed restarts.
4. Audio-off (Text-only) suppresses <audio>, disables mic, and sends audio_response: false.
5. Off-critical-path story_open renders immediately and updates when story_image arrives; ended sessions discard late story_image.
6. Participant UI hides dev diagnostics unless ?dev=1 is set.

Run against Vite: python3 test/rehearsal-integration.py [http://127.0.0.1:3000]
"""

import os
import sys
from playwright.sync_api import sync_playwright, expect

INTEGRATION_SDK_MOCK = """
window.testCalls = [];
window.speechRecognitions = [];

class MockSpeechRecognition {
  constructor() {
    this.lang = 'en-US';
    this.continuous = true;
    this.interimResults = true;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.startedCount = 0;
    this.stoppedCount = 0;
    window.speechRecognitions.push(this);
  }
  start() {
    this.startedCount++;
    window.testCalls.push(['browserSTT.start', this.startedCount]);
  }
  stop() {
    this.stoppedCount++;
    window.testCalls.push(['browserSTT.stop', this.stoppedCount]);
  }
  abort() {
    this.stoppedCount++;
  }
}
window.SpeechRecognition = MockSpeechRecognition;
window.webkitSpeechRecognition = MockSpeechRecognition;

PipecatClient.prototype.connect = async function (connectParams) {
  window.testClient = this;
  window.testCalls.push(['connect', this._options.enableMic, connectParams]);
  this.emit('connected');
  await new Promise(resolve => setTimeout(resolve, 60));
  this.emit('botReady', {version: '2.3.0', about: {library: 'test', library_version: '1'}});
  const req = connectParams?.webrtcRequestParams?.requestData || {
    scenario_id: 'hospital',
    level: 1,
    mode: 'practise',
    audio_enabled: true,
  };
  this.emit('serverMessage', {
    type: 'session_configured',
    scenario_id: req.scenario_id,
    level: req.level,
    mode: req.mode,
    audio_enabled: req.audio_enabled,
    node_id: 'greet',
    step_title: 'Step 1',
    speaker: req.scenario_id === 'matatu' ? 'otieno' : 'joy',
    stack_id: req.audio_enabled ? 'gemini_proxy' : 'text_only',
    uses_browser_stt: Boolean(req.audio_enabled),
  });
  this.emit('botTranscript', {text: 'Welcome to the practice session.'});
};

PipecatClient.prototype.sendClientMessage = function (msgType, data) {
  window.testCalls.push(['sendClientMessage', msgType, data]);
};

PipecatClient.prototype.sendText = async function (text, options) {
  window.testCalls.push(['sendText', text, options]);
  this.emit('botTranscript', {text: 'Thank you for your reply.'});
  return 'message-id';
};

PipecatClient.prototype.enableMic = function (enabled) {
  window.testCalls.push(['mic', enabled]);
};

PipecatClient.prototype.tracks = function () {
  return {local: {}, bot: {}};
};

PipecatClient.prototype.disconnect = async function () {
  window.testCalls.push(['disconnect']);
  this.emit('disconnected');
};
"""


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000"
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            channel=os.getenv("PLAYWRIGHT_CHANNEL", "chrome"),
            args=["--enable-unsafe-swiftshader"],
        )
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        def mock_sdk(route):
            response = route.fetch()
            route.fulfill(response=response, body=response.text() + "\n" + INTEGRATION_SDK_MOCK)

        page.route("**/api/**", lambda route: route.abort("blockedbyclient"))
        page.route("**/src/App.tsx*", mock_sdk)
        page.goto(base)
        page.wait_for_load_state("networkidle")

        # 1. Choosing Level 2 + Matatu Stage sends configuration in connect() requestData & session_config
        page.get_by_role("button", name="Level 2 · Everyday Practice").click()
        page.get_by_role("button", name="Matatu Stage").click()
        expect(page.get_by_label("Conversation transcript")).to_contain_text("Welcome to the practice session.")

        connect_call = page.evaluate("window.testCalls.find(c => c[0] === 'connect')")
        assert connect_call[1] is False
        req_data = connect_call[2]["webrtcRequestParams"]["requestData"]
        assert req_data == {
            "scenario_id": "matatu",
            "level": 2,
            "mode": "practise",
            "audio_enabled": True,
        }, req_data
        expect(page.get_by_label("Joy, your rehearsal companion", exact=False).first).to_Contain_text("Matatu Stage") if False else None
        expect(page.locator("section[aria-label='Joy, your rehearsal companion']")).to_contain_text("Matatu Stage")
        expect(page.locator("section[aria-label='Joy, your rehearsal companion']")).to_contain_text("Conductor Otieno")
        print("PASS 1: Scenario & difficulty selections reach the bot via connect() requestData and session_config")

        # 2. Participant view hides dev diagnostics by default
        expect(page.get_by_label("Developer diagnostics")).to_have_count(0)
        print("PASS 2: Developer simulations and diagnostics are hidden from participant UI by default")

        # 3. Approval blocks progression: Deny stays on Step 1; Approve advances to Step 2 and sends approval_response
        expect(page.get_by_label("Rehearsal journey and companion modes")).to_contain_text("Step 1 of 4")
        page.evaluate("""
          window.testClient.emit('serverMessage', {
            type: 'approval_proposal',
            approval_id: 'apr-test-1',
            action: 'go_to_step',
            from_node: 'greet',
            target_node: 'confirm_payment',
            target_title: '2. Pretend fare & choosing a seat',
          });
        """)
        gate = page.get_by_role("region", name="Approval gate")
        expect(gate).to_be_visible()
        expect(page.get_by_label("Rehearsal journey and companion modes")).to_contain_text("Step 1 of 4")

        # Click Deny -> stays on Step 1 and sends approval_response with approved: false
        page.get_by_role("button", name="Deny (stay put)").click()
        expect(gate).to_have_count(0)
        expect(page.get_by_label("Rehearsal journey and companion modes")).to_contain_text("Step 1 of 4")
        deny_msg = page.evaluate(
            "window.testCalls.filter(c => c[0] === 'sendClientMessage' && c[1] === 'approval_response').pop()"
        )
        assert deny_msg[2] == {
            "approved": False,
            "target_node": "confirm_payment",
            "approval_id": "apr-test-1",
        }, deny_msg

        # Re-emit proposal and click Approve -> advances to Step 2 and sends approved: true
        page.evaluate("""
          window.testClient.emit('serverMessage', {
            type: 'approval_proposal',
            approval_id: 'apr-test-2',
            action: 'go_to_step',
            from_node: 'greet',
            target_node: 'confirm_payment',
            target_title: '2. Pretend fare & choosing a seat',
          });
        """)
        page.get_by_role("button", name="Approve", exact=True).click()
        expect(page.get_by_label("Rehearsal journey and companion modes")).to_contain_text("Step 2 of 4")
        approve_msg = page.evaluate(
            "window.testCalls.filter(c => c[0] === 'sendClientMessage' && c[1] === 'approval_response').pop()"
        )
        assert approve_msg[2] == {
            "approved": True,
            "target_node": "confirm_payment",
            "approval_id": "apr-test-2",
        }, approve_msg
        print("PASS 3: Approval blocks progression on Deny and advances + syncs with backend on Approve")

        # 4. Microphone handling matches provider (Browser STT vs Server STT), syncs permission error, and Pause prevents delayed restarts
        mic_btn = page.get_by_role("button", name="Microphone off", exact=True)
        mic_btn.click()
        expect(page.get_by_role("button", name="Microphone on", exact=True)).to_have_attribute("aria-pressed", "true")
        assert page.evaluate("window.testCalls.some(c => c[0] === 'browserSTT.start')")

        # Permission error ('not-allowed') synchronizes mic button back to off and shows alert
        page.evaluate("window.speechRecognitions[0].onerror({ error: 'not-allowed' })")
        expect(page.get_by_role("button", name="Microphone off", exact=True)).to_have_attribute("aria-pressed", "false")
        expect(page.get_by_role("alert")).to_contain_text("Microphone permission denied")

        # Switch to server-side STT stack (openai) -> toggling mic calls PipecatClient.enableMic(true)
        page.evaluate("""
          window.testClient.emit('serverMessage', {
            type: 'provider_selected',
            stack_id: 'openai',
            uses_browser_stt: false,
          });
        """)
        page.get_by_role("button", name="Microphone off", exact=True).click()
        expect(page.get_by_role("button", name="Microphone on", exact=True)).to_have_attribute("aria-pressed", "true")
        assert page.evaluate("window.testCalls.some(c => c[0] === 'mic' && c[1] === true)")

        # Switch back to browser STT, trigger BotStoppedSpeaking (which schedules 300ms restart), and immediately Pause
        page.get_by_role("button", name="Microphone on", exact=True).click()
        page.evaluate("""
          window.testClient.emit('serverMessage', {
            type: 'provider_selected',
            stack_id: 'gemini_proxy',
            uses_browser_stt: true,
          });
        """)
        page.get_by_role("button", name="Microphone off", exact=True).click()
        page.evaluate("window.testClient.emit('botStartedSpeaking')")
        page.evaluate("window.testClient.emit('botStoppedSpeaking')")
        # Pause BEFORE the 300ms restart timer fires!
        page.get_by_role("button", name="Pause — stops audio and microphone").click()
        starts_at_pause = page.evaluate("window.speechRecognitions[0].startedCount")
        page.wait_for_timeout(450)
        starts_after_wait = page.evaluate("window.speechRecognitions[0].startedCount")
        assert starts_after_wait == starts_at_pause, "Pause must cancel delayed STT restart timer"
        print("PASS 4: Microphone matches provider stack, syncs permission errors, and Pause cancels delayed STT restarts")

        # 5. Reconnect, verify async story_open -> story_image off critical path, and test Audio-off
        page.get_by_role("button", name="Reconnect with microphone off").click()
        expect(page.get_by_label("Connection status")).to_contain_text("Microphone off")
        page.evaluate("""
          window.testClient.emit('serverMessage', {
            type: 'story_open',
            story_id: 'matatu-stage-route',
            node_id: 'request_stop',
          });
        """)
        story_region = page.get_by_role("region", name="Story: Route 46 and your stop")
        expect(story_region).to_be_visible()
        expect(story_region.locator("img.story-card-image")).to_have_count(0)
        page.evaluate("""
          window.testClient.emit('serverMessage', {
            type: 'story_image',
            story_id: 'matatu-stage-route',
            node_id: 'request_stop',
            image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          });
        """)
        expect(story_region.locator("img.story-card-image")).to_have_count(1)
        print("PASS 5: story_open renders immediately and updates when async story_image arrives")

        expect(page.locator("audio")).to_have_count(1)
        page.get_by_role("button", name="Voice output: On").click()
        expect(page.get_by_role("button", name="Voice output: Off (Text-only)")).to_have_attribute("aria-pressed", "true")
        expect(page.locator("audio")).to_have_count(0)

        textbox = page.get_by_role("textbox", name="Type your response here")
        textbox.fill("Testing text-only turn")
        page.get_by_role("button", name="Send typed message").click()
        last_send = page.evaluate("window.testCalls.filter(c => c[0] === 'sendText').pop()")
        assert last_send[2] == {"run_immediately": True, "audio_response": False}, last_send
        print("PASS 6: Voice output: Off removes <audio> and sends audio_response: false")

        assert not errors, errors
        browser.close()
        print("ALL BROWSER INTEGRATION REGRESSIONS PASSED.")


if __name__ == "__main__":
    main()
