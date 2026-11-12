from playwright.sync_api import sync_playwright
import os

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    abs_path = os.path.abspath("electron-app/src/display_bigscreen_touch_pro.html")
    page.goto(f"file:///{abs_path.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)

    cards = page.query_selector_all(".pet-card")
    print(f"Total pet cards: {len(cards)}")

    for i in range(min(8, len(cards))):
        cards[i].click()
        page.wait_for_timeout(400)
        name = page.inner_text("#modalStudentName")
        lvl = page.inner_text("#heroPetLevel")
        rate = page.inner_text("#heroExpRate")
        detail = page.inner_text("#heroExpText")
        bar_width = page.eval_on_selector("#heroProgressBar", "el => el.style.width")
        print(f"[{i}] {name} | {lvl} | Rate: {rate} | Detail: {detail} | Bar: {bar_width}")
        page.click("button:has-text('✕ 关闭')")
        page.wait_for_timeout(200)

    browser.close()
