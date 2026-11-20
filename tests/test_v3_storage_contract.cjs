// test_v3_storage_contract.cjs —— 存储契约：数据库唯一真相 / 有库时不写本地镜像 / 老数据一次性迁库
const path = require('path'); const fs = require('fs'); const os = require('os');
const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');
const initSqlJs = require(path.join(projectRoot, 'electron-app', 'node_modules', 'sql.js'));
const { SQLiteService } = require(path.join(projectRoot, 'electron-app', 'sqlite_service.js'));

const storage = {};
global.localStorage = {
    getItem: k => (storage[k] !== undefined ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.BroadcastChannel = class { constructor() {} postMessage() {} close() {} };
global.Audio = class { play() { return Promise.resolve(); } pause() {} };
global.window = { addEventListener: () => {}, localStorage: global.localStorage, BroadcastChannel: global.BroadcastChannel };
let ClassPetStore = null;   // 等 electronAPI 就绪后再 require，贴近真实页面加载顺序

let passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 260) : '')); failed++; } };
const BUSINESS_KEY = /^classpet_(v2_students_data|custom_level_thresholds|custom_stage_levels|custom_behavior_rules)/;
const businessKeys = () => Object.keys(storage).filter(k => BUSINESS_KEY.test(k));

(async () => {
    console.log('== 存储契约：数据库唯一真相 ==');
    const src = path.join(projectRoot, 'database', 'classpet.sqlite');
    const before = fs.statSync(src).mtimeMs;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-store-'));
    const tmpDb = path.join(tmpDir, 'classpet.sqlite');
    fs.copyFileSync(src, tmpDb);
    const SQL = await initSqlJs();
    const svc = new SQLiteService();
    svc.SQL = SQL; svc.db = new SQL.Database(fs.readFileSync(tmpDb)); svc.dbPath = tmpDb; svc.isInitialized = true;
    const bridge = {
        db: {
            loadAllState: c => svc.loadAllState(c), recordScore: p => svc.recordScoreOperation(p),
            undoScore: id => svc.undoOperation(id), hatchPet: p => svc.hatchStudentPet(p),
            saveStudent: (s, c) => svc.saveStudent(s, c), importStudents: (s, c) => svc.importStudents(s, c),
            saveAllStudents: (s, c) => svc.saveAllStudents(s, c),
            saveThresholds: (t, s2, c) => svc.saveThresholds(t, s2, c), saveBehaviorRules: (r, c) => svc.saveBehaviorRules(r, c),
            getClassLedger: (c, f, t) => svc.getClassLedger(c, f, t),
            updateStudentProfile: (id, p, c) => svc.updateStudentProfile(id, p, c),
            restoreClassBackup: (c, p) => svc.restoreClassBackup(c, p),
            query: (s, p) => svc.query(s, p), execute: (s, p) => svc.execute(s, p)
        }
    };

    // ① 有数据库：任何操作都不许写业务镜像
    console.log('\n[1] 有数据库时，localStorage 不许出现业务数据');
    global.window.electronAPI = bridge;
    ClassPetStore = require(path.join(projectRoot, 'electron-app', 'src', 'classpet_core.js')).ClassPetStore;
    let store = new ClassPetStore();
    await new Promise(r => setTimeout(r, 50));
    const vm = await store.getV3ViewModel();
    const id0 = vm.students[0].id;
    await store.v3Score({ studentIds: [id0], delta: 2, reason: '契约测试加分', subjectCode: 'chinese' });
    await store.v3UndoLast();
    await store.v3SaveRules({ rules: [{ id: 'r1', name: '契约规则', points: 1, type: 'positive' }] });
    await store.v3SaveThresholds({ thresholds: [0,15,35,60,90,125,165,210,260,315,375,440,510,585,665,750,840,935,1035,1140,1250], stages: vm.stages });
    assert(businessKeys().length === 0, '构造/赋分/撤销/存规则/存阈值之后，localStorage 没有任何业务键', businessKeys());
    const led = await store.v3Ledger({});
    assert(led.ok === true && led.rows.length > 0, '台账来自数据库（' + led.rows.length + ' 行）');

    // ② 无数据库（浏览器直开/演示）：仍走老本地存储，行为不变
    console.log('\n[2] 无数据库时保留原有本地存储（演示/审计不受影响）');
    delete global.window.electronAPI;
    const demoStore = new ClassPetStore();
    assert(demoStore.students.length === 42, '演示态仍是 42 人内置名单', demoStore.students.length);
    assert(businessKeys().length > 0, '演示态仍写本地存储（老行为不变）', businessKeys());

    // ③ 老数据一次性迁库：空班级 + 本地镜像 -> 导入数据库，然后清掉镜像
    console.log('\n[3] 老版本本机名单一次性迁进数据库');
    Object.keys(storage).forEach(k => delete storage[k]);
    const emptyClass = 'c_migrate_test';
    svc.db.run("INSERT OR IGNORE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at) VALUES (?, 't_x', 'x', '迁库班', '迁库班', 'subj_chinese', 20, 0, 0)", [emptyClass]);
    storage['classpet_current_account'] = JSON.stringify({ id: 'acc_mig', classId: emptyClass, teacherName: '迁库老师', className: '迁库班', subject: '语文' });
    storage['classpet_active_account_id'] = 'acc_mig';
    const legacyRoster = [
        { id: 'st_mig_1', no: '01', name: '迁库甲', group: 1, level: 3, exp: 70, visualStage: 1, isHatched: true, pets: { chinese: { id: 'pet_mig_1', species: 'cat', exp: 70, level: 3, visualStage: 1, isHatched: true }, math: { species: 'egg', exp: 0, level: 0, visualStage: 0 }, english: { species: 'egg', exp: 0, level: 0, visualStage: 0 } } },
        { id: 'st_mig_2', no: '02', name: '迁库乙', group: 2, level: 1, exp: 20, visualStage: 1, isHatched: true, pets: { chinese: { id: 'pet_mig_2', species: 'dog', exp: 20, level: 1, visualStage: 1, isHatched: true }, math: { species: 'egg', exp: 0, level: 0, visualStage: 0 }, english: { species: 'egg', exp: 0, level: 0, visualStage: 0 } } }
    ];
    storage['classpet_v2_students_data_acc_mig'] = JSON.stringify(legacyRoster);
    global.window.electronAPI = bridge;
    store = new ClassPetStore();
    await new Promise(r => setTimeout(r, 120));
    const dbCount = svc.query("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [emptyClass])[0].n;
    assert(dbCount === 2, '本机旧名单已迁入数据库（2 人）', dbCount);
    assert(!storage['classpet_v2_students_data_acc_mig'], '迁库后本地镜像已清理', Object.keys(storage));
    const vm3 = await store.getV3ViewModel();
    assert(vm3.students.length === 2 && vm3.students.some(s => s.name === '迁库甲'), '迁库后 ViewModel 读到这 2 人', vm3.students.map(s => s.name));

    // ④ 演示名单绝不被迁进库
    console.log('\n[4] 42 人演示名单绝不入库');
    Object.keys(storage).forEach(k => delete storage[k]);
    const emptyClass2 = 'c_migrate_demo';
    svc.db.run("INSERT OR IGNORE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at) VALUES (?, 't_x', 'x', '演示班', '演示班', 'subj_chinese', 20, 0, 0)", [emptyClass2]);
    storage['classpet_current_account'] = JSON.stringify({ id: 'acc_demo_302', classId: emptyClass2, teacherName: '刘老师', className: '演示班' });
    storage['classpet_active_account_id'] = 'acc_demo_302';
    store = new ClassPetStore();
    await new Promise(r => setTimeout(r, 120));
    const demoCount = svc.query("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [emptyClass2])[0].n;
    assert(demoCount === 0, '演示名单没有写进空班级（0 行）', demoCount);

    assert(fs.statSync(src).mtimeMs === before, 'database/classpet.sqlite 原件未被修改');
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exitCode = 1;
})().catch(e => { console.error('测试异常:', e); process.exitCode = 1; });
