// test_v3_unit_bounds.cjs —— 批次 6.1 单元测试：阈值换算 / 0~20 边界 / 负分不降级 / 破壳门禁 / 形态阶梯
// 跑法：node tests/test_v3_unit_bounds.cjs
// 只做纯 node 计算 + 真实 SQLiteService 的临时副本；不启动 Electron、不读写 database/classpet.sqlite
const path = require('path');
const fs = require('fs');
const os = require('os');

const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');
const initSqlJs = require(path.join(projectRoot, 'electron-app', 'node_modules', 'sql.js'));
const { SQLiteService } = require(path.join(projectRoot, 'electron-app', 'sqlite_service.js'));
const CORE = path.join(projectRoot, 'electron-app', 'src', 'classpet_core.js');
const SRC_DB = path.join(projectRoot, 'database', 'classpet.sqlite');

let passed = 0, failed = 0;
const assert = (cond, msg, extra) => {
    if (cond) { console.log('  PASS  ' + msg); passed++; }
    else {
        console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 400) : ''));
        failed++;
    }
};

// ---------- 浏览器环境最小桩（不定义 window 时 core 不会自动建实例，便于纯计算） ----------
const storage = {};
global.localStorage = {
    getItem: k => (storage[k] !== undefined ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.BroadcastChannel = class { constructor() {} postMessage() {} close() {} };
global.Audio = class { play() { return Promise.resolve(); } pause() {} };

const loadCore = () => { delete require.cache[require.resolve(CORE)]; return require(CORE); };
const tick = () => new Promise(r => setTimeout(r, 0));

(async () => {
    console.log('== 批次 6.1 单元测试（纯 node，无 Electron，正式库不参与）==');

    // ===================== 1. 阈值换算 =====================
    console.log('\n[1] calcLevel 阈值换算（0/50/150 … 1950 与边界上下 1）');
    const core = loadCore();
    const store = new core.ClassPetStore();

    const thr = store.getLevelThresholds();
    assert(thr.length === 21 && thr[0] === 0 && thr[1] === 50 && thr[20] === 1950,
        '默认阈值表 0~20 级共 21 个数值（L0=0 / L1=50 破壳 / L20=1950）', thr);
    assert(thr[2] - thr[1] === 100 && thr[20] - thr[19] === 100, '每个等级之间默认 100 EXP（负责人指令）', { l1: thr[1], l2: thr[2], l20: thr[20] });

    const boundaryBad = [];
    for (let l = 0; l <= 20; l++) {
        const at = store.calcLevel(thr[l]);
        if (at !== l) boundaryBad.push({ level: l, exp: thr[l], expect: l, got: at });
        if (l > 0) {
            const below = store.calcLevel(thr[l] - 1);
            if (below !== l - 1) boundaryBad.push({ level: l, exp: thr[l] - 1, expect: l - 1, got: below });
        }
        if (l < 20) {
            const upperBelow = store.calcLevel(thr[l + 1] - 1);
            if (upperBelow !== l) boundaryBad.push({ level: l, exp: thr[l + 1] - 1, expect: l, got: upperBelow });
        }
    }
    assert(boundaryBad.length === 0, '每个阈值点 + 阈值上下 1 的 calcLevel 全部落在正确等级（共 61 个取样点）', boundaryBad);
    assert(store.calcLevel(0) === 0 && store.calcLevel(-5) === 0, 'exp=0 与负 exp 都落在 Lv.0', { zero: store.calcLevel(0), neg: store.calcLevel(-5) });

    // ===================== 2. getExpProgress 三段 =====================
    console.log('\n[2] getExpProgress：蛋态 / 普通级 / 满级三段边界');
    const egg0 = store.getExpProgress(0, 0, false);
    assert(egg0.isEgg === true && egg0.percent === 0 && egg0.needExp === 50 && egg0.levelNextExp === 50,
        '蛋态 exp=0：percent=0 / needExp=50 / 目标=破壳阈值 50', egg0);
    const egg7 = store.getExpProgress(7, 0, false);
    assert(egg7.percent === 14 && egg7.needExp === 43 && egg7.progressInLevel === 7,
        '蛋态 exp=7：percent=14（7/50）/ 还差 43', egg7);
    const egg14 = store.getExpProgress(49, 0, false);
    assert(egg14.percent === 98 && egg14.needExp === 1, '蛋态 exp=49：percent=98 / 还差 1（破壳门槛 50）', egg14);
    const egg15 = store.getExpProgress(50, 0, false);
    assert(egg15.isEgg === true && egg15.percent === 100 && egg15.needExp === 0,
        '未孵化但 exp 已达 50：蛋态 percent 封顶 100、needExp=0（仍等破壳）', egg15);
    assert(egg15.levelNextExp === thr[1], '蛋态进度按破壳阈值（LEVEL_THRESHOLDS[1]）计算，不是普通级阈值', egg15.levelNextExp);

    const lv1a = store.getExpProgress(50, 1, true);
    assert(lv1a.isEgg === false && lv1a.levelMinExp === 50 && lv1a.levelNextExp === 150 && lv1a.levelSpan === 100 &&
        lv1a.percent === 0 && lv1a.needExp === 100,
        '普通级 Lv.1 exp=50：本级区间 50→150、percent=0、needExp=100', lv1a);
    const lv1b = store.getExpProgress(70, 1, true);
    assert(lv1b.progressInLevel === 20 && lv1b.percent === 20 && lv1b.needExp === 80,
        '普通级 Lv.1 exp=70：本级进度 20/100 → 20%、needExp=80', lv1b);
    const lv1c = store.getExpProgress(51, 1, true);
    assert(lv1c.percent >= 1 && lv1c.needExp === 99, '普通级 Lv.1 exp=51：进度 1/100、needExp=99', lv1c);
    const lv1d = store.getExpProgress(149, 1, true);
    assert(lv1d.percent === 99 && lv1d.needExp === 1, '普通级 Lv.1 exp=149（150 的前一级）：percent=99 / needExp=1', lv1d);
    const lv2 = store.getExpProgress(150, 2, true);
    assert(lv2.levelMinExp === 150 && lv2.levelNextExp === 250 && lv2.levelSpan === 100 && lv2.percent === 0 && lv2.needExp === 100,
        '普通级 Lv.2 exp=150：本级区间 150→250、percent=0、needExp=100', lv2);
    assert(store.getExpProgress(10, 0, true).isEgg === true,
        'isHatched=true 但 level=0 时仍按蛋态呈现（0 级 = 蛋形态，core 既有契约）', store.getExpProgress(10, 0, true));

    const max = store.getExpProgress(1950, 20, true);
    assert(max.isMax === true && max.percent === 100 && max.needExp === 0 && max.levelSpan === 0 && max.levelMinExp === 1950,
        '满级 Lv.20 exp=1950：percent=100 / needExp=0 / 区间跨度 0', max);
    const max2 = store.getExpProgress(999999, 20, true);
    assert(max2.isMax === true && max2.percent === 100 && max2.needExp === 0 && max2.totalExp === 999999,
        '满级 Lv.20 exp=999999：依旧 percent=100 / needExp=0（封顶不溢出）', max2);

    // ===================== 3. 0~20 边界（等级封顶） =====================
    console.log('\n[3] 0~20 边界：等级封顶 20、经验 0 与极大值');
    assert(store.calcLevel(1950) === 20 && store.calcLevel(1949) === 19, '阈值点 1950 → Lv.20、1949 → Lv.19', { a: store.calcLevel(1950), b: store.calcLevel(1949) });
    assert(store.calcLevel(999999) === 20, 'exp=999999 等级封顶在 Lv.20（不越界）', store.calcLevel(999999));
    assert(store.calcLevel(1e12) === 20 && store.calcLevel(0) === 0, 'exp=1e12 仍封顶 20 / exp=0 为 Lv.0', { big: store.calcLevel(1e12) });
    const cap = store.getExpProgress(999999, store.calcLevel(999999), true);
    assert(cap.level === 20 && cap.percent === 100 && cap.needExp === 0, '封顶后的进度对象仍是满级态（percent=100 / needExp=0）', cap);

    // ===================== 4. 负分不降级（真实服务 + 临时副本） =====================
    console.log('\n[4] 负分不降级：真服务写入临时副本（正式库只读）');
    const srcMtime = fs.statSync(SRC_DB).mtimeMs;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-v3unit-'));
    const tmpDb = path.join(tmpDir, 'classpet.sqlite');
    fs.copyFileSync(SRC_DB, tmpDb);

    const SQL = await initSqlJs();
    const svc = new SQLiteService();
    svc.SQL = SQL; svc.db = new SQL.Database(fs.readFileSync(tmpDb)); svc.dbPath = tmpDb; svc.isInitialized = true;
    const mig = svc.migrateLegacyDefaultThresholds();   // 与真实应用启动一致：旧默认迁移到 50/100
    console.log('  阈值迁移：' + JSON.stringify(mig));

    global.window = {
        addEventListener: () => {},
        localStorage: global.localStorage,
        BroadcastChannel: global.BroadcastChannel
    };
    global.window.electronAPI = {
        db: {
            loadAllState: (classId) => svc.loadAllState(classId),
            recordScore: (payload) => svc.recordScoreOperation(payload),
            undoScore: (opId) => svc.undoOperation(opId),
            hatchPet: (payload) => svc.hatchStudentPet(payload),
            saveStudent: (student, classId) => svc.saveStudent(student, classId),
            saveThresholds: (thresholds, stages, classId) => svc.saveThresholds(thresholds, stages, classId),
            query: (sql, params) => svc.query(sql, params),
            execute: (sql, params) => svc.execute(sql, params)
        }
    };
    const core2 = loadCore();          // window 已就绪，模块会自建一个实例
    const store2 = global.window.classPetRuntime;
    await tick();
    assert(!!store2 && typeof store2.v3Hatch === 'function', '真服务桥接就绪，运行时实例可用');

    const CLASS = 'c_class02_01';
    const STU_A = 'st_b6_unit_a';
    const STU_B = 'st_b6_unit_b';
    svc.saveStudent({ id: STU_A, student_no: '91', name: '单元甲', group: 1, pets: {} }, CLASS);
    svc.saveStudent({ id: STU_B, student_no: '92', name: '单元乙', group: 1, pets: {} }, CLASS);
    const petRow = (id, subId) => svc.query('SELECT * FROM pets WHERE student_id = ? AND subject_id = ?', [id, subId])[0];
    assert(petRow(STU_A, 'subj_chinese').species_code === 'egg' && Number(petRow(STU_A, 'subj_chinese').exp) === 0,
        '准备的单元甲语文宠是 0 EXP 的蛋');

    // ---------- 4.1 破壳门禁：经验不足 ----------
    let h = await store2.v3Hatch({ studentId: STU_A, subjectCode: 'chinese', speciesCode: 'cat' });
    assert(h.ok === false && h.reason === 'exp-insufficient' && h.need === 50 && h.current === 0,
        '门禁①：经验 0 < 50 被拒（exp-insufficient），带 need/current 具体值', h);
    let hs = svc.hatchStudentPet({ classId: CLASS, studentId: STU_A, subjectCode: 'chinese', speciesCode: 'cat' });
    assert(hs.success === false && /^EXP_NOT_ENOUGH/.test(String(hs.error)),
        '门禁①服务层：hatchStudentPet 直接返回 EXP_NOT_ENOUGH', hs);
    assert(petRow(STU_A, 'subj_chinese').species_code === 'egg', '门禁①被拒后库里仍是蛋（不写库）');

    // ---------- 4.2 破壳门禁：学科未解锁 ----------
    h = await store2.v3Hatch({ studentId: STU_A, subjectCode: 'math', speciesCode: 'dog' });
    assert(h.ok === false && h.reason === 'locked', '门禁②：数学未解锁（语文未满级）被拒（locked）', h);
    // 服务层检查顺序是「经验 → 解锁」，所以先把数学经验抬到达标，才能单独验证 SUBJECT_LOCKED
    svc.execute("UPDATE pets SET exp = 50 WHERE student_id = ? AND subject_id = 'subj_math'", [STU_A]);   // 新默认：数学破壳门槛 50
    hs = svc.hatchStudentPet({ classId: CLASS, studentId: STU_A, subjectCode: 'math', speciesCode: 'dog' });
    assert(hs.success === false && /^SUBJECT_LOCKED/.test(String(hs.error)),
        '门禁②服务层：经验达标但语文未满级时 hatchStudentPet 返回 SUBJECT_LOCKED', hs);

    // ---------- 4.3 经验达标且已解锁 → 允许 ----------
    // ★ 关键回归（负责人 2026-11-20 反馈）：小分加分不得把蛋"抬成"已破壳
    const small = await store2.v3Score({ studentIds: [STU_A], delta: 5, reason: '只加 5 分', subjectCode: 'chinese' });
    const after5 = petRow(STU_A, 'subj_chinese');
    assert(small.ok === true && Number(after5.exp) === 5, '加 5 分后经验为 5', after5.exp);
    assert(after5.species_code === 'egg' && Number(after5.visual_stage) === 0,
        '加 5 分后仍是蛋：物种=egg、形态阶段=0（不会被抬到 stage1 冒充孵化）', { sp: after5.species_code, st: after5.visual_stage });
    const vmMid = await store2.getV3ViewModel();
    const midStu = vmMid.students.filter(s => s.id === STU_A)[0];
    assert(midStu.petsBySubject.chinese.isEgg === true && midStu.petsBySubject.chinese.eggImage !== false,
        'ViewModel 仍判为蛋形态', { isEgg: midStu.petsBySubject.chinese.isEgg, img: midStu.petsBySubject.chinese.image });
    const h5 = await store2.v3Hatch({ studentId: STU_A, subjectCode: 'chinese', speciesCode: 'cat' });
    assert(h5.ok === false && h5.reason === 'exp-insufficient', '5 经验时点破壳被拒（不会"加 5 分就孵化"）', h5);

    const sc = await store2.v3Score({ studentIds: [STU_A], delta: 45, reason: '补到破壳线', subjectCode: 'chinese' });
    assert(sc.ok === true && !!sc.operationId, '门禁③前置：语文再 +45 落库（合计 50）', sc);
    const at50 = petRow(STU_A, 'subj_chinese');
    assert(Number(at50.exp) === 50, '经验达标 = 破壳阈值 50', at50.exp);
    assert(at50.species_code === 'egg' && Number(at50.visual_stage) === 0 && !at50.hatched_at,
        '★ 到 50 经验也不会自动孵化：仍是蛋、stage=0、hatched_at 为空（必须由用户点破壳）',
        { sp: at50.species_code, st: at50.visual_stage, hatched: at50.hatched_at });
    const vmAt50 = await store2.getV3ViewModel();
    const stuAt50 = vmAt50.students.filter(s => s.id === STU_A)[0];
    assert(stuAt50.petsBySubject.chinese.isEgg === true, '50 经验时 ViewModel 仍显示为蛋', stuAt50.petsBySubject.chinese.isEgg);
    h = await store2.v3Hatch({ studentId: STU_A, subjectCode: 'chinese', speciesCode: 'cat', nickname: '单元小猫' });
    assert(h.ok === true && h.subjectCode === 'chinese', '门禁③：经验达标 + 学科已解锁 → 破壳放行', h);
    const hatchedRow = petRow(STU_A, 'subj_chinese');
    assert(!!hatchedRow.hatched_at, '破壳后写入显式孵化标记 hatched_at', hatchedRow.hatched_at);
    assert(hatchedRow.species_code === 'cat' && Number(hatchedRow.visual_stage) >= 1,
        '门禁③放行后库里写入物种与形态（cat / stage>=1）', { sp: hatchedRow.species_code, st: hatchedRow.visual_stage });

    // ---------- 4.4 破壳门禁：已破壳 ----------
    h = await store2.v3Hatch({ studentId: STU_A, subjectCode: 'chinese', speciesCode: 'dog' });
    assert(h.ok === false && h.reason === 'already-hatched', '门禁④：已破壳再破壳被拒（already-hatched）', h);
    hs = svc.hatchStudentPet({ classId: CLASS, studentId: STU_A, subjectCode: 'chinese', speciesCode: 'dog' });
    assert(hs.success === false && /^ALREADY_HATCHED/.test(String(hs.error)),
        '门禁④服务层：hatchStudentPet 直接返回 ALREADY_HATCHED', hs);
    assert(petRow(STU_A, 'subj_chinese').species_code === 'cat', '门禁④被拒后物种没被改写（仍是 cat）');

    // ---------- 4.5 破壳门禁：学生缺勤 ----------
    h = await store2.v3Hatch({ studentId: STU_B, subjectCode: 'chinese', speciesCode: 'cat', isAbsent: true });
    assert(h.ok === false && h.reason === 'absent', '门禁⑤：学生缺勤时破壳被拒（absent）', h);
    assert(petRow(STU_B, 'subj_chinese').species_code === 'egg', '门禁⑤被拒后单元乙的语文仍是蛋');

    // ---------- 4.6 负分不降级 ----------
    const before = petRow(STU_A, 'subj_chinese');
    const up = await store2.v3Score({ studentIds: [STU_A], delta: 110, reason: '单元测试跨级加分', subjectCode: 'chinese' });
    assert(up.ok === true, '负分不降级前置：再 +110 跨级（50→150）', up);
    const afterUp = petRow(STU_A, 'subj_chinese');
    assert(Number(afterUp.exp) === Number(before.exp) + 110 && Number(afterUp.level) > Number(before.level),
        '加分后经验与等级都上升（跨到下一级）', { expBefore: before.exp, exp: afterUp.exp, lvBefore: before.level, lv: afterUp.level });
    const down = await store2.v3Score({ studentIds: [STU_A], delta: -200, reason: '单元测试大额扣分', subjectCode: 'chinese' });
    assert(down.ok === true, '大额扣分本身成功（不报错）', down);
    const afterDown = petRow(STU_A, 'subj_chinese');
    assert(Number(afterDown.exp) === 0, '扣分跨过 0 时经验夹到 0，绝不为负', { exp: afterDown.exp, delta: -200 });
    assert(Number(afterDown.level) === Number(afterUp.level) && Number(afterDown.level) > 0,
        '扣分不降级：等级保持扣分前（不回到 Lv.0）', { lvBefore: afterUp.level, lvAfter: afterDown.level });
    assert(Number(afterDown.visual_stage) >= 1, '扣分不回退形态：visual_stage 仍 >= 1（不是蛋）', afterDown.visual_stage);
    assert(store2.calcLevel(0) === 0 && store2.calcLevel(0, Number(afterDown.level)) === Number(afterDown.level),
        'core 侧同一不变量：calcLevel(0, 当前等级) 不降级', { plain: store2.calcLevel(0), guarded: store2.calcLevel(0, Number(afterDown.level)) });

    // ===================== 5. 形态阶梯（只升不降） =====================
    console.log('\n[5] STAGE_MIN_LEVELS 形态阶梯：minLevel 调整后只升不降');
    const stageList = store2.getStageMinLevels();
    assert(stageList.length === 6 && stageList[5].minLevel === 20, '默认形态阶梯 6 段（stage5 需 Lv.20）', stageList);
    const ladderBad = [];
    const expectStage = { 0: 0, 1: 1, 3: 1, 4: 2, 7: 2, 8: 3, 12: 3, 13: 4, 19: 4, 20: 5 };
    Object.keys(expectStage).forEach(lv => {
        const got = store2.calcVisualStage(Number(lv));
        if (got !== expectStage[lv]) ladderBad.push({ level: Number(lv), expect: expectStage[lv], got });
    });
    assert(ladderBad.length === 0, '默认阶梯 0/1/3/4/7/8/12/13/19/20 级对应阶段全部正确', ladderBad);
    assert(store2.calcVisualStage(0, 5) === 5 && store2.calcVisualStage(2, 3) === 3,
        '已获得形态保底：calcVisualStage(低等级, 已达成 5/3 阶段) 不回退', { a: store2.calcVisualStage(0, 5), b: store2.calcVisualStage(2, 3) });

    const raised = stageList.map(st => ({ stage: st.stage, minLevel: [0, 1, 5, 10, 15, 20][st.stage], code: st.code, name: st.name }));
    const saved = store2.saveLevelThresholds(store2.getLevelThresholds(), raised);
    assert(saved && saved.success === true, '把 stage2/3/4 的 minLevel 上调到 5/10/15 成功（写库 + 写缓存）', saved);
    assert(store2.calcVisualStage(4) === 1, '阶梯上调后按新阶梯重算：4 级只对应 stage1（重算可低于历史形态）', store2.calcVisualStage(4));
    assert(store2.calcVisualStage(4, 2) === 2, '阶梯上调 + 已获得 stage2 → 仍是 stage2（只升不降的对外契约）', store2.calcVisualStage(4, 2));
    assert(store2.calcVisualStage(9, 3) === 3 && store2.calcVisualStage(9) === 2,
        '9 级在新阶梯下重算为 stage2，但已获得 stage3 时保留 stage3', { guarded: store2.calcVisualStage(9, 3), plain: store2.calcVisualStage(9) });

    store2.resetLevelThresholds();
    assert(store2.getStageMinLevels()[2].minLevel === 4 && store2.calcVisualStage(4) === 2,
        '恢复默认阶梯后 4 级重新对应 stage2（复位可用）', store2.getStageMinLevels());

    // ===================== 收尾 =====================
    assert(fs.statSync(SRC_DB).mtimeMs === srcMtime, 'database/classpet.sqlite 原件未被修改（全程只用临时副本）');
    if (svc.saveTimer) clearTimeout(svc.saveTimer);   // 停掉防抖落盘，避免收尾后写已删除的临时目录
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exitCode = 1;
})().catch(e => { console.error('单元测试异常:', e); process.exitCode = 1; });
