const { app, BrowserWindow } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    let win;
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

        const issues = [];

        win.webContents.on('console-message', (ev, level, msg) => {
            if (level >= 3 && !msg.includes('ERR_FILE_NOT_FOUND')) {
                issues.push({ type: 'CONSOLE_ERROR', msg });
            }
        });

        // 1. Load Touch Pro Bigscreen
        console.log('--- 1. Testing display_bigscreen_touch_pro.html ---');
        await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
        await new Promise(r => setTimeout(r, 1200));

        // Test 1.1: Switch views: seat, pk, grid
        console.log('  Testing view switching (seat, pk, grid)...');
        await win.webContents.executeJavaScript(`
            switchView('seat');
        `);
        await new Promise(r => setTimeout(r, 500));
        const seatOk = await win.webContents.executeJavaScript(`
            document.getElementById('seatMapView')?.style.display !== 'none'
        `);
        if (!seatOk) issues.push({ type: 'FEATURE_FAIL', msg: 'Seat map view failed to show' });

        await win.webContents.executeJavaScript(`
            switchView('pk');
        `);
        await new Promise(r => setTimeout(r, 500));
        const pkOk = await win.webContents.executeJavaScript(`
            document.getElementById('pkRaceView')?.style.display !== 'none'
        `);
        if (!pkOk) issues.push({ type: 'FEATURE_FAIL', msg: 'PK view failed to show' });

        await win.webContents.executeJavaScript(`
            switchView('grid');
        `);
        await new Promise(r => setTimeout(r, 500));

        // Test 1.2: Random picker
        console.log('  Testing random picker...');
        const pickerResult = await win.webContents.executeJavaScript(`
            (() => {
                try {
                    startRandomPicker();
                    return 'picker_started';
                } catch (e) {
                    return 'error: ' + e.message;
                }
            })()
        `);
        console.log('  Picker result:', pickerResult);
        await new Promise(r => setTimeout(r, 1500));
        // Close modal if picker opened one
        await win.webContents.executeJavaScript(`
            if (typeof closeDetailsModal === 'function') closeDetailsModal();
            const pickOverlay = document.getElementById('randomPickerOverlay');
            if (pickOverlay) pickOverlay.style.display = 'none';
        `);

        // Test 1.3: Scoring from modal (+1, +3, +5, -3)
        console.log('  Testing modal scoring and invariants...');
        const scoreTestResult = await win.webContents.executeJavaScript(`
            (() => {
                const s = store.students[0];
                const initialExp = (s && s.exp !== undefined && s.exp !== null) ? Number(s.exp) : 0;
                const initialLvl = s.level;
                
                openStudentDetailsModal(s.id);
                quickModalScore(3, '测试加分');
                const expAfterAdd = s.exp;
                
                quickModalScore(-3, '测试扣分');
                const expAfterSub = s.exp;

                closeDetailsModal();
                return {
                    initialExp,
                    expAfterAdd,
                    expAfterSub,
                    levelMatches: s.level >= initialLvl
                };
            })()
        `);
        console.log('  Score test result:', scoreTestResult);
        if (scoreTestResult.expAfterAdd !== scoreTestResult.initialExp + 3) {
            issues.push({ type: 'LOGIC_FAIL', msg: 'Quick score +3 failed to increase EXP by 3' });
        }
        if (scoreTestResult.expAfterSub !== scoreTestResult.initialExp) {
            issues.push({ type: 'LOGIC_FAIL', msg: 'Quick score -3 failed to restore EXP' });
        }

        // Test 1.4: Theme switching
        console.log('  Testing theme switching...');
        await win.webContents.executeJavaScript(`setGlobalTheme('orange')`);
        await new Promise(r => setTimeout(r, 800));
        const theme1 = await win.webContents.executeJavaScript(`document.documentElement.getAttribute('data-theme')`);
        await win.webContents.executeJavaScript(`setGlobalTheme('classic')`);
        await new Promise(r => setTimeout(r, 800));
        const theme2 = await win.webContents.executeJavaScript(`document.documentElement.getAttribute('data-theme')`);
        const themeTest = { theme1, theme2 };
        console.log('  Theme test result:', themeTest);
        if (themeTest.theme1 !== 'orange' || themeTest.theme2 !== 'classic') {
            issues.push({ type: 'UI_FAIL', msg: 'Theme switching failed' });
        }

        // Test 1.5: Hatch modal opening
        console.log('  Testing hatch center modal...');
        const hatchModalTest = await win.webContents.executeJavaScript(`
            (() => {
                openHatchModal(store.students[0].id);
                const disp = document.getElementById('modalHatchCenter')?.style.display;
                closeHatchModal();
                return { disp };
            })()
        `);
        console.log('  Hatch modal result:', hatchModalTest);
        if (hatchModalTest.disp === 'none') {
            issues.push({ type: 'UI_FAIL', msg: 'Hatch modal failed to open' });
        }

        // 2. Load Teacher Panel Touch Pro
        console.log('\n--- 2. Testing teacher_panel_touch_pro.html ---');
        await win.loadFile(path.join(__dirname, '../electron-app/src/teacher_panel_touch_pro.html'));
        await new Promise(r => setTimeout(r, 1200));

        // Test 2.1: Student selection and score rule triggering
        console.log('  Testing student selection and rule trigger in teacher panel...');
        const teacherScoreTest = await win.webContents.executeJavaScript(`
            (() => {
                const s = store.students[0];
                const expBefore = s.exp;
                handleStudentRowClick(s.id);
                const isSelected = selectedIds.has(s.id);
                
                // Trigger a score rule
                const rule = store.behaviorRules[0];
                triggerScore(rule.points, rule.name);
                const expAfter = s.exp;
                
                return {
                    isSelected,
                    expBefore,
                    expAfter,
                    expectedExp: expBefore + rule.points
                };
            })()
        `);
        console.log('  Teacher score test result:', teacherScoreTest);
        if (!teacherScoreTest.isSelected) {
            issues.push({ type: 'TEACHER_PANEL_FAIL', msg: 'Student selection failed' });
        }
        if (teacherScoreTest.expAfter !== teacherScoreTest.expectedExp) {
            issues.push({ type: 'TEACHER_PANEL_FAIL', msg: 'Rule score failed to apply to student' });
        }

        // Test 2.2: Undo last operation
        console.log('  Testing undo operation in teacher panel...');
        const undoTest = await win.webContents.executeJavaScript(`
            (() => {
                const s = store.students[0];
                const expBeforeUndo = s.exp;
                executeUndo();
                const expAfterUndo = s.exp;
                return { expBeforeUndo, expAfterUndo };
            })()
        `);
        console.log('  Undo test result:', undoTest);

        console.log('\n=============================================');
        console.log('Issues found:', issues.length);
        issues.forEach(i => console.log('  ', i));
        console.log('=============================================');

    } catch (e) {
        console.error('Test script exception:', e);
    } finally {
        if (win) win.destroy();
        app.quit();
        process.exit(0);
    }
});
