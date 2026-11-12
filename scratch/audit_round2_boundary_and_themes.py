import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

print("=== ROUND 2: BOUNDARY COLLISION & THEME PERSISTENCE AUDIT ===")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # ----------------------------------------------------
    # Part A: Test Boundary Protection on Student Big Screen
    # ----------------------------------------------------
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    abs_path_bs = os.path.abspath("electron-app/src/display_bigscreen_touch_pro.html")
    page.goto(f"file:///{abs_path_bs.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)

    corners = [
        ("Top-Left", 10, 10),
        ("Top-Right", 1420, 10),
        ("Bottom-Left", 10, 880),
        ("Bottom-Right", 1420, 880)
    ]

    for name, x, y in corners:
        # Move ball to extreme corner
        page.evaluate(f"""() => {{
            const c = document.getElementById('floatingBallContainer');
            c.style.left = '{x}px';
            c.style.top = '{y}px';
            c.style.right = 'auto';
            c.style.bottom = 'auto';
        }}""")
        page.wait_for_timeout(200)

        # Click ball to open radial menu
        page.locator("#classpetFloatingBall").click()
        page.wait_for_timeout(350)

        # Check container position after safe clamp
        rect = page.evaluate("""() => {
            const c = document.getElementById('floatingBallContainer');
            const r = c.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        }""")

        assert rect['left'] >= 190, f"BigScreen {name}: Expected left >= 190, got {rect['left']}"
        assert rect['left'] <= 1440 - 190, f"BigScreen {name}: Expected left <= {1440-190}, got {rect['left']}"
        assert rect['top'] >= 190, f"BigScreen {name}: Expected top >= 190, got {rect['top']}"
        assert rect['top'] <= 900 - 190, f"BigScreen {name}: Expected top <= {900-190}, got {rect['top']}"
        print(f"PASS: BigScreen {name} clamped safely to ({rect['left']:.1f}, {rect['top']:.1f}).")

        # Close menu
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)

    # Test all 4 theme transitions on Big Screen
    themes = ['orange', 'forest', 'ocean', 'classic']
    for t in themes:
        page.evaluate(f"setGlobalTheme('{t}')")
        page.wait_for_timeout(200)
        applied = page.evaluate("document.documentElement.getAttribute('data-theme')")
        assert applied == t, f"Expected theme {t}, got {applied}"
        bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        print(f"PASS: BigScreen Theme '{t}' applied successfully (body bg: {bg}).")
    page.close()

    # ----------------------------------------------------
    # Part B: Test Boundary Protection on Teacher Panel
    # ----------------------------------------------------
    page_tp = browser.new_page(viewport={"width": 1440, "height": 900})
    abs_path_tp = os.path.abspath("electron-app/src/teacher_panel_touch_pro.html")
    page_tp.goto(f"file:///{abs_path_tp.replace(os.sep, '/')}")
    page_tp.wait_for_timeout(1000)

    for name, x, y in corners:
        page_tp.evaluate(f"""() => {{
            const c = document.getElementById('floatingBallContainer');
            c.style.left = '{x}px';
            c.style.top = '{y}px';
            c.style.right = 'auto';
            c.style.bottom = 'auto';
        }}""")
        page_tp.wait_for_timeout(200)

        page_tp.locator("#classpetFloatingBall").click()
        page_tp.wait_for_timeout(350)

        rect = page_tp.evaluate("""() => {
            const c = document.getElementById('floatingBallContainer');
            const r = c.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        }""")

        assert rect['left'] >= 190, f"TeacherPanel {name}: Expected left >= 190, got {rect['left']}"
        assert rect['left'] <= 1440 - 190, f"TeacherPanel {name}: Expected left <= {1440-190}, got {rect['left']}"
        assert rect['top'] >= 190, f"TeacherPanel {name}: Expected top >= 190, got {rect['top']}"
        assert rect['top'] <= 900 - 190, f"TeacherPanel {name}: Expected top <= {900-190}, got {rect['top']}"
        print(f"PASS: TeacherPanel {name} clamped safely to ({rect['left']:.1f}, {rect['top']:.1f}).")

        page_tp.keyboard.press("Escape")
        page_tp.wait_for_timeout(200)

    for t in themes:
        page_tp.evaluate(f"setGlobalTheme('{t}')")
        page_tp.wait_for_timeout(200)
        applied = page_tp.evaluate("document.documentElement.getAttribute('data-theme')")
        assert applied == t, f"Expected theme {t}, got {applied}"
        bg = page_tp.evaluate("getComputedStyle(document.body).backgroundColor")
        print(f"PASS: TeacherPanel Theme '{t}' applied successfully (body bg: {bg}).")
    page_tp.close()

    browser.close()
    print("=== ROUND 2 COMPLETED 100% SUCCESSFULLY! ===")
