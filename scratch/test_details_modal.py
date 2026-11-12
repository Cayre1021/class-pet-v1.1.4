from playwright.sync_api import sync_playwright
import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    abs_path = os.path.abspath("electron-app/src/display_bigscreen_touch_pro.html")
    page.goto(f"file:///{abs_path.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)

    # 1. Capture grid cards
    os.makedirs("scratch/screenshots", exist_ok=True)
    page.locator("#gridFullView").screenshot(path="scratch/screenshots/grid_cards_proof.png")
    print("Saved grid cards screenshot to scratch/screenshots/grid_cards_proof.png")

    # 2. Open stu_2 (Lv.8 with progress)
    page.evaluate("openStudentDetailsModal('stu_2')")
    page.wait_for_timeout(200)
    page.locator("#modalStudentDetails > div").screenshot(path="scratch/screenshots/modal_exp_progress_proof.png")
    print("Saved stu_2 modal screenshot to scratch/screenshots/modal_exp_progress_proof.png")
    page.evaluate("closeDetailsModal()")

    # 3. Open egg student or hatch test
    browser.close()
