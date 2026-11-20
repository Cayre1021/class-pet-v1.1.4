// test_v3_manage.cjs —— 批次 4 管理能力验收（真实 sqlite_service + 种子库临时副本）
const path = require('path');
const fs = require('fs');
const os = require('os');
const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');
const initSqlJs = require(path.join(projectRoot, 'electron-app', 'node_modules', 'sql.js'));
const { SQLiteService } = require(path.join(projectRoot, 'electron-app', 'sqlite_service.js'));

const storage = {};
global.localStorage = {
    getItem: (k) => storage[k] !== undefined ? storage[k] : null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.BroadcastChannel = class { constructor() {} postMessage() {} close() {} };
global.Audio = class { play() { return Promise.resolve(); } pause() {} };
global.window = { addEventListener: () => {}, localStorage: global.localStorage, BroadcastChannel: global.BroadcastChannel };
const { ClassPetStore } = require(path.join(projectRoot, 'electron-app', 'src', 'classpet_core.js'));

let passed = 0, failed = 0;
const assert = (cond, msg, extra) => {
    if (cond) { console.log('  PASS  ' + msg); passed++; }
    else { console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 260) : '')); failed++; }
};

(async () => {
    console.log('== 批次 4 管理能力验收（临时副本，不碰 database/classpet.sqlite）==');
    const src = path.join(projectRoot, 'database', 'classpet.sqlite');
    const before = fs.statSync(src).mtimeMs;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-v3m-'));
    const tmpDb = path.join(tmpDir, 'classpet.sqlite');
    fs.copyFileSync(src, tmpDb);
    const SQL = await initSqlJs();
    const svc = new SQLiteService();
    svc.SQL = SQL; svc.db = new SQL.Database(fs.readFileSync(tmpDb)); svc.dbPath = tmpDb; svc.isInitialized = true;
    global.window.electronAPI = {
        db: {
            loadAllState: (c) => svc.loadAllState(c), recordScore: (p) => svc.recordScoreOperation(p),
            undoScore: (id) => svc.undoOperation(id), hatchPet: (p) => svc.hatchStudentPet(p),
            saveStudent: (s, c) => svc.saveStudent(s, c), importStudents: (s, c) => svc.importStudents(s, c),
            saveThresholds: (t, s2, c) => svc.saveThresholds(t, s2, c), saveBehaviorRules: (r, c) => svc.saveBehaviorRules(r, c),
            getClassLedger: (c, f, t) => svc.getClassLedger(c, f, t),
            updateStudentProfile: (id, patch, c) => svc.updateStudentProfile(id, patch, c),
            restoreClassBackup: (c, p) => svc.restoreClassBackup(c, p),
            query: (s, p) => svc.query(s, p), execute: (s, p) => svc.execute(s, p)
        }
    };
    const CLASS = 'c_class02_01';
    const mk = async () => { const s = new ClassPetStore(); await new Promise(r => setTimeout(r, 0)); return s; };
    let store = await mk();

    // ---------- 4.1 新增学生 ----------
    console.log('\n[4.1] 新增 / 编辑学生');
    let r = await store.v3CreateStudent({ name: '管理测试甲', group: 2 });
    assert(r.ok === true && !!r.studentId, '新增学生成功并生成库内 id', r);
    const petCount = svc.query("SELECT COUNT(*) AS n FROM pets WHERE student_id = ?", [r.studentId])[0].n;
    assert(petCount === 3, '新增学生自动建三科蛋宠（3 条）', petCount);
    const dupName = await store.v3CreateStudent({ name: '管理测试甲' });
    assert(dupName.ok === false && dupName.reason === 'duplicate-name', '同名新增被拒', dupName);
    r = await store.v3CreateStudent({ name: '管理测试乙', no: r.no });
    assert(r.ok === false && r.reason === 'duplicate-no', '同学号新增被拒', r);

    // 编辑只改姓名/组：等级/经验/物种必须原样
    store = await mk();
    const target = store.students ? null : null;
    const vm0 = await store.getV3ViewModel();
    const editTarget = vm0.students.filter(s => s.petsBySubject.chinese.exp > 0)[0];
    const petBefore = svc.query("SELECT * FROM pets WHERE student_id = ? AND subject_id = 'subj_chinese'", [editTarget.id])[0];
    const pr = await store.v3SaveStudentProfile({ studentId: editTarget.id, name: editTarget.name + '·改', group: 3 });
    assert(pr.ok === true && pr.group === 3, '编辑学生姓名/小组成功', pr);
    const petAfter = svc.query("SELECT * FROM pets WHERE student_id = ? AND subject_id = 'subj_chinese'", [editTarget.id])[0];
    assert(petAfter.species_code === petBefore.species_code && Number(petAfter.exp) === Number(petBefore.exp) && Number(petAfter.level) === Number(petBefore.level),
        '编辑绝不改物种/经验/等级', { before: [petBefore.species_code, petBefore.exp, petBefore.level], after: [petAfter.species_code, petAfter.exp, petAfter.level] });

    // ---------- 4.3 台账 ----------
    console.log('\n[4.3] 台账（本堂课 + 今日）');
    store = await mk();
    const sc = await store.v3Score({ studentIds: [vm0.students[0].id], delta: 4, reason: '台账测试', subjectCode: 'chinese' });
    assert(sc.ok === true, '造一笔赋分用于台账', sc);
    const led = await store.v3Ledger({ fromTs: Date.now() - 3600 * 1000, toTs: Date.now() + 60 * 1000 });
    assert(led.ok === true && led.rows.length > 0, '台账返回记录', { n: led.rows.length });
    const row = led.rows.filter(x => x.operationId === sc.operationId)[0];
    assert(!!row && row.actionName === '台账测试' && row.subjectLabel === '语文' && row.studentName, '台账带规则名/学科/学生名', row);
    assert(row.undone === false && row.expAfter === row.expBefore + 4, '台账带撤销状态与经验前后值', row);
    const undo = await store.v3UndoLast();
    const led2 = await store.v3Ledger({});
    const row2 = led2.rows.filter(x => x.operationId === sc.operationId)[0];
    assert(undo.ok === true && row2 && row2.undone === true && row2.undoneAt > 0, '撤销后台账显示已撤销 + 撤销时间', row2 && { undone: row2.undone, at: row2.undoneAt });

    // ---------- 4.5 整包恢复 ----------
    console.log('\n[4.5] JSON 整包恢复（kind/version/重复 ID/原子）');
    store = await mk();
    const vmNow = await store.getV3ViewModel();
    const backup = {
        kind: 'classpet-class-backup', version: 1,
        students: vmNow.students.map(s => ({
            id: s.id, no: s.no, name: s.name, group: s.group, isArchived: s.isArchived,
            pets: {
                chinese: { id: s.petsBySubject.chinese.petId, species: s.petsBySubject.chinese.speciesCode, exp: s.petsBySubject.chinese.exp, level: s.petsBySubject.chinese.level, visualStage: s.petsBySubject.chinese.visualStage },
                math: { id: s.petsBySubject.math.petId, species: s.petsBySubject.math.speciesCode, exp: s.petsBySubject.math.exp, level: s.petsBySubject.math.level, visualStage: s.petsBySubject.math.visualStage },
                english: { id: s.petsBySubject.english.petId, species: s.petsBySubject.english.speciesCode, exp: s.petsBySubject.english.exp, level: s.petsBySubject.english.level, visualStage: s.petsBySubject.english.visualStage }
            }
        })),
        thresholds: vmNow.thresholds, stages: vmNow.stages, rules: vmNow.rules
    };
    const studentsBefore = svc.query("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [CLASS])[0].n;
    const badKind = await store.v3RestoreBackup(Object.assign({}, backup, { kind: 'x' }));
    assert(badKind.ok === false && badKind.reason === 'bad-kind', '错误 kind 被拒', badKind);
    const badVer = await store.v3RestoreBackup(Object.assign({}, backup, { version: 9 }));
    assert(badVer.ok === false && badVer.reason === 'bad-version', '错误 version 被拒', badVer);
    const dup = JSON.parse(JSON.stringify(backup));
    dup.students.push(JSON.parse(JSON.stringify(dup.students[0])));
    const dupRes = await store.v3RestoreBackup(dup);
    assert(dupRes.ok === false && dupRes.reason === 'duplicate-id', '重复 id 被拒', dupRes);
    assert(svc.query("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [CLASS])[0].n === studentsBefore, '被拒的恢复没有改动数据（不半套）');

    const okRes = await store.v3RestoreBackup(backup);
    assert(okRes.ok === true, '合法备份恢复成功', okRes);
    assert(svc.query("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [CLASS])[0].n === backup.students.length, '恢复后学生数与备份一致');
    const roundTrip = svc.query("SELECT p.* FROM pets p JOIN students s ON s.id = p.student_id WHERE p.class_id = ? AND p.subject_id = 'subj_chinese' ORDER BY s.student_no ASC LIMIT 1", [CLASS])[0];
    const srcPet = backup.students.filter(st => st.id === roundTrip.student_id)[0];
    assert(srcPet && roundTrip.species_code === srcPet.pets.chinese.species && Number(roundTrip.exp) === Number(srcPet.pets.chinese.exp), '恢复保留物种与经验（往返一致）', { db: [roundTrip.species_code, roundTrip.exp], bak: srcPet && srcPet.pets.chinese });
    const rulesAfter = svc.query("SELECT COUNT(*) AS n FROM behavior_rules WHERE class_id = ?", [CLASS])[0].n;
    assert(rulesAfter === backup.rules.length, '恢复同时写回行为规则', { db: rulesAfter, bak: backup.rules.length });

    assert(fs.statSync(src).mtimeMs === before, 'database/classpet.sqlite 原件未被修改');
    svc.db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exitCode = 1;
})().catch(e => { console.error('测试异常:', e); process.exitCode = 1; });
