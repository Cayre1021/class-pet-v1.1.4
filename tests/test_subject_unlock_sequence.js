// test_subject_unlock_sequence.js —— 学科解锁模型：开局只有主科，其余由老师逐科选择解锁
// 负责人指令（2026-11）：「老师选了某个科目，那么就先解锁这个科目，其他科目要到这个科目符合条件了再解锁下一个，
// 而且是要用户自己选的。」→ 解锁集合落库 class_subject_unlocks 为唯一真相；满级只是"可解锁候选"，不自动解锁。
// 跑法：node tests/test_subject_unlock_sequence.js
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
    else { console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 300) : '')); failed++; }
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const petRow = (svc, studentId, subId) => svc.query("SELECT * FROM pets WHERE student_id = ? AND subject_id = ?", [studentId, subId])[0];
const expOf = (svc, studentId, subId) => Number((petRow(svc, studentId, subId) || {}).exp || 0);
const useAccount = (classId, subject) => {
    global.localStorage.setItem('classpet_current_account', JSON.stringify({ id: 't_unlock_seq', classId: classId, className: '解锁序列班', teacherName: '测试老师', subject: subject || '语文' }));
    global.localStorage.setItem('classpet_active_account_id', 't_unlock_seq');
    global.localStorage.setItem('classpet_current_teaching_subject', subject || '语文');
};

