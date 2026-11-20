// test_v3_writes.cjs —— 批次 3 写库链路验收（真实 sqlite_service + 种子库临时副本）
// 跑法：node tests/test_v3_writes.cjs
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
const petRow = (svc, studentId, subId) => svc.query("SELECT * FROM pets WHERE student_id = ? AND subject_id = ?", [studentId, subId])[0];
const expOf = (svc, studentId, subId) => Number((petRow(svc, studentId, subId) || {}).exp || 0);

(async () => {
    console.log('== 批次 3 写库链路验收（临时副本，不碰 database/classpet.sqlite）==');
    const src = path.join(projectRoot, 'database', 'classpet.sqlite');
    const before = fs.statSync(src).mtimeMs;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-v3w-'));
    const tmpDb = path.join(tmpDir, 'classpet.sqlite');
    fs.copyFileSync(src, tmpDb);

    const SQL = await initSqlJs();
    const svc = new SQLiteService();
    svc.SQL = SQL; svc.db = new SQL.Database(fs.readFileSync(tmpDb)); svc.dbPath = tmpDb; svc.isInitialized = true;
    // 与 electron-app/preload.js 暴露的方法名一一对应（IPC 到 SQLiteService 的映射）
    global.window.electronAPI = {
        db: {
            loadAllState: (classId) => svc.loadAllState(classId),
            recordScore: (payload) => svc.recordScoreOperation(payload),
            undoScore: (operationId) => svc.undoOperation(operationId),
            hatchPet: (payload) => svc.hatchStudentPet(payload),
            saveStudent: (student, classId) => svc.saveStudent(student, classId),
            importStudents: (students, classId) => svc.importStudents(students, classId),
            saveThresholds: (thresholds, stages, classId) => svc.saveThresholds(thresholds, stages, classId),
            saveBehaviorRules: (rules, classId) => svc.saveBehaviorRules(rules, classId),
            query: (sql, params) => svc.query(sql, params),
            execute: (sql, params) => svc.execute(sql, params)
        }
    };
    const CLASS = 'c_class02_01';
    const mkStore = async () => { const s = new ClassPetStore(); await new Promise(r => setTimeout(r, 0)); return s; };

    // ---------- 准备：新建一名空学生（saveStudent 会建三科蛋宠，经验 0） ----------
    const newId = 'st_v3t_01';
    const saveRes = svc.saveStudent({ id: newId, student_no: '99', name: '写库测试甲', group: 1, pets: {} }, CLASS);
    assert(saveRes && saveRes.success === true, '准备学生成功（saveStudent）', saveRes);
    assert(expOf(svc, newId, 'subj_chinese') === 0, '新学生语文蛋初始 0 EXP');

    let store = await mkStore();
    let vm = await store.getV3ViewModel();
    const fresh = vm.students.filter(s => s.id === newId)[0];
    assert(!!fresh && fresh.petsBySubject.chinese.isEgg === true, 'VM 里新学生语文是蛋形态');

    // ---------- 3.3 破壳门槛：经验不足被拒 ----------
    let hatch = await store.v3Hatch({ studentId: newId, subjectCode: 'chinese', speciesCode: 'cat' });
    assert(hatch.ok === false && hatch.reason === 'exp-insufficient', '经验 0 时破壳被拒（exp-insufficient）', hatch);
    assert(petRow(svc, newId, 'subj_chinese').species_code === 'egg', '被拒后库里仍是蛋（未写入）');

    // ---------- 3.3 学科解锁门槛：数学蛋未解锁 ----------
    hatch = await store.v3Hatch({ studentId: newId, subjectCode: 'math', speciesCode: 'dog' });
    assert(hatch.ok === false && (hatch.reason === 'locked' || hatch.reason === 'exp-insufficient'), '数学破壳被门槛拦截', hatch);

    // ---------- 3.1 赋分：语文蛋可以加分攒破壳能量 ----------
    let score = await store.v3Score({ studentIds: [newId], delta: 50, reason: '写库测试加分', subjectCode: 'chinese' });   // 种子库已改为破壳 50
    assert(score.ok === true && !!score.operationId, '赋分 +50 成功且拿到 operationId（等库确认后才算成功）', score);
    const opBeforeHatch = score.operationId;
    assert(expOf(svc, newId, 'subj_chinese') === 50, '库里语文经验变为 50（破壳线）', expOf(svc, newId, 'subj_chinese'));
    assert(score.skipped.length === 0, '无被跳过学生', score.skipped);

    // ---------- 3.3 破壳：经验达标后写入成功并成为展示宠 ----------
    hatch = await store.v3Hatch({ studentId: newId, subjectCode: 'chinese', speciesCode: 'cat', nickname: '语文小猫' });
    assert(hatch.ok === true, '经验达标后语文破壳成功', hatch);
    const cnRow = petRow(svc, newId, 'subj_chinese');
    assert(cnRow.species_code === 'cat' && Number(cnRow.visual_stage) >= 1, '库里写入物种与形态', { sp: cnRow.species_code, st: cnRow.visual_stage });
    assert((svc.query("SELECT display_pet_id FROM students WHERE id = ?", [newId])[0] || {}).display_pet_id === cnRow.id, '破壳后自动成为展示宠（display_pet_id）');

    // 重复破壳被拒
    hatch = await store.v3Hatch({ studentId: newId, subjectCode: 'chinese', speciesCode: 'dog' });
    assert(hatch.ok === false && hatch.reason === 'already-hatched', '重复破壳被拒（already-hatched）', hatch);

    // ---------- 3.1 赋分资格：未破壳的数学被跳过、缺勤被跳过 ----------
    score = await store.v3Score({ studentIds: [newId], delta: 3, reason: '数学加分', subjectCode: 'math' });
    assert(score.ok === false && score.reason === 'no-eligible' && score.skipped[0].reason === 'LOCKED',
        '数学未解锁时赋分被跳过（LOCKED），不写库', score.skipped);
    // 已解锁但未破壳（语文已满级的同班学生）应为 UNHATCHED
    const cnMax = vm.students.filter(s => s.petsBySubject.chinese.isHatched && s.petsBySubject.chinese.level >= 20 && s.petsBySubject.math.isEgg)[0];
    if (cnMax) {
        score = await store.v3Score({ studentIds: [cnMax.id], delta: 3, reason: '数学加分', subjectCode: 'math' });
        assert(score.ok === false && score.skipped[0].reason === 'UNHATCHED',
            '已解锁但数学未破壳时赋分被跳过（UNHATCHED）', score.skipped);
    } else {
        console.log('  (跳过 UNHATCHED 用例：真实库里没有「语文满级且数学仍是蛋」的学生)');
    }
    assert(petRow(svc, newId, 'subj_math').exp === 0, '被跳过后数学经验仍为 0');

    score = await store.v3Score({ studentIds: [newId], delta: 3, reason: '缺勤加分', subjectCode: 'chinese', absentIds: [newId] });
    assert(score.ok === false && score.skipped[0].reason === 'ABSENT', '缺勤学生被跳过（ABSENT），不写库', score.skipped);

    // ---------- 3.2 撤销：只许撤最后一笔 ----------
    const expBeforeUndo = expOf(svc, newId, 'subj_chinese');
    const s2 = await store.v3Score({ studentIds: [newId], delta: 5, reason: '第二笔', subjectCode: 'chinese' });
    assert(s2.ok === true, '第二笔赋分成功', s2);
    const expAfterSecond = expOf(svc, newId, 'subj_chinese');
    assert(expAfterSecond === expBeforeUndo + 5, '第二笔后经验 +5', { expBeforeUndo, expAfterSecond });

    const undoStale = await store.v3UndoLast({ operationId: opBeforeHatch });
    assert(undoStale.ok === false && undoStale.reason === 'not-last', '撤销非最后一笔被拒（not-last）', undoStale);
    assert(expOf(svc, newId, 'subj_chinese') === expAfterSecond, '被拒的撤销没有改数据');

    const undoOk = await store.v3UndoLast();
    assert(undoOk.ok === true && undoOk.operationId === s2.operationId, '撤销最后一笔成功', undoOk);
    assert(expOf(svc, newId, 'subj_chinese') === expBeforeUndo, '撤销后经验回到第二笔之前', expOf(svc, newId, 'subj_chinese'));

    // ---------- 3.5 阈值保存：21 级 + 6 阶段 ----------
    store = await mkStore();
    const baseThr = (await store.getV3ViewModel()).thresholds.slice();
    const l8new = baseThr[7] + 200;   // 保证单调：比上一级高 200
    const changed = baseThr.map((v, i) => i >= 8 ? Math.max(v, l8new + (i - 8) * 50) : v);
    let sv = await store.v3SaveThresholds({ thresholds: changed, stages: (await store.getV3ViewModel()).stages });
    assert(sv.ok === true, '阈值保存成功（21 级 + 6 阶段）', sv);
    store = await mkStore();
    let vm2 = await store.getV3ViewModel();
    assert(vm2.thresholds[8] === l8new, '重启等价：重新加载后 8 级阈值仍是写入值(' + l8new + ')', vm2.thresholds[8]);
    const bad = baseThr.slice(); bad[5] = 1; bad[6] = 0;
    sv = await store.v3SaveThresholds({ thresholds: bad, stages: vm2.stages });
    assert(sv.ok === false && sv.reason === 'bad-thresholds', '非单调阈值被拒（bad-thresholds）', sv);
    sv = await store.v3SaveThresholds({ thresholds: baseThr.slice(0, 20), stages: vm2.stages });
    assert(sv.ok === false && sv.reason === 'bad-thresholds', '级数不足 21 被拒', sv);

    // ---------- 3.4 规则：写库后 VM 跟着变 ----------
    const rules = [
        { id: 'pos_t1', name: '认真倾听', points: 1, type: 'positive' },
        { id: 'neg_t1', name: '小声提醒', points: -1, type: 'negative' }
    ];
    const sr = await store.v3SaveRules({ rules: rules });
    assert(sr.ok === true, '规则保存成功', sr);
    store = await mkStore();
    vm2 = await store.getV3ViewModel();
    assert(vm2.rules.length === 2 && vm2.rules[0].name === '认真倾听' && vm2.rules[1].points === -1,
        'VM 规则来自数据库（改库后界面数据跟着变）', vm2.rules);

    // ---------- 无桥 ----------
    delete global.window.electronAPI;
    store = await mkStore();
    const noBridge = await store.v3Score({ studentIds: [newId], delta: 1, reason: 'x' });
    assert(noBridge.ok === false && noBridge.reason === 'no-bridge', '无 electronAPI 时写操作明确失败（no-bridge）', noBridge);

    // ---------- 正式库原件未被动过 ----------
    assert(fs.statSync(src).mtimeMs === before, 'database/classpet.sqlite 原件未被修改');
    svc.db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exitCode = 1;
})().catch(e => { console.error('测试异常:', e); process.exitCode = 1; });
