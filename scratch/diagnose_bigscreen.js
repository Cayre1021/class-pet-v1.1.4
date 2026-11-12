const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';
app.disableHardwareAcceleration();

async function saveScreenshot(win, filename) {
    await new Promise(r => setTimeout(r, 400));
    const image = await win.webContents.capturePage();
    const filePath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filePath, image.toPNG());
    console.log(`📸 Saved screenshot: ${filename}`);
}

app.whenReady().then(async () => {
    let win;
    try {
        console.log('🚀 Capturing perfect BigScreen radial screenshots with scoped IIFE...');
        win = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        win.webContents.on('console-message', (ev, level, msg) => {
            console.log(`[PAGE LOG ${level}]`, msg);
        });

        const bigscreenFile = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
        await win.loadFile(bigscreenFile);
        await new Promise(r => setTimeout(r, 1200));

        // Disable CSS transitions
        await win.webContents.executeJavaScript(`
            (() => {
                const s = document.createElement('style');
                s.innerHTML = '* { transition: none !important; }';
                document.head.appendChild(s);
            })()
        `);

        // 1. Open Primary Radial Menu
        await win.webContents.executeJavaScript(`
            (() => {
                toggleRadialMenu();
                ensureRadialMenuSafePosition();
            })()
        `);
        await saveScreenshot(win, 'overhaul_bigscreen_menu_open.png');

        // 2. Open Theme Sub-menu
        await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('theme');
                const sub = document.getElementById('classpetRadialSubMenu');
                if (sub) sub.classList.add('open');
            })()
        `);
        await saveScreenshot(win, 'overhaul_bigscreen_theme_sub.png');

        // 3. Open View Sub-menu
        await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('view');
                const sub = document.getElementById('classpetRadialSubMenu');
                if (sub) sub.classList.add('open');
            })()
        `);
        await saveScreenshot(win, 'overhaul_bigscreen_view_sub.png');

        // 4. Open Lottery Sub-menu
        await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('lottery');
                const sub = document.getElementById('classpetRadialSubMenu');
                if (sub) sub.classList.add('open');
            })()
        `);
        await saveScreenshot(win, 'overhaul_bigscreen_lottery_sub.png');

        console.log('🎉 ALL BigScreen screenshots perfectly captured!');
    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        if (win) win.close();
        app.quit();
    }
});
