const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

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

        // 1. Find or setup a student with Chinese Lv.20 MAX
        const testRes = await win.webContents.executeJavaScript(`
            (() => {
                let st = store.students.find(s => (s.level >= 20 || s.pets?.chinese?.level >= 20));
                if (!st) {
                    st = store.students[0];
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

                // Open modal
                openStudentDetailsModal(st.id);

                // Check initial state (Chinese tab active)
                const cBox = document.getElementById('modalHatchTriggerBox').style.display;

                // Switch to Math tab
                switchModalSubject('math');
                const mBox = document.getElementById('modalHatchTriggerBox').style.display;
                const mBtn = document.getElementById('btnModalHatch');
                const mBtnText = mBtn ? mBtn.textContent.trim() : null;

                // Switch to English tab
                switchModalSubject('english');
                const eBox = document.getElementById('modalHatchTriggerBox').style.display;
                const eBtn = document.getElementById('btnModalHatch');
                const eBtnText = eBtn ? eBtn.textContent.trim() : null;

                // Switch back to Chinese tab
                switchModalSubject('chinese');
                const cBox2 = document.getElementById('modalHatchTriggerBox').style.display;

                // Switch back to Math tab to verify button is still intact
                switchModalSubject('math');
                const mBox2 = document.getElementById('modalHatchTriggerBox').style.display;
                const mBtn2 = document.getElementById('btnModalHatch');
                const mBtnText2 = mBtn2 ? mBtn2.textContent.trim() : null;

                return {
                    studentId: st.id,
                    studentName: st.name,
                    cBox,
                    mBox,
                    mBtnText,
                    eBox,
                    eBtnText,
                    cBox2,
                    mBox2,
                    mBtnText2
                };
            })()
        `);

        console.log('Tab Switching Test Result:', JSON.stringify(testRes, null, 2));

        if (!testRes.mBtnText || !testRes.mBtnText2) {
            throw new Error('btnModalHatch was lost during tab switching!');
        }

        const outDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const image = await win.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'modal_tab_switch_hatch_proof.png'), image.toPNG());
        console.log('✅ Screenshot saved to scratch/screenshots/modal_tab_switch_hatch_proof.png');

        console.log('🎉 Tab Switching & Hatch Button Invariant Test PASSED 100%!');
        win.destroy();
        app.quit();
        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed:', err);
        if (win) win.destroy();
        app.quit();
        process.exit(1);
    }
});
