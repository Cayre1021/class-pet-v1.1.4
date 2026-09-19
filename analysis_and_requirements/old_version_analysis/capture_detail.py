import os
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

DIST_DIR = r"D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\dist"
SCREENSHOT_DIR = r"D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\old_version_analysis\screenshots"
PORT = 8992

class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

server_thread = threading.Thread(target=lambda: HTTPServer(("127.0.0.1", PORT), SPAHandler).serve_forever(), daemon=True)
server_thread.start()
time.sleep(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Go to student query page
    page.goto(f"http://127.0.0.1:{PORT}/#/student")
    page.wait_for_timeout(800)

    # Click student item
    student_item = page.locator("div.cursor-pointer", has_text="刘派龙").first
    if student_item.count() > 0:
        student_item.click()
        page.wait_for_timeout(800)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "15_student_query_detail.png"))

    # Go to dashboard
    page.goto(f"http://127.0.0.1:{PORT}/#/dashboard")
    page.wait_for_timeout(800)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "16_dashboard_analytics.png"))

    browser.close()
    print("Done updating detail screenshots!")