(async () => {
    console.log('== 学科解锁序列：开局只有主科，其余由老师逐科选择（临时副本，不碰 database/classpet.sqlite）==');
    const src = path.join(projectRoot, 'database', 'classpet.sqlite');
    const before = fs.statSync(src).mtimeMs;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-subjseq-'));
    const tmpDb = path.join(tmpDir, 'classpet.sqlite');
    fs.copyFileSync(src, tmpDb);

    const SQL = await initSqlJs();
    const svc = new SQLiteService();
    svc.SQL = SQL; svc.db = new SQL.Database(fs.readFileSync(tmpDb)); svc.dbPath = tmpDb; svc.isInitialized = true;
    svc.initDefaultTables();
    global.window.electronAPI = {
        db: {
            loadAllState: (classId) => svc.loadAllState(classId),
            recordScore: (payload) => svc.recordScoreOperation(payload),
            undoScore: (operationId) => svc.undoOperation(operationId),
            hatchPet: (payload) => svc.hatchStudentPet(payload),
            saveStudent: (student, classId) => svc.saveStudent(student, classId),
            getSubjectUnlocks: (classId) => svc.getUnlockedSubjects(classId),
            unlockSubject: (payload) => svc.unlockSubject(payload && payload.classId, payload && payload.code),
            query: (sql, params) => svc.query(sql, params),
            execute: (sql, params) => svc.execute(sql, params)
        }
    };
    const mkStore = async () => { const s = new ClassPetStore(); await new Promise(r => setTimeout(r, 0)); return s; };

    // ---------- 0. 迁移素材：先造一个「语文有已破壳宠物」的老班（必须在首次读解锁之前） ----------
    const LEGACY = 'c_legacy_seq_test';
    const LEGACY_STU = 'st_legacy_seq_01';
    svc.execute("INSERT OR REPLACE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at) VALUES (?, 't_legacy_seq', '实验小学本部', '老班级序列班', '老班级序列班', NULL, 20, 0, 0)", [LEGACY]);
    assert(svc.saveStudent({ id: LEGACY_STU, student_no: '88', name: '老班甲', group: 1, pets: {} }, LEGACY).success === true, '准备老班级学生成功');
    svc.execute("UPDATE pets SET species_code = 'cat', hatched_at = ?, visual_stage = 1, exp = 1950, level = 20 WHERE student_id = ? AND subject_id = 'subj_chinese'", [Date.now(), LEGACY_STU]);
    assert(petRow(svc, LEGACY_STU, 'subj_chinese').hatched_at !== null, '老班级语文宠物已破壳（迁移推断依据）');
    assert(svc.query("SELECT code FROM class_subject_unlocks WHERE class_id = ?", [LEGACY]).length === 0, '迁移前：老班级还没有任何解锁行');

    // ---------- 1. 数学主科新班：只解锁数学，语文/英语都不在候选里 ----------
    const MATH_CLASS = 'c_math_seq_test';
    const MATH_STU = 'st_math_seq_01';
    assert(svc.createClassWithDefaults({ classId: MATH_CLASS, className: '数学主科序列班', teacherName: '张老师', subjectCode: 'math', teacherId: 't_math_seq' }).success === true, '建班成功（主科数学）');
    assert(svc.saveStudent({ id: MATH_STU, student_no: '91', name: '数学甲', group: 1, pets: {} }, MATH_CLASS).success === true, '数学主科班新增学生成功');
    assert(same(svc.getUnlockedSubjects(MATH_CLASS), ['math']), '★ getUnlockedSubjects() 只返回 [math]（语文不再恒解锁）', svc.getUnlockedSubjects(MATH_CLASS));

    useAccount(MATH_CLASS, '数学');
    let store = await mkStore();
    let vm = await store.getV3ViewModel();
    assert(vm.ok === true, 'ViewModel 读取成功（db）', { reason: vm.reason });
    assert(same(vm.subjectUnlocks, ['math']), '★ VM.subjectUnlocks = ["math"]', vm.subjectUnlocks);
    assert(same(vm.subjectCandidates, []), '★ 未满足条件时 VM.subjectCandidates 为空数组', vm.subjectCandidates);
    let stu = vm.students.filter(s => s.id === MATH_STU)[0];
    assert(!!stu, 'VM 里找得到这名学生');
    assert(stu.petsBySubject.math.unlocked === true && stu.petsBySubject.math.lockReason === null, '主科数学 unlocked=true 且无锁理由');
    assert(stu.petsBySubject.chinese.unlocked === false, '★ 语文在这个班里锁着（不再恒解锁）', { u: stu.petsBySubject.chinese.unlocked, r: stu.petsBySubject.chinese.lockReason });
    assert(svc.unlockSubject(MATH_CLASS, 'english').ok === false && svc.unlockSubject(MATH_CLASS, 'english').reason === 'not-eligible', '★ 未满足条件时 unlockSubject 返回 not-eligible（服务层自己判）');

    // ---------- 2. 语文锁着：core 判定 + 赋分拦截 ----------
    const cnState = store._v3UnlockState('chinese');
    assert(cnState.allowed === false && /尚未解锁/.test(String(cnState.reason)), '★ core._v3UnlockState("chinese") → allowed=false', cnState);
    const guard = store._v3GuardScore(stu, 'chinese', false);
    assert(guard.allowed === false && guard.reason === 'LOCKED', '★ _v3GuardScore 拒绝语文赋分（LOCKED）', guard);
    const scoreCn = await store.v3Score({ studentIds: [MATH_STU], delta: 5, reason: '语文加分（应被拦）', subjectCode: 'chinese' });
    assert(scoreCn.ok === false && scoreCn.reason === 'no-eligible' && scoreCn.skipped[0].reason === 'LOCKED', '未解锁学科的赋分被拦（no-eligible / LOCKED）', scoreCn.skipped);
    assert(expOf(svc, MATH_STU, 'subj_chinese') === 0, '被拦后语文经验没写库', expOf(svc, MATH_STU, 'subj_chinese'));

    // ---------- 3. 数学宠物打到 Lv.20：语文/英语进入候选，但仍未解锁 ----------
    const toMax = await store.v3Score({ studentIds: [MATH_STU], delta: 1950, reason: '数学刷到满级', subjectCode: 'math' });
    assert(toMax.ok === true, '已解锁的数学可以一路加到满级（蛋态也能攒经验，否则永远孵不出来）', toMax);
    assert(Number(petRow(svc, MATH_STU, 'subj_math').level) === 20, '库里数学宠物到 Lv.20', petRow(svc, MATH_STU, 'subj_math').level);
    vm = await store.getV3ViewModel();
    stu = vm.students.filter(s => s.id === MATH_STU)[0];
    assert(same(vm.subjectCandidates, ['chinese', 'english']), '★ 满级后 subjectCandidates = ["chinese","english"]', vm.subjectCandidates);
    assert(same(vm.subjectUnlocks, ['math']), '★ 只是候选：subjectUnlocks 仍是 ["math"]（不自动解锁）', vm.subjectUnlocks);
    assert(same(svc.getUnlockedSubjects(MATH_CLASS), ['math']), '库里仍然只有数学一行', svc.getUnlockedSubjects(MATH_CLASS));
    assert(/已满足解锁条件/.test(String(stu.petsBySubject.chinese.lockReason)), '候选学科的锁理由变成"等老师选择解锁"', stu.petsBySubject.chinese.lockReason);
    assert(stu.petsBySubject.english.unlocked === false, '英语同样只是候选、仍然锁着');

    // ---------- 4. 老师选择解锁语文：集合变成 math+chinese，语文可赋分，英语仍在候选 ----------
    const unlockCn = await store.v3UnlockSubject({ subjectCode: 'chinese' });
    assert(unlockCn.ok === true && same(unlockCn.unlocked, ['math', 'chinese']), '★ 解锁语文成功，集合 = ["math","chinese"]', unlockCn);
    assert(same(svc.getUnlockedSubjects(MATH_CLASS), ['math', 'chinese']), '落库顺序：先主科、后老师选的学科', svc.getUnlockedSubjects(MATH_CLASS));
    const reloaded = await mkStore();
    vm = await reloaded.getV3ViewModel();
    stu = vm.students.filter(s => s.id === MATH_STU)[0];
    assert(stu.petsBySubject.chinese.unlocked === true, '★ 解锁后语文 unlocked=true', stu.petsBySubject.chinese);
    assert(same(vm.subjectCandidates, ['english']), '★ 英语仍在候选列表（老师还没选它）', vm.subjectCandidates);
    const scoreCn2 = await reloaded.v3Score({ studentIds: [MATH_STU], delta: 10, reason: '语文已解锁加分', subjectCode: 'chinese' });
    assert(scoreCn2.ok === true && expOf(svc, MATH_STU, 'subj_chinese') === 10, '★ 解锁后语文可赋分（蛋态攒破壳能量）', { ok: scoreCn2.ok, exp: expOf(svc, MATH_STU, 'subj_chinese') });
    const scoreEn = await reloaded.v3Score({ studentIds: [MATH_STU], delta: 5, reason: '英语加分（应被拦）', subjectCode: 'english' });
    assert(scoreEn.ok === false && scoreEn.skipped[0].reason === 'LOCKED', '英语仍未解锁 → 仍被 LOCKED 拦住', scoreEn.skipped);

    // ---------- 5. 幂等：重复解锁不报错、集合不变 ----------
    const again = await reloaded.v3UnlockSubject({ subjectCode: 'chinese' });
    assert(again.ok === true && again.already === true && same(again.unlocked, ['math', 'chinese']), '★ 重复解锁幂等（ok + already）', again);
    assert(same(svc.getUnlockedSubjects(MATH_CLASS), ['math', 'chinese']), '重复解锁后集合不变', svc.getUnlockedSubjects(MATH_CLASS));
    assert(svc.query("SELECT code FROM class_subject_unlocks WHERE class_id = ?", [MATH_CLASS]).length === 2, '库里仍只有 2 行（没有重复插入）', svc.query("SELECT code FROM class_subject_unlocks WHERE class_id = ?", [MATH_CLASS]));

    // ---------- 6. 老班级迁移：推断结果落成行，原功能不受影响 ----------
    assert(svc.query("SELECT value FROM app_meta WHERE key = 'subject_unlock_v1'").length === 1, '★ app_meta 写入标记 subject_unlock_v1');
    assert(svc.migrateSubjectUnlockV1().skipped === true, '★ 迁移只跑一次（第二次 skipped）');
    assert(same(svc.getUnlockedSubjects(LEGACY), ['chinese']), '★ 老班级迁移后解锁集合以语文推断落地', svc.getUnlockedSubjects(LEGACY));
    assert(svc.query("SELECT code FROM class_subject_unlocks WHERE class_id = ?", [LEGACY]).length === 1, '老班级只补了推断出的 1 行（数学/英语没被顺带解锁）');
    useAccount(LEGACY, '语文');
    const legacyStore = await mkStore();
    const vmL = await legacyStore.getV3ViewModel();
    assert(vmL.ok === true && same(vmL.subjectUnlocks, ['chinese']), '老班级 VM.subjectUnlocks = ["chinese"]', vmL.subjectUnlocks);
    assert(same(vmL.subjectCandidates, ['math', 'english']), '老班级语文已满级 → 数学/英语是候选（仍锁着）', vmL.subjectCandidates);
    const stuL = vmL.students.filter(s => s.id === LEGACY_STU)[0];
    assert(stuL.petsBySubject.math.unlocked === false, '老班级数学仍然锁着（迁移不会顺带解锁）', stuL.petsBySubject.math);
    const scoreLCn = await legacyStore.v3Score({ studentIds: [LEGACY_STU], delta: 5, reason: '老班语文照旧', subjectCode: 'chinese' });
    assert(scoreLCn.ok === true, '★ 老班级语文赋分照旧成功（原功能不受影响）', scoreLCn);
    const scoreLMath = await legacyStore.v3Score({ studentIds: [LEGACY_STU], delta: 5, reason: '老班数学（应被拦）', subjectCode: 'math' });
    assert(scoreLMath.ok === false && scoreLMath.skipped[0].reason === 'LOCKED', '老班级数学仍被 LOCKED 拦住', scoreLMath.skipped);

    // ---------- 清理 ----------
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('种子库未被改动: ' + (fs.statSync(src).mtimeMs === before ? '是' : '否'));
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
