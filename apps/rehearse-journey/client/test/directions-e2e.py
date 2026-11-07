"""Focused UI regression with mocked providers (no API key or live calls).

Start Vite, then: python3 test/directions-e2e.py [http://127.0.0.1:3000]
"""
import importlib.util
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

# Reuse the existing SDK boundary mock to exercise the real rehearsal handoff.
spec = importlib.util.spec_from_file_location('rehearsal', Path(__file__).with_name('rehearsal-e2e.py'))
rehearsal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rehearsal)


def route_fixture(count=12, with_map=True):
    return {'routes': [{
        'distanceMeters': 3400, 'duration': '720s',
        'polyline': {'encodedPolyline': '_p~iF~ps|U_ulLnnqC_mqNvxq`@' if with_map else ''},
        'legs': [{'steps': [{
            'navigationInstruction': {'instructions': f'Instruction {i + 1}: ' + 'Continue toward the entrance and use the pedestrian crossing. ' * 4},
            'distanceMeters': 200, 'staticDuration': '90s',
        } for i in range(count)]}],
    }]}


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel=os.getenv('PLAYWRIGHT_CHANNEL', 'chrome'), args=['--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def mock_component(route):
            response = route.fetch()
            # Replace configuration at the module boundary; never read a real key.
            source = re.sub(r'const MAPS_API_KEY = .*?;', 'const MAPS_API_KEY = "ui-test-key";', response.text())
            route.fulfill(response=response, body=source)

        def mock_sdk(route):
            response = route.fetch()
            route.fulfill(response=response, body=response.text() + '\n' + rehearsal.SDK_MOCK)

        page.route('**/src/components/Directions.tsx*', mock_component)
        page.route('**/src/App.tsx*', mock_sdk)
        page.route('**/api/**', lambda route: route.abort('blockedbyclient'))
        page.route('**/*.tile.openstreetmap.org/**', lambda route: route.abort())
        page.route('**/open-meteo/**', lambda route: route.fulfill(status=503, json={}))
        pending_places = []
        page.route('**/maps-places/**', lambda route: pending_places.append(route))
        fixtures = [route_fixture(), route_fixture(1), {'routes': []}, route_fixture(0, False)]
        page.route('**/maps-routes', lambda route: route.fulfill(json=fixtures.pop(0)))
        page.goto(sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3000')
        page.wait_for_load_state('networkidle')
        page.get_by_role('button', name='Get Directions', exact=True).click()
        expect(page.get_by_text('Mbagathi Hospital', exact=True)).to_be_visible()
        page.get_by_label('To', exact=True).fill('Test destination')
        page.get_by_role('button', name='Find route', exact=True).click()
        current = page.get_by_role('region', name='Current instruction', exact=True)
        expect(current).to_contain_text('Step 1 of 12')
        expect(page.get_by_text('Loading supporting details…', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Find route', exact=True)).to_be_enabled()
        previous = page.get_by_role('button', name='Previous', exact=True)
        next_step = page.get_by_role('button', name='Next', exact=True)
        expect(previous).to_be_disabled()
        next_step.focus()
        page.keyboard.press('Enter')
        expect(current).to_contain_text('Step 2 of 12')
        previous.click()
        expect(current).to_contain_text('Step 1 of 12')
        for _ in range(11):
            next_step.click()
        expect(current).to_contain_text('Step 12 of 12')
        expect(next_step).to_be_disabled()
        expect(current).to_contain_text('Final step')
        expect(page.get_by_role('list', name='Turn-by-turn directions').locator('li')).to_have_count(12)

        for width in (1280, 768, 375, 320):
            page.set_viewport_size({'width': width, 'height': 900})
            page.wait_for_function('''() => {
                const map = document.querySelector('.directions-map').getBoundingClientRect();
                const line = document.querySelector('.leaflet-overlay-pane path').getBoundingClientRect();
                return line.width > 0 && line.left >= map.left && line.right <= map.right
                    && line.top >= map.top && line.bottom <= map.bottom;
            }''')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}px'
            map_box = page.get_by_label('Complete route map', exact=True).bounding_box()
            step_box = current.bounding_box()
            if width > 760:
                assert step_box['x'] > map_box['x'] + map_box['width']
            else:
                assert step_box['y'] >= map_box['y'] + map_box['height']
            page.get_by_role('button', name='Settings', exact=True).click()
            close = page.get_by_role('button', name='Close settings')
            expect(close).to_be_focused()
            page.keyboard.press('Shift+Tab')
            expect(close).to_be_focused()
            page.keyboard.press('Escape')
            expect(page.get_by_role('button', name='Settings', exact=True)).to_be_focused()
        page.screenshot(path='/tmp/directions-mobile.png', full_page=True)

        # Replace a route while the old Places request is still pending.
        page.get_by_label('To', exact=True).fill('Replacement destination')
        page.get_by_role('button', name='Find route', exact=True).click()
        expect(current).to_contain_text('Step 1 of 1')
        expect(previous).to_be_disabled()
        expect(next_step).to_be_disabled()
        page.wait_for_timeout(100)
        assert len(pending_places) == 2
        pending_places[1].fulfill(status=503, json={})
        expect(page.get_by_text('Supporting details are optional.', exact=True)).to_be_visible()
        pending_places[0].fulfill(json={'places': [{'formattedAddress': 'Stale address', 'displayName': {'text': 'Old destination'}}]})
        expect(page.get_by_text('Weather unavailable', exact=True)).to_be_visible()
        expect(page.get_by_text('Stale address', exact=True)).to_have_count(0)
        expect(page.get_by_text('Crowd estimate', exact=True)).to_be_visible()
        expect(page.locator('figcaption').first).to_contain_text('Illustration')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), page.evaluate('''() => [...document.querySelectorAll('body *')]
            .filter(e => e.getBoundingClientRect().right > innerWidth && e.checkVisibility())
            .map(e => [e.tagName, e.className, e.getBoundingClientRect().width, e.textContent.slice(0, 80)]).slice(-15)''')
        page.set_viewport_size({'width': 1280, 'height': 900})
        page.screenshot(path='/tmp/directions-desktop.png', full_page=True)

        page.get_by_role('button', name='Find route', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('No route found')
        expect(current).to_have_count(0)
        page.get_by_role('button', name='Find route', exact=True).click()
        expect(current).to_contain_text('No step instructions available')
        expect(previous).to_be_disabled()
        expect(next_step).to_be_disabled()
        expect(page.get_by_text('Map unavailable. Use the instructions.', exact=True)).to_be_visible()
        page.wait_for_timeout(100)
        pending_places[2].fulfill(status=503, json={})
        expect(page.get_by_text('Supporting details are optional.', exact=True)).to_be_visible()
        page.get_by_role('button', name='Rehearse this trip with Conductor Otieno', exact=True).click()
        expect(page.get_by_label('Connection status')).to_contain_text('Microphone off')
        expect(page.get_by_role('group', name=re.compile('Conductor Otieno.*dialogue'))).to_be_visible()
        expect(page.locator('.rehearsal-story-rail')).not_to_be_visible()
        assert not errors, errors
        browser.close()
        print('PASS: steps, replacement, single step, empty route, missing map/steps, delayed/stale/failed details, 320px reflow, drawer keyboard focus, rehearsal handoff.')


if __name__ == '__main__':
    main()
