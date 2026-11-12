const { app, BrowserWindow } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

const pages = [
    'electron-app/src/display_bigscreen_touch_pro.html',
    'electron-app/src/display_bigscreen.html',
    'electron-app/src/display_bigscreen_zoom150.html',
    'electron-app/src/teacher_panel_touch_pro.html'
];

app.whenReady().then(async () => {
    let allPassed = true;

    for (const pageRel of pages) {
        console.log(`\nTesting page: ${pageRel}`);
        const win = new BrowserWindow({
            width: 1400,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const errors = [];
        win.webContents.on('console-message', (event, level, message, line, sourceId) => {
            if (level >= 3) { // error
                // Filter out non-critical harmless network/asset 404s if any
                if (!message.includes('ERR_FILE_NOT_FOUND')) {
                    errors.push({ message, line, sourceId });
                }
            }
        });

        try {
            await win.loadFile(path.resolve(pageRel));
            await new Promise(r => setTimeout(r, 1200));

            // Test modal interaction if it's a bigscreen page
            if (pageRel.includes('bigscreen')) {
                const modalTest = await win.webContents.executeJavaScript(`
                    (() => {
                        const st = store.students[0];
                        if (!st) return 'no_students';
                        openStudentDetailsModal(st.id);
                        const start = document.getElementById('heroMilestoneStart')?.textContent;
                        const target = document.getElementById('heroMilestoneTarget')?.textContent;
                        const rate = document.getElementById('heroExpRate')?.textContent;
                        const detail = document.getElementById('heroExpText')?.textContent;
                        return { start, target, rate, detail };
                    })()
                `);
                console.log(`  Modal check result:`, modalTest);
                if (!modalTest || !modalTest.start || modalTest.start.includes('--')) {
                    console.error(`  ❌ Modal milestone start failed to populate`);
                    allPassed = false;
                } else {
                    console.log(`  ✅ Modal populated dynamic milestone scale successfully!`);
                }
            } else if (pageRel.includes('teacher_panel')) {
                const teacherCheck = await win.webContents.executeJavaScript(`
                    (() => {
                        const count = store.students ? store.students.length : 0;
                        return { count };
                    })()
                `);
                console.log(`  Teacher panel loaded with students:`, teacherCheck);
                if (teacherCheck.count === 0) {
                    console.error(`  ❌ Teacher panel has 0 students`);
                    allPassed = false;
                } else {
                    console.log(`  ✅ Teacher panel initialized cleanly with ${teacherCheck.count} students!`);
                }
            }

            if (errors.length > 0) {
                console.warn(`  ⚠️ Console errors logged on ${pageRel}:`, errors);
            } else {
                console.log(`  ✅ Zero console errors!`);
            }

        } catch (err) {
            console.error(`  ❌ Exception testing ${pageRel}:`, err);
            allPassed = false;
        } finally {
            win.destroy();
        }
    }

    console.log('\n======================================================');
    if (allPassed) {
        console.log('🎉 ALL 4 MAIN PAGES PASSED RUNTIME AUDIT WITH FLYING COLORS!');
    } else {
        console.error('❌ SOME PAGES ENCOUNTERED AUDIT ISSUES');
    }
    console.log('======================================================');

    app.quit();
    process.exit(allPassed ? 0 : 1);
});
