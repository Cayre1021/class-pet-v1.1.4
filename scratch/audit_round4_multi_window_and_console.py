import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

print("=== ROUND 4: MULTI-WINDOW SYNCHRONIZATION & CONSOLE AUDIT ===")

errors_bs = []
errors_tp = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--allow-file-access-from-files'])
    context = browser.new_context()
    
    # Page 1: Student Big Screen
    page_bs = context.new_page()
    page_bs.on("pageerror", lambda err: errors_bs.append(str(err)))
    abs_bs = os.path.abspath("electron-app/src/display_bigscreen_touch_pro.html")
    page_bs.goto(f"file:///{abs_bs.replace(os.sep, '/')}")
    page_bs.wait_for_timeout(1000)

    # Page 2: Teacher Panel
    page_tp = context.new_page()
    page_tp.on("pageerror", lambda err: errors_tp.append(str(err)))
    abs_tp = os.path.abspath("electron-app/src/teacher_panel_touch_pro.html")
    page_tp.goto(f"file:///{abs_tp.replace(os.sep, '/')}")
    page_tp.wait_for_timeout(1000)

    # Initial score of stu_1
    score_bs_initial = page_bs.evaluate("store.students.find(s => s.id === 'stu_1').exp")
    print(f"Initial score on BigScreen for stu_1: {score_bs_initial}")

    # Teacher Panel selects stu_1 and awards +5
    page_tp.evaluate("""() => {
        selectedIds.clear();
        selectedIds.add('stu_1');
        renderStudentList();
    }""")
    page_tp.wait_for_timeout(300)

    # Trigger score on teacher panel
    page_tp.evaluate("triggerScore(5, '课堂精彩发言')")
    page_tp.wait_for_timeout(600)
    score_tp_after = page_tp.evaluate("store.students.find(s => s.id === 'stu_1').exp")
    print(f"Teacher Panel score for stu_1 after +5: {score_tp_after}")

    # Check updated score in store on bigscreen after BroadcastChannel propagation
    page_bs.wait_for_timeout(600)
    score_bs_synced = page_bs.evaluate("store.students.find(s => s.id === 'stu_1').exp")
    print(f"BigScreen auto-synced score for stu_1: {score_bs_synced}")
    assert score_bs_synced == score_tp_after, f"Expected {score_tp_after}, got {score_bs_synced}"

    # Teacher Panel executes undo
    page_tp.evaluate("executeUndo()")
    page_tp.wait_for_timeout(600)
    score_tp_undone = page_tp.evaluate("store.students.find(s => s.id === 'stu_1').exp")
    print(f"Teacher Panel score for stu_1 after Undo: {score_tp_undone}")
    assert score_tp_undone == score_bs_initial, "Score should revert after undo"

    page_bs.wait_for_timeout(600)
    score_bs_undone = page_bs.evaluate("store.students.find(s => s.id === 'stu_1').exp")
    print(f"BigScreen auto-synced score for stu_1 after Undo: {score_bs_undone}")
    assert score_bs_undone == score_bs_initial, "BigScreen should revert after undo"
    print("PASS: Cross-window scoring and undo synchronization verified successfully.")

    # Check console errors
    print(f"BigScreen console errors count: {len(errors_bs)}")
    print(f"TeacherPanel console errors count: {len(errors_tp)}")
    assert len(errors_bs) == 0, f"BigScreen had errors: {errors_bs}"
    assert len(errors_tp) == 0, f"TeacherPanel had errors: {errors_tp}"
    print("PASS: ZERO console errors across both windows!")

    page_bs.close()
    page_tp.close()
    browser.close()
    print("=== ROUND 4 COMPLETED 100% SUCCESSFULLY! ===")
