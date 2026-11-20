// test_v3_integration.cjs —— 批次 6.2 集成测试：幂等语义 / 重启一致性 / 撤销后重启 / 阈值写库后重启 / 正式库只读
// 跑法：node tests/test_v3_integration.cjs
// 真实 SQLiteService + 种子库临时副本；每个「重启」= 重新加载 classpet_core.js 模块（模块级阈值表归位）+ 新建 store
// 说明：core 的 this.students 会镜像到 localStorage（classpet_core.js:1652 save()），
//       重启时用 Math.max(内存, 库) 合并并把更高经验回写数据库（classpet_core.js:691-697 / 821-824）。
//       因此「重启」分两种：带缓存（真实用户路径）与清缓存（冷缓存），差异见 [4] 的已知缺陷探针。
const path = require('path');
const fs = require('fs');
const os = require('os');

const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');
const initSqlJs = require(path.join(projectRoot, 'electron-app', 'node_modules', 'sql.js'));
const { SQLiteService } = require(path.join(projectRoot, 'electron-app', 'sqlite_service.js'));
const CORE = path.join(projectRoot, 'electron-app', 'src', 'classpet_core.js');
const SRC_DB = path.join(projectRoot, 'database', 'classpet.sqlite');
const CLASS = 'c_class02_01';
const CACHE_KEYS = ['classpet_v2_students_data_acc_demo_302', 'classpet_v2_students_data'];

