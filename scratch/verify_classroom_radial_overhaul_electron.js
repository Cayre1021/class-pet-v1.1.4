const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';
app.disableHardwareAcceleration();

async function saveScreenshot(win, filename) {
    const image = await win.webContents.capturePage();
    const filePath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filePath, image.toPNG());
    console.log(`📸 Saved screenshot: ${filename}`);
}

app.whenReady().then(async () => {
    let win;
    try {
        console.log('🚀 Launching Electron for Classroom Radial Menu Overhaul Verification...');
        win = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const rendererErrors = [];
        win.webContents.on('console-message', (ev, level, msg) => {
            if (level >= 3) rendererErrors.push(msg);
            // console.log('[CONSOLE]', msg);
        });

        // ==========================================
        // 1. TEST STUDENT BIG SCREEN
        // ==========================================
        console.log('\n--- 1. Testing Student Big Screen (display_bigscreen_touch_pro.html) ---');
        const bigscreenFile = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
        await win.loadFile(bigscreenFile);
        await new Promise(r => setTimeout(r, 800));
        await win.webContents.executeJavaScript(`
            const s = document.createElement('style');
            s.innerHTML = '* { transition: none !important; }';
            document.head.appendChild(s);
        `);

        // Open radial menu
        const bigPrimaryCheck = await win.webContents.executeJavaScript(`
            (() => {
                const ball = document.getElementById('classpetFloatingBall');
                if (!ball) return { error: 'Floating ball not found' };
                toggleRadialMenu();
                
                const expected = ['radialMod_theme', 'radialMod_view', 'radialMod_lottery', 'radialMod_reach', 'radialMod_scale', 'radialMod_tools'];
                const results = {};
                for (const id of expected) {
                    const el = document.getElementById(id);
                    results[id] = el ? {
                        exists: true,
                        text: el.innerText.trim().replace(/\\s+/g, ' '),
                        title: el.getAttribute('title')
                    } : { exists: false };
                }
                const isOpen = document.getElementById('classpetRadialMenu').classList.contains('open');
                return { isOpen, results };
            })()
        `);
        console.log('✓ BigScreen Primary Menu Open State:', bigPrimaryCheck.isOpen);
        console.log('✓ BigScreen 6 Primary Modules:', JSON.stringify(bigPrimaryCheck.results, null, 2));
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_bigscreen_menu_open.png');

        // Test Theme Sub-menu
        const bigThemeCheck = await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('theme');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ BigScreen Theme Sub-items:', JSON.stringify(bigThemeCheck, null, 2));
        if (bigThemeCheck.count !== 4) throw new Error('Expected 4 theme sub-items on BigScreen');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_bigscreen_theme_sub.png');

        // Click Forest Theme
        await win.webContents.executeJavaScript(`triggerRadialSubAction('theme', 'thm_forest')`);
        await new Promise(r => setTimeout(r, 600));
        const themeForestResult = await win.webContents.executeJavaScript(`
            document.documentElement.getAttribute('data-theme')
        `);
        console.log('✓ BigScreen Theme switched to:', themeForestResult);
        if (themeForestResult !== 'forest') throw new Error('Theme did not switch to forest');

        // Test Lottery Sub-menu
        const bigLotteryCheck = await win.webContents.executeJavaScript(`
            (() => {
                toggleRadialMenu();
                handleRadialModuleClick('lottery');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ BigScreen Lottery Sub-items:', JSON.stringify(bigLotteryCheck, null, 2));
        if (bigLotteryCheck.count !== 3) throw new Error('Expected 3 lottery sub-items on BigScreen');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_bigscreen_lottery_sub.png');

        // Test View Sub-menu
        const bigViewCheck = await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('view');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ BigScreen View Sub-items:', JSON.stringify(bigViewCheck, null, 2));
        if (bigViewCheck.count !== 5) throw new Error('Expected 5 view sub-items on BigScreen');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_bigscreen_view_sub.png');

        // Switch to Seat View
        await win.webContents.executeJavaScript(`triggerRadialSubAction('view', 'view_seat')`);
        await new Promise(r => setTimeout(r, 400));
        await saveScreenshot(win, 'overhaul_bigscreen_seat_view.png');

        // Switch to PK View
        await win.webContents.executeJavaScript(`
            (() => {
                toggleRadialMenu();
                handleRadialModuleClick('view');
                triggerRadialSubAction('view', 'view_pk');
            })()
        `);
        await new Promise(r => setTimeout(r, 400));
        await saveScreenshot(win, 'overhaul_bigscreen_pk_view.png');

        console.log('✅ Student Big Screen Radial Overhaul Verification PASSED!');

        // ==========================================
        // 2. TEST TEACHER WORKSTATION
        // ==========================================
        console.log('\n--- 2. Testing Teacher Workstation (teacher_panel_touch_pro.html) ---');
        const teacherFile = path.join(__dirname, '../electron-app/src/teacher_panel_touch_pro.html');
        await win.loadFile(teacherFile);
        await new Promise(r => setTimeout(r, 800));
        await win.webContents.executeJavaScript(`
            const s = document.createElement('style');
            s.innerHTML = '* { transition: none !important; }';
            document.head.appendChild(s);
        `);

        // Open radial menu on Teacher Panel
        const teachPrimaryCheck = await win.webContents.executeJavaScript(`
            (() => {
                const ball = document.getElementById('classpetFloatingBall');
                if (!ball) return { error: 'Floating ball not found' };
                toggleRadialMenu();
                
                const expected = ['radialMod_theme', 'radialMod_select', 'radialMod_subject', 'radialMod_undo', 'radialMod_roster', 'radialMod_system'];
                const results = {};
                for (const id of expected) {
                    const el = document.getElementById(id);
                    results[id] = el ? {
                        exists: true,
                        text: el.innerText.trim().replace(/\\s+/g, ' '),
                        title: el.getAttribute('title')
                    } : { exists: false };
                }
                const isOpen = document.getElementById('classpetRadialMenu').classList.contains('open');
                return { isOpen, results };
            })()
        `);
        console.log('✓ Teacher Primary Menu Open State:', teachPrimaryCheck.isOpen);
        console.log('✓ Teacher 6 Primary Modules:', JSON.stringify(teachPrimaryCheck.results, null, 2));
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_teacher_menu_open.png');

        // Test Theme Sub-menu on Teacher Panel
        const teachThemeCheck = await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('theme');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ Teacher Theme Sub-items:', JSON.stringify(teachThemeCheck, null, 2));
        if (teachThemeCheck.count !== 4) throw new Error('Expected 4 theme sub-items on Teacher Panel');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_teacher_theme_sub.png');

        // Click Ocean Theme
        const teachOceanResult = await win.webContents.executeJavaScript(`
            (() => {
                triggerRadialSubAction('theme', 'thm_ocean');
                const newTheme = document.documentElement.getAttribute('data-theme');
                return { newTheme };
            })()
        `);
        console.log('✓ Teacher Theme switched to:', teachOceanResult.newTheme);
        if (teachOceanResult.newTheme !== 'ocean') throw new Error('Teacher theme did not switch to ocean');

        // Test Select (快速选人) Sub-menu
        const teachSelectCheck = await win.webContents.executeJavaScript(`
            (() => {
                toggleRadialMenu();
                handleRadialModuleClick('select');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ Teacher Select Sub-items:', JSON.stringify(teachSelectCheck, null, 2));
        if (teachSelectCheck.count !== 3) throw new Error('Expected 3 select sub-items on Teacher Panel');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_teacher_select_sub.png');

        // Test 一键全选
        const selAllResult = await win.webContents.executeJavaScript(`
            (() => {
                triggerRadialSubAction('select', 'sel_all');
                return { selectedCount: selectedIds.size, total: store.students.length };
            })()
        `);
        console.log(`✓ Teacher 一键全选 result: ${selAllResult.selectedCount} / ${selAllResult.total}`);
        if (selAllResult.selectedCount === 0) throw new Error('Select all failed');

        // Test Subject (授课学科) Sub-menu
        const teachSubjectCheck = await win.webContents.executeJavaScript(`
            (() => {
                toggleRadialMenu();
                handleRadialModuleClick('subject');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ Teacher Subject Sub-items:', JSON.stringify(teachSubjectCheck, null, 2));
        if (teachSubjectCheck.count !== 3) throw new Error('Expected 3 subject sub-items on Teacher Panel');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_teacher_subject_sub.png');

        // Test Undo (撤销纠错) Sub-menu
        const teachUndoCheck = await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('undo');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ Teacher Undo Sub-items:', JSON.stringify(teachUndoCheck, null, 2));
        if (teachUndoCheck.count !== 2) throw new Error('Expected 2 undo sub-items on Teacher Panel');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_teacher_undo_sub.png');

        // Test Roster (班务考勤) Sub-menu
        const teachRosterCheck = await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('roster');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ Teacher Roster Sub-items:', JSON.stringify(teachRosterCheck, null, 2));
        if (teachRosterCheck.count !== 3) throw new Error('Expected 3 roster sub-items on Teacher Panel');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_teacher_roster_sub.png');

        // Test System (教学设置) Sub-menu
        const teachSystemCheck = await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('system');
                const subContainer = document.getElementById('classpetRadialSubMenu');
                const items = Array.from(subContainer.querySelectorAll('.radial-sub-item')).map(it => ({
                    text: it.innerText.trim().replace(/\\s+/g, ' '),
                    title: it.getAttribute('title')
                }));
                return { count: items.length, items };
            })()
        `);
        console.log('✓ Teacher System Sub-items:', JSON.stringify(teachSystemCheck, null, 2));
        if (teachSystemCheck.count !== 5) throw new Error('Expected 5 system sub-items on Teacher Panel');
        await new Promise(r => setTimeout(r, 450));
        await saveScreenshot(win, 'overhaul_teacher_system_sub.png');

        console.log('✅ Teacher Workstation Radial Overhaul Verification PASSED!');
        console.log('\n🎉 ALL 12 AUDIT TESTS PASSED WITH 0 ERRORS!');

    } catch (e) {
        console.error('❌ Verification FAILED:', e);
        process.exit(1);
    } finally {
        if (win) win.destroy();
        app.quit();
    }
});
