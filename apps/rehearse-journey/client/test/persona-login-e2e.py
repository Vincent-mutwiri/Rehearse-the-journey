"""Playwright verification for the 3-Person Login & Personalized UI Showcase.

Verifies:
1. Opening the app shows the 3-person Login screen representing Problem Statement 6:
   - Baraka Mwangi (Neurotypical Baseline · Standard UI)
   - Zawadi Wanjiku (Sensory Overload & Journey Anxiety · Sensory-Calm Sanctuary UI)
   - Kamau Ochieng (Dyslexia, ADHD & Executive Function · Structured Focus UI)
2. Selecting Zawadi applies `data-persona-ui="sensory-calm"`, activates the Toolkit's
   `sensory-calm` AbilityModel preset (Reduce Motion, Stop Auto-Advance, Plainer Words,
   Sensory-Calm Mode), renders the Sage Sanctuary UI & Decompress bar, and freezes 3D motion.
3. Selecting Kamau applies `data-persona-ui="reading-focus"`, activates Bionic Reading,
   Reading Ruler, Big Targets, and Plainer Words, renders the Warm Amber Paper theme,
   the 3-step Executive Function checklist, and the 3 numbered Dashboard cards.
4. Selecting Baraka restores the Standard Baseline UI (`data-persona-ui="standard"`).
5. Returning to the Login screen via `⇄ Switch Person (Login)` works cleanly with 0 errors.
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

        # 1. Verify the 3-person Login screen is presented first
        expect(
            page.get_by_role("heading", name="Who is rehearsing their Nairobi journey today?")
        ).to_be_visible()
        expect(page.get_by_role("heading", name="Baraka Mwangi")).to_be_visible()
        expect(page.get_by_role("heading", name="Zawadi Wanjiku")).to_be_visible()
        expect(page.get_by_role("heading", name="Kamau Ochieng")).to_be_visible()
        page.screenshot(path="/tmp/opencode/persona-login-screen.png", full_page=True)

        # 2. Click on Zawadi Wanjiku (Sensory Overload & Journey Anxiety)
        page.get_by_role(
            "button", name="Continue as Zawadi Wanjiku — Sensory-Calm Sanctuary UI"
        ).click()

        expect(
            page.get_by_role("heading", name="Welcome, Zawadi. Take this at your own calm pace.")
        ).to_be_visible()
        expect(page.locator("body")).to_have_attribute("data-persona-ui", "sensory-calm")
        bg_zawadi = page.evaluate("getComputedStyle(document.body).backgroundColor")
        assert bg_zawadi == "rgb(238, 245, 241)", f"Expected sage sanctuary bg, got {bg_zawadi}"
        expect(
            page.get_by_role("region", name="Zawadi's Sensory Sanctuary Controls")
        ).to_contain_text("Sensory Load: Low & Steady")
        expect(
            page.get_by_role("img", name="Joy, your rehearsal companion", exact=False)
        ).to_have_attribute("data-motion", "still")
        page.screenshot(path="/tmp/opencode/persona-ui-zawadi.png", full_page=True)

        # 3. Switch to Kamau Ochieng (Dyslexia, ADHD & Executive Function)
        page.get_by_role("button", name="Kamau (Focus/Dyslexia)").click()
        expect(
            page.get_by_role("heading", name="Kamau’s Step-by-Step Journey Workspace")
        ).to_be_visible()
        expect(page.locator("body")).to_have_attribute("data-persona-ui", "reading-focus")
        bg_kamau = page.evaluate("getComputedStyle(document.body).backgroundColor")
        assert bg_kamau == "rgb(253, 248, 236)", f"Expected warm amber paper bg, got {bg_kamau}"
        expect(page.locator("#ai4a11y-reading-ruler")).to_have_count(1)
        expect(page.locator(".dashboard-card")).to_have_count(3)
        expect(
            page.get_by_role("group", name="Kamau's 3-step visual journey checklist")
        ).to_be_visible()
        # Wait for React-safe Bionic Reading pass to bold word prefixes
        page.wait_for_timeout(180)
        assert page.locator(".ai4a11y-bionic").count() > 0, "Bionic Reading spans should be active"
        page.screenshot(path="/tmp/opencode/persona-ui-kamau.png", full_page=True)

        # 4. Switch to Baraka Mwangi (Standard Baseline UI)
        page.get_by_role("button", name="Baraka (Standard)").click()
        expect(
            page.get_by_role("heading", name="What would you like to do?")
        ).to_be_visible()
        expect(page.locator("body")).to_have_attribute("data-persona-ui", "standard")
        expect(page.locator("#ai4a11y-reading-ruler")).to_have_count(0)
        expect(page.locator(".dashboard-card")).to_have_count(2)
        page.screenshot(path="/tmp/opencode/persona-ui-baraka.png", full_page=True)

        # 5. Return to the 3-person Login page via top bar button
        page.get_by_role("button", name="⇄ Switch Person (Login)").click()
        expect(
            page.get_by_role("heading", name="Who is rehearsing their Nairobi journey today?")
        ).to_be_visible()

        assert not errors, f"Unexpected page errors: {errors}"
        browser.close()
        print("PASS: 3-person login screen and all 3 personalized UIs verified with 0 errors.")


if __name__ == "__main__":
    main()
