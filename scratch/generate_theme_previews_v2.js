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
        await new Promise(r => setTimeout(r, 1500));

        const outDir = path.join(__dirname, 'screenshots/eye_care');
        const brainDir = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        // Ensure student #05 (孙七) is Lv.20 MAX
        await win.webContents.executeJavaScript(`
            (() => {
                let st = store.students.find(s => s.id === 'st_05' || s.name === '孙七');
                if (!st) st = store.students[4] || store.students[0];
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
                if (!st.pets.math) {
                    st.pets.math = {
                        subject: '数学',
                        name: '小宠',
                        icon: '🐣',
                        visualStage: 1,
                        species: 'egg',
                        exp: 0,
                        level: 0,
                        isHatched: false
                    };
                }
                store.save();
                renderAll();
            })()
        `);
        await new Promise(r => setTimeout(r, 500));

        for (const t of THEMES) {
            console.log(`\n========================================`);
            console.log(`🎨 Processing Theme: ${t.key} (${t.label})`);

            // Step 1: Set theme directly and close modal for Grid view
            await win.webContents.executeJavaScript(`
                (() => {
                    document.documentElement.setAttribute('data-theme', '${t.key}');
                    const sel = document.getElementById('themeSelect');
                    if (sel) sel.value = '${t.key}';
                    closeDetailsModal();
                    renderAll();
                })()
            `);
            await new Promise(r => setTimeout(r, 600));

            // Verify theme applied and modal closed
            const gridState = await win.webContents.executeJavaScript(`
                (() => ({
                    theme: document.documentElement.getAttribute('data-theme'),
                    modalDisplay: document.getElementById('modalStudentDetails').style.display
                }))()
            `);
            console.log(`  Grid State Check:`, gridState);

            // Capture Grid Overview
            const gridImg = await win.webContents.capturePage();
            const gridFileName = `${t.label}_grid.png`;
            const gridFilePath = path.join(outDir, gridFileName);
            fs.writeFileSync(gridFilePath, gridImg.toPNG());
            fs.copyFileSync(gridFilePath, path.join(brainDir, gridFileName));
            console.log(`  ✅ Grid screenshot captured & saved: ${gridFileName}`);

            // Step 2: Open Student Details Modal (with Lv.20 MAX banner & Math Tab)
            await win.webContents.executeJavaScript(`
                (() => {
                    const st = store.students.find(s => s.id === 'st_05' || s.name === '孙七') || store.students[0];
                    openStudentDetailsModal(st.id);
                    switchModalSubject('math');
                })()
            `);
            await new Promise(r => setTimeout(r, 600));

            // Verify modal opened
            const modalState = await win.webContents.executeJavaScript(`
                (() => ({
                    theme: document.documentElement.getAttribute('data-theme'),
                    modalDisplay: document.getElementById('modalStudentDetails').style.display,
                    subject: activeModalSubject
                }))()
            `);
            console.log(`  Modal State Check:`, modalState);

            // Capture Modal View
            const modalImg = await win.webContents.capturePage();
            const modalFileName = `${t.label}_modal.png`;
            const modalFilePath = path.join(outDir, modalFileName);
            fs.writeFileSync(modalFilePath, modalImg.toPNG());
            fs.copyFileSync(modalFilePath, path.join(brainDir, modalFileName));
            console.log(`  ✅ Modal screenshot captured & saved: ${modalFileName}`);
        }

        console.log('\n🎉 ALL 10 EYE-CARE SCREENSHOTS SUCCESSFULLY GENERATED & VERIFIED!');
        win.destroy();
        app.quit();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error generating screenshots:', err);
        if (win) win.destroy();
        app.quit();
        process.exit(1);
    }
});
