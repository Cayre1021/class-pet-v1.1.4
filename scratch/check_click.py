from playwright.sync_api import sync_playwright
import os

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    abs_path = os.path.abspath('electron-app/src/display_bigscreen_touch_pro.html')
    page.goto(f'file:///{abs_path.replace(os.sep, "/")}')
    page.wait_for_timeout(1000)

    for i in range(5):
        c = page.query_selector(f'.pet-card:nth-child({i+1})')
        if c:
            onclick = c.get_attribute("onclick")
            cid = c.get_attribute("id")
            print(f"Card {i}: id={cid}, onclick={onclick}")
            c.click()
            page.wait_for_timeout(300)
            modal_display = page.eval_on_selector('#modalStudentDetails', 'el => window.getComputedStyle(el).display')
            hatch_display = page.eval_on_selector('#modalHatchCenter', 'el => window.getComputedStyle(el).display')
            rate = page.inner_text('#heroExpRate')
            text = page.inner_text('#heroExpText')
            bar = page.eval_on_selector('#heroProgressBar', 'el => el.style.width')
            name = page.inner_text('#modalStudentName')
            print(f"   modalStudentDetails display={modal_display}, modalHatchCenter display={hatch_display}")
            print(f"   modalName={name}, rate={rate}, text={text}, bar={bar}")
            page.evaluate("document.getElementById('modalStudentDetails').style.display='none'; document.getElementById('modalHatchCenter').style.display='none';")
            page.wait_for_timeout(200)

    browser.close()
