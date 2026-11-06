"""UI regression with an SDK boundary mock; no mic or provider calls.

Start Vite, then: python3 test/rehearsal-e2e.py [http://127.0.0.1:3000]
"""

import sys
import os

from playwright.sync_api import sync_playwright, expect

SDK_MOCK = """
window.testCalls = [];
PipecatClient.prototype.connect = async function () {
  window.testCalls.push(['connect', this._options.enableMic]);
  this.emit('connected');
  await new Promise(resolve => setTimeout(resolve, 100));
  this.emit('botReady', {version: '2.3.0', about: {library: 'test', library_version: '1'}});
  this.emit('botTranscript', {text: 'Hello, I am Joy. This is fictional practice.'});
};
PipecatClient.prototype.sendText = async function (text, options) {
  window.testCalls.push(['sendText', text, options]);
  if (text === 'fail this message') throw new Error('test send failure');
  this.emit('botTranscript', {text: 'Do you have a pretend clinic card?'});
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
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel=os.getenv("PLAYWRIGHT_CHANNEL", "chrome"))
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))

        def mock_sdk(route):
            response = route.fetch()
            route.fulfill(response=response, body=response.text() + "\n" + SDK_MOCK)

        page.route("**/src/App.tsx", mock_sdk)
        page.goto(sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("note")).to_contain_text("fictional")
        draft = page.get_by_role("textbox")
        draft.fill("I am here for my pretend appointment.")
        draft.press("Enter")
        assert not page.evaluate("window.testCalls.some(c => c[0] === 'sendText')")
        page.get_by_role("button", name="Start rehearsal with Joy").click()
        try:
            expect(page.get_by_label("Connection status")).to_contain_text("Microphone off")
        except AssertionError:
            print("SDK calls:", page.evaluate("window.testCalls"))
            print("Page errors:", errors)
            print("Alerts:", page.get_by_role("alert").all_text_contents())
            raise
        expect(page.get_by_label("Conversation transcript")).to_contain_text("Hello, I am Joy")
        assert page.evaluate("window.testCalls.find(c => c[0] === 'connect')[1]") is False
        assert not page.evaluate("window.testCalls.some(c => c[0] === 'mic' && c[1])")

        page.get_by_role("button", name="Send typed message").click()
        expect(draft).to_have_value("")
        expect(page.get_by_label("Conversation transcript")).to_contain_text("pretend clinic card")
        calls = page.evaluate("window.testCalls.filter(c => c[0] === 'sendText')")
        assert calls[0][2] == {"run_immediately": True, "audio_response": True}

        draft.fill("fail this message")
        draft.press("Enter")
        expect(page.get_by_role("alert")).to_contain_text("could not be sent")
        expect(draft).to_have_value("fail this message")
        page.get_by_role("button", name="Turn microphone on", exact=True).click()
        expect(page.get_by_role("button", name="Turn microphone off", exact=True)).to_have_attribute("aria-pressed", "true")

        page.get_by_role("button", name="Pause — stops audio and microphone").click()
        expect(page.get_by_label("Connection status")).to_contain_text("Paused")
        expect(page.locator("audio")).to_have_count(0)
        expect(page.get_by_role("button", name="Send typed message")).to_be_disabled()
        count = len(page.evaluate("window.testCalls.filter(c => c[0] === 'sendText')"))
        draft.press("Enter")
        assert len(page.evaluate("window.testCalls.filter(c => c[0] === 'sendText')")) == count
        page.get_by_role("button", name="Reconnect with microphone off").click()
        expect(page.get_by_label("Connection status")).to_contain_text("Microphone off")
        page.get_by_role("button", name="Exit rehearsal — ends the session").click()
        expect(page.get_by_label("Connection status")).to_contain_text("Session ended")
        expect(page.locator("audio")).to_have_count(0)
        assert not errors, errors
        browser.close()
        print("PASS: fictional notice, mic-off start, typed turn, send failure, pause, reconnect, exit.")


if __name__ == "__main__":
    main()
