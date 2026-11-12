const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';

(async () => {
    console.log('🚀 Starting Classroom Radial Menu Overhaul Verification...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

    // ==========================================
    // 1. TEST BIG SCREEN RADIAL MENU
    // ==========================================
    console.log('\n--- 1. Testing Student Big Screen (display_bigscreen_touch_pro.html) ---');
    const bigscreenPath = 'file:///' + path.resolve(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html').replace(/\\/g, '/');
    const pageBig = await context.newPage();
    
    // Capture page errors
    const bigErrors = [];
    pageBig.on('pageerror', err => bigErrors.push(err.message));

    await pageBig.goto(bigscreenPath);
    await pageBig.waitForTimeout(1000);

    // Verify floating ball is visible
    const ballBig = await pageBig.$('#classpetFloatingBall');
    if (!ballBig) throw new Error('BigScreen: Floating ball not found!');
    console.log('✓ Floating ball found on BigScreen');

    // Click ball to open menu
    await ballBig.click();
    await pageBig.waitForTimeout(400);

    // Verify 6 primary buttons
    const expectedBigPrimary = [
        'radialMod_theme',
        'radialMod_view',
        'radialMod_lottery',
        'radialMod_reach',
        'radialMod_scale',
        'radialMod_tools'
    ];
    for (const modId of expectedBigPrimary) {
        const el = await pageBig.$('#' + modId);
        if (!el) throw new Error(`BigScreen: Missing primary button #${modId}`);
        const isVisible = await el.isVisible();
        console.log(`✓ Primary button #${modId} visible: ${isVisible}`);
    }

    // Screenshot open primary menu
    await pageBig.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_bigscreen_menu_open.png') });
    console.log('📸 Captured overhaul_bigscreen_menu_open.png');

    // Test Theme sub-menu
    await pageBig.click('#radialMod_theme');
    await pageBig.waitForTimeout(400);
    const themeItems = await pageBig.$$('.radial-sub-item');
    console.log(`✓ BigScreen Theme sub-menu item count: ${themeItems.length} (expected 4)`);
    if (themeItems.length !== 4) throw new Error('BigScreen: Expected 4 theme items');
    await pageBig.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_bigscreen_theme_sub.png') });
    console.log('📸 Captured overhaul_bigscreen_theme_sub.png');

    // Click Forest theme
    await themeItems[2].click(); // Forest
    await pageBig.waitForTimeout(400);
    const curTheme = await pageBig.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`✓ BigScreen theme after click: ${curTheme} (expected forest)`);
    if (curTheme !== 'forest') throw new Error(`BigScreen theme expected forest, got ${curTheme}`);

    // Reopen and test Lottery sub-menu
    await ballBig.click();
    await pageBig.waitForTimeout(300);
    await pageBig.click('#radialMod_lottery');
    await pageBig.waitForTimeout(400);
    const lotItems = await pageBig.$$('.radial-sub-item');
    console.log(`✓ BigScreen Lottery sub-menu item count: ${lotItems.length} (expected 3)`);
    if (lotItems.length !== 3) throw new Error('BigScreen: Expected 3 lottery items');
    await pageBig.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_bigscreen_lottery_sub.png') });
    console.log('📸 Captured overhaul_bigscreen_lottery_sub.png');

    // Test Group picker
    await lotItems[1].click(); // 抽选小组
    await pageBig.waitForTimeout(500);

    // Reopen and test View sub-menu
    await ballBig.click();
    await pageBig.waitForTimeout(300);
    await pageBig.click('#radialMod_view');
    await pageBig.waitForTimeout(400);
    const viewItems = await pageBig.$$('.radial-sub-item');
    console.log(`✓ BigScreen View sub-menu item count: ${viewItems.length} (expected 5)`);
    if (viewItems.length !== 5) throw new Error('BigScreen: Expected 5 view items');
    await pageBig.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_bigscreen_view_sub.png') });
    console.log('📸 Captured overhaul_bigscreen_view_sub.png');

    if (bigErrors.length > 0) {
        throw new Error('BigScreen encountered JS errors: ' + JSON.stringify(bigErrors));
    }
    console.log('✅ BigScreen Radial Menu Overhaul: ALL PASSED (0 errors)');

    // ==========================================
    // 2. TEST TEACHER WORKSTATION RADIAL MENU
    // ==========================================
    console.log('\n--- 2. Testing Teacher Workstation (teacher_panel_touch_pro.html) ---');
    const teacherPath = 'file:///' + path.resolve(__dirname, '../electron-app/src/teacher_panel_touch_pro.html').replace(/\\/g, '/');
    const pageTeach = await context.newPage();

    const teachErrors = [];
    pageTeach.on('pageerror', err => teachErrors.push(err.message));

    await pageTeach.goto(teacherPath);
    await pageTeach.waitForTimeout(1000);

    const ballTeach = await pageTeach.$('#classpetFloatingBall');
    if (!ballTeach) throw new Error('Teacher: Floating ball not found!');
    console.log('✓ Floating ball found on Teacher Panel');

    // Click ball to open menu
    await ballTeach.click();
    await pageTeach.waitForTimeout(400);

    // Verify 6 primary buttons
    const expectedTeachPrimary = [
        'radialMod_theme',
        'radialMod_select',
        'radialMod_subject',
        'radialMod_undo',
        'radialMod_roster',
        'radialMod_system'
    ];
    for (const modId of expectedTeachPrimary) {
        const el = await pageTeach.$('#' + modId);
        if (!el) throw new Error(`Teacher: Missing primary button #${modId}`);
        const isVisible = await el.isVisible();
        console.log(`✓ Primary button #${modId} visible: ${isVisible}`);
    }

    await pageTeach.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_teacher_menu_open.png') });
    console.log('📸 Captured overhaul_teacher_menu_open.png');

    // Test Theme sub-menu
    await pageTeach.click('#radialMod_theme');
    await pageTeach.waitForTimeout(400);
    const teachThemeItems = await pageTeach.$$('.radial-sub-item');
    console.log(`✓ Teacher Theme sub-menu item count: ${teachThemeItems.length} (expected 4)`);
    if (teachThemeItems.length !== 4) throw new Error('Teacher: Expected 4 theme items');
    await pageTeach.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_teacher_theme_sub.png') });
    console.log('📸 Captured overhaul_teacher_theme_sub.png');

    // Click Ocean theme
    await teachThemeItems[3].click(); // Ocean
    await pageTeach.waitForTimeout(400);
    const curTeachTheme = await pageTeach.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log(`✓ Teacher theme after click: ${curTeachTheme} (expected ocean)`);
    if (curTeachTheme !== 'ocean') throw new Error(`Teacher theme expected ocean, got ${curTeachTheme}`);

    // Reopen and test Select (快速选人) sub-menu
    await ballTeach.click();
    await pageTeach.waitForTimeout(300);
    await pageTeach.click('#radialMod_select');
    await pageTeach.waitForTimeout(400);
    const selectItems = await pageTeach.$$('.radial-sub-item');
    console.log(`✓ Teacher Select sub-menu item count: ${selectItems.length} (expected 3)`);
    if (selectItems.length !== 3) throw new Error('Teacher: Expected 3 select items');
    await pageTeach.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_teacher_select_sub.png') });
    console.log('📸 Captured overhaul_teacher_select_sub.png');

    // Test 一键全选
    await selectItems[0].click(); // 全选
    await pageTeach.waitForTimeout(400);
    const selCount = await pageTeach.evaluate(() => selectedIds.size);
    console.log(`✓ Selected student count after 一键全选: ${selCount}`);
    if (selCount === 0) throw new Error('Expected selected students > 0 after select all');

    // Reopen and test Subject sub-menu
    await ballTeach.click();
    await pageTeach.waitForTimeout(300);
    await pageTeach.click('#radialMod_subject');
    await pageTeach.waitForTimeout(400);
    const subItems = await pageTeach.$$('.radial-sub-item');
    console.log(`✓ Teacher Subject sub-menu item count: ${subItems.length} (expected 3)`);
    if (subItems.length !== 3) throw new Error('Teacher: Expected 3 subject items');
    await pageTeach.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_teacher_subject_sub.png') });
    console.log('📸 Captured overhaul_teacher_subject_sub.png');

    // Reopen and test Undo sub-menu
    await ballTeach.click();
    await pageTeach.waitForTimeout(300);
    await pageTeach.click('#radialMod_undo');
    await pageTeach.waitForTimeout(400);
    const undoItems = await pageTeach.$$('.radial-sub-item');
    console.log(`✓ Teacher Undo sub-menu item count: ${undoItems.length} (expected 2)`);
    if (undoItems.length !== 2) throw new Error('Teacher: Expected 2 undo items');
    await pageTeach.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_teacher_undo_sub.png') });
    console.log('📸 Captured overhaul_teacher_undo_sub.png');

    // Reopen and test Roster sub-menu
    await ballTeach.click();
    await pageTeach.waitForTimeout(300);
    await pageTeach.click('#radialMod_roster');
    await pageTeach.waitForTimeout(400);
    const rosterItems = await pageTeach.$$('.radial-sub-item');
    console.log(`✓ Teacher Roster sub-menu item count: ${rosterItems.length} (expected 3)`);
    if (rosterItems.length !== 3) throw new Error('Teacher: Expected 3 roster items');
    await pageTeach.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_teacher_roster_sub.png') });
    console.log('📸 Captured overhaul_teacher_roster_sub.png');

    // Reopen and test System Settings sub-menu
    await ballTeach.click();
    await pageTeach.waitForTimeout(300);
    await pageTeach.click('#radialMod_system');
    await pageTeach.waitForTimeout(400);
    const systemItems = await pageTeach.$$('.radial-sub-item');
    console.log(`✓ Teacher System sub-menu item count: ${systemItems.length} (expected 5)`);
    if (systemItems.length !== 5) throw new Error('Teacher: Expected 5 system items');
    await pageTeach.screenshot({ path: path.join(ARTIFACT_DIR, 'overhaul_teacher_system_sub.png') });
    console.log('📸 Captured overhaul_teacher_system_sub.png');

    if (teachErrors.length > 0) {
        throw new Error('Teacher panel encountered JS errors: ' + JSON.stringify(teachErrors));
    }
    console.log('✅ Teacher Panel Radial Menu Overhaul: ALL PASSED (0 errors)');

    await browser.close();
    console.log('\n🎉 ALL TESTS AND VERIFICATIONS COMPLETED SUCCESSFULLY!');
})();
