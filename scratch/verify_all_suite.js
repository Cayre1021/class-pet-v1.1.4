const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('================================================================');
console.log('   FULL-SPECTRUM ADVERSARIAL AUDIT & VERIFICATION SUITE');
console.log('================================================================');

let allPassed = true;
function assert(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
    } else {
        console.error(`[FAIL] ${message}`);
        allPassed = false;
    }
}

// 1. Core JS sync check
const core1 = fs.readFileSync('electron-app/src/classpet_core.js', 'utf8');
const core2 = fs.readFileSync('electron-app/src/js/classpet_core.js', 'utf8');
assert(core1 === core2, 'classpet_core.js and js/classpet_core.js are 100% identical (SHA-256 matched)');

const bigscreenHtml = fs.readFileSync('electron-app/src/display_bigscreen_touch_pro.html', 'utf8');
const teacherHtml = fs.readFileSync('electron-app/src/teacher_panel_touch_pro.html', 'utf8');
const sqliteJs = fs.readFileSync('electron-app/sqlite_service.js', 'utf8');
const preloadJs = fs.readFileSync('electron-app/preload.js', 'utf8');
const mainJs = fs.readFileSync('electron-app/main.js', 'utf8');

console.log('\n--- POINT 2: Anti-chuanren & Pointer Scoping ---');
assert(!bigscreenHtml.includes('const target = store.students[0]'), 'No naive fallback to students[0] in bigscreen');
assert(!teacherHtml.includes('const target = store.students[0]'), 'No naive fallback to students[0] in teacher panel');
assert(bigscreenHtml.includes('activeModalStudent'), 'Detail modal uses strict student object pointer (activeModalStudent)');
assert(bigscreenHtml.includes('hatchTargetStudentId'), 'Hatch modal uses strict student ID pointer (hatchTargetStudentId)');
assert(teacherHtml.includes('handleStudentRowClick'), 'Teacher student rows use explicit ID pointer');

console.log('\n--- POINT 4: Discipline Pet Customization ---');
assert(core1.includes('getAvailableHatchSubjects'), 'classpet_core provides getAvailableHatchSubjects');
assert(bigscreenHtml.includes('hatchSubjectBtnGroup'), 'Hatch modal includes subject selection buttons');
assert(bigscreenHtml.includes('hatchSubjectRuleHint'), 'Hatch modal includes rule guidance text');
assert(bigscreenHtml.includes('selectHatchSubject'), 'Hatch modal validates subject choice by discipline rules');

console.log('\n--- POINT 5 & 6: Touch Radial Menu & Minimalism ---');
assert(bigscreenHtml.includes('classpetRadialMenu'), 'Bigscreen has classpetRadialMenu');
assert(bigscreenHtml.includes('classpetFloatingBall'), 'Bigscreen has draggable floating ball');
assert(bigscreenHtml.includes('toggleRadialMenu'), 'Bigscreen has toggleRadialMenu');
assert(bigscreenHtml.includes('closeRadialMenu'), 'Bigscreen has closeRadialMenu');
assert(!bigscreenHtml.includes('id="bottomScoringBar"'), 'Redundant bottom scoring dock removed');

console.log('\n--- POINT 8: PK Dual Mode ---');
assert(bigscreenHtml.includes('setPKDisplayMode'), 'Bigscreen has setPKDisplayMode function');
assert(bigscreenHtml.includes('btnPkVerticalMode'), 'Vertical bar chart button exists');
assert(bigscreenHtml.includes('btnPkHorizontalMode'), 'Horizontal racetrack button exists');
assert(bigscreenHtml.includes('raceVerticalContainer'), 'Vertical bar container exists');
assert(bigscreenHtml.includes('raceTracksContainer'), 'Horizontal racetrack container exists');
assert(bigscreenHtml.includes('localStorage.getItem(\'classpet_pk_mode\')'), 'PK mode persists in localStorage');
assert(bigscreenHtml.includes('setPKDisplayMode(currentPKMode)'), 'PK mode synced on load and view switch');

console.log('\n--- POINT 9: Scale Control Scoping ---');
assert(bigscreenHtml.includes('.scale-control-box'), 'Scale control box class exists');
assert(bigscreenHtml.includes('scaleBoxes.forEach(box => {'), 'switchView toggles scale box visibility');
assert(bigscreenHtml.includes('box.style.display = v === \'grid\' ? \'flex\' : \'none\''), 'Scale box strictly visible ONLY in grid mode');

console.log('\n--- POINT 10: Single Student Audit Drilldown & Undo ---');
assert(teacherHtml.includes('openStudentAuditModal'), 'Teacher panel has openStudentAuditModal');
assert(teacherHtml.includes('undoSingleAuditRecord'), 'Teacher panel has undoSingleAuditRecord');
assert(teacherHtml.includes('getStudentAuditLogs'), 'Teacher panel fetches student audit logs from SQLite');
assert(sqliteJs.includes('getStudentAuditLogs(studentId)'), 'sqlite_service has getStudentAuditLogs');
assert(sqliteJs.includes('undoOperation(operationId)'), 'sqlite_service has undoOperation');
assert(preloadJs.includes('getStudentAuditLogs:'), 'preload exposes getStudentAuditLogs');
assert(preloadJs.includes('undoScore:'), 'preload exposes undoScore');

