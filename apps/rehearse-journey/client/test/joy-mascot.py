"""Mascot rendering and motion regressions against Vite.

Run: python3 test/joy-mascot.py http://127.0.0.1:3000
The test replaces the app entry in-browser; no backend or provider calls.
"""
import os
import sys
from playwright.sync_api import sync_playwright, expect


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3000'
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, channel=os.getenv('PLAYWRIGHT_CHANNEL', 'chrome'),
            args=['--enable-unsafe-swiftshader'],
        )
        page = browser.new_page(viewport={'width': 390, 'height': 500}, reduced_motion='no-preference')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def harness(route):
            response = route.fetch()
            imports = response.text().split('ReactDOM.createRoot', 1)[0]
            route.fulfill(response=response, body=imports + '''
              import JoyMascot from '/src/components/JoyMascot.tsx';
              const root = ReactDOM.createRoot(document.getElementById('root'));
              window.setJoyProps = (props = {}) => root.render(
                React.createElement(JoyMascot, {state: 'idle', ...props}));
              window.setJoyProps();
            ''')

        def expose_rig(route):
            response = route.fetch()
            body = response.text().replace(
                'const rig = useMemo(() => buildRig(), []);',
                'const rig = useMemo(() => buildRig(), []); window.joyTestRig = rig;',
            )
            route.fulfill(response=response, body=body + '\nwindow.buildTestJoyRig = buildRig;')

        page.route('**/src/main.tsx*', harness)
        page.route('**/src/components/JoyScene.tsx*', expose_rig)
        page.goto(base)
        page.wait_for_load_state('networkidle')
        canvas = page.locator('.joy canvas')
        expect(canvas).to_be_visible(timeout=60000)
        page.wait_for_function('window.joyTestRig !== undefined')

        # A motion change during a blink must restore all facial features.
        page.evaluate('''() => {
          const rig = window.buildTestJoyRig();
          const face = rig.faceController, nodes = rig.faceNodes;
          face.update(2.4, 1/60, 'speaking', nodes);
          face.update(2.485, 1/60, 'speaking', nodes);
          if (nodes.eyeL.scale.y > 0.02) throw Error('Blink setup failed');
          face.update(2.485, 1/60, 'idle', nodes, undefined, true);
          for (const eye of rig.eyes) {
            if (eye.scale.y !== 0.093) throw Error('Eye frozen mid-blink');
          }
          if (rig.lids.some(lid => lid.visible)) throw Error('Still eyelid covers eye');
          if (rig.highlights.some(light => !light.visible)) throw Error('Missing eye highlight');
          if (rig.mouthRig.mesh.morphTargetInfluences[1] !== 0) throw Error('Talking mouth frozen');
          rig.dispose();
        }''')
        print('PASS: stopping mid-blink restores open eyes, highlights, and a closed smile', flush=True)

        for state in ['idle', 'connecting', 'listening', 'speaking', 'paused', 'ended']:
            page.evaluate('(state) => window.setJoyProps({state})', state)
            expect(page.locator('.joy')).to_have_attribute('data-state', state)
            expect(canvas).to_be_visible()
            page.wait_for_timeout(200)
            assert page.evaluate('''() => {
              const rig = window.joyTestRig;
              return rig.root.position.y === 0 && rig.hips.scale.y === 1;
            }'''), 'Feet and pelvis must remain grounded'
        print('PASS: all six states render with feet grounded and no duplicate pelvis squash', flush=True)

        page.evaluate("window.setJoyProps({state: 'speaking'})")
        page.emulate_media(reduced_motion='reduce')
        expect(page.locator('.joy')).to_have_attribute('data-motion', 'still')
        page.wait_for_timeout(300)
        first = canvas.screenshot()
        page.mouse.move(190, 80)
        page.wait_for_timeout(350)
        assert canvas.screenshot() == first, 'Reduced-motion pose must be stable'
        assert page.evaluate('window.joyTestRig.chest.scale.x === 1'), 'Breathing scale must reset'
        page.emulate_media(reduced_motion='no-preference')
        expect(page.locator('.joy')).to_have_attribute('data-motion', 'animated')
        page.wait_for_timeout(350)
        assert canvas.screenshot() != first, 'Animation must resume'
        print('PASS: live reduced-motion changes reset breathing, freeze pixels, and resume animation', flush=True)
        assert not errors, errors

        fallback = browser.new_page(viewport={'width': 390, 'height': 500})
        fallback.route('**/src/main.tsx*', harness)
        fallback.add_init_script('''
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            return type.startsWith('webgl') ? null : original.call(this, type, ...args);
          };
        ''')
        fallback.goto(base)
        fallback.wait_for_load_state('networkidle')
        expect(fallback.locator('.joy svg.joy-placeholder')).to_be_visible(timeout=60000)
        expect(fallback.get_by_role('img', name='Joy, your rehearsal companion — idle')).to_be_visible()
        print('PASS: WebGL failure retains an illustrated, accessible companion', flush=True)
        browser.close()


if __name__ == '__main__':
    main()