let passed = 0, failed = 0, warned = 0;
const assert = (cond, msg, extra) => {
    if (cond) { console.log('  PASS  ' + msg); passed++; }
    else {
        console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 400) : ''));
        failed++;
    }
};
// 已知缺陷：断言当前真实行为、保留证据，但不计成 PASS（避免「失败标记为通过」），单独计数上报
const warn = (msg, extra) => {
    console.log('  WARN  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 400) : ''));
    warned++;
};

// ---------- 浏览器环境桩 ----------
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
const tick = () => new Promise(r => setTimeout(r, 0));

(async () => {
    console.log('== 批次 6.2 集成测试（真服务 + 隔离库副本）==');
    const srcMtime = fs.statSync(SRC_DB).mtimeMs;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-v3int-'));
    const tmpDb = path.join(tmpDir, 'classpet.sqlite');
    fs.copyFileSync(SRC_DB, tmpDb);

    const SQL = await initSqlJs();
    const svc = new SQLiteService();
    svc.SQL = SQL; svc.db = new SQL.Database(fs.readFileSync(tmpDb)); svc.dbPath = tmpDb; svc.isInitialized = true;

    // 与 electron-app/preload.js 暴露的方法名一一对应
    global.window.electronAPI = {
        db: {
            loadAllState: (classId) => svc.loadAllState(classId),
            recordScore: (payload) => svc.recordScoreOperation(payload),
            undoScore: (opId) => svc.undoOperation(opId),
            hatchPet: (payload) => svc.hatchStudentPet(payload),
            saveStudent: (student, classId) => svc.saveStudent(student, classId),
            saveThresholds: (thresholds, stages, classId) => svc.saveThresholds(thresholds, stages, classId),
            saveBehaviorRules: (rules, classId) => svc.saveBehaviorRules(rules, classId),
            getClassLedger: (classId, fromTs, toTs) => svc.getClassLedger(classId, fromTs, toTs),
            query: (sql, params) => svc.query(sql, params),
            execute: (sql, params) => svc.execute(sql, params)
        }
    };

    // 「重启」= 重新加载 core 模块 + 新建 store 实例（模块级 LEVEL_THRESHOLDS / STAGE_MIN_LEVELS 归位）
    const restart = async (opts) => {
        const o = opts || {};
        if (o.clearThresholdCache) {
            delete storage['classpet_custom_level_thresholds'];
            delete storage['classpet_custom_stage_levels'];
        }
        if (o.clearStudentCache) CACHE_KEYS.forEach(k => delete storage[k]);
        delete require.cache[require.resolve(CORE)];
        require(CORE);
        const s = global.window.classPetRuntime;
        await tick();
        await tick();
        return s;
    };
    const petRow = (studentId, subId) => svc.query('SELECT * FROM pets WHERE student_id = ? AND subject_id = ?', [studentId, subId])[0];
    const petExp = (studentId) => Number((petRow(studentId, 'subj_chinese') || {}).exp || 0);
    const opCount = () => svc.query('SELECT COUNT(*) AS n FROM score_operations WHERE class_id = ?', [CLASS])[0].n;
    const cachedExp = (studentId) => {
        try {
            const arr = JSON.parse(storage['classpet_v2_students_data_acc_demo_302'] || '[]');
            const hit = Array.isArray(arr) ? arr.filter(x => x.id === studentId)[0] : null;
            return hit ? Number(hit.exp) : null;
        } catch (e) { return null; }
    };

    // ---------------- 准备 ----------------
    const THR = svc.query("SELECT min_exp FROM class_level_thresholds WHERE class_id = ? ORDER BY level", [CLASS]).map(r => Number(r.min_exp));
    const HATCH = THR[1], L2 = THR[2];    /* 当前库内破壳门槛与二级阈值（默认 50 / 150） */
    const STU = 'st_b6_int_a';
    const STU2 = 'st_b6_int_b';
    assert(svc.saveStudent({ id: STU, student_no: '93', name: '集成甲', group: 2, pets: {} }, CLASS).success === true,
        '准备学生 A（saveStudent 建三科蛋宠）');
    assert(Number(petRow(STU, 'subj_chinese').exp) === 0, '准备的语文宠经验 0');
    let store = await restart();
    let vm = await store.getV3ViewModel();
    assert(vm.ok === true && vm.students.some(s => s.id === STU), '重启后 ViewModel 能读到新学生', { ok: vm.ok, n: vm.students.length });

    // ================= 1. 幂等语义 =================
    console.log('\n[1] 幂等：同一次 v3Score 重复调用产生两笔不同 operationId（非幂等）');
    const opsBefore = opCount();
    const args = { studentIds: [STU], delta: 5, reason: '集成幂等测试', subjectCode: 'chinese' };
    const r1 = await store.v3Score(args);
    const r2 = await store.v3Score(args);
    const opsAfter = opCount();
    assert(r1.ok === true && r2.ok === true, '两次完全相同的 v3Score 都返回成功', { r1: r1.ok, r2: r2.ok });
    assert(!!r1.operationId && !!r2.operationId && r1.operationId !== r2.operationId,
        '两次调用的 operationId 不同（每次都是新流水）', { first: r1.operationId, second: r2.operationId });
    assert(opsAfter === opsBefore + 2, 'score_operations 增加 2 条（重复点击 = 重复赋分）', { before: opsBefore, after: opsAfter });
    assert(petExp(STU) === 10, '经验累加两次 +5 = 10（没有被去重）', petExp(STU));
    const dupRows = svc.query(
        "SELECT id, request_id, points, action_name FROM score_operations WHERE class_id = ? AND action_name = ? ORDER BY created_at ASC, rowid ASC",
        [CLASS, '集成幂等测试']);
    assert(dupRows.length === 2 && dupRows[0].id !== dupRows[1].id && dupRows[0].request_id !== dupRows[1].request_id,
        '库里两笔同文案操作各有独立 id / request_id', dupRows);
    console.log('        依据：sqlite_service.js:336 每次调用生成 op_<Date.now()>_<random>，:343 无条件 INSERT，' +
        'request_id=\'req_\'+now 且表上无唯一约束 → 服务端不做请求去重；防重复点击只能靠界面禁用。');

    // ================= 2. 重启一致性 =================
    console.log('\n[2] 重启一致性：写库后重启，经验/等级/形态与写后一致');
    assert((await store.v3Score({ studentIds: [STU], delta: HATCH - 10, reason: '集成破壳前置', subjectCode: 'chinese' })).ok === true,
        '补到破壳线（' + HATCH + ' EXP）');
    assert((await store.v3Hatch({ studentId: STU, subjectCode: 'chinese', speciesCode: 'cat', nickname: '集成小猫' })).ok === true,
        '破壳成功（cat）');
    const up2 = await store.v3Score({ studentIds: [STU], delta: 5, reason: '集成重启前最后一笔', subjectCode: 'chinese' });
    assert(up2.ok === true, '破壳后再 +5（经验 ' + (HATCH + 5) + '）');
    const petBeforeRestart = petRow(STU, 'subj_chinese');
    assert(Number(petBeforeRestart.exp) === HATCH + 5 && Number(petBeforeRestart.level) === 1 && Number(petBeforeRestart.visual_stage) >= 1,
        '写后库值：exp ' + (HATCH + 5) + ' / level 1 / visual_stage>=1', { exp: petBeforeRestart.exp, lv: petBeforeRestart.level, st: petBeforeRestart.visual_stage });

    store = await restart();
    vm = await store.getV3ViewModel();
    const stVm = vm.students.filter(s => s.id === STU)[0];
    const cnVm = stVm ? stVm.petsBySubject.chinese : null;
    assert(!!cnVm && cnVm.exp === Number(petBeforeRestart.exp), '重启后 VM 经验 = 写后库值（' + (HATCH + 5) + '）', { vm: cnVm && cnVm.exp, db: petBeforeRestart.exp });
    assert(!!cnVm && cnVm.level === Number(petBeforeRestart.level) && cnVm.level === 1,
        '重启后 VM 等级 = 写后库值（Lv.1，' + (HATCH + 5) + ' EXP 落在 ' + HATCH + '~' + L2 + ' 区间）', { vm: cnVm && cnVm.level, db: petBeforeRestart.level });
    assert(!!cnVm && cnVm.visualStage === Number(petBeforeRestart.visual_stage) && cnVm.visualStage >= 1,
        '重启后 VM 形态阶段 = 写后库值（stage>=1，已破壳不回退成蛋）', { vm: cnVm && cnVm.visualStage, db: petBeforeRestart.visual_stage });
    assert(!!cnVm && cnVm.isHatched === true && cnVm.speciesCode === 'cat', '重启后 VM 仍是已破壳的 cat（物种不丢）', cnVm && { sp: cnVm.speciesCode, h: cnVm.isHatched });
    assert(vm.lastOperation && vm.lastOperation.id === up2.operationId,
        '重启后 lastOperation 就是重启前最后一笔', { last: vm.lastOperation && vm.lastOperation.id, expect: up2.operationId });

    // ================= 3. 撤销后重启 =================
    console.log('\n[3] 撤销后重启：该笔不再出现在 lastOperation，经验回到 exp_before');
    const entryOfOp2 = svc.query("SELECT * FROM score_entries WHERE operation_id = ?", [up2.operationId])[0];
    assert(!!entryOfOp2 && Number(entryOfOp2.exp_before) === HATCH && Number(entryOfOp2.exp_after) === HATCH + 5,
        '该笔明细记录 exp_before=' + HATCH + ' / exp_after=' + (HATCH + 5), entryOfOp2 && { b: entryOfOp2.exp_before, a: entryOfOp2.exp_after });
    const undoOk = await store.v3UndoLast({ operationId: up2.operationId });
    assert(undoOk.ok === true && undoOk.operationId === up2.operationId, '撤销最后一笔成功', undoOk);
    assert(petExp(STU) === Number(entryOfOp2.exp_before), '撤销后库里经验立刻回到 exp_before=' + HATCH, petExp(STU));
    const undoneRow = svc.query("SELECT * FROM score_operations WHERE id = ?", [up2.operationId])[0];
    assert(!!undoneRow && !!undoneRow.undone_at, '库里该笔已标记 undone_at（台账可区分）', undoneRow && undoneRow.undone_at);

    // 同一笔第二次撤销必须被拒
    const undoAgainSvc = svc.undoOperation(up2.operationId);
    assert(undoAgainSvc.success === false && /已被撤销/.test(String(undoAgainSvc.error)),
        '服务层第二次撤销被拒：error 含「已被撤销」', undoAgainSvc);
    const undoAgainStore = await store.v3UndoLast({ operationId: up2.operationId });
    assert(undoAgainStore.ok === false && ['not-last', 'no-operation', 'db-failed'].indexOf(undoAgainStore.reason) >= 0,
        'Store 层第二次撤销失败（not-last：它已不是最后一笔）', undoAgainStore);
    assert(petExp(STU) === Number(entryOfOp2.exp_before), '被拒的重复撤销没有再次改数据（经验仍 ' + HATCH + '）', petExp(STU));

    // 清掉陈旧学生缓存后重启 = 以库为准
    store = await restart({ clearStudentCache: true });
    vm = await store.getV3ViewModel();
    const stVm3 = vm.students.filter(s => s.id === STU)[0];
    assert(!vm.lastOperation || vm.lastOperation.id !== up2.operationId,
        '重启后 lastOperation 不再是被撤销的那笔', { last: vm.lastOperation && vm.lastOperation.id, undone: up2.operationId });
    assert(stVm3.petsBySubject.chinese.exp === Number(entryOfOp2.exp_before),
        '重启后 VM 经验 = 撤销后的 exp_before（' + HATCH + '，冷缓存以库为准）', stVm3.petsBySubject.chinese.exp);
    assert(stVm3.petsBySubject.chinese.level === 1 && stVm3.petsBySubject.chinese.isHatched === true,
        '重启后等级/破壳状态仍与库一致（Lv.1 / 已破壳）', { lv: stVm3.petsBySubject.chinese.level, h: stVm3.petsBySubject.chinese.isHatched });

    // ================= 4. 已知缺陷探针（只取证不上报为 PASS） =================
    console.log('\n[4] 撤销后重启不得回潮（撤销结果必须扛得住重启）');
    svc.saveStudent({ id: STU2, student_no: '94', name: '集成乙', group: 2, pets: {} }, CLASS);
    let storeB = await restart();
    await storeB.v3Score({ studentIds: [STU2], delta: HATCH, reason: '回潮探针加分1', subjectCode: 'chinese' });
    await storeB.v3Hatch({ studentId: STU2, subjectCode: 'chinese', speciesCode: 'cat' });
    const probeUp = await storeB.v3Score({ studentIds: [STU2], delta: 5, reason: '回潮探针加分2', subjectCode: 'chinese' });
    storeB = await restart();                       // 重启把 this.students(=20) 写进 localStorage 缓存
    const probeUndo = await storeB.v3UndoLast({ operationId: probeUp.operationId });
    const dbAfterUndo = petExp(STU2);
    storeB = await restart();                       // 再重启：陈旧缓存若还在，会被 Math.max 合并回写
    await new Promise(r => setTimeout(r, 300));     // 等异步回写（db.saveStudent）落库
    const dbAfterRestart = petExp(STU2);
    const vmB = await storeB.getV3ViewModel();
    const stB = vmB.students.filter(s => s.id === STU2)[0];
    assert(probeUndo.ok === true && dbAfterUndo === HATCH, '撤销把经验退回撤销前（库 ' + (HATCH + 5) + ' → ' + HATCH + '）', { undoOk: probeUndo.ok, dbAfterUndo });
    assert(dbAfterRestart === HATCH, '撤销后重启，经验不得被内存缓存回写成撤销前的值（' + HATCH + ' 仍是 ' + HATCH + '）', { dbAfterRestart });
    assert(stB && stB.petsBySubject.chinese.exp === HATCH, '重启后 ViewModel 经验与库一致（' + HATCH + '）', stB && stB.petsBySubject.chinese.exp);


    // ================= 5. 阈值写库后重启 =================
    console.log('\n[5] 阈值写库后重启：新 store 从数据库读到新阈值');
    store = await restart({ clearStudentCache: true });
    vm = await store.getV3ViewModel();
    const base = vm.thresholds.slice();
    assert(base.length === 21 && base[1] === HATCH && base[2] === L2, '当前库内阈值 L1=' + HATCH + ' / L2=' + L2, { l1: base[1], l2: base[2] });
    const changed = base.slice(); changed[1] = HATCH + 10; changed[2] = L2 + 10;
    const sv = await store.v3SaveThresholds({ thresholds: changed, stages: vm.stages });
    assert(sv.ok === true, '保存新阈值（L1=' + (HATCH + 10) + ' / L2=' + (L2 + 10) + '）成功', sv);
    const dbL1 = svc.query("SELECT min_exp FROM class_level_thresholds WHERE class_id = ? AND level = 1", [CLASS])[0];
    assert(dbL1 && Number(dbL1.min_exp) === HATCH + 10, '库里 class_level_thresholds L1 已写成 ' + (HATCH + 10), dbL1);

    store = await restart({ clearThresholdCache: true });   // 清掉 localStorage 阈值缓存：阈值只能来自数据库
    vm = await store.getV3ViewModel();
    assert(vm.thresholds[1] === HATCH + 10 && vm.thresholds[2] === L2 + 10,
        '重启后新 store 读到 L1=' + (HATCH + 10) + ' / L2=' + (L2 + 10) + '（清空 localStorage 阈值缓存后仍成立）', { l1: vm.thresholds[1], l2: vm.thresholds[2] });
    assert(vm.hatchThreshold === HATCH + 10, '重启后破壳阈值跟随 L1 变为 ' + (HATCH + 10), vm.hatchThreshold);

    const restore = await store.v3SaveThresholds({ thresholds: base, stages: vm.stages });
    assert(restore.ok === true, '恢复默认阈值成功', restore);
    store = await restart({ clearThresholdCache: true });
    vm = await store.getV3ViewModel();
    assert(vm.thresholds[1] === HATCH && vm.thresholds[2] === L2 && vm.hatchThreshold === HATCH,
        '再次重启后回到 L1=' + HATCH + ' / L2=' + L2 + '（阈值往返一致）', { l1: vm.thresholds[1], l2: vm.thresholds[2] });

    // ================= 收尾 =================
    assert(fs.statSync(SRC_DB).mtimeMs === srcMtime, 'database/classpet.sqlite 原件未被修改（全程临时副本）');
    if (svc.saveTimer) clearTimeout(svc.saveTimer);
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed' + (warned ? '（另有 ' + warned + ' 项已知缺陷告警，不计入失败）' : ''));
    if (failed > 0) process.exitCode = 1;
})().catch(e => { console.error('集成测试异常:', e); process.exitCode = 1; });
