// test_teacher_day_loop.cjs —— 教师日常路径 ①：一天的教学循环
// 新建学生 -> 破壳(需 50 EXP) -> 连续赋分升到 Lv.2(150 EXP) -> 撤销最后一笔 -> 重启后数值一致
// 跑法：node tests/test_teacher_day_loop.cjs
const { createHarness } = require('./test_teacher__harness.cjs');

const h = createHarness();

h.runMain('教师日常路径 ① 一天的教学循环（新建 -> 破壳 -> 升级 -> 撤销 -> 重启）', async () => {
    await h.boot();
    const CLASS = 'c_class02_01';
    h.setAccount({ classId: CLASS });
    h.setSubject('chinese');

    // ---------- 1. 新建学生 ----------
    console.log('\n[1] 新建一名学生');
    const created = await h.store.v3CreateStudent({ no: '901', name: '教学循环甲', group: 1 });
    h.assert(created.ok === true && !!created.studentId, '新建学生成功并返回 studentId', created);
    const SID = created.studentId;
    const row0 = h.student(SID);
    h.assert(!!row0 && row0.name === '教学循环甲' && String(row0.student_no) === '901',
        '库里学生姓名/学号落库正确', row0 && { name: row0.name, no: row0.student_no });
    const pet0 = h.pet(SID, 'subj_chinese');
    h.assert(!!pet0 && pet0.species_code === 'egg' && Number(pet0.exp) === 0 && !pet0.hatched_at,
        '新学生语文宠是 0 EXP 的蛋（未孵化）', pet0 && { sp: pet0.species_code, exp: pet0.exp, hatched: pet0.hatched_at });

    const dupNo = await h.store.v3CreateStudent({ no: '901', name: '重复学号乙', group: 1 });
    h.assert(dupNo.ok === false && dupNo.reason === 'duplicate-no',
        '同学号再建一名学生被拒绝（duplicate-no）', dupNo);

    // ---------- 2. 破壳门禁 + 破壳 ----------
    console.log('\n[2] 破壳：0 EXP 先被拒，补到 50 EXP 后才允许');
    const hatchEarly = await h.store.v3Hatch({ studentId: SID, subjectCode: 'chinese', speciesCode: 'cat' });
    h.assert(hatchEarly.ok === false && hatchEarly.reason === 'exp-insufficient' && hatchEarly.need === 50,
        '0 EXP 点破壳被拒（exp-insufficient，门槛 50）', hatchEarly);

    const s50 = await h.store.v3Score({ studentIds: [SID], delta: 50, reason: '课堂表现', subjectCode: 'chinese' });
    h.assert(s50.ok === true && !!s50.operationId, '第一次赋分 +50 成功', s50);
    const vm50 = await h.viewModel();
    const stu50 = vm50.students.filter(s => s.id === SID)[0];
    h.assert(stu50 && stu50.petsBySubject.chinese.exp === 50 && stu50.petsBySubject.chinese.level === 1,
        '50 EXP 时页面视图为 1 级 / 50 EXP（L1 阈值=50）', stu50 && { exp: stu50.petsBySubject.chinese.exp, lv: stu50.petsBySubject.chinese.level });
    h.assert(stu50.petsBySubject.chinese.isEgg === true, '到 50 EXP 但未点破壳时页面仍是蛋（不会自动孵化）', stu50.petsBySubject.chinese.isEgg);

    const hatched = await h.store.v3Hatch({ studentId: SID, subjectCode: 'chinese', speciesCode: 'cat', nickname: '教学循环猫' });
    h.assert(hatched.ok === true, '50 EXP 点破壳放行', hatched);
    const petH = h.pet(SID, 'subj_chinese');
    h.assert(petH.species_code === 'cat' && !!petH.hatched_at && Number(petH.visual_stage) >= 1,
        '库里写入物种 cat / hatched_at / stage>=1', { sp: petH.species_code, hatched: petH.hatched_at, stage: petH.visual_stage });
    const vmH = await h.viewModel();
    const stuH = vmH.students.filter(s => s.id === SID)[0];
    h.assert(stuH.petsBySubject.chinese.isHatched === true && stuH.petsBySubject.chinese.speciesCode === 'cat',
        '页面视图切换为已破壳的 cat', { hatched: stuH.petsBySubject.chinese.isHatched, sp: stuH.petsBySubject.chinese.speciesCode });

    // ---------- 3. 连续赋分到升级（150 EXP = Lv.2） ----------
    console.log('\n[3] 连续赋分升到 Lv.2（150 EXP）');
    const s1 = await h.store.v3Score({ studentIds: [SID], delta: 50, reason: '连续赋分一', subjectCode: 'chinese' });
    h.assert(s1.ok === true, '第二次赋分 +50 成功（累计 100）', s1);
    const mid = h.pet(SID, 'subj_chinese');
    h.assert(Number(mid.exp) === 100 && Number(mid.level) === 1, '100 EXP 仍是 Lv.1（L2 阈值 150）', { exp: mid.exp, lv: mid.level });

    const s2 = await h.store.v3Score({ studentIds: [SID], delta: 50, reason: '连续赋分二', subjectCode: 'chinese' });
    h.assert(s2.ok === true, '第三次赋分 +50 成功（累计 150）', s2);
    const up = h.pet(SID, 'subj_chinese');
    h.assert(Number(up.exp) === 150 && Number(up.level) === 2, '150 EXP 升级到 Lv.2', { exp: up.exp, lv: up.level });
    const entryUp = h.rows('SELECT * FROM score_entries WHERE operation_id = ?', [s2.operationId])[0];
    h.assert(Number(entryUp.level_before) === 1 && Number(entryUp.level_after) === 2,
        '该笔流水的 level_before/after 记录了这次升级（1 -> 2）', { b: entryUp.level_before, a: entryUp.level_after });
    const vmUp = await h.viewModel();
    const stuUp = vmUp.students.filter(s => s.id === SID)[0];
    h.assert(stuUp.petsBySubject.chinese.level === 2 && stuUp.petsBySubject.chinese.exp === 150,
        '页面视图同步为 Lv.2 / 150 EXP', { lv: stuUp.petsBySubject.chinese.level, exp: stuUp.petsBySubject.chinese.exp });

    // ---------- 4. 撤销最后一笔 ----------
    console.log('\n[4] 撤销最后一笔（把 150 撤回 100）');
    const undo = await h.store.v3UndoLast({});
    h.assert(undo.ok === true && String(undo.operationId) === String(s2.operationId), '撤销的就是最后一笔（+50 那次赋分）', undo);
    const afterUndo = h.pet(SID, 'subj_chinese');
    h.assert(Number(afterUndo.exp) === 100 && Number(afterUndo.level) === 1,
        '撤销后库里经验回到 100、等级回到 Lv.1', { exp: afterUndo.exp, lv: afterUndo.level });
    h.assert(Number(afterUndo.visual_stage) >= Number(up.visual_stage),
        '撤销不回退形态（visual_stage 只升不降）', { before: up.visual_stage, after: afterUndo.visual_stage });
    const vmUndo = await h.viewModel();
    const stuUndo = vmUndo.students.filter(s => s.id === SID)[0];
    h.assert(stuUndo.petsBySubject.chinese.exp === 100 && stuUndo.petsBySubject.chinese.level === 1,
        '撤销后页面视图立刻显示 100 EXP / Lv.1（不需要重启）', { exp: stuUndo.petsBySubject.chinese.exp, lv: stuUndo.petsBySubject.chinese.level });
    const undoneRow = h.rows('SELECT undone_at FROM score_operations WHERE id = ?', [s2.operationId])[0];
    h.assert(!!undoneRow && !!undoneRow.undone_at, '被撤销的那笔流水打上了 undone_at 标记', undoneRow);
    h.assert(!!afterUndo.hatched_at, '撤销不影响破壳状态（hatched_at 仍在）', afterUndo.hatched_at);

    // ---------- 5. 重启后数值一致 ----------
    console.log('\n[5] 重启应用后数值一致');
    const beforeRestart = {
        exp: Number(afterUndo.exp), level: Number(afterUndo.level), stage: Number(afterUndo.visual_stage),
        ops: h.opCount(CLASS), entries: Number((h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE student_id = ?', [SID])[0] || {}).c)
    };
    await h.restart();
    h.setAccount({ classId: CLASS });
    h.setSubject('chinese');
    const vmR = await h.viewModel();
    h.assert(vmR.ok === true, '重启后 ViewModel 读取正常', { ok: vmR.ok, reason: vmR.reason });
    const stuR = vmR.students.filter(s => s.id === SID)[0];
    h.assert(!!stuR, '重启后这名学生仍在名单里', stuR && stuR.name);
    h.assert(stuR.petsBySubject.chinese.exp === beforeRestart.exp && stuR.petsBySubject.chinese.level === beforeRestart.level,
        '重启后经验与等级与撤销后的值一致（撤销没有被"复活"）',
        { page: { exp: stuR.petsBySubject.chinese.exp, lv: stuR.petsBySubject.chinese.level }, db: beforeRestart });
    const petR = h.pet(SID, 'subj_chinese');
    h.assert(Number(petR.exp) === beforeRestart.exp && Number(petR.level) === beforeRestart.level,
        '重启后库里的经验/等级与页面一致', { db: { exp: petR.exp, lv: petR.level }, page: beforeRestart });
    h.assert(!!petR.hatched_at && petR.species_code === 'cat', '重启后破壳状态与物种保持不变', { sp: petR.species_code, hatched: petR.hatched_at });
    h.assert(h.opCount(CLASS) === beforeRestart.ops, '重启后流水条数不变', { before: beforeRestart.ops, after: h.opCount(CLASS) });
    const entriesR = Number((h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE student_id = ?', [SID])[0] || {}).c);
    h.assert(entriesR === beforeRestart.entries && entriesR === 3, '重启后这名学生的流水明细仍是 3 条（3 次赋分，撤销不删明细）', { before: beforeRestart.entries, after: entriesR });
    const lastOpR = vmR.lastOperation;
    h.assert(!!lastOpR && String(lastOpR.id) === String(s1.operationId),
        '重启后"可撤销的最后一笔"回退到上一笔未撤销的操作', { last: lastOpR && lastOpR.id, expect: s1.operationId });

    h.teardown();
    h.summary();
});
