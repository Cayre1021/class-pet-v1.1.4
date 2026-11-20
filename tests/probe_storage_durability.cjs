// probe_storage_durability.cjs —— 回答「数据到底存在哪」：清空 localStorage 后数据还在不在
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'); const fs = require('fs'); const os = require('os');
const ROOT = path.join(__dirname, '..');
const { SQLiteService } = require(path.join(ROOT, 'electron-app', 'sqlite_service.js'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.setPath('userData', path.join(os.tmpdir(), 'cp-dura-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');

const srcDb = path.join(ROOT, 'database', 'classpet.sqlite');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-duradb-'));
const tmpDb = path.join(tmpDir, 'classpet.sqlite');
fs.copyFileSync(srcDb, tmpDb);

let svc = null; let passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 260) : '')); failed++; } };
const q = (sql, p) => svc.query(sql, p || []);

function regIpc() {
    const h = (ch, fn) => ipcMain.handle(ch, async (e, pl) => { try { return await fn(pl); } catch (err) { return { success: false, error: String(err && err.message || err) }; } });
    h('db:loadAllState', (c) => svc.loadAllState(c || 'c_class02_01'));
    h('db:recordScore', (p) => svc.recordScoreOperation(p));
    h('db:undoScore', (id) => svc.undoOperation(id));
    h('db:getStudentAuditLogs', (s) => svc.getStudentAuditLogs(s));
    h('db:hatchPet', (p) => svc.hatchStudentPet(p));
    h('db:saveStudent', (p) => svc.saveStudent(p.student, p.classId || 'c_class02_01'));
    h('db:importStudents', (p) => svc.importStudents(p.students, p.classId || 'c_class02_01'));
    h('db:saveAllStudents', (p) => svc.saveAllStudents(p.students, p.classId || 'c_class02_01'));
    h('db:archiveStudent', (p) => svc.archiveStudent(p.studentId, p.isArchived, p.classId));
    h('db:deleteStudent', (p) => svc.deleteStudent(p.studentId, p.classId));
    h('db:saveThresholds', (p) => svc.saveThresholds(p.thresholds, p.stages, p.classId || 'c_class02_01'));
    h('db:saveBehaviorRules', (p) => svc.saveBehaviorRules(p.rules, p.classId || 'c_class02_01'));
    h('db:getClassLedger', (p) => svc.getClassLedger(p.classId || 'c_class02_01', p.fromTs, p.toTs));
    h('db:updateStudentProfile', (p) => svc.updateStudentProfile(p.studentId, p.patch || {}, p.classId || 'c_class02_01'));
    h('db:restoreClassBackup', (p) => svc.restoreClassBackup(p.classId || 'c_class02_01', p.payload));
    h('db:query', (p) => svc.query(p.sql, p.params || []));
    h('db:execute', (p) => svc.execute(p.sql, p.params || []));
}

app.whenReady().then(async () => {
    svc = new SQLiteService();
    await svc.init(null, tmpDb);
    svc.isInitialized = true;
    regIpc();
    console.log('== 数据落在哪：清空 localStorage 后的耐久测试 ==');

    const win = new BrowserWindow({ width: 1600, height: 900, show: false, webPreferences: { contextIsolation: true, preload: path.join(ROOT, 'electron-app', 'preload.js') } });
    const js = c => win.webContents.executeJavaScript(c, true);
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', 'v3_teacher_desk.html').replace(/\\/g, '/'));
    await sleep(2500);

    const before = await js("(function(){var c=window.classPetRuntime;return c.getV3ViewModel();})()");
    const stu = before.students[0];
    assert(before.ok === true && before.students.length > 0, '页面数据来自数据库（VM ok + 学生 ' + before.students.length + ' 人）');
    const dbExp = q("SELECT exp FROM pets WHERE student_id = ? AND subject_id = 'subj_chinese'", [stu.id])[0].exp;
    assert(stu.petsBySubject.chinese.exp === dbExp, '页面显示的经验 = 数据库里的经验（' + dbExp + '）', { ui: stu.petsBySubject.chinese.exp, db: dbExp });

    const lsKeys = await js("Object.keys(localStorage).sort()");
    console.log('  页面写入的 localStorage 键：' + JSON.stringify(lsKeys));
    const businessInLs = lsKeys.filter(k => /^classpet_(v2_students_data|custom_level_thresholds|custom_stage_levels|custom_behavior_rules)/.test(k));
    assert(businessInLs.length === 0, '有数据库时 localStorage 里没有任何业务数据（只有身份/UI 偏好）', businessInLs);
    console.log('  实际键：' + JSON.stringify(lsKeys));

    // 关键：清空 localStorage 再重新加载，数据必须还在
    await js("localStorage.clear(); sessionStorage.clear();");
    await win.webContents.reload();
    await sleep(2500);
    const after = await js("(function(){var c=window.classPetRuntime;return c.getV3ViewModel();})()");
    const stu2 = after.students.filter(s => s.id === stu.id)[0];
    assert(after.ok === true && after.students.length === before.students.length, '清空 localStorage 后学生数不变（' + after.students.length + '）');
    assert(stu2 && stu2.petsBySubject.chinese.exp === dbExp, '清空 localStorage 后经验仍等于库值（' + dbExp + '）', stu2 && stu2.petsBySubject.chinese.exp);
    assert(stu2 && stu2.petsBySubject.chinese.level === stu.petsBySubject.chinese.level, '清空后等级不变（Lv.' + (stu2 && stu2.petsBySubject.chinese.level) + '）');
    assert(after.thresholds[1] === before.thresholds[1] && after.rules.length === before.rules.length, '清空后阈值与规则仍从库读出（L1=' + after.thresholds[1] + ', rules=' + after.rules.length + '）');

    // 停掉页面，直接用 node 读 SQLite 文件，证明磁盘上有数据
    win.destroy();
    const SQL = require(path.join(ROOT, 'electron-app', 'node_modules', 'sql.js'));
    const initSqlJs = SQL.default || SQL;
    const S = await initSqlJs();
    const raw = new S.Database(fs.readFileSync(tmpDb));
    const res = raw.exec("SELECT (SELECT COUNT(*) FROM students), (SELECT COUNT(*) FROM pets), (SELECT COUNT(*) FROM behavior_rules), (SELECT COUNT(*) FROM class_level_thresholds)");
    const [stN, petN, ruleN, thrN] = res[0].values[0];
    assert(stN > 0 && petN > 0 && ruleN > 0 && thrN === 21, 'SQLite 文件里有学生 ' + stN + ' / 宠物 ' + petN + ' / 规则 ' + ruleN + ' / 阈值 ' + thrN + ' 条');
    raw.close();
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('探针异常:', e); app.exit(2); });
