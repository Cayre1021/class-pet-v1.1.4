// test_teacher_threshold_change.cjs —— 教师日常路径 ⑤：改每级步长为 200 并重启
// 断言：保存后库里/页面一致，重启后仍是 200 步长；越界与非单调输入必须被拒且不改库
// 跑法：node tests/test_teacher_threshold_change.cjs
const { createHarness } = require('./test_teacher__harness.cjs');

const STEP = 200;
// 与 v3_teacher_desk.html:2784 buildRealThresholds 同一算法：L0=0，L1=当前破壳门槛，之后每级 +步长
const buildRealThresholds = (base, step) => {
    const out = [0, base];
    for (let n = 2; n <= 20; n++) out[n] = out[n - 1] + step;
    return out;
};

const h = createHarness();

h.runMain('教师日常路径 ⑤ 阈值改动：步长改 200 -> 重启 -> 库与页面一致', async () => {
    await h.boot();
    const CLASS = 'c_teach_thr';
    h.svc.createClassWithDefaults({ classId: CLASS, className: '教学阈值班', teacherName: '刘老师' });
    h.seedClass(CLASS, 2);
    h.setAccount({ id: 'acc_teach_thr', classId: CLASS });
    h.setSubject('chinese');
    await h.store.loadFromSQLite();
    const X = 'st_t_' + CLASS + '_01';

    // ---------- 1. 改之前的默认值 ----------
    console.log('\n[1] 默认阈值：破壳 50 / 每级 +100');
    const vm0 = await h.viewModel();
    const thr0 = vm0.thresholds;
    h.assert(thr0.length === 21 && thr0[1] === 50 && thr0[2] === 150 && thr0[20] === 1950,
        '改之前页面阈值是 0/50/150…1950（21 级）', thr0);
    h.assert(JSON.stringify(h.thresholdsInDb()) === JSON.stringify(thr0), '改之前库与页面阈值一致', h.thresholdsInDb());
    const s50 = await h.store.v3Score({ studentIds: [X], delta: 50, reason: '到破壳线', subjectCode: 'chinese' });
    const hat = await h.store.v3Hatch({ studentId: X, subjectCode: 'chinese', speciesCode: 'cat' });
    const s200 = await h.store.v3Score({ studentIds: [X], delta: 200, reason: '再到 250 EXP', subjectCode: 'chinese' });
    h.assert(s50.ok && hat.ok && s200.ok && Number(h.pet(X, 'subj_chinese').exp) === 250,
        '准备好一名已破壳、250 EXP 的学生', { ok: [s50.ok, hat.ok, s200.ok], exp: h.pet(X, 'subj_chinese').exp, reason: hat.reason });
    const vmBefore = await h.viewModel();
    const stuBefore = vmBefore.students.filter(s => s.id === X)[0];
    h.assert(stuBefore.petsBySubject.chinese.isHatched === true && stuBefore.petsBySubject.chinese.level === 3 && stuBefore.petsBySubject.chinese.needExp === 100,
        '默认阈值下 250 EXP = Lv.3，还差 100 EXP 升级', { lv: stuBefore.petsBySubject.chinese.level, need: stuBefore.petsBySubject.chinese.needExp });

    // ---------- 2. 把每级步长改成 200 并保存 ----------
    console.log('\n[2] 老师把"每级递增步长"改成 200 并保存');
    const want = buildRealThresholds(50, STEP);
    const saved = await h.store.v3SaveThresholds({ thresholds: want, stages: vm0.stages });
    h.assert(saved.ok === true && saved.classId === CLASS, '保存阈值成功并落在本班', saved);
    const dbThr = h.thresholdsInDb();
    h.assert(JSON.stringify(dbThr) === JSON.stringify(want),
        '库里 21 级阈值就是 0/50/250/450…（L1 仍是破壳门槛 50，之后每级 +200）', dbThr);
    h.warn('v3SaveThresholds 只写库、不刷新内存 LEVEL_THRESHOLDS；页面靠随后一次 getV3ViewModel/v3Refresh 同步');
    const vm1 = await h.viewModel();
    h.assert(JSON.stringify(vm1.thresholds) === JSON.stringify(want), '保存后页面立即读到新阈值', vm1.thresholds);
    h.assert(JSON.stringify(h.store.getLevelThresholds()) === JSON.stringify(want), '刷新后内存里的阈值也同步成新的', h.store.getLevelThresholds());
    h.assert(vm1.hatchThreshold === 50, '破壳门槛仍是 50（改步长不会改破壳线）', vm1.hatchThreshold);

    const stu1 = vm1.students.filter(s => s.id === X)[0];
    h.assert(stu1.petsBySubject.chinese.level === 2,
        '按新步长重算：250 EXP = Lv.2（L2 阈值 250）', stu1.petsBySubject.chinese.level);
    h.assert(stu1.petsBySubject.chinese.needExp === 200 && stu1.petsBySubject.chinese.nextLevelExp === 450,
        '本级进度按新步长算：还差 200 EXP 到 Lv.3（450）', { need: stu1.petsBySubject.chinese.needExp, next: stu1.petsBySubject.chinese.nextLevelExp });
    h.assert(stu1.petsBySubject.chinese.percent === 0, '刚好处在 Lv.2 起点：本级进度 0%', stu1.petsBySubject.chinese.percent);
    h.warn('库里 pets.level 仍是改阈值前的 3，页面按新阈值显示 2（页面不读 pets.level，用 exp + 阈值现算）');
    h.assert(Number(h.pet(X, 'subj_chinese').exp) === 250, '改阈值不动学生的经验值（250 仍是 250）', h.pet(X, 'subj_chinese').exp);

    // ---------- 3. 重启后仍然一致 ----------
    console.log('\n[3] 重启后（"改完阈值重启失效"的回归点）');
    await h.restart();
    h.setAccount({ id: 'acc_teach_thr', classId: CLASS });
    h.setSubject('chinese');
    h.assert(JSON.stringify(h.store.getLevelThresholds()) === JSON.stringify(want),
        '重启后内存阈值仍是 200 步长（不会被代码默认值覆盖）', h.store.getLevelThresholds());
    const vmR = await h.viewModel();
    h.assert(JSON.stringify(vmR.thresholds) === JSON.stringify(want), '重启后页面读到的阈值仍是 200 步长', vmR.thresholds);
    h.assert(JSON.stringify(h.thresholdsInDb()) === JSON.stringify(vmR.thresholds),
        '重启后库里阈值与页面阈值完全一致（逐级比对 21 个数值）', { db: h.thresholdsInDb(), page: vmR.thresholds });
    const stuR = vmR.students.filter(s => s.id === X)[0];
    h.assert(stuR.petsBySubject.chinese.level === 2 && stuR.petsBySubject.chinese.needExp === 200,
        '重启后这名学生仍按 200 步长显示 Lv.2 / 还差 200', { lv: stuR.petsBySubject.chinese.level, need: stuR.petsBySubject.chinese.needExp });
    h.assert(h.store.calcLevel(250) === 2 && h.store.calcLevel(450) === 3 && h.store.calcLevel(50) === 1,
        '重启后 calcLevel 按新阶梯换算（50->1 / 250->2 / 450->3）', { a: h.store.calcLevel(250), b: h.store.calcLevel(450) });

    // ---------- 4. 越界 / 非单调输入必须被拒 ----------
    console.log('\n[4] 越界与非单调输入：必须被拒绝，且不能改库');
    const bad = [
        { name: '只给 20 级（少一级）', thresholds: want.slice(0, 20), stages: vmR.stages },
        { name: '给 22 级（多一级）', thresholds: want.concat([4550]), stages: vmR.stages },
        { name: '第 2 级写成负数', thresholds: want.map((v, i) => i === 2 ? -300 : v), stages: vmR.stages },
        { name: '第 5 级比第 4 级小（非单调递减）', thresholds: want.map((v, i) => i === 5 ? 100 : v), stages: vmR.stages },
        { name: '某级写成非数字', thresholds: want.map((v, i) => i === 7 ? 'abc' : v), stages: vmR.stages },
        { name: '形态阶梯只给 5 段', thresholds: want, stages: vmR.stages.slice(0, 5) }
    ];
    for (const c of bad) {
        const r = await h.store.v3SaveThresholds({ thresholds: c.thresholds, stages: c.stages });
        h.assert(r.ok === false && (r.reason === 'bad-thresholds' || r.reason === 'bad-stages'),
            '被拒：' + c.name, r);
        h.assert(JSON.stringify(h.thresholdsInDb()) === JSON.stringify(want),
            '被拒后库里阈值没有变化（' + c.name + '）', h.thresholdsInDb());
    }
    h.assert(JSON.stringify(h.store.getLevelThresholds()) === JSON.stringify(want), '被拒后内存阈值也没有变化', h.store.getLevelThresholds());

    const flat = want.map((v, i) => i >= 3 ? 450 : v);   // 450,450,450… 非递减但相邻相等
    const flatRes = await h.store.v3SaveThresholds({ thresholds: flat, stages: vmR.stages });
    const flatDb = h.thresholdsInDb();
    const strictlyIncreasing = flatDb.every((v, i) => i === 0 || v > flatDb[i - 1]);
    h.assert(flatRes.ok === false || strictlyIncreasing,
        '相邻两级阈值相等时必须被拒，或保存后库里仍严格递增（否则一个经验值同时命中两级）',
        { accepted: flatRes.ok, db: flatDb, strictlyIncreasing });

    // 复位到 200 步长，确认还能正常保存
    const reset = await h.store.v3SaveThresholds({ thresholds: want, stages: vmR.stages });
    h.assert(reset.ok === true && JSON.stringify(h.thresholdsInDb()) === JSON.stringify(want),
        '把阈值改回 200 步长仍能正常保存（复位可用）', { ok: reset.ok, db: h.thresholdsInDb() });

    // 服务层直连（绕过 core 校验）是否会写进垃圾阈值 —— 记录给 Lead，不算本用例断言
    const raw = h.svc.saveThresholds([0, 50000, 10], null, CLASS);
    h.warn('服务层 saveThresholds 不做校验：直连写入 [0,50000,10] 返回 ' + JSON.stringify(raw) +
        '，库里变成前 3 级 ' + JSON.stringify(h.thresholdsInDb().slice(0, 3)) + '（core 会拦，IPC 直连不拦）');

    h.teardown();
    h.summary();
});