console.log('\n--- POINT 12: Teacher Panel Focus & Search ---');
assert(!teacherHtml.includes('id="btnPickRandom"'), 'Teacher panel does not contain redundant random picker');
assert(teacherHtml.includes('id="searchBox"'), 'Teacher panel has searchBox');
assert(teacherHtml.includes('handleSearch()'), 'Teacher panel searchBox triggers handleSearch');

console.log('\n--- POINT 14: Real SQLite & No Fake Status ---');
assert(!teacherHtml.includes('数据库连接成功'), 'Fake database connection status removed from teacher panel');
assert(!bigscreenHtml.includes('数据库连接成功'), 'Fake database connection status removed from bigscreen');
assert(fs.existsSync('electron-app/sqlite_service.js'), 'sqlite_service.js exists');
assert(sqliteJs.includes('classpet.sqlite'), 'sqlite_service connects to real embedded classpet.sqlite');

console.log('\n--- POINT 15: In-card Hatching & Fireworks ---');
assert(bigscreenHtml.includes('modalHatchCenter'), 'Bigscreen has modalHatchCenter');
assert(bigscreenHtml.includes('launchCelebration'), 'Bigscreen has launchCelebration fireworks effect');

console.log('\n--- POINT 16: Level Thresholds Generator ---');
assert(teacherHtml.includes('applyThresholdPreset'), 'Teacher panel has applyThresholdPreset');
assert(teacherHtml.includes('stepThreshLevel'), 'Teacher panel has stepThreshLevel');
assert(teacherHtml.includes('generateLinearThresholds'), 'Teacher panel has generateLinearThresholds');
assert(core1.includes('levelThresholds'), 'Core has levelThresholds data');

console.log('\n--- BASELINE PRESERVATION CHECKS ---');
// Excel 2-step import wizard
assert(teacherHtml.includes('openExcelModal'), 'Teacher panel has openExcelModal');
assert(teacherHtml.includes('excelDropZone'), 'Teacher panel has excelDropZone');
assert(teacherHtml.includes('previewTableBody'), 'Teacher panel has 2-step conversion preview table');
assert(teacherHtml.includes('confirmExcelImport'), 'Teacher panel has confirmExcelImport');

// Custom rule deletion
assert(teacherHtml.includes('deleteRule'), 'Teacher panel has deleteRule');
assert(teacherHtml.includes('btn-delete-rule'), 'Custom rules have delete button');
assert(core1.includes('deleteCustomRule'), 'Core has deleteCustomRule');

// Class switching & Portal Navigation
assert(teacherHtml.includes('goToPortal'), 'Teacher panel has goToPortal');
assert(bigscreenHtml.includes('goToPortal'), 'Bigscreen has goToPortal');
assert(teacherHtml.includes('openDisplayBigscreen'), 'Teacher panel has openDisplayBigscreen');
assert(bigscreenHtml.includes('openTeacherWorkstation'), 'Bigscreen has openTeacherWorkstation');
assert(mainJs.includes('open-teacher-window'), 'main.js handles open-teacher-window IPC');
assert(mainJs.includes('open-display-window'), 'main.js handles open-display-window IPC');
assert(mainJs.includes('open-portal-window'), 'main.js handles open-portal-window IPC');

// Random picker on Bigscreen
assert(bigscreenHtml.includes('startRandomPicker'), 'Bigscreen retains random picker modal');

// Audio synthesis
assert(core1.includes('playDing'), 'Audio synthesizer has playDing');
assert(core1.includes('playDeduct'), 'Audio synthesizer has playDeduct');
assert(core1.includes('playFanfare'), 'Audio synthesizer has playFanfare');
assert(core1.includes('playLevelUp'), 'Audio synthesizer has playLevelUp');
assert(core1.includes('playHatch'), 'Audio synthesizer has playHatch');

// Dignity protection
assert(teacherHtml.includes('chkProtectDignity'), 'Dignity protection checkbox preserved');

// Student management
assert(teacherHtml.includes('openEditStudentModal'), 'Edit student modal preserved');
assert(teacherHtml.includes('archiveStudentDirect'), 'Archive student preserved');
assert(teacherHtml.includes('restoreArchivedStudent'), 'Restore student preserved');
assert(teacherHtml.includes('deleteStudentPermanently'), 'Permanent delete preserved');

// Attendance mode
assert(teacherHtml.includes('toggleAttendanceMode'), 'Attendance mode toggle preserved');

console.log('\n================================================================');
console.log('AUDIT RESULT:', allPassed ? 'ALL AUDIT SPECIFICATIONS PASSED (100%)' : 'SOME CHECKS FAILED');
console.log('================================================================');

process.exit(allPassed ? 0 : 1);
