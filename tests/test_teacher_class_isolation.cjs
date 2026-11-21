// test_teacher_class_isolation.cjs —— 教师日常路径 ⑦：多班级隔离
// 断言：A 班赋分 / 改阈值 / 改名单 / 归档 都不影响 B 班的阈值、名单与流水
// 跑法：node tests/test_teacher_class_isolation.cjs
const { createHarness } = require('./test_teacher__harness.cjs');

const A = 'c_teach_iso_a';
const B = 'c_teach_iso_b';
const buildRealThresholds = (base, step) => {
    const out = [0, base];
    for (let n = 2; n <= 20; n++) out[n] = out[n - 1] + step;
    return out;
};

const h = createHarness();

h.runMain('教师日常路径 ⑦ 多班级隔离：A 班操作不影响 B 班', async () => {
    await h.boot();
    h.svc.createClassWithDefaults({ classId: A, className: '一班', teacherName: '刘老师' });
    h.svc.createClassWithDefaults({ classId: B, className: '二班', teacherName: '王老师' });
    h.seedClass(A, 2, { noBase: 100 });
    h.seedClass(B, 2, { noBase: 200 });
    const a1 = 'st_t_' + A + '_01';
    const b1 = 'st_t_' + B + '_01';

    // ---------- 1. A 班赋分 + 破壳 + 改阈值 ----------
    console.log('\n[1] 在 A 班：赋分、破壳、把步长改成 200');
    h.setAccount({ id: 'acc_iso_a', classId: A });
    h.setSubject('chinese');
    await h.store.loadFromSQLite();
    const vmB0 = await h.viewModel();
    h.assert(vmB0.classId === A && vmB0.students.length === 2, 'A 班基础状态：2 名学生', { classId: vmB0.classId, n: vmB0.students.length });

    const sA = await h.store.v3Score({ studentIds: [a1], delta: 60, reason: 'A 班加分', subjectCode: 'chinese' });
    const hA = await h.store.v3Hatch({ studentId: a1, subjectCode: 'chinese', speciesCode: 'cat' });
    h.assert(sA.ok === true && hA.ok === true, 'A 班 1 号加分 60 并破壳成功', { score: sA.ok, hatch: hA.ok, reason: hA.reason });
    const tA = await h.store.v3SaveThresholds({ thresholds: buildRealThresholds(50, 200), stages: vmB0.stages });
    h.assert(tA.ok === true, 'A 班阈值改成 200 步长', tA);
    const addA = await h.store.v3CreateStudent({ no: '150', name: 'A班新人', group: 1 });
    h.assert(addA.ok === true, 'A 班新增 1 名学生', addA);

    // 切班前的快照：B 班学生行必须原封不动
    const snapStudents = (cid) => JSON.stringify(h.rows('SELECT id, class_id, student_no, name, group_name, note, display_pet_id, updated_at FROM students WHERE class_id = ? ORDER BY id', [cid]));

    // ---------- 2. 切到 B 班：阈值/名单/流水都不串 ----------
    console.log('\n[2] 切到 B 班：阈值、名单、流水都不应该跟着带过来');
    const aRowsBefore = snapStudents(A);
    h.setAccount({ id: 'acc_iso_b', classId: B });
    h.setSubject('chinese');
    await h.store.loadFromSQLite();
    h.assert(snapStudents(A) === aRowsBefore,
        '切到 B 班后，A 班的学生行没有被改写（切班不应把上一班的内存名单写回别的班）',
        { before: aRowsBefore.slice(0, 160), after: snapStudents(A).slice(0, 160) });
    const vmB = await h.viewModel();
    h.assert(vmB.classId === B, 'ViewModel 的 classId 是 B 班', vmB.classId);
    h.assert(vmB.students.length === 2, 'B 班名单仍是自己的 2 人（没有被 A 班新增的第 3 人污染）', vmB.students.length);
    h.assert(!vmB.students.some(s => s.id === a1 || s.name === 'A班新人'), 'B 班名单里没有 A 班学生', vmB.students.map(s => s.name));
    h.assert(JSON.stringify(vmB.thresholds) === JSON.stringify([0, 50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950]),
        'B 班阈值仍是默认 100 步长（没有被 A 班的 200 步长覆盖）', vmB.thresholds);
    h.assert(JSON.stringify(h.thresholdsInDb(B)) !== JSON.stringify(h.thresholdsInDb(A)),
        '库里 A/B 两套阈值互不相同（各存各的）', { A: h.thresholdsInDb(A).slice(0, 4), B: h.thresholdsInDb(B).slice(0, 4) });
    h.assert(vmB.lastOperation === null, 'B 班的"最后一笔"是空的（A 班的流水没有串过来）', vmB.lastOperation);
    h.assert(Number((h.pet(b1, 'subj_chinese', B) || {}).exp) === 0, 'B 班 1 号经验仍是 0（A 班的 60 分没跟过来）', (h.pet(b1, 'subj_chinese', B) || {}).exp);
    h.assert(h.opCount(B) === 0, 'B 班流水笔数是 0', h.opCount(B));
    h.assert(h.opCount(A) === 1, 'A 班流水笔数是 1（自己那一笔还在）', h.opCount(A));

    // ---------- 3. 在 B 班操作：不影响 A 班 ----------
    console.log('\n[3] 在 B 班赋分/删人：A 班不受影响');
    const sB = await h.store.v3Score({ studentIds: [b1], delta: 30, reason: 'B 班加分', subjectCode: 'chinese' });
    h.assert(sB.ok === true, 'B 班 1 号加 30 分成功', sB);
    h.assert(Number((h.pet(b1, 'subj_chinese', B) || {}).exp) === 30, 'B 班 1 号经验 30', (h.pet(b1, 'subj_chinese', B) || {}).exp);
    h.assert(h.opCount(B) === 1 && h.opCount(A) === 1, '两个班的流水笔数各自独立（A=1 / B=1）', { A: h.opCount(A), B: h.opCount(B) });
    const aAfterB = h.pet(a1, 'subj_chinese', A);
    h.assert(Number(aAfterB.exp) === 60 && !!aAfterB.hatched_at, 'A 班 1 号经验与破壳状态没有被 B 班操作改动', { exp: aAfterB.exp, hatched: aAfterB.hatched_at });

    const crossScore = await h.store.v3Score({ studentIds: [a1], delta: 5, reason: '在 B 班界面给 A 班学生加分', subjectCode: 'chinese' });
    h.assert(crossScore.ok === false && crossScore.reason === 'no-eligible',
        '在 B 班界面给 A 班学生加分被拦（no-eligible，不会跨班写到 A 的宠上）', crossScore);
    h.assert(Number(h.pet(a1, 'subj_chinese', A).exp) === 60, 'A 班 1 号经验没被越界写入（仍 60）', h.pet(a1, 'subj_chinese', A).exp);

    const delB = await h.store.deleteStudentPermanent(b1);
    h.assert(delB === true && !h.student(b1), 'B 班删掉 1 号学生', delB);
    h.assert(!!h.student(a1), 'A 班学生没有被一起删掉', h.student(a1) && h.student(a1).name);
    h.assert(h.rows('SELECT COUNT(*) AS c FROM pets WHERE class_id = ?', [A])[0].c === 9,
        'A 班的宠物行数没变（3 人 x 3 科 = 9）', h.rows('SELECT COUNT(*) AS c FROM pets WHERE class_id = ?', [A])[0].c);
    h.assert(h.rows('SELECT COUNT(*) AS c FROM pets WHERE class_id = ? AND student_id = ?', [B, b1])[0].c === 0,
        'B 班被删学生的宠物也一并清掉（且只清 B 班的）', h.rows('SELECT COUNT(*) AS c FROM pets WHERE class_id = ? AND student_id = ?', [B, b1])[0].c);

    // ---------- 4. 换回 A 班：A 自己那套还在 ----------
    console.log('\n[4] 换回 A 班：阈值/名单/流水仍是 A 自己的');
    const bRowsBefore = snapStudents(B);
    h.setAccount({ id: 'acc_iso_a', classId: A });
    h.setSubject('chinese');
    await h.store.loadFromSQLite();
    h.assert(snapStudents(B) === bRowsBefore,
        '换回 A 班后，B 班剩下的学生行没有被改写', { before: bRowsBefore.slice(0, 160), after: snapStudents(B).slice(0, 160) });
    const vmBackA = await h.viewModel();
    h.assert(JSON.stringify(vmBackA.thresholds) === JSON.stringify(buildRealThresholds(50, 200)),
        '换回 A 班读到的还是 A 的 200 步长', vmBackA.thresholds);
    h.assert(vmBackA.students.length === 3, 'A 班名单仍是 3 人（含新增的第 3 人）', vmBackA.students.length);
    h.assert(!!vmBackA.lastOperation && h.opCount(A) === 1, 'A 班仍能撤自己那一笔', vmBackA.lastOperation);
    h.assert(Number(h.pet(a1, 'subj_chinese', A).exp) === 60, 'A 班 1 号经验仍 60', h.pet(a1, 'subj_chinese', A).exp);

    // ---------- 5. 重启后仍然隔离 ----------
    console.log('\n[5] 重启后两个班仍然互不串');
    await h.restart();                       // 重启后停在 A 班（上一个账号）
    const aBefore5 = snapStudents(A);
    const bBefore5 = snapStudents(B);
    h.setAccount({ id: 'acc_iso_b', classId: B });
    await h.store.loadFromSQLite();
    h.assert(snapStudents(A) === aBefore5,
        '重启后从 A 班切到 B 班：A 班的学生行没有被改写（单进程内切班不得把上一班名单"补写"进本班）',
        { before: aBefore5.slice(0, 200), after: snapStudents(A).slice(0, 200) });
    h.assert(snapStudents(B) === bBefore5, '切到 B 班后 B 班自己的学生行也没被改动', { before: bBefore5.slice(0, 200), after: snapStudents(B).slice(0, 200) });
    const vmB2 = await h.viewModel();
    h.assert(vmB2.students.length === 1, '重启后 B 班剩下 1 人（删掉的那个没复活）', vmB2.students.length);
    h.assert(JSON.stringify(vmB2.thresholds) !== JSON.stringify(buildRealThresholds(50, 200)),
        '重启后 B 班阈值仍不是 A 那套 200 步长', vmB2.thresholds.slice(0, 4));
    h.setAccount({ id: 'acc_iso_a', classId: A });
    await h.store.loadFromSQLite();
    const vmA2 = await h.viewModel();
    h.assert(vmA2.students.length === 3 && JSON.stringify(vmA2.thresholds) === JSON.stringify(buildRealThresholds(50, 200)),
        '重启后 A 班名单 3 人 + 200 步长都还在', { n: vmA2.students.length, thr: vmA2.thresholds.slice(0, 4) });
    h.assert(h.opCount(A) === 1 && h.opCount(B) === 1, '重启后两班流水仍各 1 笔', { A: h.opCount(A), B: h.opCount(B) });

    h.teardown();
    h.summary();
});
