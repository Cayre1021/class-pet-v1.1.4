const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

const THEMES = [
    { key: 'classic', label: '01_current_glaring_white' },
    { key: 'chalkboard', label: '02_chalkboard_green_eye_care' },
    { key: 'warmpaper', label: '03_warm_paper_low_blue_light' },
    { key: 'slatedark', label: '04_slate_charcoal_dark' },
    { key: 'softlight', label: '05_soft_daylight_modern' }
];

app.whenReady().then(async () => {
    let win;
    try {
        win = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const targetUrl = 'file:///' + path.resolve(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html').replace(/\\/g, '/');
        await win.loadURL(targetUrl);
        await new Promise(r => setTimeout(r, 1200));

        const outDir = path.join(__dirname, 'screenshots/eye_care');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        // Ensure we have a sample student with Chinese Lv.20 MAX
        await win.webContents.executeJavaScript(`
            (() => {
                let st = store.students.find(s => (s.level >= 20 || s.pets?.chinese?.level >= 20));
                if (!st) {
                    st = store.students[4] || store.students[0];
                    st.level = 20;
                    st.exp = 1250;
                    st.isHatched = true;
                    if (!st.pets) st.pets = {};
                    st.pets.chinese = {
                        id: 'pet_c_' + st.id,
                        species: 'cat',
                        subject: '语文',
                        name: '灵猫',
                        icon: '👑',
                        level: 20,
                        exp: 1250,
                        visualStage: 5,
                        isHatched: true
                    };
                    store.save();
                }
            })()
        `);

        for (const t of THEMES) {
            console.log(`\n📸 Capturing theme: ${t.key} (${t.label})...`);

            // 1. Switch theme & close modal for grid view
            await win.webContents.executeJavaScript(`
                (() => {
                    closeDetailsModal();
                    setGlobalTheme('${t.key}');
                    renderAll();
                })()
            `);
            await new Promise(r => setTimeout(r, 600));

            // Capture Grid Overview
            const gridImg = await win.webContents.capturePage();
            const gridFile = path.join(outDir, `${t.label}_grid.png`);
            fs.writeFileSync(gridFile, gridImg.toPNG());
            console.log(`  ✅ Grid screenshot: ${gridFile}`);

            // 2. Open Student Details Modal (with Lv.20 MAX banner & Math Tab)
            await win.webContents.executeJavaScript(`
                (() => {
                    const st = store.students.find(s => (s.level >= 20 || s.pets?.chinese?.level >= 20)) || store.students[0];
                    openStudentDetailsModal(st.id);
                    switchModalSubject('math');
                })()
            `);
            await new Promise(r => setTimeout(r, 600));

            // Capture Modal View
            const modalImg = await win.webContents.capturePage();
            const modalFile = path.join(outDir, `${t.label}_modal.png`);
            fs.writeFileSync(modalFile, modalImg.toPNG());
            console.log(`  ✅ Modal screenshot: ${modalFile}`);
        }

        console.log('\n🎉 All 10 High-Fidelity Eye-Care Screenshots Generated Successfully!');
        win.destroy();
        app.quit();
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to generate screenshots:', err);
        if (win) win.destroy();
        app.quit();
        process.exit(1);
    }
});
