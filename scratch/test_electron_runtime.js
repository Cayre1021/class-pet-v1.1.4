const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable hardware acceleration for headless environment
app.disableHardwareAcceleration();

let errorsCaptured = [];
let warningsCaptured = [];
let logsCaptured = [];

async function runRuntimeAudit() {
    console.log('================================================================');
    console.log('   ELECTRON RUNTIME BUG HUNT & DYNAMIC INSPECTION SUITE');
    console.log('================================================================\n');

    // 1. Initialise SQLite service exactly as in main.js
    const sqliteService = require('../electron-app/sqlite_service.js');
    const dbPath = path.join(__dirname, '../database/classpet.sqlite');
    await sqliteService.init(app, dbPath);
    console.log('[OK] SQLite service connected in runtime test');

    // Wire up main IPC handlers
    ipcMain.handle('db:loadAllState', async (event, classId) => sqliteService.loadAllState(classId || 'c_class02_01'));
    ipcMain.handle('db:recordScore', async (event, payload) => sqliteService.recordScoreOperation(payload));
    ipcMain.handle('db:undoScore', async (event, operationId) => sqliteService.undoOperation(operationId));
    ipcMain.handle('db:getStudentAuditLogs', async (event, studentId) => sqliteService.getStudentAuditLogs(studentId));
    ipcMain.handle('db:hatchPet', async (event, payload) => sqliteService.hatchStudentPet(payload));
    ipcMain.handle('db:saveStudent', async (event, { student, classId }) => sqliteService.saveStudent(student, classId));
    ipcMain.handle('db:importStudents', async (event, { students, classId }) => sqliteService.importStudents(students, classId));
    ipcMain.handle('db:saveAllStudents', async (event, { students, classId }) => sqliteService.saveAllStudents(students, classId));
    ipcMain.handle('db:archiveStudent', async (event, { studentId, isArchived, classId }) => sqliteService.archiveStudent(studentId, isArchived));
    ipcMain.handle('db:deleteStudent', async (event, { studentId, classId }) => sqliteService.deleteStudent(studentId));
    ipcMain.handle('db:saveThresholds', async (event, { thresholds, stages, classId }) => sqliteService.saveThresholds(thresholds, stages, classId));
    ipcMain.handle('db:saveBehaviorRules', async (event, { rules, classId }) => sqliteService.saveBehaviorRules(rules, classId));
    ipcMain.handle('db:query', async (event, { sql, params }) => sqliteService.query(sql, params));
    ipcMain.handle('db:execute', async (event, { sql, params }) => sqliteService.execute(sql, params));
    ipcMain.handle('get-displays', () => [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]);

    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '../electron-app/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    });

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const shortSrc = path.basename(sourceId || '');
        if (level >= 3) {
            console.error(`[CONSOLE ERROR] [${shortSrc}:${line}] ${message}`);
            errorsCaptured.push({ level, message, line, sourceId: shortSrc });
        } else if (level === 2) {
            // warning
            warningsCaptured.push({ level, message, line, sourceId: shortSrc });
        } else {
            logsCaptured.push({ level, message, line, sourceId: shortSrc });
        }
    });

    win.webContents.on('render-process-gone', (event, details) => {
        console.error('[CRASH] Renderer process gone:', details);
        errorsCaptured.push({ crash: details });
    });

    // -------------------------------------------------------------
    // Test 1: Load portal_auth.html
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing portal_auth.html ---');
    await win.loadFile(path.join(__dirname, '../electron-app/src/portal_auth.html'));
    console.log('[OK] portal_auth.html loaded successfully');

    const portalChecks = await win.webContents.executeJavaScript(`
        ({
            hasThemeBtns: document.querySelectorAll('.theme-btn').length,
            hasTabs: document.querySelectorAll('.tab-btn').length,
            hasAccountListContainer: !!document.getElementById('accountListContainer'),
            hasRegisterForm: !!document.getElementById('regClassName'),
            hasPasswordInput: !!document.getElementById('inputLoginPassword')
        })
    `);
    console.log('Portal UI checks:', portalChecks);

    // -------------------------------------------------------------
    // Test 2: Load teacher_panel_touch_pro.html
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing teacher_panel_touch_pro.html ---');
    await win.loadFile(path.join(__dirname, '../electron-app/src/teacher_panel_touch_pro.html'));
    console.log('[OK] teacher_panel_touch_pro.html loaded successfully');

    // Wait a brief moment for async loadFromSQLite
    await new Promise(r => setTimeout(r, 600));

    const teacherChecks = await win.webContents.executeJavaScript(`
        (async () => {
            const results = {};
            results.studentsLoaded = store && store.students && store.students.length;
            results.hasSearchBox = !!document.getElementById('searchBox');
            results.hasExcelModal = !!document.getElementById('modalExcelImport');
            results.hasPreviewTable = !!document.getElementById('previewTableBody');
            results.hasAuditModal = !!document.getElementById('modalStudentAudit');
            results.hasThresholdsModal = !!document.getElementById('modalLevelThresholds');
            results.hasAttendanceBtn = !!document.getElementById('btnAttendanceMode');
            results.hasRules = store && store.behaviorRules && store.behaviorRules.length;

            // Test search filtering
            document.getElementById('searchBox').value = '1';
            handleSearch();
            results.filterCount = getFilteredStudents().length;
            document.getElementById('searchBox').value = '';
            handleSearch();

            // Test threshold preset generation
            if (typeof applyThresholdPreset === 'function') {
                applyThresholdPreset('fast');
                results.fastPresetApplied = true;
            }

            return results;
        })()
    `);
    console.log('Teacher Panel UI checks:', teacherChecks);

    // -------------------------------------------------------------
    // Test 3: Load display_bigscreen_touch_pro.html
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing display_bigscreen_touch_pro.html ---');
    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    console.log('[OK] display_bigscreen_touch_pro.html loaded successfully');

    await new Promise(r => setTimeout(r, 600));

    const bigscreenChecks = await win.webContents.executeJavaScript(`
        (async () => {
            const results = {};
            results.studentsLoaded = store && store.students && store.students.length;
            results.hasScaleControls = !!document.querySelector('.scale-control-box');
            results.hasFloatingBall = !!document.getElementById('classpetFloatingBall');
            results.hasRadialMenu = !!document.getElementById('classpetRadialMenu');
            results.hasPKRace = !!document.getElementById('pkRaceView');
            results.hasHatchModal = !!document.getElementById('modalHatchCenter');
            results.hasDetailModal = !!document.getElementById('modalStudentDetails');

            // Test switching views
            switchView('seat');
            results.seatViewVisible = document.getElementById('seatmapView').style.display !== 'none';
            results.scaleHiddenInSeat = document.querySelector('.scale-control-box').style.display === 'none';

            switchView('pk');
            results.pkViewVisible = document.getElementById('pkRaceView').style.display !== 'none';
            results.scaleHiddenInPK = document.querySelector('.scale-control-box').style.display === 'none';

            // Test PK dual mode toggle
            setPKDisplayMode('vertical');
            results.verticalActive = document.getElementById('raceVerticalContainer').style.display !== 'none';
            setPKDisplayMode('horizontal');
            results.horizontalActive = document.getElementById('raceTracksContainer').style.display !== 'none';

            // Return to grid
            switchView('grid');
            results.gridViewVisible = document.getElementById('gridFullView').style.display !== 'none';
            results.scaleShownInGrid = document.querySelector('.scale-control-box').style.display !== 'none';

            // Test audio engine methods
            results.audioMethods = {
                ding: typeof store.audio.playDing === 'function',
                deduct: typeof store.audio.playDeduct === 'function',
                fanfare: typeof store.audio.playFanfare === 'function',
                levelUp: typeof store.audio.playLevelUp === 'function',
                hatch: typeof store.audio.playHatch === 'function'
            };

            return results;
        })()
    `);
    console.log('Bigscreen UI checks:', bigscreenChecks);

    console.log('\n================================================================');
    console.log('RUNTIME LOG SUMMARY:');
    console.log('  Total Logs Captured:     ', logsCaptured.length);
    console.log('  Total Warnings Captured: ', warningsCaptured.length);
    console.log('  Total Console Errors:    ', errorsCaptured.length);
    if (errorsCaptured.length > 0) {
        console.error('CRITICAL RUNTIME ERRORS:');
        errorsCaptured.forEach(e => console.error('  ->', e));
    }
    console.log('================================================================');

    win.destroy();
    app.quit();
    process.exit(errorsCaptured.length === 0 ? 0 : 1);
}

app.whenReady().then(runRuntimeAudit).catch(err => {
    console.error('CRITICAL TEST RUNNER EXCEPTION:', err);
    app.quit();
    process.exit(1);
});
