// test_v3_flow_e2e.cjs —— 批次 6.3 端到端：注册/登录 → 赋分 → 大屏同步 → 台账
// 跑法：env -u ELECTRON_RUN_AS_NODE electron-app/node_modules/electron/dist/electron.exe tests/test_v3_flow_e2e.cjs
// 全程临时库副本；真 preload + 自注册 IPC + 真 sqlite_service；正式库 database/classpet.sqlite 只读
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ROOT = path.join(__dirname, '..');
const { SQLiteService } = require(path.join(ROOT, 'electron-app', 'sqlite_service.js'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

app.setPath('userData', path.join(os.tmpdir(), 'cp-v3flow-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

const SRC_DB = path.join(ROOT, 'database', 'classpet.sqlite');
const srcMtime = fs.statSync(SRC_DB).mtimeMs;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-v3flowdb-'));
const tmpDb = path.join(tmpDir, 'classpet.sqlite');
fs.copyFileSync(SRC_DB, tmpDb);

const CLASS = 'c_class02_01';
const PAGE = f => 'file://' + path.join(ROOT, 'electron-app', 'src', f).replace(/\\/g, '/');
const REAL_PRELOAD = path.join(ROOT, 'electron-app', 'preload.js');
const STUB_PRELOAD = path.join(ROOT, 'tests', 'v3_fixture_preload.js');

let passed = 0, failed = 0;
const assert = (cond, msg, extra) => {
    if (cond) { console.log('  PASS  ' + msg); passed++; }
    else {
        console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 400) : ''));
        failed++;
    }
};

let svc = null;
const q = (sql, params) => svc.query(sql, params || []);

// 与 electron-app/preload.js + main.js 的通道一一对应（17 个）
function registerIpc() {
    const h = (channel, fn) => ipcMain.handle(channel, async (event, payload) => {
        try { return await fn(payload); }
        catch (err) { console.error('[FLOW IPC] ' + channel + ' 失败:', err && err.message); return { success: false, error: String((err && err.message) || err) }; }
    });
    h('db:loadAllState', (classId) => svc.loadAllState(classId || CLASS));
    h('db:recordScore', (payload) => svc.recordScoreOperation(payload));
    h('db:undoScore', (operationId) => svc.undoOperation(operationId));
    h('db:getStudentAuditLogs', (studentId) => svc.getStudentAuditLogs(studentId));
    h('db:hatchPet', (payload) => svc.hatchStudentPet(payload));
    h('db:saveStudent', (p) => svc.saveStudent(p.student, p.classId || CLASS));
    h('db:importStudents', (p) => svc.importStudents(p.students, p.classId || CLASS));
    h('db:saveAllStudents', (p) => svc.saveAllStudents(p.students, p.classId || CLASS));
    h('db:archiveStudent', (p) => svc.archiveStudent(p.studentId, p.isArchived, p.classId));
    h('db:deleteStudent', (p) => svc.deleteStudent(p.studentId, p.classId));
    h('db:saveThresholds', (p) => svc.saveThresholds(p.thresholds, p.stages, p.classId || CLASS));
    h('db:saveBehaviorRules', (p) => svc.saveBehaviorRules(p.rules, p.classId || CLASS));
    h('db:getClassLedger', (p) => svc.getClassLedger(p.classId || CLASS, p.fromTs, p.toTs));
    h('db:updateStudentProfile', (p) => svc.updateStudentProfile(p.studentId, p.patch || {}, p.classId || CLASS));
    h('db:restoreClassBackup', (p) => svc.restoreClassBackup(p.classId || CLASS, p.payload));
    h('db:query', (p) => svc.query(p.sql, p.params || []));
    h('db:execute', (p) => svc.execute(p.sql, p.params || []));
}

function makeWindow(preload) {
    const win = new BrowserWindow({
        width: 1600, height: 900, show: false,
        webPreferences: { contextIsolation: true, backgroundThrottling: false, preload: preload }
    });
    const errors = [];
    win.webContents.on('console-message', function () {
        const a = Array.prototype.slice.call(arguments);
        const d = a[1];
        const lvl = (typeof d === 'object' && d) ? d.level : a[1];
        const msg = (typeof d === 'object' && d) ? d.message : a[2];
        if ((lvl === 'error' || lvl === 3) && !/Electron Security Warning/.test(String(msg))) errors.push(String(msg).slice(0, 200));
    });
    const js = code => win.webContents.executeJavaScript(code, true);
    return { win, js, errors };
}

// 真 preload 窗口：先在页面里写 localStorage 身份，再重载一次让页面按该身份启动
async function openRealWithProfile(file, profileRaw, width) {
    const ctx = makeWindow(REAL_PRELOAD);
    ctx.win.setSize(width || 1600, 900);
    await ctx.win.loadURL(PAGE(file));
    await sleep(600);
    const wrote = await ctx.js("(function(){ try { localStorage.setItem('classpet.teacher.profile.v3', " +
        JSON.stringify(profileRaw) + "); return localStorage.getItem('classpet.teacher.profile.v3'); } catch (e) { return 'ERR:' + e.message; } })()");
    await ctx.win.loadURL(PAGE(file));
    await sleep(2600);
    ctx.wroteProfile = wrote;
    return ctx;
}

async function openStubWithEnv(file, lsObj, fixtureObj) {
    process.env.CLASSPET_LS = JSON.stringify(lsObj || {});
    process.env.CLASSPET_FIXTURE = JSON.stringify(fixtureObj || {});
    const ctx = makeWindow(STUB_PRELOAD);
    await ctx.win.loadURL(PAGE(file));
    await sleep(2600);
    delete process.env.CLASSPET_LS;
    delete process.env.CLASSPET_FIXTURE;
    return ctx;
}

app.whenReady().then(async () => {
    svc = new SQLiteService();
    await svc.init(null, tmpDb);
    svc.isInitialized = true;
    registerIpc();
    console.log('== 批次 6.3 端到端：注册/登录 → 赋分 → 大屏同步 → 台账（真 preload + IPC + 真服务 + 临时库）==');

    // ================= 1. 注册 → 入口页 =================
    console.log('\n[1] v3_portal.html 注册（真 preload）→ 进入入口页 + localStorage 档案');
    const portal = makeWindow(REAL_PRELOAD);
    await portal.win.loadURL(PAGE('v3_portal.html'));
    await sleep(2200);
    assert(portal.errors.length === 0, '入口页 0 控制台错误', portal.errors);

    const REG = { cls: '三年级二班', name: '批次六老师', subject: '语文' };
    const regResult = await portal.js(`(function(){
        document.getElementById('tab-register').click();
        function fill(id, val){
            var el = document.getElementById(id);
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return el.value;
        }
        fill('rg-class', ${JSON.stringify(REG.cls)});
        fill('rg-name', ${JSON.stringify(REG.name)});
        var radio = document.querySelector('#rg-subject input[value="' + ${JSON.stringify(REG.subject)} + '"]');
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
        var form = document.getElementById('panel-register');
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return { radio: !!radio && radio.checked, regHidden: document.getElementById('panel-register').hidden };
    })()`);
    assert(regResult && regResult.radio === true, '注册表单：科目单选「语文」已选中', regResult);
    await sleep(700);

    const gate = await portal.js(`(function(){
        var done = document.getElementById('panel-done');
        var gates = [].slice.call(document.querySelectorAll('.gate'));
        var first = gates[0];
        return {
            doneHidden: done ? done.hidden : null,
            gateCount: gates.length,
            firstVisible: !!(first && first.offsetParent !== null && getComputedStyle(first).display !== 'none'),
            profile: localStorage.getItem('classpet.teacher.profile.v3'),
            session: localStorage.getItem('classpet.teacher.session.v3'),
            chip: (document.getElementById('who-chip') || {}).textContent || ''
        };
    })()`);
    assert(gate.doneHidden === false && gate.gateCount === 2 && gate.firstVisible === true,
        '提交注册后进入入口页（.gate 可见）', { doneHidden: gate.doneHidden, gateCount: gate.gateCount, firstVisible: gate.firstVisible });
    let prof = null;
    try { prof = JSON.parse(gate.profile || 'null'); } catch (e) { prof = null; }
    assert(!!prof && prof['class'] === REG.cls && prof.name === REG.name && prof.subject === REG.subject,
        'localStorage 写出 classpet.teacher.profile.v3（班级/姓名/科目）', gate.profile);
    assert(gate.session === '1', '注册后自动登录（session 标记 = 1）', gate.session);
    assert(String(gate.chip).indexOf(REG.name) >= 0 && String(gate.chip).indexOf(REG.cls) >= 0,
        '入口页顶部身份条显示本次注册身份', gate.chip);
    const profileRaw = gate.profile;

    // ================= 2. 用桩 preload 把该档案注入教师台 =================
    console.log('\n[2] 桩 preload（CLASSPET_LS）注入该档案 → 教师台进入真实数据态');
    const full = svc.loadAllState(CLASS);
    const keepIds = full.students.slice(0, 2).map(s => s.id);
    const slimState = {
        students: full.students.filter(s => keepIds.indexOf(s.id) >= 0),
        petsByStudent: keepIds.reduce((acc, id) => { acc[id] = full.petsByStudent[id] || {}; return acc; }, {}),
        behaviorRules: full.behaviorRules,
        thresholds: full.thresholds,
        stages: full.stages,
        recentOperations: []
    };
    console.log('        桩夹具大小 ' + Buffer.byteLength(JSON.stringify(slimState)) + ' 字节（来自临时库 loadAllState 的真实子集）');
    const stubLs = {};
    stubLs['classpet.teacher.profile.v3'] = profileRaw;
    const stubDesk = await openStubWithEnv('v3_teacher_desk.html', stubLs, slimState);
    assert(stubDesk.errors.length === 0, '桩 preload 教师台 0 控制台错误', stubDesk.errors);
    const stubInfo = await stubDesk.js(`(function(){
        var buttons = [].slice.call(document.querySelectorAll('#score-grid .score-btn[data-rule-id]'));
        return {
            profile: localStorage.getItem('classpet.teacher.profile.v3'),
            chip: (document.getElementById('class-chip') || {}).textContent || '',
            rows: document.querySelectorAll('.stu-row[data-stu]').length,
            ruleButtons: buttons.length,
            ruleIds: buttons.map(function(b){ return b.getAttribute('data-rule-id'); }).slice(0, 3)
        };
    })()`);
    let injected = null;
    try { injected = JSON.parse(stubInfo.profile || 'null'); } catch (e) { injected = null; }
    assert(!!injected && injected.name === REG.name && injected['class'] === REG.cls,
        'CLASSPET_LS 把注册档案写进了教师台的 localStorage', stubInfo.profile);
    assert(String(stubInfo.chip).indexOf(REG.name) >= 0 && String(stubInfo.chip).indexOf('刘老师') < 0,
        '教师台顶部身份来自注入档案（不再写死演示身份）', stubInfo.chip);
    const dbRuleCount = q("SELECT COUNT(*) AS n FROM behavior_rules WHERE class_id = ?", [CLASS])[0].n;
    assert(stubInfo.ruleButtons === dbRuleCount && stubInfo.rows >= 1,
        '教师台进入真实数据态：#score-grid .score-btn[data-rule-id] = 库内规则数（' + dbRuleCount + '）', stubInfo);
    assert(stubInfo.ruleIds.every(id => !!id), '规则按钮带库内 ruleId', stubInfo.ruleIds);
    stubDesk.win.close();

    // ================= 3. 真桥教师台：选学生 → 点规则 → 落库 =================
    console.log('\n[3] 真桥教师台（同一身份注入）：选学生 → 点规则 → 库里落一笔');
    const desk = await openRealWithProfile('v3_teacher_desk.html', profileRaw);
    assert(desk.errors.length === 0, '教师台 0 控制台错误', desk.errors);
    const deskIdentity = await desk.js(`(function(){
        return {
            profile: localStorage.getItem('classpet.teacher.profile.v3'),
            chip: (document.getElementById('class-chip') || {}).textContent || '',
            ruleButtons: document.querySelectorAll('#score-grid .score-btn[data-rule-id]').length,
            rows: document.querySelectorAll('.stu-row[data-stu]').length
        };
    })()`);
    assert(!!deskIdentity.profile && deskIdentity.profile === profileRaw, '教师台身份与入口页注册档案一致', deskIdentity.profile);
    assert(String(deskIdentity.chip).indexOf(REG.name) >= 0, '教师台顶部显示注册老师姓名', deskIdentity.chip);
    assert(deskIdentity.ruleButtons === dbRuleCount, '教师台规则按钮仍等于库内规则数（真实数据态）', deskIdentity);

    // 挑一名「展示宠 = 语文宠、已破壳、有经验」的学生，保证大屏卡片的经验可比对
    const target = q(`SELECT s.id AS student_id, s.name, s.student_no, p.id AS pet_id, p.exp, p.level, p.visual_stage
                        FROM students s JOIN pets p ON p.student_id = s.id AND p.subject_id = 'subj_chinese'
                        WHERE s.class_id = ? AND s.archived_at IS NULL AND s.display_pet_id = p.id
                          AND p.visual_stage >= 1 AND p.exp > 0
                        ORDER BY s.student_no ASC LIMIT 1`, [CLASS])[0];
    assert(!!target, '临时库里找到「展示宠=语文宠且已破壳」的学生', target);
    const sameNo = q("SELECT COUNT(*) AS n FROM students WHERE class_id = ? AND student_no = ?", [CLASS, String(target.student_no)])[0].n;
    assert(sameNo === 1, '目标学生学号在本班唯一（页面里可按学号定位行）', { no: target.student_no, n: sameNo });

    // 教师台 DOM 的 data-stu 是本地序号（dbId 才对应库里 id），因此按学号定位行
    const pick = await desk.js(`(function(){
        var rows = [].slice.call(document.querySelectorAll('.stu-row[data-stu]'));
        var no = '#' + ${JSON.stringify(String(target.student_no))};
        var hits = rows.filter(function(r){ var n = r.querySelector('.stu-meta .no'); return n && n.textContent.trim() === no; });
        if (hits.length !== 1) return { err: 'row-not-unique', hits: hits.length, rows: rows.length };
        var row = hits[0];
        row.click();
        var btn = document.querySelector('#score-grid .score-btn[data-rule-id][data-score="5"]') ||
                  document.querySelector('#score-grid .score-btn[data-rule-id]');
        if (!btn) return { err: 'no-rule-btn' };
        return { stu: row.getAttribute('data-stu'), delta: Number(btn.getAttribute('data-score')),
                 rule: btn.getAttribute('data-rule'), ruleId: btn.getAttribute('data-rule-id'),
                 selected: row.classList.contains('is-selected') };
    })()`);
    assert(pick && !pick.err && pick.delta > 0 && !!pick.ruleId,
        '选中目标学生并取到一条带 ruleId 的规则按钮', pick);

    const opsBefore = q("SELECT COUNT(*) AS n FROM score_operations WHERE class_id = ?", [CLASS])[0].n;
    const petBefore = q("SELECT * FROM pets WHERE id = ?", [target.pet_id])[0];
    const clickResult = await desk.js(`(function(){
        var btn = document.querySelector('#score-grid .score-btn[data-rule-id][data-score="' + ${pick.delta} + '"]');
        if (!btn) return { err: 'btn-gone' };
        btn.click();
        return { clicked: true };
    })()`);
    assert(clickResult && clickResult.clicked === true, '点击规则按钮（页面事件链）', clickResult);
    await sleep(2400);

    const opsAfter = q("SELECT COUNT(*) AS n FROM score_operations WHERE class_id = ?", [CLASS])[0].n;
    const lastOp = q("SELECT * FROM score_operations WHERE class_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", [CLASS])[0];
    const petAfter = q("SELECT * FROM pets WHERE id = ?", [target.pet_id])[0];
    assert(opsAfter === opsBefore + 1, '点一次赋分 → 库里 score_operations 多一条', { before: opsBefore, after: opsAfter });
    assert(!!lastOp && lastOp.rule_id === pick.ruleId && Number(lastOp.points) === pick.delta,
        '新流水的 rule_id / 分值来自所点规则（不是写死）', lastOp && { ruleId: lastOp.rule_id, points: lastOp.points, expectRule: pick.ruleId, expectPoints: pick.delta });
    assert(Number(petAfter.exp) === Number(petBefore.exp) + pick.delta,
        '宠物经验按按钮分值变化', { before: petBefore.exp, after: petAfter.exp, delta: pick.delta });
    const deskRowNow = await desk.js(`(function(){
        var no = '#' + ${JSON.stringify(String(target.student_no))};
        var rows = [].slice.call(document.querySelectorAll('.stu-row[data-stu]')).filter(function(r){
            var n = r.querySelector('.stu-meta .no'); return n && n.textContent.trim() === no; });
        var row = rows[0];
        var bar = row ? row.querySelector('.stu-exp') : null;
        var txt = (document.body.innerText || '').replace(/\\s+/g, ' ');
        return { title: bar ? bar.getAttribute('title') : null, confirmed: /班级库已确认/.test(txt) };
    })()`);
    assert(deskRowNow && String(deskRowNow.title || '').indexOf('经验 ' + petAfter.exp) >= 0,
        '教师台卡片经验同步到库值', { title: deskRowNow && deskRowNow.title, db: petAfter.exp });
    const deskExpNum = Number((String(deskRowNow.title || '').match(/\d+/) || [NaN])[0]);
    assert(deskExpNum === Number(petAfter.exp), '教师台读出的经验数字 = 库值', { ui: deskExpNum, db: petAfter.exp });

    // ================= 4. 学生大屏同步 =================
    console.log('\n[4] v3_looseleaf_paper.html（同一身份注入）大屏经验与教师台一致');
    const paper = await openRealWithProfile('v3_looseleaf_paper.html', profileRaw);
    assert(paper.errors.length === 0, '学生大屏 0 控制台错误', paper.errors);
    const paperCard = await paper.js(`(function(){
        var cards = [].slice.call(document.querySelectorAll('.pet-card'));
        var name = ${JSON.stringify(target.name)};
        for (var i = 0; i < cards.length; i++) {
            if (cards[i].textContent.indexOf(name) >= 0) { cards[i].click(); return { localId: cards[i].getAttribute('data-id'), total: cards.length }; }
        }
        return { err: 'card-not-found', total: cards.length };
    })()`);
    assert(paperCard && !!paperCard.localId, '大屏渲染出该学生的卡片并可选中', paperCard);
    await sleep(900);
    const paperExp = await paper.js("(function(){ var el = document.getElementById('ins-exp'); return el ? el.textContent.replace(/\\s+/g, '') : null; })()");
    const paperExpNum = Number(String(paperExp || '').split('/')[0].replace(/[^0-9]/g, ''));
    assert(paperExpNum === Number(petAfter.exp),
        '大屏检查器经验 = 教师台/库值（' + petAfter.exp + ' EXP）', { paper: paperExp, parsed: paperExpNum, db: petAfter.exp, desk: deskExpNum });
    const paperChip = await paper.js("(function(){ var el = document.getElementById('head-identity'); return el ? el.textContent : ''; })()");
    assert(String(paperChip).indexOf(REG.name) >= 0, '大屏顶部身份也来自同一注册档案', paperChip);

    // ================= 5. 台账 =================
    console.log('\n[5] 回到教师台：v3Ledger({}) + 台账弹层里能看到刚才那一笔');
    const ledger = await desk.js(`(async function(){
        var c = window.classPetRuntime;
        if (!c || typeof c.v3Ledger !== 'function') return { ok: false, reason: 'no-core' };
        return await c.v3Ledger({ fromTs: Date.now() - 10 * 60 * 1000, toTs: Date.now() + 60000 });
    })()`);
    assert(ledger && ledger.ok === true && Array.isArray(ledger.rows), '页面上下文取到真实台账', ledger && { ok: ledger.ok, n: ledger.rows && ledger.rows.length });
    const row = (ledger.rows || []).filter(r => r.operationId === lastOp.id)[0];
    assert(!!row, '台账里能找到刚才那笔（operationId 命中）', { op: lastOp.id, sample: (ledger.rows || []).slice(0, 2) });
    assert(!!row && row.studentName === target.name && row.studentNo === String(target.student_no),
        '台账行学生姓名/学号正确', row && { name: row.studentName, no: row.studentNo, expectName: target.name, expectNo: target.student_no });
    assert(!!row && row.subjectLabel === '语文' && row.subjectCode === 'chinese', '台账行学科正确（语文 / chinese）', row && { label: row.subjectLabel, code: row.subjectCode });
    assert(!!row && Number(row.points) === pick.delta && row.undone === false, '台账行分值与撤销状态正确', row && { points: row.points, undone: row.undone, delta: pick.delta });
    assert(!!row && row.expBefore !== null && row.expAfter !== null &&
        Number(row.expBefore) === Number(petBefore.exp) && Number(row.expAfter) === Number(petAfter.exp),
        '台账行带上 exp_before/exp_after（与库一致）', row && { b: row.expBefore, a: row.expAfter });

    await desk.js("(function(){ var b = document.getElementById('btn-open-ledger'); if (b) b.click(); return !!b; })()");
    await sleep(1600);
    const ledgerDialog = await desk.js(`(function(){
        var table = document.getElementById('ledger-table');
        var dlg = document.getElementById('dlg');
        return { hasTable: !!table, text: table ? table.innerText.replace(/\\s+/g, ' ') : '', open: dlg ? (dlg.hasAttribute('open') || getComputedStyle(dlg).display !== 'none') : false };
    })()`);
    assert(ledgerDialog && ledgerDialog.open === true, '台账弹层被打开', ledgerDialog && ledgerDialog.open);
    assert(ledgerDialog && ledgerDialog.text.indexOf(target.name) >= 0 && ledgerDialog.text.indexOf('语文') >= 0,
        '台账弹层里能看到该学生与语文', ledgerDialog && ledgerDialog.text.slice(0, 200));

    // ================= 收尾 =================
    assert(fs.statSync(SRC_DB).mtimeMs === srcMtime, 'database/classpet.sqlite 原件未被修改');
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    try { desk.win.close(); } catch (e) {}
    try { paper.win.close(); } catch (e) {}
    try { portal.win.close(); } catch (e) {}
    if (svc.saveTimer) clearTimeout(svc.saveTimer);
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('E2E 异常:', e); app.exit(2); });
