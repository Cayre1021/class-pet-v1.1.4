// test_v114_verification.js - Comprehensive Electron verification for ClassPet 1.1.4
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

let winBigscreen = null;
let winTeacher = null;
let errors = [];

let teacherWindowOpened = false;
let displayWindowOpened = false;

// Setup IPC handlers to satisfy preload.js and window interactions
ipcMain.on('toggle-fullscreen', (event) => {});
ipcMain.on('open-display-window', (event) => { displayWindowOpened = true; });
ipcMain.on('open-teacher-window', (event) => { teacherWindowOpened = true; });
ipcMain.on('open-portal-window', (event) => {});
ipcMain.on('broadcast-sync', (event, data) => {});
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

app.whenReady().then(async () => {
    try {
        console.log('🚀 Starting ClassPet 1.1.4 Automated Verification Suite...');
        const preloadPath = path.join(__dirname, 'electron-app', 'preload.js');

        // ==========================================
        // TEST 1: Student Big Screen (display_bigscreen_touch_pro.html)
        // ==========================================
        console.log('\n==================================================');
        console.log('🧪 TEST 1: Student Big Screen (display_bigscreen_touch_pro.html)');
        console.log('==================================================');

        winBigscreen = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        winBigscreen.webContents.on('console-message', (event, level, message, line, sourceId) => {
            if (level === 3) {
                console.error(`[BigScreen Console Error] (${line}): ${message}`);
                errors.push({ page: 'bigscreen', message, line });
            }
        });

        const bigscreenUrl = 'file://' + path.join(__dirname, 'electron-app', 'src', 'display_bigscreen_touch_pro.html').replace(/\\/g, '/');
        await winBigscreen.loadURL(bigscreenUrl);
        await sleep(1000);

        const bigscreenResult = await winBigscreen.webContents.executeJavaScript(`
            (async () => {
                const results = [];
                function assert(cond, msg) {
                    results.push({ pass: !!cond, msg });
                    if (!cond) console.error('ASSERTION FAILED: ' + msg);
                }

                // 1. Verify 6 radial items exist with correct text & icons
                const modTheme = document.getElementById('radialMod_theme');
                const modView = document.getElementById('radialMod_view');
                const modLottery = document.getElementById('radialMod_lottery');
                const modReach = document.getElementById('radialMod_reach');
                const modScale = document.getElementById('radialMod_scale');
                const modTools = document.getElementById('radialMod_tools');

                assert(modTheme && modTheme.textContent.includes('换风格'), '大屏圆盘：🎨 换风格 存在');
                assert(modView && modView.textContent.includes('大屏排布'), '大屏圆盘：👥 大屏排布 存在');
                assert(modLottery && modLottery.textContent.includes('随机点名'), '大屏圆盘：🎲 随机点名 存在');
                assert(modReach && modReach.textContent.includes('屏幕下沉'), '大屏圆盘：⬇️ 屏幕下沉 存在');
                assert(modScale && modScale.textContent.includes('卡片放大'), '大屏圆盘：🔍 卡片放大 存在');
                assert(modTools && modTools.textContent.includes('教师控制台'), '大屏圆盘：⚡ 教师控制台 存在');

                // Verify obsolete elements removed
                assert(!document.getElementById('radialMod_groupLottery'), '大屏圆盘：小组抽选已彻底清除');
                assert(!document.getElementById('radialMod_fireworks'), '大屏圆盘：全班烟花已彻底清除');
                assert(!document.getElementById('radialMod_tugofwar'), '大屏圆盘：拔河跑道已彻底清除');
                assert(!document.getElementById('radialMod_barchart'), '大屏圆盘：竞赛柱图已彻底清除');

                // 2. Open radial menu
                openRadialMenu();
                const menuContainer = document.getElementById('classpetRadialMenu');
                assert(menuContainer.classList.contains('open'), '大屏圆盘展开成功');

                // 3. Test Theme submenu (4 palettes: classic, orange, forest, ocean)
                handleRadialModuleClick('theme');
                const subMenu = document.getElementById('classpetRadialSubMenu');
                const themeSubItems = subMenu.querySelectorAll('.radial-sub-item');
                assert(themeSubItems.length === 4, '换风格三级展开 4 款配色芯片 (当前: ' + themeSubItems.length + ')');
                
                // Click forest theme
                const forestBtn = Array.from(themeSubItems).find(b => b.textContent.includes('森林'));
                assert(forestBtn !== undefined, '护眼森林 配色选项存在');
                if (forestBtn) {
                    forestBtn.click();
                    await new Promise(r => setTimeout(r, 200));
                }
                assert(document.documentElement.getAttribute('data-theme') === 'forest', '护眼森林主题切换生效');

                // 4. Test View submenu (3 items: 全班平铺, 按组排布, 小组PK榜)
                openRadialMenu();
                handleRadialModuleClick('view');
                const viewSubItems = subMenu.querySelectorAll('.radial-sub-item');
                assert(viewSubItems.length === 3, '大屏排布严格精简为 3 个直观选项 (当前: ' + viewSubItems.length + ')');
                const hasGrid = Array.from(viewSubItems).some(b => b.textContent.includes('全班平铺'));
                const hasGroup = Array.from(viewSubItems).some(b => b.textContent.includes('按组排布'));
                const hasPK = Array.from(viewSubItems).some(b => b.textContent.includes('小组PK榜'));
                assert(hasGrid, '选项一：🔲 全班平铺 存在');
                assert(hasGroup, '选项二：🪑 按组排布 存在');
                assert(hasPK, '选项三：🏆 小组PK榜 存在');

                // Click 按组排布
                const groupBtn = Array.from(viewSubItems).find(b => b.textContent.includes('按组排布'));
                if (groupBtn) groupBtn.click();
                assert(currentView === 'seat', '成功切换至【按组排布】视图 (currentView === "seat")');

                // 5. Test Scale submenu (4 presets)
                openRadialMenu();
                handleRadialModuleClick('scale');
                const scaleSubItems = subMenu.querySelectorAll('.radial-sub-item');
                assert(scaleSubItems.length === 4, '卡片放大三级展开 4 档预设 (当前: ' + scaleSubItems.length + ')');
                const has100 = Array.from(scaleSubItems).some(b => b.textContent.includes('1.0x'));
                const has125 = Array.from(scaleSubItems).some(b => b.textContent.includes('1.25x'));
                const has150 = Array.from(scaleSubItems).some(b => b.textContent.includes('1.5x'));
                const has175 = Array.from(scaleSubItems).some(b => b.textContent.includes('1.75x'));
                assert(has100 && has125 && has150 && has175, '卡片放大 1.0x/1.25x/1.5x/1.75x 完整具备');

                // 6. Test Direct Action: 🎲 随机点名 (一步直达，无三级子菜单)
                openRadialMenu();
                handleRadialModuleClick('lottery');
                assert(!subMenu.classList.contains('open'), '随机点名点击后无三级展开');
                const rollcallModal = document.getElementById('modalRandomRollcall');
                assert(rollcallModal && rollcallModal.style.display === 'flex', '随机点名一步直接拉起全班滚动大屏模态框');
                closeRandomRollcallModal();
                assert(rollcallModal.style.display === 'none', '随机点名模态框正常关闭');

                // 7. Test Direct Action: ⬇️ 屏幕下沉 (一步直达下沉260px，无三级子菜单)
                openRadialMenu();
                handleRadialModuleClick('reach');
                assert(!subMenu.classList.contains('open'), '屏幕下沉点击后无三级展开');
                const stageWrapper = document.getElementById('stageWrapper');
                assert(stageWrapper.classList.contains('reachability-active'), '屏幕下沉 260px 生效 (.reachability-active)');
                // Click again to restore
                openRadialMenu();
                handleRadialModuleClick('reach');
                assert(!stageWrapper.classList.contains('reachability-active'), '再次点击屏幕下沉复位还原');

                // 8. Header Buttons: Sort, Fullscreen & Audio
                const btnSortNo = document.getElementById('btnSortNo');
                const btnSortLvl = document.getElementById('btnSortLevel');
                assert(btnSortNo && btnSortNo.textContent.includes('按学号'), '大屏卡片排序按钮已更名为【按学号】');
                assert(btnSortLvl && btnSortLvl.textContent.includes('按等级'), '大屏卡片排序按钮已更名为【按等级】');

                const btnFs = document.getElementById('btnHeaderFullscreen');
                const btnAudio = document.getElementById('btnHeaderAudio');
                assert(btnFs !== null, '右上角全屏轻量图标存在');
                assert(btnAudio !== null, '右上角音效轻量图标存在');
                if (btnAudio) {
                    const preMuted = store.audio ? store.audio.muted : false;
                    btnAudio.click();
                    const postMuted = store.audio ? store.audio.muted : false;
                    assert(preMuted !== postMuted, '课堂音效开关交互正常 (静音/恢复音效切换成功)');
                }

                // 9. Verify Emoji Particles feature module is completely removed per user request
                const heroParticles = document.getElementById('heroEmojiParticles');
                assert(heroParticles === null, '表情粒子浮现容器 (#heroEmojiParticles) 已彻底删除，保持大屏干净清爽');
                assert(typeof spawnPetEmojiParticles === 'undefined', 'spawnPetEmojiParticles 函数已彻底删除');

                // 10. Test Student Cooldown Isolation & Clean EXP Text
                if (store.students && store.students.length >= 2) {
                    const sA = store.students[0];
                    const sB = store.students[1];
                    // Trigger interaction for student A
                    openStudentDetailsModal(sA.id);
                    const heroExpText = document.getElementById('heroExpText');
                    assert(heroExpText && !heroExpText.textContent.includes('距离Lv.20') && !heroExpText.textContent.includes('距离 Lv.20'), '学生卡片经验信息已彻底精简冗余的距离Lv.20后缀，单行完整显示无截断: ' + (heroExpText ? heroExpText.textContent : ''));
                    triggerInteraction('greet');
                    const cdA = getStudentCooldownRemaining(sA.id, 'greet');
                    assert(cdA > 0, '学生A互动后正确独立记录冷却倒计时 (cd: ' + cdA + 's)');
                    
                    // Switch to student B modal
                    openStudentDetailsModal(sB.id);
                    const cdB = getStudentCooldownRemaining(sB.id, 'greet');
                    assert(cdB === 0, '学生B互不干扰，不继承学生A的冷却倒计时 (cdB === 0)');
                    const btnB = document.getElementById('btnInteract_greet');
                    assert(btnB && !btnB.disabled, '学生B详情卡片中的互动按钮保持可用');
                }
                closeDetailsModal();

                // 11. Test Upgraded Fireworks Engine (Multi-color, Full-width Random Positions, Dynamic Burst Types)
                assert(window.classroomFireworks !== undefined, '全屏烟花庆典引擎 (window.classroomFireworks) 存在');
                assert(window.classroomFireworks.themes && window.classroomFireworks.themes.length >= 6, '烟花引擎具备丰富色彩主题库 (当前: ' + (window.classroomFireworks.themes ? window.classroomFireworks.themes.length : 0) + ' 种主题)');
                
                // Test rocket generation: wide random positions and velocities
                window.classroomFireworks.rockets = [];
                for (let i = 0; i < 12; i++) {
                    window.classroomFireworks.addRocket();
                }
                assert(window.classroomFireworks.rockets.length === 12, '成功生成 12 枚随机弹道升空火箭');
                const xPositions = window.classroomFireworks.rockets.map(r => r.x);
                const yTargets = window.classroomFireworks.rockets.map(r => r.targetY);
                const minX = Math.min(...xPositions);
                const maxX = Math.max(...xPositions);
                const minY = Math.min(...yTargets);
                const maxY = Math.max(...yTargets);
                assert(maxX - minX > window.innerWidth * 0.4, '烟花横向爆炸点覆盖开阔全屏 (跨度: ' + Math.round(maxX - minX) + 'px)');
                assert(maxY - minY > window.innerHeight * 0.15, '烟花纵向爆炸点具备高低层次错落 (落差: ' + Math.round(maxY - minY) + 'px)');
                
                // Test burst particle colors: multicolor and sparkle
                const testRocket = window.classroomFireworks.rockets[0];
                window.classroomFireworks.particles = [];
                window.classroomFireworks.explode(200, 200, testRocket);
                assert(window.classroomFireworks.particles.length >= 60, '烟花爆炸粒子数量饱满 (当前: ' + window.classroomFireworks.particles.length + ' 颗)');
                const uniqueColors = new Set(window.classroomFireworks.particles.map(p => p.color));
                assert(uniqueColors.size >= 2, '单次烟花爆炸色彩丰富绚丽 (包含 ' + uniqueColors.size + ' 种独立色彩)');
                
                // Cleanup test particles & rockets
                window.classroomFireworks.rockets = [];
                window.classroomFireworks.particles = [];
                window.classroomFireworks.confetti = [];

                return results;
            })();
        `);

        // Test Direct Action: ⚡ 教师控制台 (一步直达)
        teacherWindowOpened = false;
        await winBigscreen.webContents.executeJavaScript(`
            openRadialMenu();
            handleRadialModuleClick('tools');
        `);
        await sleep(200);
        bigscreenResult.push({
            pass: teacherWindowOpened,
            msg: '⚡ 教师控制台点击一步直达拉起教师工作台 (open-teacher-window)'
        });

        let bigscreenPassCount = 0;
        bigscreenResult.forEach(r => {
            if (r.pass) {
                console.log(`  ✅ PASS: ${r.msg}`);
                bigscreenPassCount++;
            } else {
                console.error(`  ❌ FAIL: ${r.msg}`);
            }
        });

        winBigscreen.close();

        // ==========================================
        // TEST 2: Teacher Control Panel (teacher_panel_touch_pro.html)
        // ==========================================
        console.log('\n==================================================');
        console.log('🧪 TEST 2: Teacher Control Panel (teacher_panel_touch_pro.html)');
        console.log('==================================================');

        winTeacher = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        winTeacher.webContents.on('console-message', (event, level, message, line, sourceId) => {
            if (level === 3) {
                console.error(`[Teacher Console Error] (${line}): ${message}`);
                errors.push({ page: 'teacher', message, line });
            }
        });

        const teacherUrl = 'file://' + path.join(__dirname, 'electron-app', 'src', 'teacher_panel_touch_pro.html').replace(/\\/g, '/');
        await winTeacher.loadURL(teacherUrl);
        await sleep(1000);

        const teacherResult = await winTeacher.webContents.executeJavaScript(`
            (async () => {
                const results = [];
                function assert(cond, msg) {
                    results.push({ pass: !!cond, msg });
                    if (!cond) console.error('ASSERTION FAILED: ' + msg);
                }

                // 1. Top Navbar de-buttoned & portal button sizing check
                const navbar = document.querySelector('.top-navbar-pro');
                assert(navbar !== null, '教师端顶栏存在');
                const navRect = navbar.getBoundingClientRect();
                assert(navRect.height <= 56, '顶栏极致降维去按钮化 (高度 52px，释放垂直空间): 当前高度 ' + navRect.height + 'px');

                const btnPortal = navbar.querySelector('.btn-header-touch');
                assert(btnPortal !== null, '顶栏左上角【← 门户】按钮存在');
                if (btnPortal) {
                    const btnRect = btnPortal.getBoundingClientRect();
                    assert(btnRect.height <= 40 && btnRect.bottom <= navRect.bottom + 2, '【← 门户】按钮尺寸适中 (高度 ' + btnRect.height + 'px <= 40px)，完全收拢在顶栏内不超出界限');
                }
                
                // Check that old stacked buttons are completely removed
                assert(!document.getElementById('btnModeAttendance'), '顶栏无考勤模式按钮');
                assert(!document.getElementById('btnHeaderBackup'), '顶栏无备份还原按钮');
                assert(!document.getElementById('btnHeaderImportExcel'), '顶栏无导入Excel按钮');
                assert(!document.getElementById('btnHeaderAudit'), '顶栏无审计台账按钮');
                assert(!document.getElementById('btnHeaderDisplay'), '顶栏无大屏跳转按钮');
                assert(!document.getElementById('headerThemeSelect'), '顶栏无主题下拉框');

                // 2. Global Subject Notice Bar check
                const subjectNotice = document.getElementById('subjectGlobalNoticeBar');
                assert(subjectNotice !== null, '左侧学生列表上方常驻全局醒目加分科目徽章');
                const subjectText = document.getElementById('subjectGlobalText');
                assert(subjectText && subjectText.textContent.includes('当前正在进行的加分/扣分的科目：'), '初始加分科目规范命名显示：' + (subjectText ? subjectText.textContent : 'none'));
                assert(subjectText && (subjectText.textContent.includes('📖 语文') || subjectText.textContent.includes('📐 数学')), '初始加分科目有效设置：' + (subjectText ? subjectText.textContent : 'none'));

                // 2.1 Test 🔄 换科 button functionality: one-click to open radial menu and pop out Level-3 subject chips
                closeRadialMenu();
                const btnChangeSubj = subjectNotice.querySelector('span[onclick*="quickOpenSubjectMenu"]');
                assert(btnChangeSubj !== null, '左上角【🔄 换科】极速入口按钮存在');
                if (btnChangeSubj) {
                    btnChangeSubj.click();
                    await new Promise(r => setTimeout(r, 100));
                    const menuEl = document.getElementById('classpetRadialMenu');
                    const subMenuEl = document.getElementById('classpetRadialSubMenu');
                    const isRadialOpen = menuEl && menuEl.classList.contains('open');
                    const isSubOpen = subMenuEl && subMenuEl.classList.contains('open');
                    const subItemCount = subMenuEl ? subMenuEl.querySelectorAll('.radial-sub-item').length : 0;
                    assert(isRadialOpen && isSubOpen && subItemCount === 3, '点击【🔄 换科】一步直达展开二级圆盘并立即展开三级授课科目 (语文/数学/英语)');
                    closeRadialMenu();
                }

                // 3. Radial menu 6 hexagonal items check
                const modTheme = document.getElementById('radialMod_theme');
                const modSubject = document.getElementById('radialMod_subject');
                const modBigscreen = document.getElementById('radialMod_bigscreen');
                const modUndo = document.getElementById('radialMod_undo');
                const modStudents = document.getElementById('radialMod_students');
                const modSettings = document.getElementById('radialMod_settings');

                assert(modTheme && modTheme.textContent.includes('换风格'), '教师圆盘：🎨 换风格 存在');
                assert(modSubject && modSubject.textContent.includes('授课科目'), '教师圆盘：📚 授课科目 存在');
                assert(modBigscreen && modBigscreen.textContent.includes('打开大屏'), '教师圆盘：🖥️ 打开大屏 存在');
                assert(modUndo && modUndo.textContent.includes('撤销加分'), '教师圆盘：↩ 撤销加分 存在');
                assert(modStudents && modStudents.textContent.includes('班级学生'), '教师圆盘：👥 班级学生 存在');
                assert(modSettings && modSettings.textContent.includes('讲台设置'), '教师圆盘：⚙️ 讲台设置 存在');

                // Verify obsolete buttons removed
                assert(!document.getElementById('radialMod_attendance'), '教师圆盘：考勤圆圈已彻底删除');
                assert(!document.getElementById('radialMod_selection'), '教师圆盘：选人圆圈已彻底删除');

                // 4. Test Theme Submenu
                openRadialMenu();
                handleRadialModuleClick('theme');
                const subMenu = document.getElementById('classpetRadialSubMenu');
                const themeSubItems = subMenu.querySelectorAll('.radial-sub-item');
                assert(themeSubItems.length === 4, '教师端换风格展开 4 款配色芯片 (当前: ' + themeSubItems.length + ')');
                const oceanBtn = Array.from(themeSubItems).find(b => b.textContent.includes('晴空'));
                if (oceanBtn) {
                    oceanBtn.click();
                    await new Promise(r => setTimeout(r, 200));
                }
                assert(document.documentElement.getAttribute('data-theme') === 'ocean', '晴空蓝调主题切换生效');

                // 5. Test Subject Switching & Dynamic Linkage
                openRadialMenu();
                handleRadialModuleClick('subject');
                const subSubItems = subMenu.querySelectorAll('.radial-sub-item');
                assert(subSubItems.length === 3, '授课科目三级展开 3 门核心课：语文/数学/英语 (当前: ' + subSubItems.length + ')');
                
                // Switch to Chinese
                const cnBtn = Array.from(subSubItems).find(b => b.textContent.includes('语文'));
                if (cnBtn) cnBtn.click();
                assert(activeTeachingSubject === 'chinese', '成功切换当前授课科目为语文');
                assert(document.getElementById('subjectGlobalText').textContent.includes('📖 语文'), '常驻徽章实时联动为【📖 语文】');

                // Switch to Math
                openRadialMenu();
                handleRadialModuleClick('subject');
                const maBtn = Array.from(subMenu.querySelectorAll('.radial-sub-item')).find(b => b.textContent.includes('数学'));
                if (maBtn) maBtn.click();
                assert(activeTeachingSubject === 'math', '成功切回当前授课科目为数学');
                assert(document.getElementById('subjectGlobalText').textContent.includes('📐 数学'), '常驻徽章实时联动为【📐 数学】');

                // 6. Test Undo Submenu (2 items: ↩ 撤回上一笔 / 📜 加分明细台账)
                openRadialMenu();
                handleRadialModuleClick('undo');
                const undoItems = subMenu.querySelectorAll('.radial-sub-item');
                assert(undoItems.length === 2, '撤销加分展开 2 项 (撤回上一笔 / 加分明细台账)');

                // 7. Test Students Submenu (2 items: 📊 导入Excel名单 / ➕ 录入新学生)
                openRadialMenu();
                handleRadialModuleClick('students');
                const studentItems = subMenu.querySelectorAll('.radial-sub-item');
                assert(studentItems.length === 2, '班级学生展开 2 项 (导入Excel / 录入新学生)');
                const subItem0 = studentItems[0];
                const itemWidth = subItem0 ? parseInt(window.getComputedStyle(subItem0).width, 10) : 0;
                const itemHeight = subItem0 ? parseInt(window.getComputedStyle(subItem0).height, 10) : 0;
                assert(itemWidth >= 60 && itemHeight >= 60, '班级学生三级圆圈尺寸扩展至 64px (实测: ' + itemWidth + 'x' + itemHeight + 'px >= 60px)，文字完整收纳不溢出');
                const hasExcel = Array.from(studentItems).some(it => it.textContent.includes('导入Excel'));
                const hasStudent = Array.from(studentItems).some(it => it.textContent.includes('导入学生'));
                assert(hasExcel && hasStudent, '三级圆圈文本精简优化为【导入Excel】与【导入学生】');

                // 8. Test Settings Submenu (2 items: 📏 升级经验阈值 / 💾 数据备份与还原)
                openRadialMenu();
                handleRadialModuleClick('settings');
                const settingItems = subMenu.querySelectorAll('.radial-sub-item');
                assert(settingItems.length === 2, '讲台设置展开 2 项 (经验阈值 / 数据备份与还原)');

                // 9. Test Scoring Guard & Dynamic Subject Auto-Recording
                if (store.students && store.students.length > 0) {
                    const s0 = store.students[0];

                    // A. 验证未解锁/未孵化宠物的加分锁定守卫 (数学科目下张三未解锁，必须严格锁住)
                    const mathCheck = store.canScoreStudentPet(s0.id, 'math');
                    assert(!mathCheck.allowed, '未解锁/未孵化宠物被严格锁定拦截：张三数学不可加分 (' + mathCheck.reason + ')');

                    const preMathExp = (s0.pets && s0.pets.math && s0.pets.math.exp) || 0;
                    selectedIds.clear();
                    selectedIds.add(s0.id);
                    await triggerScore(5, '测试数学加分拦截');
                    const postMathExp = (s0.pets && s0.pets.math && s0.pets.math.exp) || 0;
                    assert(postMathExp === preMathExp, '未解锁/未孵化宠物成功锁住：数学经验严格保持 ' + postMathExp + ' 未被错误增加');

                    // B. 切换至已解锁且已破壳的【语文】科目，验证正常赋分与撤销
                    setTeacherActiveSubject('chinese', true);
                    const cnCheck = store.canScoreStudentPet(s0.id, 'chinese');
                    assert(cnCheck.allowed, '已解锁且已破壳宠物具备正常加分资格：张三语文可正常赋分');

                    const preCnExp = (s0.pets && s0.pets.chinese && s0.pets.chinese.exp) || 0;
                    selectedIds.clear();
                    selectedIds.add(s0.id);
                    renderStudentList();

                    // Trigger score +5 in Chinese
                    await triggerScore(5, '课堂精彩发言 (测试)');
                    const postCnExp = (s0.pets && s0.pets.chinese && s0.pets.chinese.exp) || 0;
                    assert(postCnExp === preCnExp + 5, '加分自动记录至当前科目【语文】：EXP 从 ' + preCnExp + ' 增至 ' + postCnExp);
                    assert(lastUndoRecord !== null, '撤销记录成功捕获加分操作 (lastUndoRecord !== null)');

                    // Test Undo execution
                    await executeUndo();
                    const revertCnExp = (s0.pets && s0.pets.chinese && s0.pets.chinese.exp) || 0;
                    assert(revertCnExp === preCnExp, '撤回上一笔成功，EXP 恢复为 ' + revertCnExp);

                    // 复位切回数学
                    setTeacherActiveSubject('math', true);
                }

                return results;
            })();
        `);

        // Test Direct Action: 🖥️ 打开大屏 (一步直达)
        displayWindowOpened = false;
        await winTeacher.webContents.executeJavaScript(`
            openRadialMenu();
            handleRadialModuleClick('bigscreen');
        `);
        await sleep(200);
        teacherResult.push({
            pass: displayWindowOpened,
            msg: '🖥️ 打开大屏点击一步直达跨屏联动 (open-display-window)'
        });

        let teacherPassCount = 0;
        teacherResult.forEach(r => {
            if (r.pass) {
                console.log(`  ✅ PASS: ${r.msg}`);
                teacherPassCount++;
            } else {
                console.error(`  ❌ FAIL: ${r.msg}`);
            }
        });

        winTeacher.close();

        // ==========================================
        // SUMMARY
        // ==========================================
        console.log('\n==================================================');
        console.log('📊 VERIFICATION SUMMARY');
        console.log('==================================================');
        console.log(`Student Big Screen: ${bigscreenPassCount}/${bigscreenResult.length} passed`);
        console.log(`Teacher Panel:      ${teacherPassCount}/${teacherResult.length} passed`);
        console.log(`Console Errors:     ${errors.length}`);

        if (errors.length > 0) {
            console.error('Errors encountered:');
            errors.forEach(e => console.error(` - [${e.page}] Line ${e.line}: ${e.message}`));
            app.exit(1);
        } else if (bigscreenPassCount === bigscreenResult.length && teacherPassCount === teacherResult.length) {
            console.log('\n🎉🎉 ALL TESTS PASSED WITH 0 ERRORS! 100% SUCCESS! 🎉🎉');
            app.exit(0);
        } else {
            app.exit(1);
        }
    } catch (err) {
        console.error('❌ Exception in test runner:', err);
        app.exit(1);
    }
});
