"""Playwright verification for the Default Page (Person 1 · Neurotypical Baseline · Standard UI)
and Top Bar Persona + UI Settings Switcher.
"""

import os
import sys
from playwright.sync_api import sync_playwright, expect


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000"
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            channel=os.getenv("PLAYWRIGHT_CHANNEL", "chrome"),
            args=["--enable-unsafe-swiftshader"],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        page.route("**/api/**", lambda route: route.abort("blockedbyclient"))
        page.goto(base)
        page.wait_for_load_state("networkidle")

        # 1. Verify the default page is Person 1 · Neurotypical Baseline · Standard UI
        top_bar = page.get_by_role(
            "navigation", name="Active traveller profile and personalized UI switcher"
        )
        expect(top_bar).to_contain_text("Person 1 · Neurotypical Baseline · Standard UI")
        expect(page.get_by_role("heading", name="What would you like to do?")).to_be_visible()
        expect(page.locator(".dashboard-card")).to_have_count(2)
        page.screenshot(path="/tmp/opencode/default-person1-ui.png", full_page=True)

        # 2. Click Person 2: Zawadi (Sensory-Calm) at the top
        page.get_by_role("button", name="Person 2: Zawadi (Sensory-Calm)").click()
        expect(top_bar).to_contain_text("Person 2 · Autism & Psychosocial Support · Calm UI")
        expect(
            page.get_by_role("heading", name="Welcome, Zawadi. Take this at your own calm pace.")
        ).to_be_visible()
        expect(page.locator("body")).to_have_attribute("data-persona-ui", "sensory-calm")
        expect(
            page.get_by_role("img", name="Joy, your rehearsal companion", exact=False)
        ).to_have_attribute("data-motion", "still")
        page.screenshot(path="/tmp/opencode/person2-zawadi-ui.png", full_page=True)

        # 3. Click Person 3: Kamau (Focus/Dyslexia) at the top
        page.get_by_role("button", name="Person 3: Kamau (Focus/Dyslexia)").click()
        expect(top_bar).to_contain_text("Person 3 · Dyslexia & ADHD Support · Focus UI")
        expect(
            page.get_by_role("heading", name="Kamau’s Step-by-Step Journey Workspace")
        ).to_be_visible()
        expect(page.locator("body")).to_have_attribute("data-persona-ui", "reading-focus")
        expect(page.locator("#ai4a11y-reading-ruler")).to_have_count(1)
        expect(page.locator(".dashboard-card")).to_have_count(3)
        page.wait_for_timeout(180)
        assert page.locator(".ai4a11y-bionic").count() > 0
        page.screenshot(path="/tmp/opencode/person3-kamau-ui.png", full_page=True)

        # 4. Open ⚙️ UI Settings in the top bar and switch settings
        page.get_by_role("button", name="⚙️ UI Settings").click()
        studio = page.get_by_role("region", name="UI Personalization Settings Studio").first
        expect(studio).to_be_visible()
        studio.get_by_role("button", name="Soft-Mirror (Standard)").click()
        expect(page.locator("body")).to_have_attribute("data-persona-ui", "standard")
        expect(top_bar).to_contain_text("Person 1 · Neurotypical Baseline · Standard UI")
        page.screenshot(path="/tmp/opencode/top-bar-ui-settings.png", full_page=True)

        assert not errors, f"Unexpected page errors: {errors}"
        browser.close()
        print("PASS: Default page is Person 1 Standard UI with top-bar person & settings controls.")


if __name__ == "__main__":
    main()
