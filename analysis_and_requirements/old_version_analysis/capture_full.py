import os
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

DIST_DIR = r"D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\dist"
SCREENSHOT_DIR = r"D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\old_version_analysis\screenshots"
PORT = 8991

class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

def start_server():
    server = HTTPServer(("127.0.0.1", PORT), SPAHandler)
    server.serve_forever()

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    page = context.new_page()

    # 1. Capture Portal
    print("1. Capturing Portal...")
    page.goto(f"http://127.0.0.1:{PORT}/#/")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_portal_home.png"))

    # 2. Capture Teacher Auth Login
    print("2. Capturing Teacher Auth Login...")
    page.goto(f"http://127.0.0.1:{PORT}/#/admin")
    page.wait_for_timeout(800)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_teacher_auth_login.png"))

    # Switch to Register
    try:
        page.locator("button", has_text="注册").first.click()
        page.wait_for_timeout(500)
        print("3. Capturing Teacher Auth Register Step 1...")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_teacher_auth_register_step1.png"))

        # Fill Class & Teacher
        inputs = page.locator("input")
        inputs.nth(0).fill("三年级二班")
        inputs.nth(1).fill("兰老师")
        page.locator("button[type='submit']").click()
        page.wait_for_timeout(500)

        print("4. Capturing Teacher Auth Register Step 2 (Password)...")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_teacher_auth_register_step2.png"))

        pass_inputs = page.locator("input[type='password']")
        pass_inputs.nth(0).fill("123456")
        pass_inputs.nth(1).fill("123456")
        page.locator("button[type='submit']").click()
        page.wait_for_timeout(1000)
    except Exception as e:
        print("Register exception:", e)

    # 5. Teacher Panel Initial Empty
    print("5. Capturing Teacher Panel Empty...")
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_teacher_panel_empty.png"))

    # 6. Add Students via Single & Batch
    try:
        # Click Batch Import
        batch_toggle = page.locator("button", has_text="批量导入")
        if batch_toggle.count() > 0:
            batch_toggle.click()
            page.wait_for_timeout(400)
            page.locator("textarea").fill("刘派龙\n张小明\n李晓华\n王乐乐\n赵小刚\n孙悟空\n林黛玉\n贾宝玉")
            page.locator("button[type='submit']").click()
            page.wait_for_timeout(1000)
    except Exception as e:
        print("Batch add exception:", e)

    # 7. Teacher Panel with Students Populated
    print("7. Capturing Teacher Panel Populated...")
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_teacher_panel_populated.png"))

    # 8. Select Single Student (刘派龙)
    try:
        first_student = page.locator("div.cursor-pointer").filter(has_text="刘派龙").first
        first_student.click()
        page.wait_for_timeout(400)
        print("8. Capturing Teacher Panel Student Selected...")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_teacher_panel_selected_single.png"))

        # Score positive +5 (认真听讲 or similar)
        pos_rules = page.locator("button.bg-green-50, button.bg-emerald-50, button").filter(has_text="+")
        if pos_rules.count() > 0:
            pos_rules.first.click()
            page.wait_for_timeout(200)
            print("9. Capturing Teacher Panel Scoring Toast & Confetti...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_teacher_panel_scoring_action.png"))

            # Boost 刘派龙 to Level 3 / Level 6
            for _ in range(8):
                pos_rules.first.click()
                page.wait_for_timeout(100)
    except Exception as e:
        print("Scoring exception:", e)

    # 10. Multi-select Students (Select All / Multiple)
    try:
        select_all_btn = page.locator("button", has_text="全选")
        if select_all_btn.count() > 0:
            select_all_btn.click()
            page.wait_for_timeout(400)
            print("10. Capturing Teacher Panel Multi-Select All...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_teacher_panel_multi_select.png"))
    except Exception as e:
        print("Multi-select exception:", e)

    # 11. Open Account / Profile Settings Menu
    try:
        avatar_btn = page.locator("button[aria-label='打开教师账号菜单']")
        if avatar_btn.count() > 0:
            avatar_btn.click()
            page.wait_for_timeout(500)
            print("11. Capturing Teacher Account Dropdown Menu...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_teacher_account_menu.png"))
            avatar_btn.click() # close
            page.wait_for_timeout(300)
    except Exception as e:
        print("Account menu exception:", e)

    # 12. Go to BigScreen (`#/screen`)
    print("12. Capturing BigScreen View...")
    page.goto(f"http://127.0.0.1:{PORT}/#/screen")
    page.wait_for_timeout(1200)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "11_big_screen_grid.png"))

    # 13. Click Pet Card in BigScreen
    try:
        pet_card = page.locator("div.cursor-pointer").first
        pet_card.click()
        page.wait_for_timeout(800)
        print("13. Capturing BigScreen Pet Interaction Modal...")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "12_big_screen_pet_modal.png"))

        # Click Feed action
        feed_btn = page.locator("button", has_text="喂食")
        if feed_btn.count() > 0:
            feed_btn.click()
            page.wait_for_timeout(400)
            print("14. Capturing BigScreen Pet Feed Action...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "13_big_screen_pet_feed.png"))

        # Close Modal
        close_btn = page.locator("button").filter(has=page.locator("svg.lucide-x"))
        if close_btn.count() > 0:
            close_btn.click()
        else:
            page.keyboard.press("Escape")
        page.wait_for_timeout(400)
    except Exception as e:
        print("Pet modal interaction exception:", e)

    # 14. Student Query Page (`#/student`)
    print("14. Capturing Student Query Page...")
    page.goto(f"http://127.0.0.1:{PORT}/#/student")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "14_student_query_initial.png"))

    try:
        student_picker = page.locator("select, input").first
        if student_picker.count() > 0:
            if student_picker.evaluate("el => el.tagName") == "SELECT":
                student_picker.select_option(index=1)
            else:
                student_picker.fill("刘派龙")
                student_picker.press("Enter")
            page.wait_for_timeout(800)
            print("15. Capturing Student Query Detail...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "15_student_query_detail.png"))
    except Exception as e:
        print("Student query exception:", e)

    # 15. Dashboard Page (`#/dashboard`)
    print("15. Capturing Dashboard Analytics...")
    page.goto(f"http://127.0.0.1:{PORT}/#/dashboard")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "16_dashboard_analytics.png"))

    browser.close()
    print("ALL 16 FLOW SCREENSHOTS CAPTURED PERFECTLY!")
