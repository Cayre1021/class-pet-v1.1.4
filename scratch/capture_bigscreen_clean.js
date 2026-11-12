const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';
app.disableHardwareAcceleration();

async function saveScreenshot(win, filename) {
    const image = await win.webContents.capturePage();
    const filePath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filePath, image.toPNG());
    console.log(`📸 Saved screenshot: ${filename}`);
}

app.whenReady().then(async () => {
    let win;
    try {
        console.log('🚀 Capturing clean BigScreen screenshots...');
        win = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const bigscreenFile = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
        await win.loadFile(bigscreenFile);
        await new Promise(r => setTimeout(r, 1200));

        // Disable CSS transitions for reliable snapshot rendering
        await win.webContents.executeJavaScript(`
            const s = document.createElement('style');
            s.innerHTML = '* { transition: none !important; }';
            document.head.appendChild(s);
        `);

        // 1. Open Primary Radial Menu
        await win.webContents.executeJavaScript(`
            toggleRadialMenu();
            // Force safe positioning calculation without transition lag
            ensureRadialMenuSafePosition();
        `);
        await new Promise(r => setTimeout(r, 600));
        await saveScreenshot(win, 'overhaul_bigscreen_menu_open.png');

        // 2. Open Theme Sub-menu
        await win.webContents.executeJavaScript(`
            handleRadialModuleClick('theme');
            const subContainer = document.getElementById('classpetRadialSubMenu');
            if (subContainer) subContainer.classList.add('open');
        `);
        await new Promise(r => setTimeout(r, 600));
        await saveScreenshot(win, 'overhaul_bigscreen_theme_sub.png');

        // 3. Open View Sub-menu
        await win.webContents.executeJavaScript(`
            handleRadialModuleClick('view');
            const subContainer = document.getElementById('classpetRadialSubMenu');
            if (subContainer) subContainer.classList.add('open');
        `);
        await new Promise(r => setTimeout(r, 600));
        await saveScreenshot(win, 'overhaul_bigscreen_view_sub.png');

        // 4. Open Lottery Sub-menu
        await win.webContents.executeJavaScript(`
            handleRadialModuleClick('lottery');
            const subContainer = document.getElementById('classpetRadialSubMenu');
            if (subContainer) subContainer.classList.add('open');
        `);
        await new Promise(r => setTimeout(r, 600));
        await saveScreenshot(win, 'overhaul_bigscreen_lottery_sub.png');

        console.log('🎉 All clean BigScreen screenshots captured successfully!');
    } catch (err) {
        console.error('Error capturing screenshots:', err);
    } finally {
        if (win) win.close();
        app.quit();
    }
});
