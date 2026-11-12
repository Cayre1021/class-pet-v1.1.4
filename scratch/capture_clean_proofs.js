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

    // 1. Prepare student 孙七 (no: '05') with Chinese Lv.20 MAX and Math/English unhatched
    await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students.find(x => x.no === '05') || store.students[4];
            s.level = 20;
            s.pets.chinese = {
                id: 'pet_c_' + s.id,
                subject: '语文',
                species: 'bunny',
                name: '广寒玉兔',
                icon: '🐰',
                level: 20,
                exp: 1300,
                visualStage: 5,
                isHatched: true
            };
            s.pets.math = {
                id: 'pet_m_' + s.id,
                subject: '数学',
                species: 'egg',
                name: '神秘宠物蛋',
                icon: '🐣',
                level: 0,
                exp: 0,
                visualStage: 0,
                isHatched: false
            };
            s.pets.english = {
                id: 'pet_e_' + s.id,
                subject: '英语',
                species: 'egg',
                name: '神秘宠物蛋',
                icon: '🐣',
                level: 0,
                exp: 0,
                visualStage: 0,
                isHatched: false
            };
            store.save();
            openStudentDetailsModal(s.id);
            switchModalSubject('chinese');
        })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    // Capture Proof 1: Chinese Lv.20 MAX with Golden Awaken Banner showing Two Choice Options
    const img1 = await win.capturePage();
    fs.writeFileSync(path.join(artifactDir, 'subject_choice_two_options_proof.png'), img1.toPNG());
    console.log('Saved 1: subject_choice_two_options_proof.png');

    // Switch to Math Tab
    await win.webContents.executeJavaScript("switchModalSubject('math')");
    await new Promise(r => setTimeout(r, 1000));
    const img2 = await win.capturePage();
    fs.writeFileSync(path.join(artifactDir, 'subject_choice_math_tab_proof.png'), img2.toPNG());
    console.log('Saved 2: subject_choice_math_tab_proof.png');

    // Switch to English Tab
    await win.webContents.executeJavaScript("switchModalSubject('english')");
    await new Promise(r => setTimeout(r, 1000));
    const img3 = await win.capturePage();
    fs.writeFileSync(path.join(artifactDir, 'subject_choice_english_tab_proof.png'), img3.toPNG());
    console.log('Saved 3: subject_choice_english_tab_proof.png');

    // Open Hatch Center for English
    await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students.find(x => x.no === '05') || store.students[4];
            openHatchModal(s.id, 'english');
        })()
    `);
    await new Promise(r => setTimeout(r, 1200));
    const img4 = await win.capturePage();
    fs.writeFileSync(path.join(artifactDir, 'subject_choice_english_hatch_center_proof.png'), img4.toPNG());
    console.log('Saved 4: subject_choice_english_hatch_center_proof.png');

    win.destroy();
    app.quit();
}
app.whenReady().then(run);
