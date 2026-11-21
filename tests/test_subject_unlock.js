// test_subject_unlock.js —— 注册时选的科目（班级主科）必须一开始就可用
// 2026-11 模型变更：开局只解锁主科（class_subject_unlocks），语文不再恒解锁，其余学科由老师逐科选择解锁。
// 序列/候选/迁移的完整覆盖见 tests/test_subject_unlock_sequence.js
// 跑法：node tests/test_subject_unlock.js
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
const useAccount = (classId, subject) => {
    global.localStorage.setItem('classpet_current_account', JSON.stringify({ id: 't_test', classId: classId, className: '测试班', teacherName: '测试老师', subject: subject || '语文' }));
    global.localStorage.setItem('classpet_active_account_id', 't_test');
    global.localStorage.setItem('classpet_current_teaching_subject', subject || '语文');
};

(async () => {
    console.log('== 科目解锁：班级主科恒可用（临时副本，不碰 database/classpet.sqlite）==');
    const src = path.join(projectRoot, 'database', 'classpet.sqlite');
    const before = fs.statSync(src).mtimeMs;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-subjunlock-'));
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
            importStudents: (students, classId) => svc.importStudents(students, classId),
            saveThresholds: (thresholds, stages, classId) => svc.saveThresholds(thresholds, stages, classId),
            saveBehaviorRules: (rules, classId) => svc.saveBehaviorRules(rules, classId),
            query: (sql, params) => svc.query(sql, params),
            execute: (sql, params) => svc.execute(sql, params)
        }
    };
    const mkStore = async () => { const s = new ClassPetStore(); await new Promise(r => setTimeout(r, 0)); return s; };

    // ---------- 1. 注册时选「数学」：写入 classes.default_subject_id ----------
    const MATH_CLASS = 'c_mathmain_test';
    const created = svc.createClassWithDefaults({ classId: MATH_CLASS, className: '数学主科班', teacherName: '张老师', subjectCode: 'math', teacherId: 't_mathmain' });
    assert(created && created.success === true, '建班成功（以数学为主科）', created);
    const classRow = svc.query("SELECT default_subject_id FROM classes WHERE id = ?", [MATH_CLASS])[0];
    assert(classRow && classRow.default_subject_id === 'subj_math', 'classes.default_subject_id 写成 subj_math', classRow);
    assert(svc.getClassDefaultSubject(MATH_CLASS) === 'math', 'getClassDefaultSubject() 返回 math', svc.getClassDefaultSubject(MATH_CLASS));
    assert(svc.loadAllState(MATH_CLASS).defaultSubject === 'math', 'loadAllState() 里带 defaultSubject=math');

    // 名单里加一名学生（saveStudent 会建三科蛋宠）
    const MATH_STU = 'st_mathmain_01';
    const saved = svc.saveStudent({ id: MATH_STU, student_no: '91', name: '数学甲', group: 1, pets: {} }, MATH_CLASS);
    assert(saved && saved.success === true, '数学主科班新增学生成功', saved);

    useAccount(MATH_CLASS, '数学');
    let store = await mkStore();
    let vm = await store.getV3ViewModel();
    assert(vm.ok === true, 'ViewModel 读取成功（db）', { reason: vm.reason });
    assert(vm.defaultSubject === 'math', 'VM 带 defaultSubject=math', vm.defaultSubject);
    const stu = vm.students.filter(s => s.id === MATH_STU)[0];
    assert(!!stu, 'VM 里找得到这名学生');
    assert(stu.petsBySubject.math.unlocked === true && stu.petsBySubject.math.lockReason === null, '★ 主科数学 unlocked=true 且无锁理由', { u: stu.petsBySubject.math.unlocked, r: stu.petsBySubject.math.lockReason });
    assert(stu.petsBySubject.chinese.unlocked === false, '语文在这个数学主科班里锁着（不再恒解锁）', { u: stu.petsBySubject.chinese.unlocked, r: stu.petsBySubject.chinese.lockReason });
    assert(stu.petsBySubject.english.unlocked === false && /满级/.test(String(stu.petsBySubject.english.lockReason)), '英语未解锁（数学未满级 → 无候选）', { u: stu.petsBySubject.english.unlocked, r: stu.petsBySubject.english.lockReason });

    // ---------- 2. 主科可直接赋分（未破壳的蛋也能加分攒破壳能量）----------
    let score = await store.v3Score({ studentIds: [MATH_STU], delta: 20, reason: '数学主科加分', subjectCode: 'math' });
    assert(score.ok === true && !!score.operationId, '★ 主科数学可直接赋分 +20', score);
    assert(expOf(svc, MATH_STU, 'subj_math') === 20, '库里数学经验变为 20', expOf(svc, MATH_STU, 'subj_math'));

    // ---------- 2b. 空名单的新班：页面必须靠 vm.defaultSubject 判"主科可用" ----------
    const EMPTY_CLASS = 'c_mathmain_empty';
    svc.createClassWithDefaults({ classId: EMPTY_CLASS, className: '数学主科空班', teacherName: '张老师', subjectCode: 'math', teacherId: 't_mathmain_empty' });
    assert(svc.loadAllState(EMPTY_CLASS).defaultSubject === 'math', '空名单班 loadAllState().defaultSubject=math', svc.loadAllState(EMPTY_CLASS).defaultSubject);
    useAccount(EMPTY_CLASS, '数学');
    const storeEmpty = await mkStore();
    const vmEmpty = await storeEmpty.getV3ViewModel();
    assert(vmEmpty.ok === true && vmEmpty.students.length === 0, '空名单班 VM：ok 且 students 为空', { ok: vmEmpty.ok, n: vmEmpty.students.length });
    assert(vmEmpty.defaultSubject === 'math', '★ 空名单班 VM 带 defaultSubject=math（页面据此不给主科上锁）', vmEmpty.defaultSubject);
    useAccount(MATH_CLASS, '数学');   /* 回到数学主科班继续验后面几条 */

    // ---------- 3. 其它科目规则不变：英语仍被拦 ----------
    const scoreEn = await store.v3Score({ studentIds: [MATH_STU], delta: 20, reason: '英语加分', subjectCode: 'english' });
    assert(scoreEn.ok === false && scoreEn.reason === 'no-eligible', '英语赋分被拦（no-eligible）', { ok: scoreEn.ok, reason: scoreEn.reason });
    assert(scoreEn.skipped.length === 1 && scoreEn.skipped[0].reason === 'LOCKED', '英语拦截理由 LOCKED（未解锁）', scoreEn.skipped);
    assert(expOf(svc, MATH_STU, 'subj_english') === 0, '被拦后英语经验没被写库', expOf(svc, MATH_STU, 'subj_english'));

    // 语文未解锁 → 赋分按新模型拦住
    const scoreCn = await store.v3Score({ studentIds: [MATH_STU], delta: 5, reason: '语文加分', subjectCode: 'chinese' });
    assert(scoreCn.ok === false && scoreCn.skipped[0].reason === 'LOCKED', '语文未解锁 → 赋分被 LOCKED 拦住', scoreCn && scoreCn.skipped);

    // ---------- 4. 主科能破壳（原本会被 SUBJECT_LOCKED 挡住）----------
    const scoreMath2 = await store.v3Score({ studentIds: [MATH_STU], delta: 30, reason: '数学加到破壳线', subjectCode: 'math' });
    assert(scoreMath2.ok === true && expOf(svc, MATH_STU, 'subj_math') === 50, '数学经验加到 50（破壳线）', expOf(svc, MATH_STU, 'subj_math'));
    const hatch = await store.v3Hatch({ studentId: MATH_STU, subjectCode: 'math', speciesCode: 'dog', nickname: '数学小狗' });
    assert(hatch.ok === true, '★ 主科数学可破壳（不再被学科锁拦截）', hatch);
    const mathPet = petRow(svc, MATH_STU, 'subj_math');
    assert(mathPet.hatched_at !== null && Number(mathPet.visual_stage) >= 1, '库里数学宠物已孵化', { h: mathPet.hatched_at, st: mathPet.visual_stage });

    // SQLite 侧同一规则（preload/IPC 走这里）
    assert(svc.checkSubjectUnlock(MATH_STU, 'math', MATH_CLASS).allowed === true, 'checkSubjectUnlock 对主科放行', svc.checkSubjectUnlock(MATH_STU, 'math', MATH_CLASS));
    assert(svc.checkSubjectUnlock(MATH_STU, 'english', MATH_CLASS).allowed === false, 'checkSubjectUnlock 对英语仍按链式拦截', svc.checkSubjectUnlock(MATH_STU, 'english', MATH_CLASS));

    // ---------- 5. 老班级（default_subject_id 为空）：行为与改动前一致 ----------
    const LEGACY = 'c_legacy_null_test';
    svc.execute("INSERT OR REPLACE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at) VALUES (?, 't_legacy', '实验小学本部', '老班级', '老班级', NULL, 20, 0, 0)", [LEGACY]);
    const LEGACY_STU = 'st_legacy_01';
    const savedL = svc.saveStudent({ id: LEGACY_STU, student_no: '92', name: '老班甲', group: 1, pets: {} }, LEGACY);
    assert(savedL && savedL.success === true, '老班级新增学生成功', savedL);
    assert(svc.getClassDefaultSubject(LEGACY) === 'chinese', '老班级（default_subject_id 空）主科回落语文', svc.getClassDefaultSubject(LEGACY));

    useAccount(LEGACY, '语文');
    store = await mkStore();
    const vmL = await store.getV3ViewModel();
    assert(vmL.ok === true && vmL.defaultSubject === 'chinese', '老班级 VM 的 defaultSubject=chinese', { ok: vmL.ok, d: vmL.defaultSubject });
    const stuL = vmL.students.filter(s => s.id === LEGACY_STU)[0];
    assert(!!stuL && stuL.petsBySubject.math.unlocked === false, '老班级数学仍然锁着（与改动前一致）', stuL && { u: stuL.petsBySubject.math.unlocked, r: stuL.petsBySubject.math.lockReason });
    assert(/需已解锁学科的宠物升至 Lv\.20 满级/.test(String(stuL.petsBySubject.math.lockReason)), '老班级锁理由按新模型（满级后由老师选择解锁）', stuL.petsBySubject.math.lockReason);
    const scoreLMath = await store.v3Score({ studentIds: [LEGACY_STU], delta: 10, reason: '老班数学加分', subjectCode: 'math' });
    assert(scoreLMath.ok === false && scoreLMath.reason === 'no-eligible' && scoreLMath.skipped[0].reason === 'LOCKED', '老班级数学赋分仍被 LOCKED 拦住', scoreLMath.skipped);
    const scoreLCn = await store.v3Score({ studentIds: [LEGACY_STU], delta: 10, reason: '老班语文加分', subjectCode: 'chinese' });
    assert(scoreLCn.ok === true && expOf(svc, LEGACY_STU, 'subj_chinese') === 10, '老班级语文赋分照旧成功', expOf(svc, LEGACY_STU, 'subj_chinese'));

    // ---------- 清理 ----------
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('种子库未被改动: ' + (fs.statSync(src).mtimeMs === before ? '是' : '否'));
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
