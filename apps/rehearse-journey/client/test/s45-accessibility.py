"""Keyboard, browser accessibility-tree, and real canvas/audio motion regression.

Run against Vite: python3 test/s45-accessibility.py http://127.0.0.1:3003
Uses fictional SDK responses and generated oscillator audio; no provider calls.
"""
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

spec = importlib.util.spec_from_file_location('rehearsal', Path(__file__).with_name('rehearsal-e2e.py'))
rehearsal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rehearsal)
EVIDENCE = Path(__file__).resolve().parents[2] / 'evidence' / 's4.5'


def tab_to(page, target):
    for _ in range(35):
        if target.evaluate('(element) => element === document.activeElement'):
            return
        page.keyboard.press('Tab')
    raise AssertionError('Could not reach control using Tab: ' + target.inner_text())


def static_canvas(page, canvas):
    page.wait_for_timeout(250)
    first = canvas.evaluate('(canvas) => canvas.toDataURL()')
    frame_count = page.evaluate('window.fixture.frameCount()')
    page.wait_for_timeout(350)
    assert canvas.evaluate('(canvas) => canvas.toDataURL()') == first
    assert page.evaluate('window.fixture.frameCount()') == frame_count, 'Static visualizer must stop its RAF loop'
    assert page.evaluate('window.fixture.track.readyState') == 'live', 'Motion preference must not stop audio'


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3000'
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel=os.getenv('PLAYWRIGHT_CHANNEL', 'chrome'), args=['--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1000, 'height': 900}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        def mock_sdk(route):
            response = route.fetch()
            route.fulfill(response=response, body=rehearsal.session_entry(response.text()) + '\n' + rehearsal.SDK_MOCK)
        page.route('**/api/**', lambda route: route.abort('blockedbyclient'))
        page.route('**/src/App.tsx*', mock_sdk)
        page.goto(base)
        page.wait_for_load_state('networkidle')
        assert page.evaluate('Array.isArray(window.testCalls)'), 'SDK mock did not load'
        hospital = page.get_by_role('button', name='Hospital Reception')
        tab_to(page, hospital)
        expect(hospital).to_be_focused()
        outline = hospital.evaluate('(element) => { const s = getComputedStyle(element); return [s.outlineStyle, s.outlineWidth, s.outlineColor] }')
        assert outline == ['solid', '3px', 'rgb(58, 53, 80)'], outline
        page.screenshot(path=str(EVIDENCE / 'keyboard-landing.png'), full_page=True)
        page.keyboard.press('Enter')
        draft = page.get_by_role('textbox', name='Type your response here')
        expect(draft).to_be_focused()
        page.keyboard.type('I am here for my pretend appointment.')
        page.keyboard.press('Enter')
        expect(page.get_by_role('log', name='Conversation transcript')).to_contain_text('pretend clinic card')
        settings = page.get_by_role('button', name='Settings', exact=True)
        tab_to(page, settings)
        page.keyboard.press('Enter')
        dialog = page.get_by_role('dialog', name='Settings', exact=True)
        expect(dialog).to_be_visible()
        expect(page.get_by_role('button', name='Close settings')).to_be_focused()
        prefs = dialog.get_by_role('button', name='Aa Plainer words')
        tab_to(page, prefs)
        page.keyboard.press('Space')
        expect(prefs).to_have_attribute('aria-pressed', 'true')
        page.keyboard.press('Escape')
        expect(dialog).not_to_be_visible()
        expect(settings).to_be_focused()
        mic = page.get_by_role('button', name='Microphone off', exact=True)
        tab_to(page, mic)
        page.keyboard.press('Space')
        expect(page.get_by_role('button', name='Microphone on', exact=True)).to_have_attribute('aria-pressed', 'true')
        page.keyboard.press('Space')
        session = page.context.new_cdp_session(page)
        tree = session.send('Accessibility.getFullAXTree')['nodes']
        available = {(node.get('role', {}).get('value'), node.get('name', {}).get('value')) for node in tree if not node.get('ignored')}
        assert ('log', 'Conversation transcript') in available
        assert ('status', 'Connection status') in available
        assert ('textbox', 'Type your response here') in available
        assert any(role == 'image' and name.startswith('Joy, your rehearsal companion') for role, name in available)
        page.screenshot(path=str(EVIDENCE / 'keyboard-session.png'), full_page=True)
        pause = page.get_by_role('button', name='Pause — stops audio and microphone')
        tab_to(page, pause)
        page.keyboard.press('Enter')
        status = page.get_by_role('status', name='Connection status')
        expect(status).to_be_focused()
        expect(status).to_contain_text('Paused')
        reconnect = page.get_by_role('button', name='Reconnect with microphone off')
        tab_to(page, reconnect)
        page.keyboard.press('Enter')
        expect(draft).to_be_focused()
        exit_button = page.get_by_role('button', name='Exit rehearsal — ends the session')
        tab_to(page, exit_button)
        page.keyboard.press('Enter')
        expect(status).to_be_focused()
        expect(status).to_contain_text('Session ended')
        again = page.get_by_role('button', name='Start again', exact=True)
        tab_to(page, again)
        page.keyboard.press('Enter')
        expect(page.get_by_role('heading', name='Rehearse the Journey')).to_be_focused()
        tab_to(page, hospital)
        expect(hospital).to_be_focused()
        results.append('PASS: keyboard-only scenario, typing, preference, mic, pause, reconnect, exit, restart; focus outline and focus transitions')
        results.append('PASS: browser accessibility tree exposes named transcript log, connection status, textbox, companion image')
        print('\n'.join(results), flush=True)
        page.unroute('**/src/App.tsx*', mock_sdk)
        page.goto(base + '/test/visualizer-fixture.html')
        page.wait_for_load_state('networkidle')
        canvas = page.locator('canvas')
        for mode in ['connecting', 'thinking', 'audio']:
            page.get_by_role('button', name=mode, exact=True).click()
            expect(canvas).to_have_attribute('data-motion', 'still')
            static_canvas(page, canvas)
            page.emulate_media(reduced_motion='no-preference')
            expect(canvas).to_have_attribute('data-motion', 'animated')
            page.wait_for_timeout(250)
            first = page.evaluate('window.fixture.frameCount()')
            page.wait_for_timeout(200)
            assert page.evaluate('window.fixture.frameCount()') > first
            page.get_by_role('button', name='Stop motion', exact=True).click()
            expect(canvas).to_have_attribute('data-motion', 'still')
            static_canvas(page, canvas)
            page.get_by_role('button', name='Stop motion', exact=True).click()
            expect(canvas).to_have_attribute('data-motion', 'animated')
            page.emulate_media(reduced_motion='reduce')
        results.append('PASS: connecting, thinking and real generated-audio visualizers stop RAF and keep pixels static for OS/page motion settings; source audio track stays live; animation resumes')
        assert not errors, errors
        (EVIDENCE / 'automated-results.json').write_text(json.dumps({'checks': results, 'scope': 'Headless Chrome; SDK-mocked conversation and generated audio. Does not establish Orca usability, physical microphone operation or co-designer acceptance.'}, indent=2) + '\n')
        print(results[-1], flush=True)
        browser.close()

if __name__ == '__main__':
    main()
