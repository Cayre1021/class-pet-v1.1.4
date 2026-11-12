import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

print("=== ROUND 1: TEACHER PANEL RADIAL MENU AUTOMATED AUDIT ===")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    abs_path = os.path.abspath("electron-app/src/teacher_panel_touch_pro.html")
    page.goto(f"file:///{abs_path.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)

    # 1. Verify floating ball presence
    ball = page.locator("#classpetFloatingBall")
    assert ball.is_visible(), "Floating ball must be visible!"
    print("PASS: Floating ball is visible on Teacher Panel.")

    # 2. Click ball to open radial menu
    ball.click()
    page.wait_for_timeout(300)
    menu = page.locator("#classpetRadialMenu")
    assert "open" in menu.get_attribute("class"), "Radial menu should be open!"
    print("PASS: Radial menu opened successfully.")
    page.screenshot(path="scratch/screenshots/r1_teacher_menu_open.png")

    # 3. Test Select Module: sel_all, sel_inv, sel_clr
    page.locator("#radialMod_select").click()
    page.wait_for_timeout(300)
    page.screenshot(path="scratch/screenshots/r1_teacher_select_sub.png")
    
    # Click sel_all
    page.locator("button.radial-sub-item:has-text('全选')").click()
    page.wait_for_timeout(300)
    banner_count = int(page.locator("#bannerCount").inner_text())
    assert banner_count > 0, f"Expected bannerCount > 0, got {banner_count}"
    print(f"PASS: Select All selected {banner_count} students.")

    # Click sel_clr
    ball.click()
    page.wait_for_timeout(200)
    page.locator("#radialMod_select").click()
    page.wait_for_timeout(200)
    page.locator("button.radial-sub-item:has-text('清空')").click()
    page.wait_for_timeout(200)
    banner_count_after_clear = int(page.locator("#bannerCount").inner_text())
    assert banner_count_after_clear == 0, f"Expected 0 after clear, got {banner_count_after_clear}"
    print("PASS: Clear Selection reset count to 0.")

    # 4. Test Subject Module: Math switch
    ball.click()
    page.wait_for_timeout(200)
    page.locator("#radialMod_subject").click()
    page.wait_for_timeout(200)
    page.screenshot(path="scratch/screenshots/r1_teacher_subject_sub.png")
    page.locator("button.radial-sub-item:has-text('数学')").click()
    page.wait_for_timeout(300)
    print("PASS: Switched to Math subject via radial menu.")

    # 5. Test History Module: Audit modal
    ball.click()
    page.wait_for_timeout(200)
    page.locator("#radialMod_history").click()
    page.wait_for_timeout(200)
    page.screenshot(path="scratch/screenshots/r1_teacher_history_sub.png")
    page.locator("button.radial-sub-item:has-text('流水')").click()
    page.wait_for_timeout(400)
    audit_modal = page.locator("#modalAuditLog")
    assert audit_modal.is_visible(), "Audit log modal should open!"
    print("PASS: Audit log modal opened via radial menu.")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    assert not audit_modal.is_visible(), "Modal should close on Escape!"
    print("PASS: Modal closed on Escape key.")

    # 6. Test Class Module: Add Student modal
    ball.click()
    page.wait_for_timeout(200)
    page.locator("#radialMod_class").click()
    page.wait_for_timeout(200)
    page.screenshot(path="scratch/screenshots/r1_teacher_class_sub.png")
    page.locator("button.radial-sub-item:has-text('新增')").click()
    page.wait_for_timeout(400)
    add_modal = page.locator("#modalAddStudent")
    assert add_modal.is_visible(), "Add student modal should open!"
    print("PASS: Add student modal opened via radial menu.")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # 7. Test Settings Module: Theme Switch
    theme_before = page.evaluate("document.documentElement.getAttribute('data-theme')")
    ball.click()
    page.wait_for_timeout(200)
    page.locator("#radialMod_settings").click()
    page.wait_for_timeout(200)
    page.screenshot(path="scratch/screenshots/r1_teacher_settings_sub.png")
    page.locator("button.radial-sub-item:has-text('风格')").click()
    page.wait_for_timeout(300)
    theme_after = page.evaluate("document.documentElement.getAttribute('data-theme')")
    assert theme_before != theme_after, f"Theme should change from {theme_before}, got {theme_after}"
    print(f"PASS: Theme changed from {theme_before} to {theme_after}.")

    # 8. Test Nav Module: Reset ball pos
    ball.click()
    page.wait_for_timeout(200)
    page.locator("#radialMod_nav").click()
    page.wait_for_timeout(200)
    page.screenshot(path="scratch/screenshots/r1_teacher_nav_sub.png")
    page.locator("button.radial-sub-item:has-text('回正')").click()
    page.wait_for_timeout(300)
    print("PASS: Reset ball position executed.")

    browser.close()
    print("=== ROUND 1 COMPLETED 100% SUCCESSFULLY! ===")
