// test_v3_real_db.cjs —— 用真实 sqlite_service + 真实种子库副本验证 ViewModel（不改动正式库）
// 跑法：node tests/test_v3_real_db.cjs
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
    else { console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 240) : '')); failed++; }
};

(async () => {
    console.log('== 真实库 ViewModel 验收（临时副本，不碰 database/classpet.sqlite 原件）==');
    const src = path.join(projectRoot, 'database', 'classpet.sqlite');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-v3db-'));
    const tmpDb = path.join(tmpDir, 'classpet.sqlite');
    fs.copyFileSync(src, tmpDb);
    const before = fs.statSync(src).mtimeMs;

    const SQL = await initSqlJs();
    const svc = new SQLiteService();
    // 直接用已初始化的库实例（等价于 init(app) 后的状态），指向副本
    svc.SQL = SQL;
    svc.db = new SQL.Database(fs.readFileSync(tmpDb));
    svc.dbPath = tmpDb;
    svc.isInitialized = true;

    // 把真实服务挂成 electronAPI，走与页面完全相同的路径
    global.window.electronAPI = { db: svc };
    const CLASS = 'c_class02_01';

    let store = new ClassPetStore();
    let vm = await store.getV3ViewModel();
    assert(vm.ok === true && vm.reason === 'db', 'VM 从真实库成功构建', vm.reason);
    assert(vm.classId === CLASS, 'classId 取自账号缓存/账号默认，落到真实班级 ' + CLASS, vm.classId);
    assert(vm.students.length > 0, '真实库学生进得来（' + vm.students.length + ' 人）', vm.students.length);
    const raw = svc.query("SELECT COUNT(*) AS n FROM students WHERE class_id = ?", [CLASS])[0].n;
    assert(vm.students.length === raw, 'VM 学生数与库里一致（' + raw + '）', { vm: vm.students.length, db: raw });
    const s0 = vm.students[0];
    assert(typeof s0.id === 'string' && s0.id.length > 0, '学生 id 是字符串', s0.id);
    assert(s0.no === '01' || /^\d+$/.test(s0.no), '学号来自 student_no', s0.no);

    // 与库逐条比对：等级/经验/形态必须能由库里的 exp + 阈值/形态表复算出来
    const pets = svc.query("SELECT * FROM pets WHERE class_id = ?", [CLASS]);
    let mismatch = 0, checked = 0;
    const baseThr = vm.thresholds;
    for (const s of vm.students) {
        for (const code of ['chinese', 'math', 'english']) {
            const dbPet = pets.filter(p => p.student_id === s.id &&
                p.subject_id === (code === 'math' ? 'subj_math' : code === 'english' ? 'subj_english' : 'subj_chinese'))[0];
            const view = s.petsBySubject[code];
            if (!dbPet) { if (view.level !== 0 || view.exp !== 0) mismatch++; continue; }
            checked++;
            let lv = 0;
            for (let l = baseThr.length - 1; l >= 0; l--) { if ((dbPet.exp || 0) >= baseThr[l]) { lv = l; break; } }
            if (view.level !== lv || view.exp !== (dbPet.exp || 0)) mismatch++;
        }
    }
    assert(mismatch === 0, '每只宠物的等级/经验都能由库里 exp + 阈值复算（比对 ' + checked + ' 只）', mismatch);

    // display_pet_id 决定卡片展示宠（D7=A）
    const withDisplay = vm.students.filter(s => s.displayPetId);
    assert(withDisplay.length > 0, 'display_pet_id 已透传（' + withDisplay.length + ' 人）');
    let dAware = 0;
    for (const s of withDisplay) {
        const hit = ['chinese', 'math', 'english'].filter(c => s.petsBySubject[c].petId === s.displayPetId)[0];
        if (hit) dAware++;
    }
    assert(dAware > 0, 'activePet 取 display_pet_id 指向的那只宠物（' + dAware + ' 人可对上）');

    // 真实改库阈值：把 8 级阈值从 260 提到 400，重新加载后等级/下一级阈值必须跟着变
    const opBefore = vm.students[0].petsBySubject.math.level;
    svc.execute("UPDATE class_level_thresholds SET min_exp = 400 WHERE class_id = ? AND level = 8", [CLASS]);
    store = new ClassPetStore();
    const vm2 = await store.getV3ViewModel();
    assert(vm2.thresholds[8] === 400, '改库里的 8 级阈值后 VM 读到 400（批次 0 修复在真实服务上生效）', vm2.thresholds[8]);
    const exp267 = vm2.students.map(s => s.petsBySubject.math).filter(p => p.exp === 267)[0];
    if (exp267) {
        assert(exp267.level === 7, 'exp 267 的宠物在 8 级阈值提到 400 后降为 Lv.7', { before: opBefore, now: exp267.level });
        assert(exp267.nextLevelExp === 400, '下一级阈值同步为 400', exp267.nextLevelExp);
    } else {
        console.log('  (跳过 exp=267 的宠物断言：真实库里没有该经验值)');
    }

    // 空班：真实服务返回空名单 -> VM 空，不注入演示名单
    svc.execute("INSERT OR IGNORE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at) VALUES ('c_empty_test','t_x','x','空班','空班','subj_chinese',20,0,0)");
    storage['classpet_current_account'] = JSON.stringify({ id: 'acc_empty', classId: 'c_empty_test', teacherName: '李老师', className: '空班', subject: '语文' });
    store = new ClassPetStore();
    const vm3 = await store.getV3ViewModel();
    assert(vm3.ok === true && vm3.students.length === 0, '真实库里的空班返回空名单（不注入演示样例）', { ok: vm3.ok, n: vm3.students.length });

    // 正式库原件必须没被动过
    assert(fs.statSync(src).mtimeMs === before, 'database/classpet.sqlite 原件未被修改');
    svc.db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });

    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exitCode = 1;
})().catch(e => { console.error('测试异常:', e); process.exitCode = 1; });
