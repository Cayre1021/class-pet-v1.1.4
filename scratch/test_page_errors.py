from playwright.sync_api import sync_playwright
import os

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))

    abs_path = os.path.abspath("electron-app/src/display_bigscreen_touch_pro.html")
    page.goto(f"file:///{abs_path.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)

    print("Clicking first pet card...")
    cards = page.query_selector_all(".pet-card")
    if cards:
        cards[0].click()
        page.wait_for_timeout(500)
    
    browser.close()
