const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

const pagesToTest = [
    'display_bigscreen_touch_pro.html',
    'teacher_panel_touch_pro.html',
    'display_bigscreen.html',
    'display_bigscreen_zoom150.html',
    'portal_auth.html'
];

app.whenReady().then(async () => {
    let win;
    const allErrors = [];

    try {
        win = new BrowserWindow({
            width: 1400,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        win.webContents.on('console-message', (ev, level, msg) => {
            // Level 3 is error
            if (level >= 3 && !msg.includes('ERR_FILE_NOT_FOUND')) {
                allErrors.push({ page: currentPage, type: 'CONSOLE_ERROR', msg });
            }
        });

        let currentPage = '';

        for (const page of pagesToTest) {
            currentPage = page;
            console.log(`\n=================== AUDITING: ${page} ===================`);
            const filePath = path.join(__dirname, '../electron-app/src', page);
            if (!fs.existsSync(filePath)) {
                console.error(`File not found: ${filePath}`);
                continue;
            }

            await win.loadFile(filePath);
            await new Promise(r => setTimeout(r, 1000));

            // Run in-page diagnostic
            const diag = await win.webContents.executeJavaScript(`
                (() => {
                    const pageErrors = [];
                    window.addEventListener('error', (e) => {
                        pageErrors.push({ type: 'UNCAUGHT_ERROR', msg: e.message, file: e.filename, line: e.lineno });
                    });
                    window.addEventListener('unhandledrejection', (e) => {
                        pageErrors.push({ type: 'UNHANDLED_REJECTION', reason: String(e.reason) });
                    });

                    // Check common globals
                    const report = {
                        hasStore: typeof store !== 'undefined',
                        hasStudents: typeof store !== 'undefined' && Array.isArray(store.students) && store.students.length > 0,
                        studentCount: typeof store !== 'undefined' && store.students ? store.students.length : 0,
                        pageErrors: pageErrors
                    };
                    return report;
                })()
            `);
            console.log(`Page basic status: store=${diag.hasStore}, students=${diag.studentCount}`);

            if (page.includes('teacher_panel')) {
                // Test teacher panel interactions
                console.log('Testing teacher panel functions...');
                const teacherRes = await win.webContents.executeJavaScript(`
                    (() => {
                        const errs = [];
                        try {
                            if (typeof selectAllStudents === 'function') selectAllStudents();
                            if (typeof deselectAll === 'function') deselectAll();
                            if (typeof handleStudentRowClick === 'function' && store.students[0]) {
                                handleStudentRowClick(store.students[0].id);
                            }
                            // Test search filter
                            const searchInput = document.getElementById('searchStudent');
                            if (searchInput) {
                                searchInput.value = '1';
                                searchInput.dispatchEvent(new Event('input'));
                                searchInput.value = '';
                                searchInput.dispatchEvent(new Event('input'));
                            }
                            // Test group filter
                            const groupBtns = document.querySelectorAll('.group-filter-btn');
                            if (groupBtns.length > 0) {
                                groupBtns[0].click();
                            }
                            // Test switch subject
                            if (typeof switchSubject === 'function') {
                                switchSubject('math');
                                switchSubject('chinese');
                            }
                        } catch (e) {
                            errs.push({ func: 'teacher_panel_interactions', error: e.message, stack: e.stack });
                        }
                        return errs;
                    })()
                `);
                if (teacherRes.length > 0) {
                    console.error('Teacher panel errors:', teacherRes);
                    allErrors.push(...teacherRes.map(e => ({ page, ...e })));
                } else {
                    console.log('Teacher panel interactions passed cleanly.');
                }
            }

            if (page.includes('bigscreen')) {
                // Test bigscreen interactions
                console.log('Testing bigscreen functions...');
                const bsRes = await win.webContents.executeJavaScript(`
                    (() => {
                        const errs = [];
                        try {
                            const firstId = store.students[0]?.id;
                            if (typeof openStudentDetailsModal === 'function' && firstId) {
                                openStudentDetailsModal(firstId);
                                if (typeof switchModalSubject === 'function') {
                                    switchModalSubject('math');
                                    switchModalSubject('chinese');
                                }
                                if (typeof doInteraction === 'function') {
                                    doInteraction('feed');
                                    doInteraction('pet');
                                }
                                if (typeof closeDetailsModal === 'function') {
                                    closeDetailsModal();
                                }
                            }
                            if (typeof filterByGroup === 'function') {
                                filterByGroup(1);
                                filterByGroup(0);
                            }
                            if (typeof filterBySubject === 'function') {
                                filterBySubject('math');
                                filterBySubject('chinese');
                            }
                        } catch (e) {
                            errs.push({ func: 'bigscreen_interactions', error: e.message, stack: e.stack });
                        }
                        return errs;
                    })()
                `);
                if (bsRes.length > 0) {
                    console.error('Bigscreen errors:', bsRes);
                    allErrors.push(...bsRes.map(e => ({ page, ...e })));
                } else {
                    console.log('Bigscreen interactions passed cleanly.');
                }
            }
        }

        console.log('\n=================== AUDIT SUMMARY ===================');
        console.log(`Total errors detected: ${allErrors.length}`);
        allErrors.forEach(e => console.log('  ', e));
        console.log('====================================================\n');

    } catch (e) {
        console.error('Audit exception:', e);
    } finally {
        if (win) win.destroy();
        app.quit();
        process.exit(0);
    }
});
