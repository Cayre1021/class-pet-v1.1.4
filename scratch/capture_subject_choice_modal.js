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
    await new Promise(r => setTimeout(r, 1500));

    const artifactDir = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';

    // 1. Open st_05 modal (Chinese view)
    await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students.find(x => x.id === 'st_05') || store.students[4];
            openStudentDetailsModal(s.id);
        })()
    `);
    await new Promise(r => setTimeout(r, 600));
    const p1 = await win.capturePage();
    fs.writeFileSync(path.join(artifactDir, 'subject_choice_two_options_proof.png'), p1.toPNG());

    // 2. Click Math Tab
    await win.webContents.executeJavaScript("switchModalSubject('math')");
    await new Promise(r => setTimeout(r, 600));
    const p2 = await win.capturePage();
    fs.writeFileSync(path.join(artifactDir, 'subject_choice_math_tab_proof.png'), p2.toPNG());

    // 3. Click English Tab
    await win.webContents.executeJavaScript("switchModalSubject('english')");
    await new Promise(r => setTimeout(r, 600));
    const p3 = await win.capturePage();
    fs.writeFileSync(path.join(artifactDir, 'subject_choice_english_tab_proof.png'), p3.toPNG());

    // 4. Open Hatch Center for English directly
    await win.webContents.executeJavaScript("openHatchModal('st_05', 'english')");
    await new Promise(r => setTimeout(r, 600));
    const p4 = await win.capturePage();
    fs.writeFileSync(path.join(artifactDir, 'subject_choice_english_hatch_center_proof.png'), p4.toPNG());

    console.log('All 4 visual proofs captured successfully!');
    win.destroy();
    app.quit();
}

app.whenReady().then(run);
