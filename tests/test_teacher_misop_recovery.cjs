// test_teacher_misop_recovery.cjs —— 教师日常路径 ③：误操作恢复
// 断言：加分后能撤销、撤销不能重复（NOT_LAST / 已撤销）、扣分跨 0 不为负、被拒的撤销不改库
// 跑法：node tests/test_teacher_misop_recovery.cjs
const { createHarness } = require('./test_teacher__harness.cjs');

const h = createHarness();

h.runMain('教师日常路径 ③ 误操作恢复：撤销一次、不能重复撤销、扣分不为负', async () => {
    await h.boot();
    const CLASS = 'c_teach_misop';
    h.svc.createClassWithDefaults({ classId: CLASS, className: '教学误操班', teacherName: '刘老师' });
    h.seedClass(CLASS, 3);
    const [A] = ['st_t_' + CLASS + '_01', 'st_t_' + CLASS + '_02', 'st_t_' + CLASS + '_03'];
    h.setAccount({ id: 'acc_teach_misop', classId: CLASS });
    h.setSubject('chinese');

    // ---------- 1. 加分 -> 撤销 -> 不能重复撤销 ----------
    console.log('\n[1] 加分后撤销，再点一次撤销必须被拒');
    const op1 = await h.store.v3Score({ studentIds: [A], delta: 10, reason: '误加 10 分', subjectCode: 'chinese' });
    h.assert(op1.ok === true && !!op1.operationId, '加 10 分成功', op1);
    h.assert(Number(h.pet(A, 'subj_chinese').exp) === 10, '库里经验 10', h.pet(A, 'subj_chinese').exp);

    const u1 = await h.store.v3UndoLast({});
    h.assert(u1.ok === true && String(u1.operationId) === String(op1.operationId), '第一次撤销成功', u1);
    h.assert(Number(h.pet(A, 'subj_chinese').exp) === 0, '撤销后经验回到 0', h.pet(A, 'subj_chinese').exp);

    const u2 = await h.store.v3UndoLast({});
    h.assert(u2.ok === false && u2.reason === 'no-operation', '没有可撤销的下一笔时，撤销按钮给出明确理由（no-operation）', u2);
    const u2b = await h.store.v3UndoLast({ operationId: op1.operationId });
    h.assert(u2b.ok === false, '带着已撤销的 operationId 再撤一次同样被拒', u2b);
    h.assert(Number(h.pet(A, 'subj_chinese').exp) === 0, '被拒的撤销没有改动经验（仍是 0）', h.pet(A, 'subj_chinese').exp);
    h.assert(h.rows('SELECT COUNT(*) AS c FROM score_operations WHERE class_id = ?', [CLASS])[0].c === 1,
        '重复撤销不会新增流水笔数', h.rows('SELECT COUNT(*) AS c FROM score_operations WHERE class_id = ?', [CLASS])[0]);

    const direct = h.svc.undoOperation(op1.operationId);
    h.assert(direct.success === false && /已被撤销/.test(String(direct.error)),
        '服务层再撤同一笔：明确报"已被撤销"', direct);

    // ---------- 2. 只能撤销最后一笔（NOT_LAST） ----------
    console.log('\n[2] 后面还有别的流水时，不许越过它撤销');
    const opA = await h.store.v3Score({ studentIds: [A], delta: 20, reason: '第一笔', subjectCode: 'chinese' });
    const opB = await h.store.v3Score({ studentIds: [A], delta: 30, reason: '第二笔', subjectCode: 'chinese' });
    h.assert(opA.ok && opB.ok, '连开两笔赋分（+20 然后 +30）', { a: opA.ok, b: opB.ok });
    h.assert(Number(h.pet(A, 'subj_chinese').exp) === 50, '两笔合计 50 EXP', h.pet(A, 'subj_chinese').exp);

    const crossCore = await h.store.v3UndoLast({ operationId: opA.operationId });
    h.assert(crossCore.ok === false && crossCore.reason === 'not-last',
        '页面层：越过最后一笔撤销第一笔被拒（not-last）', crossCore);
    const crossSvc = h.svc.undoOperation(opA.operationId);
    h.assert(crossSvc.success === false && /^NOT_LAST/.test(String(crossSvc.error)),
        '服务层：越过最后一笔撤销返回 NOT_LAST', crossSvc);
    h.assert(Number(h.pet(A, 'subj_chinese').exp) === 50, '被拒的撤销没有改动经验（仍是 50）', h.pet(A, 'subj_chinese').exp);
    const opBRow = h.rows('SELECT undone_at FROM score_operations WHERE id = ?', [opB.operationId])[0];
    h.assert(!opBRow.undone_at, '最后一笔仍处于"可撤销"状态（没被误改）', opBRow);

    const uB = await h.store.v3UndoLast({});
    h.assert(uB.ok === true && String(uB.operationId) === String(opB.operationId), '按规则撤销最后一笔成功（+30 回滚）', uB);
    h.assert(Number(h.pet(A, 'subj_chinese').exp) === 20, '撤销后只剩第一笔的 20 EXP', h.pet(A, 'subj_chinese').exp);

    // ---------- 3. 扣分跨 0 不为负 ----------
    console.log('\n[3] 扣分扣过零：经验夹到 0，绝不为负');
    const minusHuge = await h.store.v3Score({ studentIds: [A], delta: -100, reason: '误扣 100 分', subjectCode: 'chinese' });
    h.assert(minusHuge.ok === true, '大额扣分本身成功执行（不报错）', minusHuge);
    const petNeg = h.pet(A, 'subj_chinese');
    h.assert(Number(petNeg.exp) === 0, '20 EXP 扣 100 后经验夹到 0（不是 -80）', petNeg.exp);
    const negEntry = h.rows('SELECT * FROM score_entries WHERE operation_id = ?', [minusHuge.operationId])[0];
    h.assert(Number(negEntry.exp_before) === 20 && Number(negEntry.exp_after) === 0,
        '流水如实记录 20 -> 0（明细不为负）', { before: negEntry.exp_before, after: negEntry.exp_after });
    const vmNeg = await h.viewModel();
    const stuNeg = vmNeg.students.filter(s => s.id === A)[0];
    h.assert(stuNeg.petsBySubject.chinese.exp === 0 && stuNeg.petsBySubject.chinese.level >= 0,
        '页面视图经验 0、等级不为负', { exp: stuNeg.petsBySubject.chinese.exp, lv: stuNeg.petsBySubject.chinese.level });

    const zeroMinus = await h.store.v3Score({ studentIds: [A], delta: -5, reason: '0 分再扣 5 分', subjectCode: 'chinese' });
    h.assert(zeroMinus.ok === true && Number(h.pet(A, 'subj_chinese').exp) === 0,
        '0 EXP 再扣 5 分，经验仍是 0（不会变负）', { ok: zeroMinus.ok, exp: h.pet(A, 'subj_chinese').exp });

    const undoNeg = await h.store.v3UndoLast({});
    h.assert(undoNeg.ok === true && String(undoNeg.operationId) === String(zeroMinus.operationId), '撤销刚才那笔 0 分扣分', undoNeg);
    h.assert(Number(h.pet(A, 'subj_chinese').exp) === 0, '撤销后经验仍是 0（回到扣分前的值）', h.pet(A, 'subj_chinese').exp);

    h.teardown();
    h.summary();
});
