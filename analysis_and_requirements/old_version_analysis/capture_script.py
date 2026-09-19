import os
import sys
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

DIST_DIR = r"D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\dist"
SCREENSHOT_DIR = r"D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\old_version_analysis\screenshots"
PORT = 8990

class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        # Serve index.html for root or SPA fallback if needed
        return super().do_GET()

def start_server():
    server = HTTPServer(("127.0.0.1", PORT), SPAHandler)
    server.serve_forever()

# Start background server
server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
print(f"Server started at http://127.0.0.1:{PORT}")
time.sleep(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    page = context.new_page()

    # 1. Capture Portal (Home)
    print("Capturing 01_portal_home.png...")
    page.goto(f"http://127.0.0.1:{PORT}/#/")
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_portal_home.png"))

    # 2. Capture Teacher Auth (Login/Register Initial State)
    print("Capturing 02_teacher_auth_login.png...")
    page.goto(f"http://127.0.0.1:{PORT}/#/admin")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_teacher_auth_login.png"))

    # Switch to Register
    try:
        register_btn = page.get_by_text("注册新账号", exact=False)
        if register_btn.count() > 0:
            register_btn.first.click()
            page.wait_for_timeout(500)
            print("Capturing 03_teacher_auth_register.png...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_teacher_auth_register.png"))

            # Fill in Registration
            inputs = page.locator("input")
            if inputs.count() >= 2:
                inputs.nth(0).fill("三年级二班")
                inputs.nth(1).fill("兰老师")
                page.locator("button[type='submit']").click()
                page.wait_for_timeout(600)

                # Set password
                pass_inputs = page.locator("input[type='password']")
                if pass_inputs.count() >= 2:
                    pass_inputs.nth(0).fill("123456")
                    pass_inputs.nth(1).fill("123456")
                    page.locator("button[type='submit']").click()
                    page.wait_for_timeout(1000)
    except Exception as e:
        print("Registration error:", e)

    # 3. Capture Teacher Panel (Empty / Initial State)
    print("Capturing 04_teacher_panel_empty.png...")
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_teacher_panel_initial.png"))

    # 4. Add Students (Batch & Single)
    try:
        # Check if there is batch add or single add input
        batch_tab = page.get_by_text("批量添加", exact=False)
        if batch_tab.count() > 0:
            batch_tab.first.click()
            page.wait_for_timeout(500)
            textarea = page.locator("textarea")
            if textarea.count() > 0:
                textarea.first.fill("刘派龙\n张小明\n李晓华\n王乐乐\n赵小刚\n孙悟空\n林黛玉\n贾宝玉")
                page.get_by_text("确认批量添加", exact=False).first.click()
                page.wait_for_timeout(1000)
        else:
            # Single add fallback
            single_input = page.locator("input[placeholder*='姓名']")
            if single_input.count() > 0:
                for name in ["刘派龙", "张小明", "李晓华", "王乐乐", "赵小刚"]:
                    single_input.fill(name)
                    page.get_by_text("添加", exact=False).first.click()
                    page.wait_for_timeout(300)
    except Exception as e:
        print("Add students error:", e)

    # 5. Capture Teacher Panel with Students Populated
    print("Capturing 05_teacher_panel_populated.png...")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_teacher_panel_populated.png"))

    # 6. Select Student and Perform Scoring
    try:
        # Click on first student (刘派龙)
        student_cards = page.locator("div").filter(has_text="刘派龙")
        if student_cards.count() > 0:
            student_cards.first.click()
            page.wait_for_timeout(500)
            print("Capturing 06_teacher_panel_student_selected.png...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_teacher_panel_student_selected.png"))

            # Click a positive score button (+5 or similar)
            plus_btn = page.get_by_text("+", exact=False)
            if plus_btn.count() > 0:
                plus_btn.first.click()
                page.wait_for_timeout(200) # capture confetti/toast
                print("Capturing 07_teacher_panel_score_action.png...")
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_teacher_panel_score_action.png"))
                
                # Add more points to level up 刘派龙 to Lv.3 / Lv.6
                for _ in range(12):
                    plus_btn.first.click()
                    page.wait_for_timeout(150)
    except Exception as e:
        print("Scoring error:", e)

    # 7. Capture Teacher Experience / Settings Curve Modal
    try:
        settings_btn = page.get_by_text("设置", exact=False).or_(page.locator("button").filter(has_text="经验"))
        if settings_btn.count() > 0:
            settings_btn.first.click()
            page.wait_for_timeout(600)
            print("Capturing 08_teacher_panel_settings_curve.png...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_teacher_panel_settings_curve.png"))
            # Close modal
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
    except Exception as e:
        print("Settings modal error:", e)

    # 8. Capture BigScreen View (`#/screen`)
    print("Capturing 09_big_screen_grid.png...")
    page.goto(f"http://127.0.0.1:{PORT}/#/screen")
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_big_screen_grid.png"))

    # 9. Click on a Pet in BigScreen to open Pet Interaction Modal
    try:
        first_pet = page.locator(".cursor-pointer").first
        if first_pet.count() > 0:
            first_pet.click()
            page.wait_for_timeout(800)
            print("Capturing 10_big_screen_pet_modal.png...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_big_screen_pet_modal.png"))

            # Click Hatch if ready or click Pet/Feed
            feed_btn = page.get_by_text("喂食", exact=False)
            if feed_btn.count() > 0:
                feed_btn.first.click()
                page.wait_for_timeout(500)
                print("Capturing 11_big_screen_pet_feed_action.png...")
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "11_big_screen_pet_feed_action.png"))

            # Close Modal
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
    except Exception as e:
        print("Pet modal error:", e)

    # 10. Capture Student Query View (`#/student`)
    print("Capturing 12_student_query_page.png...")
    page.goto(f"http://127.0.0.1:{PORT}/#/student")
    page.wait_for_timeout(1200)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "12_student_query_initial.png"))

    # Select student in query page
    try:
        select_or_input = page.locator("select").or_(page.locator("input[placeholder*='姓名']"))
        if select_or_input.count() > 0:
            if select_or_input.first.evaluate("el => el.tagName") == "SELECT":
                select_or_input.first.select_option(index=1)
            else:
                select_or_input.first.fill("刘派龙")
            page.wait_for_timeout(800)
            print("Capturing 13_student_query_detail.png...")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "13_student_query_detail.png"))
    except Exception as e:
        print("Student query select error:", e)

    # 11. Capture Dashboard View (`#/dashboard`)
    print("Capturing 14_dashboard_analytics.png...")
    page.goto(f"http://127.0.0.1:{PORT}/#/dashboard")
    page.wait_for_timeout(1200)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "14_dashboard_analytics.png"))

    browser.close()
    print("All screenshots captured successfully!")
