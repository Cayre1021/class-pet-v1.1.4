const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../electron-app/src/preload.js')
        }
    });

    const targetUrl = 'file://' + path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html').replace(/\\/g, '/');
    await win.loadURL(targetUrl);
    await new Promise(r => setTimeout(r, 1200));

    // Inject test student with Chinese Lv.20 MAX
    const result = await win.webContents.executeJavaScript(`
        (function() {
            // Find or modify first student to Lv.20 MAX Chinese
            const s = store.students[0];
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

            // Open student detail modal
            openStudentDetailsModal(s.id);

            const banner = document.getElementById('modalAwakenBanner');
            const mathUnlocked = store.isSubjectUnlocked(s.id, 'math');
            const englishUnlocked = store.isSubjectUnlocked(s.id, 'english');

            return {
                bannerVisible: banner ? banner.style.display !== 'none' : false,
                bannerHtml: banner ? banner.innerHTML : '',
                mathUnlocked,
                englishUnlocked
            };
        })()
    `);

    console.log('Result from page:', {
        bannerVisible: result.bannerVisible,
        mathUnlocked: result.mathUnlocked,
        englishUnlocked: result.englishUnlocked
    });

    await new Promise(r => setTimeout(r, 600));

    // Capture screenshot of the modal with 2-choice awaken banner
    const artifactPath = path.join('C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8', 'subject_choice_two_options_proof.png');
    const image = await win.webContents.capturePage();
    fs.writeFileSync(artifactPath, image.toPNG());
    console.log('Saved screenshot to:', artifactPath);

    app.quit();
});
