const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

async function run() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../electron-app/preload.js')
        }
    });

    const fileUrl = 'file://' + path.resolve('./electron-app/src/display_bigscreen_touch_pro.html').replace(/\\/g, '/');
    await win.loadURL(fileUrl);
    await new Promise(r => setTimeout(r, 2000));

    const artifactDir = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';

    // Open st_02 (李四, Chinese Lv.2, Math/English locked)
    await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students.find(x => x.no === '02') || store.students[1];
            openStudentDetailsModal(s.id);
            switchModalSubject('math');
        })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    // Force extra frame
    await win.webContents.executeJavaScript("new Promise(r => requestAnimationFrame(() => setTimeout(r, 500)))");

    const img = await win.capturePage();
    const p = path.join(artifactDir, 'subject_locked_state_proof.png');
    fs.writeFileSync(p, img.toPNG());
    console.log('Saved locked state proof to:', p);

    win.destroy();
    app.quit();
}
app.whenReady().then(run);
