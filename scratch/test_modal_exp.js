const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const filePath = 'file://' + path.resolve('./electron-app/src/display_bigscreen_touch_pro.html').replace(/\\/g, '/');
    await page.goto(filePath);
    await page.waitForTimeout(1000);

    const cards = await page.$$('.student-card');
    console.log('Found cards:', cards.length);

    for (let i = 0; i < Math.min(6, cards.length); i++) {
        await cards[i].click();
        await page.waitForTimeout(400);
        const name = await page.$eval('#modalStudentName', el => el.textContent);
        const lvl = await page.$eval('#heroPetLevel', el => el.textContent);
        const rate = await page.$eval('#heroExpRate', el => el.textContent);
        const text = await page.$eval('#heroExpText', el => el.textContent);
        const barWidth = await page.$eval('#heroProgressBar', el => el.style.width);
        console.log(`Card ${i}: name=${name}, lvl=${lvl}, rate=${rate}, text=${text}, bar=${barWidth}`);
        await page.click('button:has-text("✕ 关闭")');
        await page.waitForTimeout(200);
    }

    await browser.close();
    process.exit(0);
})();
