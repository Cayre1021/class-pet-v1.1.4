import os
import time
from playwright.sync_api import sync_playwright

root_dir = os.path.dirname(os.path.abspath(__file__))
ui_dir = os.path.join(root_dir, "analysis_and_requirements", "ui_exploration")
out_dir = os.path.join(ui_dir, "screenshots_aligned")
os.makedirs(out_dir, exist_ok=True)

pages = [
    ("prototype_neo_brutalism_display.html", "display_aligned.png"),
    ("prototype_neo_brutalism_teacher.html", "teacher_aligned.png"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    for html_file, out_name in pages:
        file_path = os.path.join(ui_dir, html_file)
        out_path = os.path.join(out_dir, out_name)
        print(f"Capturing: {html_file} -> {out_name}...")
        page.goto(f"file:///{file_path.replace(os.sep, '/')}")
        time.sleep(1.0)
        page.screenshot(path=out_path, full_page=False)
        print(f"  [SUCCESS] Saved {out_name}")

    browser.close()
print("All aligned screenshots captured!")
