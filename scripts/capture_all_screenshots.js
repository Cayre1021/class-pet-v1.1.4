// scripts/capture_all_screenshots.js - Captures high-res screenshots of ClassPet 1.1.4 features
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Setup mock IPC handlers
ipcMain.on('toggle-fullscreen', () => {});
ipcMain.on('open-display-window', () => {});
ipcMain.on('open-teacher-window', () => {});
ipcMain.on('open-portal-window', () => {});
ipcMain.on('broadcast-sync', () => {});
ipcMain.handle('get-displays', async () => []);
ipcMain.handle('db:loadAllState', async () => null);
ipcMain.handle('db:recordScore', async () => ({ success: true, operationId: 'op_test' }));
ipcMain.handle('db:undoScore', async () => ({ success: true }));
ipcMain.handle('db:getStudentAuditLogs', async () => []);
ipcMain.handle('db:hatchPet', async () => ({ success: true }));
ipcMain.handle('db:saveStudent', async () => ({ success: true }));
ipcMain.handle('db:importStudents', async () => ({ success: true }));
ipcMain.handle('db:saveAllStudents', async () => ({ success: true }));
ipcMain.handle('db:archiveStudent', async () => ({ success: true }));
ipcMain.handle('db:deleteStudent', async () => ({ success: true }));
ipcMain.handle('db:saveThresholds', async () => ({ success: true }));
ipcMain.handle('db:saveBehaviorRules', async () => ({ success: true }));
ipcMain.handle('db:query', async () => []);
ipcMain.handle('db:execute', async () => ({ changes: 1 }));

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const outDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function capture(win, filename, label) {
    await sleep(250);
    const img = await win.webContents.capturePage();
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, img.toPNG());
    console.log(`📸 [Captured] ${label} -> ${filename} (${img.getSize().width}x${img.getSize().height})`);
    return filePath;
}

