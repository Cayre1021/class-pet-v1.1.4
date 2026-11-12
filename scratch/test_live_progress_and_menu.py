import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    abs_path = os.path.abspath("electron-app/src/display_bigscreen_touch_pro.html")
    page.goto(f"file:///{abs_path.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)

    # 1. Open modal for stu_2
    page.evaluate("openStudentDetailsModal('stu_2')")
    page.wait_for_timeout(500)

    # Check initial modal text
    exp_text_before = page.locator("#heroExpRate").inner_text()
    macro_text_before = page.locator("#heroExpText").inner_text()
    level_before = page.locator("#heroPetLevel").inner_text()
    print(f"Modal before award: Level: {level_before} | Rate: {exp_text_before} | Macro: {macro_text_before}")

    # Capture initial modal screenshot
    page.locator("#modalStudentDetails > div").screenshot(path="scratch/screenshots/modal_before_award.png")

    # Now add 10 points to stu_2 in chinese while modal is open
    page.evaluate("store.scoreStudent('stu_2', 10, '积极回答加分', false, 'chinese')")
    page.wait_for_timeout(600)

    # Check modal text after award
    exp_text_after = page.locator("#heroExpRate").inner_text()
    macro_text_after = page.locator("#heroExpText").inner_text()
    level_after = page.locator("#heroPetLevel").inner_text()
    print(f"Modal after award: Level: {level_after} | Rate: {exp_text_after} | Macro: {macro_text_after}")

    # Capture updated modal screenshot
    page.locator("#modalStudentDetails > div").screenshot(path="scratch/screenshots/modal_after_award.png")

    # Close modal
    page.evaluate("closeDetailsModal()")
    page.wait_for_timeout(400)

    # 2. Test Radial Menu
    page.locator("#classpetFloatingBall").click()
    page.wait_for_timeout(400)
    page.screenshot(path="scratch/screenshots/radial_menu_open.png")

    # Click Display module
    page.locator("#radialMod_display").click()
    page.wait_for_timeout(400)
    page.screenshot(path="scratch/screenshots/radial_display_sub.png")

    # Click Manage module
    page.locator("#radialMod_manage").click()
    page.wait_for_timeout(400)
    page.screenshot(path="scratch/screenshots/radial_manage_sub.png")

    browser.close()
    print("ALL TESTS AND SCREENSHOTS COMPLETED SUCCESSFULLY!")
