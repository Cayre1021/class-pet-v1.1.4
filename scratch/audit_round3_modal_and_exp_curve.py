import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

print("=== ROUND 3: MODAL LIVE REFRESH & 0-20 LEVEL EXP CURVE AUDIT ===")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    abs_path = os.path.abspath("electron-app/src/display_bigscreen_touch_pro.html")
    page.goto(f"file:///{abs_path.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)

    # 1. Test Lv.0 Egg student (e.g. stu_1 or newly reset egg)
    page.evaluate("""() => {
        const s = store.students[0];
        s.pets.chinese = {
            id: 'pet_c_' + s.id,
            subject: '语文',
            species: 'egg',
            name: '神秘宠物蛋',
            icon: '🐣',
            level: 0,
            exp: 10,
            isHatched: false
        };
        s.level = 0;
        s.exp = 10;
        openStudentDetailsModal(s.id);
    }""")
    page.wait_for_timeout(400)
    
    rate_egg = page.locator("#heroExpRate").inner_text()
    milestone_target = page.locator("#heroMilestoneTarget").inner_text()
    print(f"PASS: Lv.0 Egg display: {rate_egg}, Target: {milestone_target}")
    assert "15" in milestone_target or "15" in rate_egg, "Egg should target 15 EXP for hatching"

    # Add 5 points to egg while modal is open -> should reach 15 EXP and show hatch trigger!
    page.evaluate("store.scoreStudent(store.students[0].id, 5, '作业优秀', false, 'chinese')")
    page.wait_for_timeout(400)
    hatch_trigger = page.locator("#modalHatchTriggerBox")
    assert hatch_trigger.is_visible(), "Hatch trigger box should appear when egg reaches 15 EXP!"
    print("PASS: Egg reached 15 EXP and hatch trigger box appeared in real time!")
    page.locator("#modalStudentDetails > div").screenshot(path="scratch/screenshots/r3_egg_hatched_live.png")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # 2. Test Lv.8 student live jump (stu_2)
    page.evaluate("openStudentDetailsModal('stu_2')")
    page.wait_for_timeout(300)
    rate_before = page.locator("#heroExpRate").inner_text()
    macro_before = page.locator("#heroExpText").inner_text()
    
    page.evaluate("store.scoreStudent('stu_2', 15, '课外阅读', false, 'chinese')")
    page.wait_for_timeout(400)
    rate_after = page.locator("#heroExpRate").inner_text()
    macro_after = page.locator("#heroExpText").inner_text()
    assert rate_before != rate_after, "Rate text must update immediately"
    assert macro_after.find("1250 EXP") != -1, "Macro text must display 1250 total EXP"
    print(f"PASS: Lv.8 Live score jump: {rate_before} -> {rate_after}")
    print(f"PASS: Macro lifetime progress shows: {macro_after}")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # 3. Test Lv.20 MAX student (e.g. stu_5 孙七)
    page.evaluate("""() => {
        const s = store.students[4];
        s.pets.chinese.level = 20;
        s.pets.chinese.exp = 1250;
        s.level = 20;
        s.exp = 1250;
        openStudentDetailsModal(s.id);
    }""")
    page.wait_for_timeout(400)
    level_tag = page.locator("#heroPetLevel").inner_text()
    assert "20" in level_tag or "MAX" in level_tag, f"Expected Lv.20 MAX, got {level_tag}"
    macro_max = page.locator("#heroExpText").inner_text()
    print(f"PASS: Lv.20 MAX Display: Level: {level_tag} | Text: {macro_max}")
    page.locator("#modalStudentDetails > div").screenshot(path="scratch/screenshots/r3_lv20_max_proof.png")
    page.keyboard.press("Escape")

    browser.close()
    print("=== ROUND 3 COMPLETED 100% SUCCESSFULLY! ===")