app.whenReady().then(async () => {
    try {
        console.log('🚀 Starting ClassPet Screenshot Capture Engine (Refined)...');
        const preloadPath = path.join(__dirname, '..', 'electron-app', 'preload.js');

        // ==========================================
        // 1. Student Big Screen (display_bigscreen_touch_pro.html)
        // ==========================================
        console.log('\n--- 1. Launching Big Screen ---');
        const winBigscreen = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        winBigscreen.webContents.on('console-message', (e, level, msg, line) => {
            if (level === 3) console.error(`[BigScreen Error L${line}]: ${msg}`);
        });

        const bigscreenUrl = 'file://' + path.join(__dirname, '..', 'electron-app', 'src', 'display_bigscreen_touch_pro.html').replace(/\\/g, '/');
        await winBigscreen.loadURL(bigscreenUrl);
        await sleep(1500);

        // Screenshot 1: Bigscreen Main Overview (全班平铺)
        await capture(winBigscreen, '01_bigscreen_main.png', '学生大屏主界面全班平铺总览');

        // Screenshot 2: Radial Menu 6 Hex
        await winBigscreen.webContents.executeJavaScript(`openRadialMenu();`);
        await sleep(400);
        await capture(winBigscreen, '02_bigscreen_radial_hex.png', '学生大屏终极六角拓扑悬浮圆盘');

        // Screenshot 3: Radial Menu Style Chips (换风格)
        await winBigscreen.webContents.executeJavaScript(`handleRadialModuleClick('theme');`);
        await sleep(400);
        await capture(winBigscreen, '03_bigscreen_theme_chips.png', '🎨 换风格三级展开4款配色芯片');

        // Screenshot 4: Radial Menu Layout Options (大屏排布)
        await winBigscreen.webContents.executeJavaScript(`
            openRadialMenu();
            handleRadialModuleClick('view');
        `);
        await sleep(400);
        await capture(winBigscreen, '04_bigscreen_layout_options.png', '👥 大屏排布三级精简3项直观选项');

        // Screenshot 5: Switched to Group Layout (按组排布)
        await winBigscreen.webContents.executeJavaScript(`
            const subItems = document.querySelectorAll('#classpetRadialSubMenu .radial-sub-item');
            const groupBtn = Array.from(subItems).find(b => b.textContent.includes('按组排布'));
            if (groupBtn) groupBtn.click();
            closeRadialMenu();
        `);
        await sleep(600);
        await capture(winBigscreen, '05_bigscreen_seat_layout.png', '🪑 按组排布四大方阵视图');

        // Switch back to normal tile layout
        await winBigscreen.webContents.executeJavaScript(`
            store.viewMode = 'all';
            currentView = 'all';
            renderAll();
        `);
        await sleep(400);

        // Screenshot 6: Screen Reachability (屏幕下沉 260px)
        await winBigscreen.webContents.executeJavaScript(`
            openRadialMenu();
            handleRadialModuleClick('reach');
            closeRadialMenu();
        `);
        await sleep(500);
        await capture(winBigscreen, '06_bigscreen_reachability_down.png', '⬇️ 屏幕下沉260px触控无忧态');

        // Reset reachability
        await winBigscreen.webContents.executeJavaScript(`toggleReachability();`);
        await sleep(300);

        // Screenshot 7: Random Rollcall (随机点名)
        await winBigscreen.webContents.executeJavaScript(`
            openRadialMenu();
            handleRadialModuleClick('lottery');
        `);
        await sleep(600);
        await capture(winBigscreen, '07_bigscreen_random_rollcall.png', '🎲 随机点名大屏全班滚动模态框');

        // Close rollcall modal
        await winBigscreen.webContents.executeJavaScript(`closeRandomRollcallModal();`);
        await sleep(300);

        // Open Student Details Modal with Hatched Pet (switch to Chinese where pet is hatched!)
        await winBigscreen.webContents.executeJavaScript(`
            if (store.students && store.students.length > 0) {
                openStudentDetailsModal(store.students[0].id);
                switchModalSubject('chinese');
                for (const k in studentInteractCooldowns) delete studentInteractCooldowns[k];
                updateInteractionButtonsUI();
            }
        `);
        await sleep(700);

        // Screenshot 8: Student Card Clean EXP
        await capture(winBigscreen, '08_bigscreen_student_card_clean_exp.png', '学生卡片精简单行经验条 (彻底消除截断)');

        // Trigger Tian-Nü-San-Hua Interaction (burst peak at 950ms - full blossom canopy)
        await winBigscreen.webContents.executeJavaScript(`
            for (const k in studentInteractCooldowns) delete studentInteractCooldowns[k];
            triggerInteraction('pet', '抚摸互动', 1);
        `);
        await sleep(950); // Full explosive canopy of flowers and smileys!
        await capture(winBigscreen, '09_bigscreen_tian_nu_san_hua_burst.png', '🌸 萌宠互动“天女散花”高空扇面爆冲瞬间');

        // Another trigger for Greet with Swaying Downward (cascade at 1500ms)
        await winBigscreen.webContents.executeJavaScript(`
            for (const k in studentInteractCooldowns) delete studentInteractCooldowns[k];
            triggerInteraction('comfort', '暖心关怀', 1);
        `);
        await sleep(1500); // Floating & swaying downwards like flower petals!
        await capture(winBigscreen, '10_bigscreen_tian_nu_san_hua_sway.png', '🌸 萌宠互动“天女散花”漫天花雨随风飘落摇曳瞬间');

        winBigscreen.close();

        // ==========================================
        // 2. Teacher Control Panel (teacher_panel_touch_pro.html)
        // ==========================================
        console.log('\n--- 2. Launching Teacher Panel ---');
        const winTeacher = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        winTeacher.webContents.on('console-message', (e, level, msg, line) => {
            if (level === 3) console.error(`[Teacher Error L${line}]: ${msg}`);
        });

        const teacherUrl = 'file://' + path.join(__dirname, '..', 'electron-app', 'src', 'teacher_panel_touch_pro.html').replace(/\\/g, '/');
        await winTeacher.loadURL(teacherUrl);
        await sleep(1500);

        // Screenshot 11: Teacher Panel Overview (去按钮化顶栏 + 当前正在进行的加分/扣分科目常驻条)
        await capture(winTeacher, '11_teacher_panel_overview.png', '教师控制台极简去按钮化顶栏与加扣分科目醒目常驻条');

        // Screenshot 12: Quick Change Subject (点击【🔄 换科】一步直达三级展开)
        await winTeacher.webContents.executeJavaScript(`
            const btn = document.querySelector('#subjectGlobalNoticeBar span[onclick*="quickOpenSubjectMenu"]');
            if (btn) btn.click();
        `);
        await sleep(500);
        await capture(winTeacher, '12_teacher_panel_quick_change_subject.png', '点击【🔄 换科】一步直达展开三级核心授课科目');

        // Screenshot 13: Class Students 64px items without text overflow
        await winTeacher.webContents.executeJavaScript(`
            closeRadialMenu();
            const sub = document.getElementById('classpetRadialSubMenu');
            if (sub) {
                sub.classList.remove('open');
                sub.innerHTML = '';
            }
        `);
        await sleep(400);
        await winTeacher.webContents.executeJavaScript(`
            openRadialMenu();
            handleRadialModuleClick('students');
        `);
        await sleep(600);
        await capture(winTeacher, '13_teacher_panel_students_menu_64px.png', '👥 班级学生 64px 圆圈【导入Excel】【导入学生】无溢出');

        winTeacher.close();

        console.log('\n🎉 All 13 high-res screenshots successfully captured in screenshots/ directory!');
        app.quit();
    } catch (err) {
        console.error('❌ Error during screenshot capture:', err);
        app.exit(1);
    }
});
