// test_v3_write_e2e.cjs —— 批次 3 端到端：页面点击 → 真 preload → IPC → 真 sqlite_service → 临时库
// 跑法：env -u ELECTRON_RUN_AS_NODE electron-app/node_modules/electron/dist/electron.exe tests/test_v3_write_e2e.cjs
// 不触碰 database/classpet.sqlite：全程用临时副本
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ROOT = path.join(__dirname, '..');
const { SQLiteService } = require(path.join(ROOT, 'electron-app', 'sqlite_service.js'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

app.setPath('userData', path.join(os.tmpdir(), 'cp-v3e2e-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

const srcDb = path.join(ROOT, 'database', 'classpet.sqlite');
const srcMtime = fs.statSync(srcDb).mtimeMs;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-v3e2edb-'));
const tmpDb = path.join(tmpDir, 'classpet.sqlite');
fs.copyFileSync(srcDb, tmpDb);

let passed = 0, failed = 0;
const assert = (cond, msg, extra) => {
    if (cond) { console.log('  PASS  ' + msg); passed++; }
    else { console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 300) : '')); failed++; }
};

let svc = null;
const q = (sql, params) => svc.query(sql, params || []);

function registerIpc() {
    const h = (channel, fn) => ipcMain.handle(channel, async (event, payload) => {
        try { return await fn(payload); }
        catch (err) { console.error('[E2E IPC] ' + channel + ' 失败:', err && err.message); return { success: false, error: String(err && err.message || err) }; }
    });
    h('db:loadAllState', (classId) => svc.loadAllState(classId || 'c_class02_01'));
    h('db:recordScore', (payload) => svc.recordScoreOperation(payload));
    h('db:undoScore', (operationId) => svc.undoOperation(operationId));
    h('db:getStudentAuditLogs', (studentId) => svc.getStudentAuditLogs(studentId));
    h('db:hatchPet', (payload) => svc.hatchStudentPet(payload));
    h('db:saveStudent', (p) => svc.saveStudent(p.student, p.classId || 'c_class02_01', p.options));
    h('db:importStudents', (p) => svc.importStudents(p.students, p.classId || 'c_class02_01'));
    h('db:saveAllStudents', (p) => svc.saveAllStudents(p.students, p.classId || 'c_class02_01'));
    h('db:archiveStudent', (p) => svc.archiveStudent(p.studentId, p.isArchived, p.classId));
    h('db:deleteStudent', (p) => svc.deleteStudent(p.studentId, p.classId));
    h('db:saveThresholds', (p) => svc.saveThresholds(p.thresholds, p.stages, p.classId || 'c_class02_01'));
    h('db:saveBehaviorRules', (p) => svc.saveBehaviorRules(p.rules, p.classId || 'c_class02_01'));
    h('db:getClassLedger', (p) => svc.getClassLedger(p.classId || 'c_class02_01', p.fromTs, p.toTs));
    h('db:updateStudentProfile', (p) => svc.updateStudentProfile(p.studentId, p.patch || {}, p.classId || 'c_class02_01'));
    h('db:restoreClassBackup', (p) => svc.restoreClassBackup(p.classId || 'c_class02_01', p.payload));
    h('db:query', (p) => svc.query(p.sql, p.params || []));
    h('db:execute', (p) => svc.execute(p.sql, p.params || []));
}

async function openPage(file, width) {
    const win = new BrowserWindow({
        width: width || 1600, height: 900, show: false,
        webPreferences: {
            contextIsolation: true,
            backgroundThrottling: false,
            preload: path.join(ROOT, 'electron-app', 'preload.js')
        }
    });
    const errors = [];
    win.webContents.on('console-message', function () {
        const a = Array.prototype.slice.call(arguments);
        const d = a[1];
        const lvl = (typeof d === 'object' && d) ? d.level : a[1];
        const msg = (typeof d === 'object' && d) ? d.message : a[2];
        if ((lvl === 'error' || lvl === 3) && !/Electron Security Warning/.test(String(msg))) errors.push(String(msg).slice(0, 200));
    });
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', file).replace(/\\/g, '/'));
    await sleep(2500);
    const js = code => win.webContents.executeJavaScript(code, true);
    return { win, js, errors };
}

app.whenReady().then(async () => {
    svc = new SQLiteService();
    await svc.init(null, tmpDb);
    svc.isInitialized = true;
    registerIpc();
    console.log('== 批次 3 端到端验收（真 preload + IPC + 真服务 + 临时库）==');
    const CLASS = 'c_class02_01';

    // ================= 教师台：赋分 → 落库 → 撤销 =================
    console.log('\n[教师台] 选学生 → 点规则按钮 → 落库 → 撤销');
    const t = await openPage('v3_teacher_desk.html');
    assert(t.errors.length === 0, '教师台 0 控制台错误', t.errors);
    const realModeSignal = await t.js("(function(){var b=document.querySelector('#score-grid .score-btn[data-rule-id]');return !!(window.classPetRuntime && b);})()");
    assert(realModeSignal === true, '教师台进入真实数据态（核心已加载 + 规则按钮带库内 ruleId）');
    const geo = await t.js(`(function(){
        var box = document.getElementById('score-scroll') || document.getElementById('score-grid');
        var btns = [].slice.call(document.querySelectorAll('#score-grid .score-btn'));
        var last = btns[btns.length - 1];
        if (!box || !last) return null;
        box.scrollTop = box.scrollHeight;   // 滚到底再测末条按钮是否可点
        var r = last.getBoundingClientRect();
        var hit = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + r.height / 2, innerHeight - 2));
        return { scrollable: box.scrollHeight > box.clientHeight + 1, btnCount: btns.length,
                 lastInViewport: r.bottom <= innerHeight || box.scrollHeight > box.clientHeight,
                 centerHit: !!(hit && last.contains(hit)) };
    })()`);
    assert(geo && geo.btnCount === 13 && geo.lastInViewport && geo.centerHit,
        '13 条规则在赋分台可容纳/可滚动且末条可点（无裁切）', geo);
    const ruleCount = await t.js("document.querySelectorAll('#score-grid .score-btn').length");
    const dbRuleCount = q("SELECT COUNT(*) AS n FROM behavior_rules WHERE class_id = ?", [CLASS])[0].n;
    assert(ruleCount === dbRuleCount, '赋分台规则按钮数量 = 数据库规则条数（' + dbRuleCount + '）', { ui: ruleCount, db: dbRuleCount });

    const first = await t.js(`(function(){
        var row = document.querySelector('.stu-row');
        if (!row) return null;
        row.click();
        var btns = document.querySelectorAll('#score-grid .score-btn');
        if (!btns.length) return { err: 'no-rule-btn' };
        var b = btns[0];
        return { stu: row.getAttribute('data-stu'), delta: Number(b.getAttribute('data-score')), rule: b.getAttribute('data-rule') };
    })()`);
    assert(first && first.delta, '选中第一名学生并找到第一条规则按钮', first);

    const petBefore = q("SELECT p.* FROM pets p JOIN students s ON s.id = p.student_id WHERE p.class_id = ? AND p.subject_id = 'subj_chinese' ORDER BY s.student_no ASC LIMIT 1", [CLASS])[0];
    const opsBefore = q("SELECT COUNT(*) AS n FROM score_operations WHERE class_id = ?", [CLASS])[0].n;

    await t.js("document.querySelectorAll('#score-grid .score-btn')[0].click()");
    await sleep(2200);
    const petAfter = q("SELECT * FROM pets WHERE id = ?", [petBefore.id])[0];
    const opsAfter = q("SELECT COUNT(*) AS n FROM score_operations WHERE class_id = ?", [CLASS])[0].n;
    assert(opsAfter === opsBefore + 1, '点一次赋分 → 库里多一条 score_operations', { before: opsBefore, after: opsAfter });
    assert(Number(petAfter.exp) === Number(petBefore.exp) + Number(first.delta), '宠物经验按按钮分值落库', { before: petBefore.exp, after: petAfter.exp, delta: first.delta });
    const tText2 = await t.js("(function(){return (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,40000);})()");
    assert(/班级库已确认/.test(tText2), '界面提示来自数据库确认（未提前报成功）');

    // 撤销
    const undoEnabled = await t.js("(function(){var b=document.getElementById('btn-undo'); return b ? !b.disabled : null;})()");
    assert(undoEnabled === true, '有最后一笔时撤销按钮可用');
    await t.js("document.getElementById('btn-undo').click()");
    await sleep(2200);
    const petUndone = q("SELECT * FROM pets WHERE id = ?", [petBefore.id])[0];
    const lastOp = q("SELECT * FROM score_operations WHERE class_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", [CLASS])[0];
    assert(Number(petUndone.exp) === Number(petBefore.exp), '撤销后经验回到赋分前', { now: petUndone.exp, before: petBefore.exp });
    assert(!!lastOp.undone_at, '库里该笔操作已标记 undone_at');
    t.win.close();

    // ================= 教师台：破壳门槛（真库） =================
    console.log('\n[教师台] 破壳门槛走真库');
    const eggStudent = q("SELECT p.*, s.student_no FROM pets p JOIN students s ON s.id = p.student_id WHERE p.class_id = ? AND p.subject_id = 'subj_chinese' AND (p.species_code = 'egg' OR p.visual_stage = 0) ORDER BY s.student_no ASC LIMIT 1", [CLASS])[0];
    if (eggStudent) {
        const r = await t.js(`(async function(){
            var core = window.classPetRuntime;
            if (!core) return { err: 'no-core' };
            return await core.v3Hatch({ studentId: '` + eggStudent.student_id + `', subjectCode: 'chinese', speciesCode: 'cat' });
        })()`);
        assert(r && (r.ok === true || /exp-insufficient|already-hatched|locked/.test(r.reason || '')), '破壳调用走真库并返回结构化结果', r);
    } else {
        console.log('  (跳过：真实库里没有中文蛋形态学生)');
    }
    t.win.close();

    // ================= 学生大屏：页面加分 → 破壳落库 =================
    console.log('\n[学生大屏] 新建蛋学生 → 页面加分到 15 → 点破壳 → 查库');
    const eggId = 'st_e2e_paper';
    svc.saveStudent({ id: eggId, student_no: '99', name: '端到端甲', group: 1, pets: {} }, CLASS);
    const paper = await openPage('v3_looseleaf_paper.html');
    assert(paper.errors.length === 0, '学生大屏 0 控制台错误', paper.errors);
    const picked = await paper.js(`(function(){
        var cards = [].slice.call(document.querySelectorAll('.pet-card'));
        for (var i = 0; i < cards.length; i++) {
            if (cards[i].textContent.indexOf('端到端甲') >= 0) { cards[i].click(); return { localId: cards[i].getAttribute('data-id'), cards: cards.length }; }
        }
        return null;
    })()`);
    assert(picked && picked.localId, '学生大屏渲染出新建的蛋学生并可选中', picked);
    const scoreBtns = await paper.js("(function(){return [].slice.call(document.querySelectorAll('#ins-body [data-score]')).map(function(b){return Number(b.getAttribute('data-score'));});})()");
    assert(Array.isArray(scoreBtns) && scoreBtns.length > 0, '检查器里有赋分按钮', scoreBtns);
    const step = Math.max.apply(null, scoreBtns);
    const clicks = Math.ceil(15 / step) + 1;
    for (let i = 0; i < clicks; i++) {
        await paper.js("(function(){var b=document.querySelector('#ins-body [data-score=\"" + step + "\"]'); if(b) b.click(); return !!b;})()");
        await sleep(1500);
    }
    const eggPet = q("SELECT * FROM pets WHERE student_id = ? AND subject_id = 'subj_chinese'", [eggId])[0];
    assert(Number(eggPet.exp) >= 15, '学生大屏点击赋分真的落库（经验 >= 15）', { exp: eggPet.exp, step: step, clicks: clicks });
    const hatchVisible = await paper.js("(function(){var b=document.getElementById('btn-hatch'); if(!b) return 'missing'; var s=getComputedStyle(b); return (b.offsetParent!==null || s.display!=='none') ? 'visible' : 'hidden';})()");
    assert(hatchVisible === 'visible', '经验达标后大屏出现「立即破壳」入口', hatchVisible);
    await paper.js("document.getElementById('btn-hatch').click()");
    await sleep(2000);
    const hatched = q("SELECT * FROM pets WHERE student_id = ? AND subject_id = 'subj_chinese'", [eggId])[0];
    assert(hatched.species_code !== 'egg' && Number(hatched.visual_stage) >= 1, '大屏点破壳后库里写入真实物种与形态（不会是 egg）', { sp: hatched.species_code, st: hatched.visual_stage });
    const disp = q("SELECT display_pet_id FROM students WHERE id = ?", [eggId])[0];
    assert(disp && disp.display_pet_id === hatched.id, '破壳后展示宠由库里更新', disp);
    paper.win.close();

    // ================= 批次 4：台账 / 新增编辑 / 备份恢复（页面上下文 → 真库） =================
    console.log('\n[批次4] 台账 / 新增编辑 / 备份恢复');
    const m = await openPage('v3_teacher_desk.html');
    const callCore = (expr) => m.js('(async function(){ var c = window.classPetRuntime; return await ' + expr + '; })()');

    // 4.3 台账
    const led = await callCore("c.v3Ledger({ fromTs: Date.now() - 24*3600*1000, toTs: Date.now() + 60000 })");
    assert(led && led.ok === true && Array.isArray(led.rows), '页面上下文能取到真实台账', { n: led && led.rows && led.rows.length });
    const ledOps = q("SELECT COUNT(DISTINCT id) AS n FROM score_operations WHERE class_id = ?", [CLASS])[0].n;
    assert(led.rows.length > 0 && ledOps > 0, '台账行来自真实 score_operations/score_entries', { rows: led.rows.length, ops: ledOps });
    const sample = led.rows[0];
    assert(sample && typeof sample.subjectLabel === 'string' && typeof sample.undone === 'boolean' && sample.createdAt > 0,
        '台账行带学科/撤销状态/真实时间', sample);

    // 4.1 新增 + 编辑（编辑绝不改经验）
    const created = await callCore("c.v3CreateStudent({ name: '端到端乙', group: 3 })");
    assert(created && created.ok === true, '页面上下文新增学生成功', created);
    const newRow = q("SELECT * FROM students WHERE id = ?", [created.studentId])[0];
    assert(!!newRow && newRow.name === '端到端乙' && String(newRow.group_name).indexOf('3') >= 0, '新增学生落库（姓名/小组）', newRow && { name: newRow.name, g: newRow.group_name });
    const dupTry = await callCore("c.v3CreateStudent({ name: '端到端乙' })");
    assert(dupTry && dupTry.ok === true && dupTry.no !== created.no && dupTry.studentId !== created.studentId, '同名新增获得独立 ID 和学号', dupTry);
    const dupNo = await callCore("c.v3CreateStudent({ name: '端到端丙', no: " + JSON.stringify('000' + created.no) + " })");
    assert(dupNo && dupNo.ok === false && dupNo.reason === 'duplicate-no', '跨 preload 和 IPC 拒绝等价重复学号', dupNo);

    const petBeforeEdit = q("SELECT * FROM pets WHERE student_id = ? AND subject_id = 'subj_chinese'", [created.studentId])[0];
    const prof = await callCore("c.v3SaveStudentProfile({ studentId: " + JSON.stringify(created.studentId) + ", name: '端到端乙改', group: 2 })");
    assert(prof && prof.ok === true, '编辑学生资料成功', prof);
    const petAfterEdit = q("SELECT * FROM pets WHERE student_id = ? AND subject_id = 'subj_chinese'", [created.studentId])[0];
    assert(String(petAfterEdit.exp) === String(petBeforeEdit.exp) && petAfterEdit.species_code === petBeforeEdit.species_code && String(petAfterEdit.level) === String(petBeforeEdit.level),
        '编辑只改姓名/小组，物种与经验不变（D12=A）', { before: [petBeforeEdit.species_code, petBeforeEdit.exp, petBeforeEdit.level], after: [petAfterEdit.species_code, petAfterEdit.exp, petAfterEdit.level] });

    const importCsv = async (csv, expectedToast) => {
        await m.js(`(() => {
            const input = document.querySelector('#file-input');
            const files = new DataTransfer();
            files.items.add(new File([${JSON.stringify(csv)}], 'qa-roster.csv', { type: 'text/csv' }));
            input.files = files.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        })()`);
        for (let i = 0; i < 50; i++) {
            const toast = await m.js("document.querySelector('#toast-text').textContent");
            if (toast.includes(expectedToast)) return toast;
            await sleep(100);
        }
        return m.js("document.querySelector('#toast-text').textContent");
    };
    const readRoster = () => q("SELECT * FROM students WHERE class_id = ? ORDER BY id", [CLASS]);
    const readPets = () => q("SELECT * FROM pets WHERE class_id = ? ORDER BY id", [CLASS]);
    const rosterBeforeCsv = readRoster();
    const petsBeforeCsv = readPets();
    const rejected = await importCsv('学号,姓名,小组\n9800,不应写入,1\n1,重复甲,1\n01,重复乙,2', '文件里学号重复');
    assert(rejected.includes('文件里学号重复') && rejected.includes('数据未改动') &&
        JSON.stringify(readRoster()) === JSON.stringify(rosterBeforeCsv) && JSON.stringify(readPets()) === JSON.stringify(petsBeforeCsv),
        'CSV 含 1 和 01 时整份拒绝且零写入', rejected);

    const originalName = '端到端甲';
    const original = rosterBeforeCsv.find(s => s.id === eggId);
    const originalPets = () => q("SELECT id, species_code, nickname, exp, level, visual_stage FROM pets WHERE student_id = ? ORDER BY id", [eggId]);
    const beforeSameName = originalPets();
    const imported = await importCsv('学号,姓名,小组\n,' + originalName + ',2\n9902,' + originalName + ',3', '已导入 2 人');
    const sameNameRows = readRoster().filter(s => s.name === originalName);
    assert(imported.includes('已导入 2 人') && sameNameRows.length === 3 &&
        sameNameRows.some(s => s.id === eggId && s.student_no === original.student_no) &&
        sameNameRows.some(s => s.id !== eggId && s.student_no === '9902') &&
        sameNameRows.some(s => s.student_no === '9903') && JSON.stringify(originalPets()) === JSON.stringify(beforeSameName),
        'CSV 同名新增及空号分配保留原学生学号与宠物', imported);
    const merged = await importCsv('学号,姓名,小组,等级,经验\n000' + original.student_no + ',端到端甲改,4,99,99999', '已导入 1 人');
    const updated = readRoster().find(s => s.id === eggId);
    assert(merged.includes('已导入 1 人') && updated.student_no === original.student_no &&
        updated.name === '端到端甲改' && updated.group_name === '第4组' &&
        JSON.stringify(originalPets()) === JSON.stringify(beforeSameName),
        'CSV 等价学号更新原学生，等级经验和宠物不被覆盖', merged);

    // 4.5 备份恢复：错误版本被拒且数据不变；正确备份恢复成功
    const vmNow = await callCore("c.getV3ViewModel()");
    const backup = {
        kind: 'classpet-class-backup', version: 1,
        students: vmNow.students.map(s => ({
            id: s.id, no: s.no, name: s.name, group: s.group,
            pets: {
                chinese: { id: s.petsBySubject.chinese.petId, species: s.petsBySubject.chinese.speciesCode, exp: s.petsBySubject.chinese.exp, level: s.petsBySubject.chinese.level, visualStage: s.petsBySubject.chinese.visualStage },
                math: { id: s.petsBySubject.math.petId, species: s.petsBySubject.math.speciesCode, exp: s.petsBySubject.math.exp, level: s.petsBySubject.math.level, visualStage: s.petsBySubject.math.visualStage },
                english: { id: s.petsBySubject.english.petId, species: s.petsBySubject.english.speciesCode, exp: s.petsBySubject.english.exp, level: s.petsBySubject.english.level, visualStage: s.petsBySubject.english.visualStage }
            }
        })),
        thresholds: vmNow.thresholds, stages: vmNow.stages, rules: vmNow.rules
    };
    const countBefore = q("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [CLASS])[0].n;
    const badVer = await callCore("c.v3RestoreBackup(" + JSON.stringify(Object.assign({}, backup, { version: 7 })) + ")");
    assert(badVer && badVer.ok === false && badVer.reason === 'bad-version', '错误版本备份被拒', badVer);
    assert(q("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [CLASS])[0].n === countBefore, '被拒的恢复没有改动数据');
    const restore = await callCore("c.v3RestoreBackup(" + JSON.stringify(backup) + ")");
    assert(restore && restore.ok === true, '合法备份在真库恢复成功', restore);
    const restoredCount = q("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [CLASS])[0].n;
    assert(restoredCount === backup.students.length, '恢复后学生数与备份一致', { db: restoredCount, bak: backup.students.length });
    m.win.close();

    // ================= 收尾：正式库原件未被修改 =================
    assert(fs.statSync(srcDb).mtimeMs === srcMtime, 'database/classpet.sqlite 原件未被修改');
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    fs.writeFileSync(path.join(ROOT, 'screenshots_v3', 'evidence', 'v3_write_e2e.json'),
        JSON.stringify({ passed, failed, at: new Date().toISOString() }, null, 2));
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('E2E 异常:', e); app.exit(2); });
