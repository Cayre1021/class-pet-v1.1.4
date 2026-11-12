// test_global_master_verification.js - Master Global Verification for ClassPet Core & UI
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');
const crypto = require('crypto');

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
let consoleErrors = [];

let teacherWindowOpened = false;
let displayWindowOpened = false;

// Mock environment for Node.js main process
const storage = {};
global.localStorage = {
    getItem: (k) => storage[k] !== undefined ? storage[k] : null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.BroadcastChannel = class {
    constructor(name) { this.name = name; }
    postMessage(msg) {}
    close() {}
};
global.Audio = class {
    play() { return Promise.resolve(); }
    pause() {}
};

// Setup mock IPC handlers
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
    let passedCount = 0;
    let failedCount = 0;

    function assert(cond, msg) {
        if (cond) {
            console.log(`  ✅ PASS: ${msg}`);
            passedCount++;
        } else {
            console.error(`  ❌ FAIL: ${msg}`);
            failedCount++;
        }
    }

    try {
        console.log('\n============================================================');
        console.log('🌟 ClassPet 全系统代码机制深度校对与全量终极自动化测试 🌟');
        console.log('============================================================\n');

        // ============================================================
        // DIMENSION 1: 多学科解锁链与萌宠加分门禁 (Core Store)
        // ============================================================
        console.log('--- 维度 1: 多学科解锁链与萌宠加分门禁校对 ---');
        const { ClassPetStore } = require(path.join(projectRoot, 'electron-app', 'src', 'classpet_core.js'));
        const store = new ClassPetStore();

        // 1.1 语文初始主修学科与默认综合科映射
        assert(store.getCurrentTeachingSubject() === 'chinese', '默认教学学科严格为语文 (chinese)');
        const sZhang = store.students.find(s => s.name === '张三');
        assert(sZhang !== undefined, '初始种子学生库包含【张三】');

        // 1.2 语文蛋形态放行加分（核心解决用户反馈的新生许3无法加分问题）
        const newStu = await store.addStudent({ name: '许3', group: 1 });
        assert(newStu !== null && newStu.name === '许3', '成功创建新录入学生【许3】');
        assert(newStu.pets.chinese.species === 'egg' && newStu.pets.chinese.isHatched === false, '许3初始语文宠物为蛋形态 (0级0分)');

        const chkXu3_cn = store.canScoreStudentPet(newStu.id, 'chinese');
        assert(chkXu3_cn.allowed === true, '【门禁规则】许3作为语文蛋形态，允许正常参与课堂赋分！');

        const scoreXu3Res = store.scoreStudent(newStu.id, 5, '课前预习', false, 'chinese');
        assert(scoreXu3Res.success === true && scoreXu3Res.blocked !== true, '成功为许3语文蛋增加 5 EXP！');
        assert(newStu.pets.chinese.exp === 5, '许3当前语文经验增至 5 EXP');

        // 1.3 数学/英语未解锁拦截（语文未满 20 级坚决锁死）
        const chkXu3_ma = store.canScoreStudentPet(newStu.id, 'math');
        assert(chkXu3_ma.allowed === false && chkXu3_ma.type === 'LOCKED', '【门禁规则】许3语文未满20级，数学科目被严格硬核锁死拦截 (LOCKED)');

        const scoreXu3MaRes = store.scoreStudent(newStu.id, 5, '数学奥数', false, 'math');
        assert(scoreXu3MaRes.blocked === true, '直接对未解锁数学加分被底层安全拦截 (blocked === true)');
        assert((newStu.pets.math?.exp || 0) === 0, '受拦截学生数学经验严格保持 0 未受污染');

        // 1.4 语文达 20 级后的二选一自由解锁与破壳前拦截
        const sSun = store.students.find(s => s.name === '孙七'); // 孙七 Lv.20
        assert(sSun && sSun.pets.chinese.level >= 20, '孙七语文宠物已达 Lv.20 满级');
        assert(store.isSubjectUnlocked(sSun.id, 'math') === true, '孙七解锁数学科目选择资格');
        assert(store.isSubjectUnlocked(sSun.id, 'english') === true, '孙七解锁英语科目选择资格 (二选一)');

        const chkSun_ma = store.canScoreStudentPet(sSun.id, 'math');
        assert(chkSun_ma.allowed === false && chkSun_ma.type === 'UNHATCHED', '孙七数学已解锁但未破壳认领，被加分拦截 (UNHATCHED)');

        // 孙七破壳认领数学专属萌宠【柴犬】
        const hatchedMa = store.hatchStudentPet(sSun.id, 'dog', 'math');
        assert(hatchedMa && hatchedMa.pets.math.species === 'dog' && hatchedMa.pets.math.isHatched === true, '孙七成功破壳认领数学萌宠【柴犬】');
        const chkSun_ma_after = store.canScoreStudentPet(sSun.id, 'math');
        assert(chkSun_ma_after.allowed === true, '破壳认领后，孙七数学科目正式放行加分通道！');

        // ============================================================
        // DIMENSION 2: 萌宠成长不变量与单调性校验 (Growth Invariants)
        // ============================================================
        console.log('\n--- 维度 2: 萌宠成长不变量与单调性校验 ---');
        // 负分扣分绝不降级、绝不退化
        const sLi = store.students.find(s => s.name === '李四');
        const lvlBefore = sLi.level;
        const stageBefore = sLi.visualStage;
        const expBefore = sLi.exp;

        store.scoreStudent(sLi.id, -10, '违纪扣分', false, 'chinese');
        assert(sLi.level === lvlBefore, '负向扣分等级坚决不降级 (仍为 Lv.' + lvlBefore + ')');
        assert(sLi.visualStage === stageBefore, '负向扣分视觉形态绝不退化');
        assert(sLi.exp === expBefore - 10, '经验值正常扣减 (' + expBefore + ' -> ' + (expBefore - 10) + ')');

        // 再次大额扣分，经验保底为 0
        store.scoreStudent(sLi.id, -1000, '严重违纪', false, 'chinese');
        assert(sLi.exp === 0, '经验值扣减保底为 0，绝不出现负数经验');
        assert(sLi.level === lvlBefore, '经验归零后等级依然保持单调不降');

        // ============================================================
        // DIMENSION 3: 动态阈值自适应与计算 (Dynamic Thresholds)
        // ============================================================
        console.log('\n--- 维度 3: 动态阈值自适应与计算 ---');
        const defaultThresholds = store.getLevelThresholds();
        assert(defaultThresholds.length === 21, '官方标准阈值包含 0~20 级共 21 个阶梯数值');
        assert(defaultThresholds[20] === 1250, '官方第 20 级满级经验为 1250 EXP');

        // 自定义新阈值
        const customT = [0, 20];
        for (let l = 2; l <= 20; l++) customT.push(20 + (l - 1) * 30);
        const customStages = [
            { stage: 0, minLevel: 0, code: 'egg', name: '宠物蛋' },
            { stage: 1, minLevel: 1, code: 'form1', name: '幼宠' },
            { stage: 2, minLevel: 3, code: 'form2', name: '少年' },
            { stage: 3, minLevel: 7, code: 'form3', name: '进阶' },
            { stage: 4, minLevel: 12, code: 'form4', name: '青年' },
            { stage: 5, minLevel: 20, code: 'form5', name: '神兽' }
        ];
        store.saveLevelThresholds(customT, customStages);
        assert(store.getHatchThreshold() === 20, '动态破壳门槛更新为 20 EXP');
        store.resetLevelThresholds();
        assert(store.getHatchThreshold() === 15, '恢复官方默认阈值后破壳门槛重置为 15 EXP');

        // ============================================================
        // DIMENSION 4: 赋分、批处理隔离与撤回 (Scoring & Undo)
        // ============================================================
        console.log('\n--- 维度 4: 赋分、批处理隔离与撤回 ---');
        const batchMaRes = store.batchScore([newStu.id, sSun.id], 5, '随堂练习', false, 'math');
        assert(batchMaRes.success === true, '混合批处理赋分执行成功');
        assert(batchMaRes.eligibleIds.length === 1 && batchMaRes.eligibleIds[0] === sSun.id, '批处理精准隔离：仅对具备资格的孙七赋分');
        assert(batchMaRes.blockedRecords.length === 1 && batchMaRes.blockedRecords[0].id === newStu.id, '批处理安全防护：新学生许3被安全跳过');

        // ============================================================
        // DIMENSION 5: 治愈系宠物互动收益守卫 (Pet Interaction)
        // ============================================================
        console.log('\n--- 维度 5: 治愈系宠物互动收益守卫 ---');
        const interactLocked = store.doPetInteraction(newStu.id, '抚摸', 1, 'math');
        assert(interactLocked.awarded === 0, '对受锁数学宠物互动收益强制归零');
        assert(interactLocked.quote.includes('尚未解锁'), '受锁互动提示告知需前置满级解锁');

        const interactCnEgg = store.doPetInteraction(newStu.id, '抚摸', 1, 'chinese');
        assert(interactCnEgg.awarded === 1, '对语文蛋互动正常获得 1 EXP 温暖孵化奖励');

        // ============================================================
        // DIMENSION 6: 花名册 GBK 导入与异常诊断校验 (Roster Import)
        // ============================================================
        console.log('\n--- 维度 6: 花名册 GBK 编码与异常诊断校验 ---');
        const csvPath = 'D:\\Desk\\班级花名册标准导入模板.csv';
        if (fs.existsSync(csvPath)) {
            const buf = fs.readFileSync(csvPath);
            assert(buf.length > 0, '真实模板 CSV 文件成功读取 (' + buf.length + ' 字节)');
            const decoder = new TextDecoder('gbk');
            const csvText = decoder.decode(buf);
            assert(csvText.includes('学号') && csvText.includes('姓名') && csvText.includes('组别'), 'GBK 解码表头无乱码');
            assert(csvText.includes('牢ten,') && csvText.includes(',张11,'), '准确定位真实模板中第9行缺组别与第10行缺学号的不规范记录 (牢ten缺组别, 张11缺学号)');
        }

        // ============================================================
        // DIMENSION 7: 双端代码一致性校验 (Parity Check)
        // ============================================================
        console.log('\n--- 维度 7: 双端核心代码一致性校验 ---');
        const hashCore = crypto.createHash('sha256').update(fs.readFileSync(path.join(projectRoot, 'electron-app') + '/src/classpet_core.js')).digest('hex');
        const hashJsCore = crypto.createHash('sha256').update(fs.readFileSync(path.join(projectRoot, 'electron-app') + '/src/js/classpet_core.js')).digest('hex');
        assert(hashCore === hashJsCore, 'classpet_core.js 与 js/classpet_core.js 保持 100% SHA-256 哈希完全一致');

        const hashFw = crypto.createHash('sha256').update(fs.readFileSync(path.join(projectRoot, 'electron-app') + '/src/fireworks_engine.js')).digest('hex');
        const hashJsFw = crypto.createHash('sha256').update(fs.readFileSync(path.join(projectRoot, 'electron-app') + '/src/js/fireworks_engine.js')).digest('hex');
        assert(hashFw === hashJsFw, 'fireworks_engine.js 与 js/fireworks_engine.js 保持 100% SHA-256 哈希完全一致');

        // ============================================================
        // DIMENSION 8: 教师端 UI 渲染与交互断言 (Teacher Panel Touch Pro)
        // ============================================================
        console.log('\n--- 维度 8: 教师控制台 (teacher_panel_touch_pro.html) 界面与排版校对 ---');
        winTeacher = new BrowserWindow({
            width: 1400,
            height: 900,
            show: false,
            webPreferences: {
                preload: path.join(projectRoot, 'electron-app', 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        winTeacher.webContents.on('console-message', (event, level, message) => {
            if (level === 3) consoleErrors.push(`[Teacher Panel] ${message}`);
        });

        await winTeacher.loadFile(path.join(projectRoot, 'electron-app', 'src', 'teacher_panel_touch_pro.html'));
        await sleep(300);

        const teacherChecks = await winTeacher.webContents.executeJavaScript(`
            (function() {
                const results = {};
                // 1. 顶栏排版与学科常驻条
                const subjectText = document.getElementById('subjectGlobalText');
                results.hasSubjectBar = !!subjectText;
                results.subjectBarText = subjectText ? subjectText.textContent : '';
                results.noUglyPill = !results.subjectBarText.includes('全员就绪');
                results.hasChangeSubBtn = !!document.querySelector('span[onclick*="quickOpenSubjectMenu"]');

                // 2. 悬浮圆盘 6 个模块
                results.hasThemeMod = !!document.getElementById('radialMod_theme');
                results.hasSubjectMod = !!document.getElementById('radialMod_subject');
                results.hasBigscreenMod = !!document.getElementById('radialMod_bigscreen');
                results.hasUndoMod = !!document.getElementById('radialMod_undo');
                results.hasStudentsMod = !!document.getElementById('radialMod_students');
                results.hasSettingsMod = !!document.getElementById('radialMod_settings');

                // 3. 冗余模块彻底删除
                results.noAttendanceMod = !document.getElementById('radialMod_attendance');
                results.noSelectionMod = !document.getElementById('radialMod_selection');

                // 4. 极速换科弹出的三级学科选项数
                openRadialMenu();
                handleRadialModuleClick('subject');
                const subItems = document.querySelectorAll('.radial-sub-item');
                results.subItemCount = subItems.length;
                closeRadialMenu();

                // 5. 换风格 4 个主题芯片
                openRadialMenu();
                handleRadialModuleClick('theme');
                const themeItems = document.querySelectorAll('.radial-sub-item');
                results.themeItemCount = themeItems.length;
                closeRadialMenu();

                return results;
            })()
        `);

        assert(teacherChecks.hasSubjectBar, '左侧上方常驻加分学科信息条');
        assert(teacherChecks.noUglyPill, '标题栏已彻底消除冗余杂乱的【全员就绪】标签');
        assert(teacherChecks.hasChangeSubBtn, '【🔄 换科】极速入口按钮存在');
        assert(teacherChecks.hasThemeMod && teacherChecks.hasSubjectMod && teacherChecks.hasBigscreenMod, '教师悬浮圆盘前三大核心功能齐备');
        assert(teacherChecks.hasUndoMod && teacherChecks.hasStudentsMod && teacherChecks.hasSettingsMod, '教师悬浮圆盘后三大核心功能齐备');
        assert(teacherChecks.noAttendanceMod && teacherChecks.noSelectionMod, '已彻底移除考勤与选人冗余按钮');
        assert(teacherChecks.subItemCount === 3, '授课科目三级展开 3 门核心课：语文/数学/英语');
        assert(teacherChecks.themeItemCount === 4, '换风格展开 4 款精品配色芯片');

        // ============================================================
        // DIMENSION 9: 学生大屏 UI 视图与烟花断言 (Big Screen Touch Pro)
        // ============================================================
        console.log('\n--- 维度 9: 学生大屏 (display_bigscreen_touch_pro.html) 视图与动效校对 ---');
        winBigscreen = new BrowserWindow({
            width: 1400,
            height: 900,
            show: false,
            webPreferences: {
                preload: path.join(projectRoot, 'electron-app', 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        winBigscreen.webContents.on('console-message', (event, level, message) => {
            if (level === 3) consoleErrors.push(`[Big Screen] ${message}`);
        });

        await winBigscreen.loadFile(path.join(projectRoot, 'electron-app', 'src', 'display_bigscreen_touch_pro.html'));
        await sleep(300);

        const bigscreenChecks = await winBigscreen.webContents.executeJavaScript(`
            (function() {
                const results = {};
                // 1. 三大排布视图支持
                results.hasGridView = typeof switchView === 'function';
                switchView('seat');
                results.isSeatView = currentView === 'seat';
                switchView('pk');
                results.isPkView = currentView === 'pk';
                switchView('grid');
                results.isGridView = currentView === 'grid';

                // 2. 屏幕下沉 260px
                const w = document.getElementById('mainStageWrapper') || document.querySelector('.main-stage-wrapper');
                toggleReachability();
                results.reachabilityActive = w && w.classList.contains('reachability-active');
                toggleReachability();
                results.reachabilityReset = w && !w.classList.contains('reachability-active');

                // 3. 随机点名弹窗
                results.hasRollcall = typeof startRandomPicker === 'function';

                // 4. 全屏烟花庆典引擎
                results.hasFireworks = !!window.classroomFireworks;
                if (results.hasFireworks) {
                    const fw = window.classroomFireworks;
                    results.hasThemes = fw.themes && fw.themes.length >= 6;
                    results.hasLaunch = typeof fw.launchCelebration === 'function';
                }

                // 5. 表情粒子已彻底删除
                results.noHeroEmojiParticles = !document.getElementById('heroEmojiParticles');

                return results;
            })()
        `);

        assert(bigscreenChecks.isSeatView && bigscreenChecks.isPkView && bigscreenChecks.isGridView, '学生大屏三大排布模式 (全班平铺/按组排布/小组PK榜) 完整支持且平滑切换');
        assert(bigscreenChecks.reachabilityActive && bigscreenChecks.reachabilityReset, '屏幕下沉 260px 便捷触控交互正常生效与复位');
        assert(bigscreenChecks.hasRollcall, '随机点名抽选互动模块正常就绪');
        assert(bigscreenChecks.hasFireworks && bigscreenChecks.hasThemes && bigscreenChecks.hasLaunch, '全屏多彩烟花庆典引擎 (6大主题色库) 完备就绪');
        assert(bigscreenChecks.noHeroEmojiParticles, '已彻底清除不合要求的表情粒子容器，大屏清爽整洁');

        // ============================================================
        // DIMENSION 10: 控制台异常与系统健康总结
        // ============================================================
        console.log('\n--- 维度 10: 控制台零异常与系统健康总结 ---');
        assert(consoleErrors.length === 0, `双端运行时无任何严重错误 (Console Errors: ${consoleErrors.length})`);

        console.log('\n============================================================');
        console.log(`📊 全局测试汇总报告: ${passedCount} 项通过, ${failedCount} 项失败`);
        console.log('============================================================\n');

        if (failedCount === 0) {
            console.log('🎉🎉🎉 恭喜！ClassPet 全系统 10 大核心机制校对全部通过！100% 成功！🎉🎉🎉\n');
            if (winBigscreen) winBigscreen.close();
            if (winTeacher) winTeacher.close();
            app.quit();
            process.exit(0);
        } else {
            console.error(`💥 发现 ${failedCount} 项异常，请检查上方日志！`);
            if (winBigscreen) winBigscreen.close();
            if (winTeacher) winTeacher.close();
            app.quit();
            process.exit(1);
        }

    } catch (e) {
        console.error('Test execution failed:', e);
        if (winBigscreen) winBigscreen.close();
        if (winTeacher) winTeacher.close();
        app.quit();
        process.exit(1);
    }
});
