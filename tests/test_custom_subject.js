// test_custom_subject.js —— 自定义学科（注册选「自定义」填「综合」）：科目是数据驱动的列表，不是写死三科
// 负责人报告的缺陷：注册选自定义填「综合」后进教师台，只显示语文解锁，自定义的「综合」根本不出现。
// 跑法：node tests/test_custom_subject.js
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
const petRows = (svc, studentId) => svc.query("SELECT * FROM pets WHERE student_id = ?", [studentId]);
const petRow = (svc, studentId, subId) => svc.query("SELECT * FROM pets WHERE student_id = ? AND subject_id = ?", [studentId, subId])[0];
const expOf = (svc, studentId, subId) => Number((petRow(svc, studentId, subId) || {}).exp || 0);
const useAccount = (classId, subject) => {
    global.localStorage.setItem('classpet_current_account', JSON.stringify({ id: 't_custom_subject', classId: classId, className: '综合科班', teacherName: '测试老师', subject: subject }));
    global.localStorage.setItem('classpet_active_account_id', 't_custom_subject');
    global.localStorage.setItem('classpet_current_teaching_subject', subject);
};

(async () => {
    console.log('== 自定义学科：科目数据驱动（临时副本，不碰 database/classpet.sqlite）==');
    const src = path.join(projectRoot, 'database', 'classpet.sqlite');
    const before = fs.statSync(src).mtimeMs;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-customsubj-'));
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
            getClassSubjects: (classId) => svc.getClassSubjects(classId),
            addClassSubject: (payload) => svc.addClassSubject(payload && payload.classId, payload && payload.name),
            query: (sql, params) => svc.query(sql, params),
            execute: (sql, params) => svc.execute(sql, params)
        }
    };
    const mkStore = async () => { const s = new ClassPetStore(); await new Promise(r => setTimeout(r, 0)); return s; };

    // ---------- 1. 以「综合」为自定义主科建班：4 个学科，主科是综合，只解锁综合 ----------
    const CLASS = 'c_custom_subject_test';
    const created = svc.createClassWithDefaults({
        classId: CLASS, className: '综合科班', teacherName: '王老师',
        subjectCode: 'custom', subjectLabel: '综合', teacherId: 't_custom_subject'
    });
    assert(created.success === true, '建班成功（主科 = 自定义「综合」）', created);
    assert(created.defaultSubject === 'custom1', '★ 服务层生成的 code 是 custom1', created.defaultSubject);
    assert(created.subjectLabel === '综合', '主科显示名 = 老师填的「综合」', created.subjectLabel);

    const subjects = svc.getClassSubjects(CLASS);
    assert(subjects.length === 4, '★ getClassSubjects 返回 4 项（语文/数学/英语/综合）', subjects);
    assert(same(subjects.map(s => s.code).sort(), ['chinese', 'custom1', 'english', 'math']), '四项 code = chinese/math/english/custom1', subjects.map(s => s.code));
    assert(same(subjects.map(s => s.name).sort(), ['数学', '综合', '英语', '语文'].sort()), '四项 name 含「综合」', subjects.map(s => s.name));
    const customRow = subjects.filter(s => s.code === 'custom1')[0];
    assert(customRow.isPreset === false, '★ 自定义科 is_preset=0（isPreset=false）', customRow);
    assert(customRow.name === '综合', '自定义科 name = 综合', customRow);
    assert(subjects.filter(s => s.isPrimary).length === 1 && subjects.filter(s => s.isPrimary)[0].code === 'custom1', '★ isPrimary 只落在综合上', subjects.filter(s => s.isPrimary));
    assert(subjects[0].code === 'custom1', '★ 排序：主科排第一', subjects.map(s => s.code));
    assert(same(subjects.filter(s => s.unlocked).map(s => s.code), ['custom1']), '★ unlocked 只有综合', subjects.filter(s => s.unlocked).map(s => s.code));
    assert(same(svc.getUnlockedSubjects(CLASS), ['custom1']), '★ class_subject_unlocks 只有 custom1 一行', svc.getUnlockedSubjects(CLASS));
    assert(svc.query("SELECT id, code, name, is_preset FROM subjects WHERE class_id = ? ORDER BY code", [CLASS]).length === 4, '★ subjects 表里插了 4 行（3 预设 + 1 自定义）');
    assert(svc.query("SELECT default_subject_id FROM classes WHERE id = ?", [CLASS])[0].default_subject_id === 'subj_custom1', '★ classes.default_subject_id = subj_custom1');
    assert(svc.loadAllState(CLASS).subjects.length === 4, 'loadAllState 返回值带上 subjects（4 项）');

    // ---------- 2. VM：defaultSubject / subjectUnlocks / subjects ----------
    useAccount(CLASS, '综合');
    let store = await mkStore();
    let vm = await store.getV3ViewModel();
    assert(vm.ok === true, 'ViewModel 读取成功（db）', { reason: vm.reason });
    assert(vm.defaultSubject === 'custom1', '★ VM.defaultSubject === "custom1"', vm.defaultSubject);
    assert(same(vm.subjectUnlocks, ['custom1']), '★ VM.subjectUnlocks === ["custom1"]', vm.subjectUnlocks);
    assert(Array.isArray(vm.subjects) && vm.subjects.length === 4, '★ VM.subjects 有 4 项', vm.subjects);
    const vmCustom = (vm.subjects || []).filter(s => s.code === 'custom1')[0];
    assert(!!vmCustom && vmCustom.name === '综合' && vmCustom.isPreset === false, '★ VM.subjects 里能拿到 name="综合" 的自定义科', vmCustom);
    assert(vmCustom.isPrimary === true && vmCustom.unlocked === true, 'VM 里综合 isPrimary/unlocked 都为 true', vmCustom);
    assert(same((vm.subjects || []).filter(s => s.unlocked).map(s => s.code), ['custom1']), 'VM.subjects 的 unlocked 只有综合');
    assert(vm.subjectCandidates.length === 0, '未满级时 subjectCandidates 为空', vm.subjectCandidates);
    assert(vm.subject === 'custom1' && vm.subjectLabel === '综合', '★ 授课科目「综合」读库后认成 custom1（不再误判成语文）', { subject: vm.subject, label: vm.subjectLabel });

    // ---------- 3. 新建学生：每个学科一行宠物（含 subj_custom1）----------
    const addRes = await store.v3CreateStudent({ no: '01', name: '综合甲', group: 1 });
    assert(addRes.ok === true, '新建学生成功', addRes);
    const STU = addRes.studentId;
    const rows = petRows(svc, STU);
    assert(rows.length === 4, '★ 新建学生有 4 条宠物行', rows.map(r => r.subject_id));
    assert(same(rows.map(r => r.subject_id).sort(), ['subj_chinese', 'subj_custom1', 'subj_english', 'subj_math']), '★ 4 条宠物行的 subject_id 含 subj_custom1', rows.map(r => r.subject_id));
    const customPet = petRow(svc, STU, 'subj_custom1');
    assert(!!customPet && customPet.id === 'pet_' + STU + '_custom1', '★ 自定义科 pets.subject_id=subj_custom1，id 用完整 code 防撞车', customPet && customPet.id);
    assert(customPet.is_display === 1, '★ 主科宠物默认是大屏展示宠', customPet && customPet.is_display);

    // ---------- 4. 对自定义科赋分成功落库；语文被 LOCKED 拦 ----------
    const scoreCustom = await store.v3Score({ studentIds: [STU], delta: 5, reason: '综合课加分', subjectCode: 'custom1' });
    assert(scoreCustom.ok === true, '★ 自定义科赋分成功', scoreCustom);
    assert(expOf(svc, STU, 'subj_custom1') === 5, '★ 经验落库到 subj_custom1', expOf(svc, STU, 'subj_custom1'));
    const scoreByLabel = await store.v3Score({ studentIds: [STU], delta: 3, reason: '按学科名赋分', subjectCode: '综合' });
    assert(scoreByLabel.ok === true && scoreByLabel.subjectCode === 'custom1', '★ 传学科名「综合」也能落到 custom1', scoreByLabel);
    assert(expOf(svc, STU, 'subj_custom1') === 8, '两次加分累计到 subj_custom1', expOf(svc, STU, 'subj_custom1'));
    const scoreCn = await store.v3Score({ studentIds: [STU], delta: 5, reason: '语文加分（应被拦）', subjectCode: 'chinese' });
    assert(scoreCn.ok === false && scoreCn.skipped[0].reason === 'LOCKED', '★ 语文在该班被 LOCKED 拦住', scoreCn.skipped);
    assert(expOf(svc, STU, 'subj_chinese') === 0, '被拦后语文经验没写库', expOf(svc, STU, 'subj_chinese'));
    assert(/【语文】/.test(String(scoreCn.skipped[0].message)), '拦理由里学科名取自学科清单（【语文】）', scoreCn.skipped[0].message);
    const stu = (await store.getV3ViewModel()).students.filter(s => s.id === STU)[0];
    assert(!!stu.petsBySubject.custom1 && stu.petsBySubject.custom1.subjectLabel === '综合', '★ 学生 petsBySubject 里有 custom1，标签=综合', stu.petsBySubject.custom1);
    assert(stu.petsBySubject.custom1.unlocked === true && stu.petsBySubject.chinese.unlocked === false, 'custom1 解锁、chinese 锁定', { c1: stu.petsBySubject.custom1.unlocked, cn: stu.petsBySubject.chinese.unlocked });

    // ---------- 5. 老师把「综合」练到满级 → 语文/数学/英语成为候选 ----------
    const toMax = await store.v3Score({ studentIds: [STU], delta: 1942, reason: '综合刷到满级', subjectCode: 'custom1' });
    assert(toMax.ok === true, '综合科继续加分到满级', toMax);
    assert(Number(petRow(svc, STU, 'subj_custom1').level) === 20, '库里综合宠物到 Lv.20', petRow(svc, STU, 'subj_custom1').level);
    vm = await store.getV3ViewModel();
    assert(same(vm.subjectCandidates, ['chinese', 'math', 'english']), '★ 综合满级后 subjectCandidates = 语文/数学/英语', vm.subjectCandidates);
    assert(same(vm.subjectUnlocks, ['custom1']), '★ 只是候选：subjectUnlocks 仍是 ["custom1"]（不自动解锁）', vm.subjectUnlocks);
    const stuMax = vm.students.filter(s => s.id === STU)[0];
    assert(/已满足解锁条件/.test(String(stuMax.petsBySubject.chinese.lockReason)), '候选学科的锁理由变成"等老师选择解锁"', stuMax.petsBySubject.chinese.lockReason);
    const unlockCn = await store.v3UnlockSubject({ subjectCode: 'chinese' });
    assert(unlockCn.ok === true && same(unlockCn.unlocked, ['custom1', 'chinese']), '★ 老师选解锁语文成功（集合 = custom1 + chinese）', unlockCn);
    const scoreCn2 = await store.v3Score({ studentIds: [STU], delta: 4, reason: '语文已解锁加分', subjectCode: 'chinese' });
    assert(scoreCn2.ok === true && expOf(svc, STU, 'subj_chinese') === 4, '解锁后语文可赋分', { ok: scoreCn2.ok, exp: expOf(svc, STU, 'subj_chinese') });

    // ---------- 6. 老师后来再加自定义科：addClassSubject 只插行、不解锁 ----------
    const expBeforeAdd = expOf(svc, STU, 'subj_custom1');
    const added = svc.addClassSubject(CLASS, '科学');
    assert(added.success === true && added.subject.code === 'custom2' && added.subject.name === '科学', '★ addClassSubject 生成 custom2', added);
    assert(added.subject.unlocked === false && same(svc.getUnlockedSubjects(CLASS), ['custom1', 'chinese']), '★ 新增自定义科不解锁', svc.getUnlockedSubjects(CLASS));
    const afterAdd = svc.getClassSubjects(CLASS);
    assert(afterAdd.length === 5 && afterAdd.filter(s => s.code === 'custom2')[0].isPreset === false, 'getClassSubjects 变成 5 项且 custom2 是自定义科', afterAdd);
    assert(petRows(svc, STU).length === 5 && expOf(svc, STU, 'subj_custom2') === 0, '★ 新增学科给班里每个学生补了一条蛋态宠物行（原有经验不动）', { rows: petRows(svc, STU).length, exp: expOf(svc, STU, 'subj_custom2') });
    assert(expOf(svc, STU, 'subj_custom1') === expBeforeAdd, '补行不影响已攒的经验', { before: expBeforeAdd, after: expOf(svc, STU, 'subj_custom1') });
    assert(afterAdd[0].code === 'custom1' && afterAdd[1].isPreset === true, '排序：主科第一，其余预设在前、自定义在后', afterAdd.map(s => s.code));
    assert(svc.addClassSubject(CLASS, '  ').success === false, '空名被拒（MISSING_NAME）');
    assert(svc.createClassWithDefaults({ classId: 'c_custom_subject_test_2', className: '第二综合班', subjectCode: 'custom', subjectLabel: '综合' }).defaultSubject === 'custom1', '另一个班的自定义科也从 custom1 起算（班内唯一，不串班）');

    // ---------- 7. 老班级（只有三科）行为不变 ----------
    const LEGACY = 'c_class02_01';
    const legacySubjects = svc.getClassSubjects(LEGACY);
    assert(legacySubjects.length === 3, '★ 老班级 getClassSubjects 返回 3 项', legacySubjects);
    assert(same(legacySubjects.map(s => s.code), ['chinese', 'math', 'english']), '老班级仍是语文/数学/英语', legacySubjects.map(s => s.code));
    assert(legacySubjects[0].isPrimary === true && legacySubjects[0].unlocked === true, '老班级语文是主科且已解锁', legacySubjects[0]);
    assert(legacySubjects.every(s => s.isPreset === true), '老班级三项都是预设科', legacySubjects.map(s => s.isPreset));
    assert(svc.getClassDefaultSubject(LEGACY) === 'chinese', '老班级 defaultSubject 仍是 chinese');
    useAccount(LEGACY, '语文');
    const legacyStore = await mkStore();
    const vmL = await legacyStore.getV3ViewModel();
    assert(vmL.ok === true && vmL.defaultSubject === 'chinese', '老班级 VM.defaultSubject = chinese', vmL.defaultSubject);
    assert(vmL.subjects.length === 3 && same(vmL.subjects.map(s => s.code), ['chinese', 'math', 'english']), '老班级 VM.subjects 只有三科', vmL.subjects && vmL.subjects.map(s => s.code));
    assert(same(vmL.subjectUnlocks, ['chinese']), '老班级 subjectUnlocks 仍是 ["chinese"]', vmL.subjectUnlocks);
    const legacyStu = vmL.students.filter(s => s.id === 'st_01')[0];
    assert(!!legacyStu && Object.keys(legacyStu.petsBySubject).length === 3, '老班级学生宠物视图仍是三科', legacyStu && Object.keys(legacyStu.petsBySubject));
    const legacyScore = await legacyStore.v3Score({ studentIds: ['st_01'], delta: 5, reason: '老班语文照旧', subjectCode: 'chinese' });
    assert(legacyScore.ok === true, '★ 老班级语文赋分照旧成功（原功能不受影响）', legacyScore);

    // ---------- 清理 ----------
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('种子库未被改动: ' + (fs.statSync(src).mtimeMs === before ? '是' : '否'));
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
