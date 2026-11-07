"""StoryCard rendering and navigation regressions against Vite.

Run: python3 test/story-card.py http://127.0.0.1:3000
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
        page = browser.new_page(viewport={'width': 390, 'height': 700})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def harness(route):
            response = route.fetch()
            imports = response.text().split('ReactDOM.createRoot', 1)[0]
            route.fulfill(response=response, body=imports + '''
              import StoryCard from '/src/components/StoryCard.tsx';
              import { STORIES } from '/src/stories.tsx';
              const root = ReactDOM.createRoot(document.getElementById('root'));
              window.closeCount = 0;
              window.renderStory = (id = 'hospital-waiting-area') => root.render(
                React.createElement(StoryCard, {
                  story: STORIES[id],
                  onClose: () => { window.closeCount++; root.render(null); },
                }));
              window.renderStory();
            ''')

        page.route('**/src/main.tsx*', harness)
        page.goto(base)
        page.wait_for_load_state('networkidle')

        card = page.locator('.story-card')
        expect(card).to_be_visible()
        expect(card.locator('.story-card-title')).to_have_text('Finding Waiting Area B')
        # Slide 1 is text
        expect(card.locator('.story-card-text h3')).to_have_text('Waiting Area B is on your left')
        expect(card.locator('.story-card-dot')).to_have_count(3)

        # Next → slide 2 is the fictional map (custom render slot)
        card.get_by_role('button', name='Next').click()
        expect(card.locator('.story-map svg')).to_be_visible()
        expect(card.locator('.story-map figcaption')).to_contain_text('Fictional')

        # Next → slide 3, then Done closes the card
        card.get_by_role('button', name='Next').click()
        expect(card.locator('.story-card-text h3')).to_have_text('Say it back to Joy')
        card.get_by_role('button', name='Done').click()
        expect(card).to_have_count(0)
        assert page.evaluate('window.closeCount') == 1

        # Back navigation on a fresh story
        page.evaluate("window.renderStory('directions-landmarks')")
        card = page.locator('.story-card')
        expect(card).to_be_visible()
        expect(card.get_by_role('button', name='Back')).to_be_disabled()
        card.get_by_role('button', name='Next').click()
        card.get_by_role('button', name='Back').click()
        expect(card.locator('.story-card-title')).to_have_text('Two landmarks to remember')
        expect(card.locator('.story-card-text h3')).to_have_text('Past the bookshop, left at the tower')

        # Close button works mid-story
        card.get_by_role('button', name='Close story').click()
        expect(card).to_have_count(0)

        assert not errors, f'page errors: {errors}'
        browser.close()
        print('story-card: all checks passed')


if __name__ == '__main__':
    main()
