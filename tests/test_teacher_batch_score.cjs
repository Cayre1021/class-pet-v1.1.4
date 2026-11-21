// test_teacher_batch_score.cjs —— 教师日常路径 ②：整批操作（全选 30 人一次 +5，再撤销）
// 断言：每人经验 +5、明细流水 30 条、只产生 1 笔操作；撤销后 30 人全部回滚
// 跑法：node tests/test_teacher_batch_score.cjs
const { createHarness } = require('./test_teacher__harness.cjs');

const h = createHarness();

h.runMain('教师日常路径 ② 整批操作：全选 30 人一次加 5 分，再撤销', async () => {
    await h.boot();
    const CLASS = 'c_teach_batch';
    const cls = h.svc.createClassWithDefaults({ classId: CLASS, className: '教学批量班', teacherName: '刘老师' });
    h.assert(cls.success === true, '先用真流程建一个新班（阈值/形态/规则齐全）', cls);
    const ids = h.seedClass(CLASS, 30);
    h.setAccount({ id: 'acc_teach_batch', classId: CLASS });
    h.setSubject('chinese');

    // ---------- 1. 名单与初始状态 ----------
    console.log('\n[1] 名单：30 人，全部 0 EXP 的蛋');
    const vm0 = await h.viewModel();
    h.assert(vm0.ok === true && vm0.classId === CLASS, 'ViewModel 读的是新班（不串到别的班）', { ok: vm0.ok, classId: vm0.classId, reason: vm0.reason });
    h.assert(vm0.students.length === 30, '班里有 30 名学生（"全选"就是这 30 人）', vm0.students.length);
    const allEgg = vm0.students.every(s => s.petsBySubject.chinese.exp === 0 && s.petsBySubject.chinese.isEgg === true);
    h.assert(allEgg, '30 人初始都是 0 EXP 的蛋', vm0.students.slice(0, 2).map(s => s.petsBySubject.chinese));
    h.assert(h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE class_id = ?', [CLASS])[0].c === 0,
        '新班初始没有流水明细', h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE class_id = ?', [CLASS])[0]);

    // ---------- 2. 一次 +5 ----------
    console.log('\n[2] 全选 30 人，一次 +5 分');
    const allIds = vm0.students.map(s => s.id);
    h.assert(allIds.length === 30 && allIds.every(id => ids.indexOf(id) >= 0), '页面选中的 30 个 id 与建班时的 30 人一致', allIds.length);
    const res = await h.store.v3Score({ studentIds: allIds, delta: 5, reason: '全班课堂表现', subjectCode: 'chinese' });
    h.assert(res.ok === true && !!res.operationId, '整批赋分成功并返回 operationId', { ok: res.ok, reason: res.reason, err: res.error });
    h.assert(Array.isArray(res.skipped) && res.skipped.length === 0, '没有学生被跳过（30 人全部计入）', res.skipped);
    h.assert(Array.isArray(res.entries) && res.entries.length === 30, '返回值里的 entries 是 30 条（一人一条）', res.entries && res.entries.length);

    const badEntry = (res.entries || []).filter(e => Number(e.expBefore) !== 0 || Number(e.expAfter) !== 5 || Number(e.pointsApplied ?? 5) !== 5);
    h.assert(badEntry.length === 0, '每条明细都是 0 -> 5 EXP', badEntry.slice(0, 3));
    const opRows = h.rows('SELECT * FROM score_operations WHERE class_id = ?', [CLASS]);
    h.assert(opRows.length === 1, '"老师点一次"只产生 1 笔操作（不是 30 笔）', opRows.length);
    h.assert(Number(opRows[0].points) === 5 && opRows[0].action_name === '全班课堂表现', '操作笔上的分数与原因正确', { points: opRows[0].points, reason: opRows[0].action_name });
    const entRows = h.rows('SELECT * FROM score_entries WHERE operation_id = ?', [res.operationId]);
    h.assert(entRows.length === 30, '流水明细 30 条全部落库（operation_id 归属同一笔）', entRows.length);
    const distinctStudents = new Set(entRows.map(r => r.student_id));
    h.assert(distinctStudents.size === 30, '30 条明细对应 30 个不同学生（没有漏人/重复）', distinctStudents.size);

    const petsAfter = h.rows("SELECT * FROM pets WHERE class_id = ? AND subject_id = 'subj_chinese'", [CLASS]);
    h.assert(petsAfter.length === 30 && petsAfter.every(p => Number(p.exp) === 5), '30 只语文宠的经验都变成 5', petsAfter.filter(p => Number(p.exp) !== 5).slice(0, 3));
    h.assert(petsAfter.every(p => p.species_code === 'egg' && Number(p.visual_stage) === 0 && !p.hatched_at),
        '加 5 分不会把蛋"抬成"已破壳（物种 egg / stage 0）', petsAfter.slice(0, 2).map(p => ({ sp: p.species_code, st: p.visual_stage })));

    const vm1 = await h.viewModel();
    const all5 = vm1.students.every(s => s.petsBySubject.chinese.exp === 5);
    h.assert(vm1.students.length === 30 && all5, '页面视图里 30 人都是 5 EXP', vm1.students.filter(s => s.petsBySubject.chinese.exp !== 5).slice(0, 3));
    h.assert(vm1.students.every(s => s.petsBySubject.chinese.level === 0 && s.petsBySubject.chinese.isEgg === true),
        '5 EXP 仍是 Lv.0 / 蛋态（阈值 50 未到）', vm1.students.slice(0, 2).map(s => ({ lv: s.petsBySubject.chinese.level, egg: s.petsBySubject.chinese.isEgg })));

    const ledger1 = h.svc.getClassLedger(CLASS);
    h.assert(ledger1.length === 30 && ledger1.every(r => r.operation_id === res.operationId),
        '课堂台账 30 行都指向这一笔操作', ledger1.length);

    // ---------- 3. 撤销整批 ----------
    console.log('\n[3] 撤销这一笔：30 人全部回滚');
    const undo = await h.store.v3UndoLast({});
    h.assert(undo.ok === true && String(undo.operationId) === String(res.operationId), '撤销的就是刚才那一笔整批操作', undo);
    h.assert(Number(undo.revertedCount) === 30, '撤销回滚了 30 条明细', undo.revertedCount);

    const petsUndone = h.rows("SELECT * FROM pets WHERE class_id = ? AND subject_id = 'subj_chinese'", [CLASS]);
    h.assert(petsUndone.length === 30 && petsUndone.every(p => Number(p.exp) === 0), '撤销后 30 只宠的经验全部回到 0', petsUndone.filter(p => Number(p.exp) !== 0).slice(0, 3));
    const vm2 = await h.viewModel();
    h.assert(vm2.students.length === 30 && vm2.students.every(s => s.petsBySubject.chinese.exp === 0),
        '撤销后页面视图 30 人全部是 0 EXP', vm2.students.filter(s => s.petsBySubject.chinese.exp !== 0).slice(0, 3));
    const entUndone = h.rows('SELECT * FROM score_entries WHERE operation_id = ?', [res.operationId]);
    h.assert(entUndone.length === 30, '撤销只标记不删明细：30 条明细仍在（老师能查历史）', entUndone.length);
    const opUndone = h.rows('SELECT undone_at FROM score_operations WHERE id = ?', [res.operationId])[0];
    h.assert(!!opUndone.undone_at, '该笔操作打上 undone_at', opUndone);
    const ledger2 = h.svc.getClassLedger(CLASS);
    h.assert(ledger2.length === 30 && ledger2.every(r => !!r.undone_at), '台账 30 行都显示"已撤销"', ledger2.filter(r => !r.undone_at).length);
    h.assert(vm2.lastOperation === null, '没有可撤销的下一笔了（lastOperation 为空）', vm2.lastOperation);

    // ---------- 4. 重启后仍是回滚态 ----------
    console.log('\n[4] 重启后仍是回滚态');
    await h.restart();
    h.setAccount({ id: 'acc_teach_batch', classId: CLASS });
    h.setSubject('chinese');
    const vmR = await h.viewModel();
    h.assert(vmR.students.length === 30 && vmR.students.every(s => s.petsBySubject.chinese.exp === 0),
        '重启后 30 人仍是 0 EXP（撤销没有被镜像复活）', vmR.students.filter(s => s.petsBySubject.chinese.exp !== 0).slice(0, 3));
    h.assert(h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE operation_id = ?', [res.operationId])[0].c === 30,
        '重启后这 30 条明细仍在库里', h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE operation_id = ?', [res.operationId])[0]);

    h.teardown();
    h.summary();
});
