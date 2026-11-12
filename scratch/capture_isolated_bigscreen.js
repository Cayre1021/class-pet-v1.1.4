const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';
app.disableHardwareAcceleration();

async function captureState(stateName, prepFn) {
    const win = new BrowserWindow({
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
    await new Promise(r => setTimeout(r, 800));

    await win.webContents.executeJavaScript(`
        (() => {
            const s = document.createElement('style');
            s.innerHTML = '* { transition: none !important; }';
            document.head.appendChild(s);
        })()
    `);

    await win.webContents.executeJavaScript(prepFn);
    // Allow renderer to finish painting
    await new Promise(r => setTimeout(r, 600));

    const image = await win.webContents.capturePage();
    const filePath = path.join(ARTIFACT_DIR, stateName);
    fs.writeFileSync(filePath, image.toPNG());
    console.log(`📸 Successfully saved: ${stateName}`);
    win.close();
}

app.whenReady().then(async () => {
    try {
        console.log('🎯 Capturing isolated BigScreen states...');

        // 1. Menu open
        await captureState('overhaul_bigscreen_menu_open.png', `
            (() => {
                toggleRadialMenu();
                ensureRadialMenuSafePosition();
            })()
        `);

        // 2. Theme Sub
        await captureState('overhaul_bigscreen_theme_sub.png', `
            (() => {
                toggleRadialMenu();
                ensureRadialMenuSafePosition();
                handleRadialModuleClick('theme');
                const sub = document.getElementById('classpetRadialSubMenu');
                if (sub) sub.classList.add('open');
            })()
        `);

        // 3. View Sub
        await captureState('overhaul_bigscreen_view_sub.png', `
            (() => {
                toggleRadialMenu();
                ensureRadialMenuSafePosition();
                handleRadialModuleClick('view');
                const sub = document.getElementById('classpetRadialSubMenu');
                if (sub) sub.classList.add('open');
            })()
        `);

        // 4. Lottery Sub
        await captureState('overhaul_bigscreen_lottery_sub.png', `
            (() => {
                toggleRadialMenu();
                ensureRadialMenuSafePosition();
                handleRadialModuleClick('lottery');
                const sub = document.getElementById('classpetRadialSubMenu');
                if (sub) sub.classList.add('open');
            })()
        `);

        console.log('🎉 All isolated BigScreen screenshots completed!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        app.quit();
    }
});
