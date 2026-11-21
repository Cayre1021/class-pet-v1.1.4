// test_teacher_roster_maint.cjs —— 教师日常路径 ④：名单维护（新增/改名/改学号/归档/删除）
// 断言：改名不碰经验；撞号必须明确拒绝而不是静默改号；归档后不可赋分且重启仍归档；删除后彻底消失
// 跑法：node tests/test_teacher_roster_maint.cjs
const { createHarness } = require('./test_teacher__harness.cjs');

const h = createHarness();

h.runMain('教师日常路径 ④ 名单维护：新增 / 改名 / 改学号 / 归档 / 删除', async () => {
    await h.boot();
    const CLASS = 'c_teach_roster';
    h.svc.createClassWithDefaults({ classId: CLASS, className: '教学名单班', teacherName: '刘老师' });
    h.seedClass(CLASS, 3);
    h.setAccount({ id: 'acc_teach_roster', classId: CLASS });
    h.setSubject('chinese');
    await h.store.loadFromSQLite();          // 等同切账号后重新载入本班名单
    const X = 'st_t_' + CLASS + '_01';
    const Y = 'st_t_' + CLASS + '_02';

    // ---------- 1. 新增 ----------
    console.log('\n[1] 新增学生，学号重复必须被拒');
    const add = await h.store.v3CreateStudent({ no: '910', name: '新增丙', group: 2 });
    h.assert(add.ok === true && add.no === '910', '新增学生成功并落到学号 910', add);
    h.assert(h.student(add.studentId) && h.student(add.studentId).name === '新增丙', '库里姓名正确', h.student(add.studentId) && h.student(add.studentId).name);
    const dup = await h.store.v3CreateStudent({ no: '910', name: '撞号丁', group: 2 });
    h.assert(dup.ok === false && dup.reason === 'duplicate-no', '学号 910 再新增被明确拒绝（duplicate-no）', dup);
    h.assert(h.rows('SELECT COUNT(*) AS c FROM students WHERE class_id = ?', [CLASS])[0].c === 4,
        '被拒的新增没有多出一条学生记录（仍是 4 人）', h.rows('SELECT COUNT(*) AS c FROM students WHERE class_id = ?', [CLASS])[0]);

    // ---------- 2. 改名 ----------
    console.log('\n[2] 改名：只改姓名，不碰经验/等级/物种');
    const sc = await h.store.v3Score({ studentIds: [X], delta: 60, reason: '先给点经验', subjectCode: 'chinese' });
    h.assert(sc.ok === true, '给 X 先加 60 EXP（用于验证改名不丢数值）', sc);
    const beforeRename = h.pet(X, 'subj_chinese');
    const ren = await h.store.v3SaveStudentProfile({ studentId: X, name: '改名后的甲' });
    h.assert(ren.ok === true, '改名成功', ren);
    const afterRename = h.pet(X, 'subj_chinese');
    h.assert(h.student(X).name === '改名后的甲', '库里姓名已更新', h.student(X).name);
    h.assert(Number(afterRename.exp) === Number(beforeRename.exp) && Number(afterRename.level) === Number(beforeRename.level) &&
        afterRename.species_code === beforeRename.species_code,
        '改名没有改动经验/等级/物种', { exp: afterRename.exp, lv: afterRename.level, sp: afterRename.species_code });
    h.assert(h.rows('SELECT COUNT(*) AS c FROM students WHERE class_id = ?', [CLASS])[0].c === 4, '改名不会让学生数变化', 4);
    const emptyName = await h.store.v3SaveStudentProfile({ studentId: X, name: '   ' });
    h.assert(emptyName.ok === false && emptyName.reason === 'bad-name', '改成空姓名被拒绝', emptyName);
    h.assert(h.student(X).name === '改名后的甲', '被拒的空姓名没有把库里的名字改掉', h.student(X).name);

    // ---------- 3. 改学号：撞号必须明确拒绝 ----------
    console.log('\n[3] 改学号：撞到别人的学号时，必须明确拒绝，不得静默改号');
    const noY = String(h.student(Y).student_no);
    const strictDup = h.svc.saveStudent({ id: X, student_no: noY, name: '改名后的甲', group: 1 }, CLASS, { strictStudentNo: true });
    h.assert(strictDup.success === false && strictDup.reason === 'duplicate-no',
        '严格保存路径（v3 新增/CSV 导入用的就是它）撞号被拒：duplicate-no', strictDup);
    h.assert(String(h.student(X).student_no) !== noY, '被拒后 X 的学号没有被改成别人的学号', h.student(X).student_no);

    const memBefore = (h.store.students.filter(s => s.id === X)[0] || {}).no;
    const upd = await h.store.updateStudent(X, { no: noY });   // 老教师台"编辑学生"走的就是这条路径
    const dbNoAfter = String(h.student(X).student_no);
    const memNoAfter = (h.store.students.filter(s => s.id === X)[0] || {}).no;
    h.assert(dbNoAfter !== noY, '库里没有出现两个同学号（X 没被写成 Y 的学号）', { X: dbNoAfter, Y: noY });
    h.assert(dbNoAfter === String(noY) || (upd && (upd.error || upd.reason || upd.rejected)),
        '改学号撞号时必须有明确的失败信号（当前 updateStudent 已把库里的学号静默改成 ' + dbNoAfter + '，返回值里没有任何报错）',
        { returned: upd && { no: upd.no, name: upd.name }, dbNo: dbNoAfter, requested: noY });
    h.assert(String(memNoAfter) === dbNoAfter,
        '内存名单里的学号必须与库一致（否则老师看到 #' + noY + '，库里其实是 #' + dbNoAfter + '）',
        { memory: memNoAfter, db: dbNoAfter, before: memBefore });
    h.assert(h.rows("SELECT COUNT(*) AS c FROM students WHERE class_id = ? AND student_no = ? AND id != ?", [CLASS, dbNoAfter, X])[0].c === 0,
        '库里的新学号是唯一的（没有抢别人号）', dbNoAfter);

    // ---------- 4. 归档 ----------
    console.log('\n[4] 归档：不能再赋分，重启后仍是归档态');
    const arc = await h.store.archiveStudent(Y);
    h.assert(arc === true, '归档成功', arc);
    h.assert(!!h.student(Y).archived_at, '库里写入 archived_at', h.student(Y).archived_at);
    const vmArc = await h.viewModel();
    const yArc = vmArc.students.filter(s => s.id === Y)[0];
    h.assert(yArc && yArc.isArchived === true, '页面视图标记为已归档', yArc && yArc.isArchived);
    const scArc = await h.store.v3Score({ studentIds: [Y], delta: 5, reason: '归档还能加分吗', subjectCode: 'chinese' });
    h.assert(scArc.ok === false && scArc.reason === 'no-eligible', '已归档学生不可赋分（no-eligible）', scArc);
    h.assert((scArc.skipped || []).some(s => s.reason === 'ARCHIVED'), '跳过原因明确写成 ARCHIVED', scArc.skipped);
    h.assert(Number(h.pet(Y, 'subj_chinese').exp) === 0, '归档学生被拒后经验没变', h.pet(Y, 'subj_chinese').exp);

    const res2 = await h.store.restoreStudent(Y);
    h.assert(res2 === true && !h.student(Y).archived_at, '还原归档后 archived_at 清空', h.student(Y).archived_at);

    const arc2 = await h.store.archiveStudent(Y);
    await h.restart();
    h.setAccount({ id: 'acc_teach_roster', classId: CLASS });
    h.setSubject('chinese');
    await h.store.loadFromSQLite();
    h.assert(!!h.student(Y).archived_at, '重启后仍是归档态（归档状态落库了）', arc2 && h.student(Y).archived_at);
    const vmArcR = await h.viewModel();
    const yArcR = vmArcR.students.filter(s => s.id === Y)[0];
    h.assert(yArcR && yArcR.isArchived === true, '重启后页面仍显示已归档', yArcR && yArcR.isArchived);

    // ---------- 5. 永久删除 ----------
    console.log('\n[5] 删除：学生与其宠物一起消失，重启不会复活');
    const scDel = await h.store.v3Score({ studentIds: [X], delta: 5, reason: '删除前留一笔流水', subjectCode: 'chinese' });
    h.assert(scDel.ok === true, '删除前 X 有一笔流水', scDel);
    const entriesBeforeDelete = h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE student_id = ?', [X])[0].c;
    const del = await h.store.deleteStudentPermanent(X);
    h.assert(del === true, '删除返回成功', del);
    h.assert(!h.student(X), '库里学生行已删除', h.student(X));
    h.assert(h.rows('SELECT COUNT(*) AS c FROM pets WHERE student_id = ?', [X])[0].c === 0, '该学生的宠物行一并删除', 0);
    const entriesAfterDelete = h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE student_id = ?', [X])[0].c;
    h.warn('删除前该学生有 ' + entriesBeforeDelete + ' 条历史流水，删除后剩 ' + entriesAfterDelete + ' 条（deleteStudent 会一并清流水明细，台账会缺这笔）');
    const vmDel = await h.viewModel();
    h.assert(!vmDel.students.some(s => s.id === X), '页面名单里不再有这名学生', vmDel.students.length);

    await h.restart();
    h.setAccount({ id: 'acc_teach_roster', classId: CLASS });
    await h.store.loadFromSQLite();
    h.assert(!h.student(X), '重启后被删除的学生没有复活', h.student(X));
    const vmDelR = await h.viewModel();
    h.assert(!vmDelR.students.some(s => s.id === X), '重启后页面名单里也没有他', vmDelR.students.map(s => s.id));
    h.assert(vmDelR.students.length === 3, '班里剩下 3 人（4 人 - 删除 1 人）', vmDelR.students.length);

    h.teardown();
    h.summary();
});
