"""Settings drawer, uncluttered layout, and preference regressions against Vite.

Run: python3 test/session-settings.py http://localhost:3000
Uses the rehearsal SDK mock; does not call providers or access a microphone.
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
    evidence = Path('/tmp/rehearsal-declutter')
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
        expect(page.get_by_role('status', name='Connection status')).to_contain_text('Microphone off')
        settings = page.get_by_role('button', name='Settings', exact=True)
        drawer = page.get_by_role('dialog', name='Settings', exact=True)
        draft = page.get_by_role('textbox', name='Type your response here')
        draft.fill('Keep this unsent reply.')
        calls_before = page.evaluate('window.testCalls.length')
        expect(drawer).not_to_be_visible()
        expect(page.get_by_role('note', name='Fictional scenario notice')).not_to_be_visible()
        assert not page.locator('details').evaluate_all('(sections) => sections.some(section => section.open)')
        assert page.locator('.tips-carousel').count() == 0
        assert page.locator('.rehearsal-conversation').evaluate('(el) => getComputedStyle(el).overflowY') == 'visible'

        settings.click()
        close = drawer.get_by_role('button', name='Close settings')
        expect(close).to_be_focused()
        page.keyboard.press('Shift+Tab')
        expect(drawer.get_by_role('button', name='🐢 Reduce motion')).to_be_focused()
        page.keyboard.press('Tab')
        expect(close).to_be_focused()
        expect(drawer.get_by_role('note')).to_contain_text('This app does not save the transcript.')
        assert drawer.bounding_box()['width'] <= 400
        drawer.get_by_role('button', name='Aa Plainer words').click()
        page.keyboard.press('Escape')
        expect(settings).to_be_focused()
        expect(drawer).not_to_be_visible()
        expect(draft).to_have_value('Keep this unsent reply.')
        assert page.evaluate('window.testCalls.length') == calls_before, 'Settings must not change session/media state'
        page.get_by_text('What to expect', exact=True).click()
        expect(page.locator('details').filter(has=page.get_by_text('What to expect', exact=True))).to_contain_text('practice hospital')
        page.get_by_text('What to expect', exact=True).click()

        settings.click()
        expect(drawer.get_by_role('button', name='Aa Plainer words')).to_have_attribute('aria-pressed', 'true')
        for label in ['💬 Current exchange only', '⏸ Stop auto-advance', '🐢 Reduce motion']:
            control = drawer.get_by_role('button', name=label)
            control.click()
            expect(control).to_have_attribute('aria-pressed', 'true')
        drawer.get_by_role('button', name='💬 Current exchange only').click()
        expect(drawer.get_by_role('button', name='💬 Current exchange only')).to_have_attribute('aria-pressed', 'false')
        drawer.get_by_role('button', name='🔊 Read page aloud').click()
        expect(drawer.get_by_role('button', name='⏹ Stop reading aloud')).to_have_attribute('aria-pressed', 'true')
        close.click()
        expect(page.get_by_role('button', name='Stop page speech', exact=True)).to_be_visible()
        page.get_by_role('button', name='Stop page speech', exact=True).click()
        expect(page.get_by_role('button', name='Stop page speech', exact=True)).not_to_be_visible()
        page.screenshot(path=str(evidence / 'desktop.png'), full_page=True)
        print('PASS: hidden secondary content, focus containment/restoration, all preferences, draft and session preservation', flush=True)

        for width, height in [(390, 844), (320, 740), (1904, 737)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.evaluate('window.scrollTo(0, 0)')
            for label in ['Send typed message', 'Pause — stops audio and microphone', 'Exit rehearsal — ends the session', 'Microphone off']:
                rect = page.get_by_role('button', name=label, exact=True).bounding_box()
                assert rect['y'] >= 0 and rect['y'] + rect['height'] <= height, (width, label, rect)
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'No horizontal overflow'
            page.screenshot(path=str(evidence / f'session-{width}.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 480})
        settings.click()
        page.get_by_role('note', name='Fictional scenario notice').scroll_into_view_if_needed()
        expect(page.get_by_role('note', name='Fictional scenario notice')).to_be_in_viewport()
        expect(close).to_be_in_viewport()
        page.screenshot(path=str(evidence / 'settings-mobile.png'))
        page.keyboard.press('Escape')
        expect(settings).to_be_focused()
        assert page.evaluate('document.body.style.overflow') != 'hidden'
        assert not errors, errors
        print('PASS: mobile/desktop controls remain in view; short drawer scrolls; no page errors', flush=True)
        browser.close()


if __name__ == '__main__':
    main()
