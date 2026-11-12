const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    try {
        const win = new BrowserWindow({
            width: 1440,
            height: 900,
            show: true, // Show window so OS compositor runs full speed
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const bigscreenFile = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
        await win.loadFile(bigscreenFile);
        await new Promise(r => setTimeout(r, 1000));

        // Open menu
        await win.webContents.executeJavaScript(`
            toggleRadialMenu();
        `);
        await new Promise(r => setTimeout(r, 600));

        let img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'overhaul_bigscreen_menu_open.png'), img.toPNG());
        console.log('Saved menu open');

        // Theme sub
        await win.webContents.executeJavaScript(`
            handleRadialModuleClick('theme');
        `);
        await new Promise(r => setTimeout(r, 600));
        img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'overhaul_bigscreen_theme_sub.png'), img.toPNG());
        console.log('Saved theme sub');

        // View sub
        await win.webContents.executeJavaScript(`
            handleRadialModuleClick('view');
        `);
        await new Promise(r => setTimeout(r, 600));
        img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'overhaul_bigscreen_view_sub.png'), img.toPNG());
        console.log('Saved view sub');

        // Lottery sub
        await win.webContents.executeJavaScript(`
            handleRadialModuleClick('lottery');
        `);
        await new Promise(r => setTimeout(r, 600));
        img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'overhaul_bigscreen_lottery_sub.png'), img.toPNG());
        console.log('Saved lottery sub');

        win.close();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        app.quit();
    }
});
