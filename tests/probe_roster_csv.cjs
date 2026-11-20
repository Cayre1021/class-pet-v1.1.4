// probe_roster_csv.cjs —— 验收同学报的 #1：CSV 导入必须按学号识别，不能按姓名改错人
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'); const fs = require('fs'); const os = require('os');
const ROOT = path.join(__dirname, '..');
const { SQLiteService } = require(path.join(ROOT, 'electron-app', 'sqlite_service.js'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.setPath('userData', path.join(os.tmpdir(), 'cp-csv-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-csvdb-'));
const tmpDb = path.join(tmpDir, 'classpet.sqlite');
fs.copyFileSync(path.join(ROOT, 'database', 'classpet.sqlite'), tmpDb);
const srcMtime = fs.statSync(path.join(ROOT, 'database', 'classpet.sqlite')).mtimeMs;

let svc = null, passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 300) : '')); failed++; } };
const q = (s, p) => svc.query(s, p || []);

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
    const CLASS = 'c_class02_01';
    console.log('== CSV 导入按学号识别（同名不同人不得串改）==');

    // 造一名 9801 张伟，语文经验 5
    const seeded = svc.saveStudent({ id: 'st_csv_9801', student_no: '9801', name: '张伟', group: 1, pets: { chinese: { species: 'cat', exp: 5, level: 1, visualStage: 1 } } }, CLASS);
    assert(seeded && seeded.success === true, '准备学生 9801 张伟 成功', seeded);
    const before = q("SELECT id, student_no, name FROM students WHERE class_id = ? ORDER BY id", [CLASS]);
    const beforeCount = before.length;
    const expBefore = q("SELECT exp FROM pets WHERE student_id='st_csv_9801' AND subject_id='subj_chinese'")[0].exp;

    const win = new BrowserWindow({ width: 1600, height: 900, show: false, webPreferences: { contextIsolation: true, preload: path.join(ROOT, 'electron-app', 'preload.js') } });
    const js = c => win.webContents.executeJavaScript(c, true);
    const errs = [];
    win.webContents.on('console-message', function () { const a = [].slice.call(arguments); const d = a[1]; const lvl = (typeof d === 'object' && d) ? d.level : a[1]; const msg = (typeof d === 'object' && d) ? d.message : a[2]; if (lvl === 'error' || lvl === 3) errs.push(String(msg).slice(0, 160)); });
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', 'v3_teacher_desk.html').replace(/\\/g, '/'));
    await sleep(2500);

    // 打开数据菜单 → Excel 弹窗 → 点「导入名单 CSV」（置 pendingImport），并用 DataTransfer 注入文件
    const csv = '9902,张伟,2,3,40,cat,在读\n';
    await js('window.__csvText = ' + JSON.stringify(csv) + '; true');
    const step = await js(`(function(){
        try {
            document.getElementById('btn-data-menu').click();
            var item = document.querySelector('[data-action="excel"]');
            if (!item) return 'no-excel-item';
            item.click();
            var inp = document.getElementById('file-input');
            if (!inp) return 'no-input';
            var orig = inp.click.bind(inp);
            inp.click = function(){};                       // 拦掉原生文件对话框
            var importBtn = [].slice.call(document.querySelectorAll('button')).filter(function(b){ return /导入名单 CSV/.test(b.textContent); })[0];
            if (!importBtn) { inp.click = orig; return 'no-import-btn'; }
            importBtn.click();                              // 设置 pendingImport='roster'
            var dt = new DataTransfer();
            dt.items.add(new File([window.__csvText], 'roster.csv', { type: 'text/csv' }));
            inp.files = dt.files;
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            inp.click = orig;
            return 'ok';
        } catch (e) { return 'err:' + e.message; }
    })()`);
    console.log('  注入步骤: ' + step);
    await sleep(3000);

    const after = q("SELECT id, student_no, name FROM students WHERE class_id = ? ORDER BY id", [CLASS]);
    const byId = id => after.filter(r => r.id === id)[0];
    assert(byId('st_csv_9801') && byId('st_csv_9801').student_no === '9801', '原学生 9801 的学号没有被改', byId('st_csv_9801'));
    assert(byId('st_csv_9801') && byId('st_csv_9801').name === '张伟', '原学生姓名仍是张伟', byId('st_csv_9801'));
    const expAfter = q("SELECT exp FROM pets WHERE student_id='st_csv_9801' AND subject_id='subj_chinese'")[0].exp;
    assert(Number(expAfter) === Number(expBefore), '原学生经验没有被 CSV 覆盖（' + expBefore + '）', expAfter);
    const created = after.filter(r => r.student_no === '9902');
    assert(created.length === 1 && created[0].name === '张伟' && created[0].id !== 'st_csv_9801',
        '新增了一条 9902 张伟（与 9801 是不同的人）', created);
    assert(after.length === beforeCount + 1, '学生总数只 +1（没有覆盖、没有丢失）', { before: beforeCount, after: after.length });
    // 其它学生一个都没被改号
    const changed = before.filter(b => { const a2 = after.filter(r => r.id === b.id)[0]; return !a2 || a2.student_no !== b.student_no || a2.name !== b.name; });
    assert(changed.length === 0, '其余 ' + beforeCount + ' 名学生的学号/姓名一个都没变', changed.slice(0, 3));
    assert(errs.length === 0, '导入过程 0 控制台错误', errs);
    assert(fs.statSync(path.join(ROOT, 'database', 'classpet.sqlite')).mtimeMs === srcMtime, '正式库原件未被修改');

    win.destroy();
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('探针异常:', e); app.exit(2); });
