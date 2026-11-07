"""Verify latest dialogue below each mascot, including streamed replies and handoff.

Run against Vite: python3 test/mascot-dialogue.py http://localhost:3000
Uses the SDK boundary mock; no microphone or provider calls.
"""
import importlib.util
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec = importlib.util.spec_from_file_location('rehearsal', Path(__file__).with_name('rehearsal-e2e.py'))
rehearsal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rehearsal)


def main():
    evidence = Path('/tmp/mascot-dialogue')
    evidence.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel=os.getenv('PLAYWRIGHT_CHANNEL', 'chrome'), args=['--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def mock_sdk(route):
            response = route.fetch()
            route.fulfill(response=response, body=rehearsal.session_entry(response.text()) + '\n' + rehearsal.SDK_MOCK)

        page.route('**/api/**', lambda route: route.abort('blockedbyclient'))
        page.route('**/src/App.tsx*', mock_sdk)
        page.goto(sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000')
        page.wait_for_load_state('networkidle')
        page.get_by_role('button', name='Hospital Reception').click()
        primary = page.locator('.joy-dialogue-primary')
        partner = page.locator('.joy-dialogue-partner')
        expect(primary).to_contain_text('Hello, I am Joy')
        expect(partner).to_contain_text('Your reply will appear here')
        draft = page.get_by_role('textbox', name='Type your response here')
        draft.fill('I am here for my pretend appointment.')
        expect(partner).not_to_contain_text('I am here for my pretend appointment.')
        page.get_by_role('button', name='Send typed message').click()
        expect(partner).to_contain_text('I am here for my pretend appointment.')
        expect(primary).to_contain_text('pretend clinic card')
        page.evaluate("""() => {
          window.testClient.emit('botTranscript', {text: 'Take your time.'});
          window.testClient.emit('botTranscript', {text: 'You can ask me to repeat.'});
        }""")
        expect(primary).to_contain_text('Take your time. You can ask me to repeat.')
        primary_before_handoff = primary.inner_text()
        page.evaluate("window.testClient.emit('serverMessage', {type: 'speaker_changed', active_speaker: 'amani'})")
        expect(page.get_by_role('img', name='Amani, practice conversation partner')).to_have_attribute('data-state', 'listening')
        # Allow the new persona to reach the transcript event subscription.
        page.wait_for_timeout(100)
        page.evaluate("window.testClient.emit('botTranscript', {text: 'I can hold your place in the queue.'})")
        expect(partner).to_contain_text('I can hold your place in the queue.')
        expect(primary).to_have_text(primary_before_handoff)
        expect(page.get_by_role('log', name='Conversation transcript')).to_contain_text('Amani')
        for width in [1440, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            overflow = page.evaluate('''() => Array.from(document.querySelectorAll('main *')).filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
            }).slice(0, 8).map(el => [el.tagName, el.className, el.getBoundingClientRect().width])''')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, overflow)
            for column in page.locator('.joy-dialogue-column').all():
                mascot = column.locator('.joy').bounding_box()
                bubble = column.locator('.joy-dialogue').bounding_box()
                assert bubble['y'] > mascot['y'] + mascot['height'], 'Dialogue must sit below feet'
                assert abs((bubble['x'] + bubble['width']/2) - (mascot['x'] + mascot['width']/2)) < 2
            if width == 1440:
                assert page.get_by_role('textbox', name='Type your response here').bounding_box()['width'] > 250
            page.screenshot(path=str(evidence / f'dialogue-{width}.png'), full_page=True)
        assert not errors, errors
        print('PASS: speaker-specific latest replies, unsent draft exclusion, streamed text, Amani handoff, full history, and responsive placement')
        browser.close()


if __name__ == '__main__':
    main()
