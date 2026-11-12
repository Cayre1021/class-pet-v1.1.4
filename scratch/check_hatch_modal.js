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

    await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students.find(x => x.no === '05') || store.students[4];
            s.level = 20;
            s.pets.chinese = {
                id: 'pet_c_' + s.id,
                subject: '语文',
                species: 'cat',
                name: '灵动橘猫',
                icon: '🐱',
                level: 20,
                exp: 1300,
                visualStage: 5,
                isHatched: true
            };
            store.save();
            openHatchModal(s.id, 'english');
        })()
    `);

    // Wait for repaint
    await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 300);
                });
            });
        })
    `);

    const img = await win.capturePage();
    const p = path.join('C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8', 'subject_choice_english_hatch_center_proof.png');
    fs.writeFileSync(p, img.toPNG());
    console.log('Saved hatch modal screenshot to:', p);

    win.destroy();
    app.quit();
}
app.whenReady().then(run);
