const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    let win;
    try {
        win = new BrowserWindow({
            width: 1400,
            height: 900,
            show: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const htmlPath = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
        await win.loadFile(htmlPath);
        await new Promise(r => setTimeout(r, 1500));

        // Click card st_01 (张三 Lv.8)
        await win.webContents.executeJavaScript("document.getElementById('petCard_st_01').click()");
        await new Promise(r => setTimeout(r, 1000));

        const img = await win.capturePage();
        fs.writeFileSync('scratch/screenshots/modal_st01_lv8_proof.png', img.toPNG());
        console.log('SUCCESS_CAPTURED_ST01');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        if (win) win.destroy();
        app.quit();
        process.exit(0);
    }
});
