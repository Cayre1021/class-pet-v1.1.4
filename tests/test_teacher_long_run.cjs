// test_teacher_long_run.cjs —— 教师日常路径 ⑥：长期使用（连续 500 笔赋分 + 20 次撤销）
// 断言：流水条数、每人经验、等级三者自洽；重启后仍自洽；整轮操作耗时 < 10s
// 跑法：node tests/test_teacher_long_run.cjs
const { createHarness } = require('./test_teacher__harness.cjs');

const ROUNDS = 500;
const UNDOS = 20;
const BUDGET_MS = 10000;

const h = createHarness();

h.runMain('教师日常路径 ⑥ 长期使用：500 笔赋分 + 20 次撤销', async () => {
    await h.boot();
    const CLASS = 'c_teach_long';
    h.svc.createClassWithDefaults({ classId: CLASS, className: '教学长跑班', teacherName: '刘老师' });
    const ids = h.seedClass(CLASS, 30);
    h.setAccount({ id: 'acc_teach_long', classId: CLASS });
    h.setSubject('chinese');
    await h.store.loadFromSQLite();

    // ---------- 1. 连续 500 笔赋分 ----------
    console.log('\n[1] 连续 ' + ROUNDS + ' 笔赋分（30 人轮流，每笔 +1~+3）');
    let failedScores = [];
    const t0 = Date.now();
    for (let i = 0; i < ROUNDS; i++) {
        const sid = ids[i % ids.length];
        const res = await h.store.v3Score({ studentIds: [sid], delta: (i % 3) + 1, reason: '第' + (i + 1) + '笔', subjectCode: 'chinese' });
        if (!res.ok) failedScores.push({ i, res });
    }
    const scoreMs = Date.now() - t0;
    h.assert(failedScores.length === 0, ROUNDS + ' 笔赋分全部成功', failedScores.slice(0, 3));
    console.log('      500 笔赋分耗时 ' + scoreMs + 'ms');
    h.assert(h.opCount() === ROUNDS, '流水笔数 = ' + ROUNDS, h.opCount());
    h.assert(Number(h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE class_id = ?', [CLASS])[0].c) === ROUNDS,
        '流水明细条数 = ' + ROUNDS, h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE class_id = ?', [CLASS])[0].c);

    // 经验 = 未撤销明细之和（这里全为正分，不存在夹 0）
    const sumExp = () => {
        const m = {};
        h.rows("SELECT student_id, SUM(points_applied) AS s FROM score_entries WHERE class_id = ? GROUP BY student_id", [CLASS])
            .forEach(r => { m[r.student_id] = Number(r.s) || 0; });
        return m;
    };
    const expectAfterScores = sumExp();
    const mismatch0 = ids.filter(id => Number(h.pet(id, 'subj_chinese').exp) !== expectAfterScores[id]);
    h.assert(mismatch0.length === 0, '30 人的经验都等于自己明细之和', mismatch0.slice(0, 3).map(id => ({ id, exp: h.pet(id, 'subj_chinese').exp, expect: expectAfterScores[id] })));

    // ---------- 2. 连点 20 次撤销 ----------
    console.log('\n[2] 连点 ' + UNDOS + ' 次撤销（每次撤最后一笔）');
    let failedUndos = [];
    const t1 = Date.now();
    for (let i = 0; i < UNDOS; i++) {
        const res = await h.store.v3UndoLast({});
        if (!res.ok) failedUndos.push({ i, res });
    }
    const undoMs = Date.now() - t1;
    h.assert(failedUndos.length === 0, UNDOS + ' 次撤销全部成功', failedUndos.slice(0, 2));
    console.log('      ' + UNDOS + ' 次撤销耗时 ' + undoMs + 'ms');
    h.assert(h.opCount() === ROUNDS, '撤销不会让流水笔数变少（仍 ' + ROUNDS + ' 笔）', h.opCount());
    h.assert(Number(h.rows('SELECT COUNT(*) AS c FROM score_operations WHERE class_id = ? AND undone_at IS NOT NULL', [CLASS])[0].c) === UNDOS,
        '被标记为已撤销的正好 ' + UNDOS + ' 笔', h.rows('SELECT COUNT(*) AS c FROM score_operations WHERE class_id = ? AND undone_at IS NOT NULL', [CLASS])[0].c);
    h.assert(Number(h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE class_id = ?', [CLASS])[0].c) === ROUNDS,
        '撤销不删明细：明细仍是 ' + ROUNDS + ' 条', h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE class_id = ?', [CLASS])[0].c);

    const totalMs = scoreMs + undoMs;
    h.assert(totalMs < BUDGET_MS, '一轮 520 次操作总耗时 ' + totalMs + 'ms < ' + BUDGET_MS + 'ms', { scoreMs, undoMs, totalMs });

    // ---------- 3. 三者自洽 ----------
    console.log('\n[3] 经验 / 等级 / 流水三者自洽');
    const undoneSum = {};
    h.rows(`SELECT e.student_id AS sid, SUM(e.points_applied) AS s
            FROM score_entries e JOIN score_operations o ON o.id = e.operation_id
            WHERE o.class_id = ? AND o.undone_at IS NOT NULL GROUP BY e.student_id`, [CLASS])
        .forEach(r => { undoneSum[r.sid] = Number(r.s) || 0; });
    const expectFinal = {};
    ids.forEach(id => { expectFinal[id] = (expectAfterScores[id] || 0) - (undoneSum[id] || 0); });
    const mismatch1 = ids.filter(id => Number(h.pet(id, 'subj_chinese').exp) !== expectFinal[id]);
    h.assert(mismatch1.length === 0, '撤销后 30 人的经验 = 明细之和 - 已撤销明细之和',
        mismatch1.slice(0, 3).map(id => ({ id, exp: h.pet(id, 'subj_chinese').exp, expect: expectFinal[id], undone: undoneSum[id] || 0 })));

    const thr = h.thresholdsInDb();
    const petRows = h.rows("SELECT * FROM pets WHERE class_id = ? AND subject_id = 'subj_chinese'", [CLASS]);
    const badLevel = petRows.filter(p => {
        const exp = Number(p.exp) || 0;
        let lv = 0;
        for (let l = thr.length - 1; l >= 0; l--) if (exp >= thr[l]) { lv = l; break; }
        return lv !== Number(p.level);
    });
    h.assert(badLevel.length === 0, '库里 30 只宠的 level 与自己 exp 对应的等级一致',
        badLevel.slice(0, 3).map(p => ({ id: p.id, exp: p.exp, lv: p.level })));

    const vm = await h.viewModel();
    const badPage = vm.students.filter(s => Number(s.petsBySubject.chinese.exp) !== Number((h.pet(s.id, 'subj_chinese') || {}).exp));
    h.assert(vm.students.length === 30 && badPage.length === 0, '页面 30 人的经验与库一致', badPage.slice(0, 3));
    const lastOp = vm.lastOperation;
    const dbLast = h.rows('SELECT id FROM score_operations WHERE class_id = ? AND undone_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1', [CLASS])[0];
    h.assert(!!lastOp && !!dbLast && String(lastOp.id) === String(dbLast.id),
        '页面认定的"最后一笔"与库排序结果一致', { page: lastOp && lastOp.id, db: dbLast && dbLast.id });
    h.assert(Number(h.rows('SELECT COUNT(*) AS c FROM score_operations WHERE class_id = ? AND undone_at IS NULL', [CLASS])[0].c) === ROUNDS - UNDOS,
        '未撤销的流水正好 ' + (ROUNDS - UNDOS) + ' 笔', h.rows('SELECT COUNT(*) AS c FROM score_operations WHERE class_id = ? AND undone_at IS NULL', [CLASS])[0].c);

    // ---------- 4. 重启后仍自洽 ----------
    console.log('\n[4] 重启后仍自洽');
    await h.restart();
    h.setAccount({ id: 'acc_teach_long', classId: CLASS });
    h.setSubject('chinese');
    const vmR = await h.viewModel();
    h.assert(vmR.students.length === 30, '重启后名单仍是 30 人', vmR.students.length);
    const badRestart = ids.filter(id => Number((h.pet(id, 'subj_chinese') || {}).exp) !== expectFinal[id]);
    h.assert(badRestart.length === 0, '重启后 30 人经验仍与明细推导值一致', badRestart.slice(0, 3));
    h.assert(h.opCount() === ROUNDS && Number(h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE class_id = ?', [CLASS])[0].c) === ROUNDS,
        '重启后流水与明细条数不变', { ops: h.opCount(), entries: h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE class_id = ?', [CLASS])[0].c });
    const pageBad = vmR.students.filter(s => Number(s.petsBySubject.chinese.exp) !== expectFinal[s.id]);
    h.assert(pageBad.length === 0, '重启后页面读数与库一致', pageBad.slice(0, 3).map(s => ({ id: s.id, exp: s.petsBySubject.chinese.exp, expect: expectFinal[s.id] })));

    h.teardown();
    h.summary();
});
