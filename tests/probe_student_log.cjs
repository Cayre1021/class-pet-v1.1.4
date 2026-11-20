// probe_student_log.cjs —— 第10条：教师台学生日志必须显示真实数据库流水（原来 IPC 传函数报 clone 错）
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'); const fs = require('fs'); const os = require('os');
const ROOT = path.join(__dirname, '..');
const { SQLiteService } = require(path.join(ROOT, 'electron-app', 'sqlite_service.js'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.setPath('userData', path.join(os.tmpdir(), 'cp-log-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-logdb-'));
const tmpDb = path.join(tmpDir, 'classpet.sqlite');
fs.copyFileSync(path.join(ROOT, 'database', 'classpet.sqlite'), tmpDb);
let svc = null, passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 300) : '')); failed++; } };
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
    svc = new SQLiteService(); await svc.init(null, tmpDb); svc.isInitialized = true; regIpc();
    const CLASS = 'c_class02_01';
    console.log('== 第10条 学生日志（真实数据库流水）==');
    // 先造两笔真实赋分
    const st = svc.query("SELECT id FROM students WHERE class_id = ? ORDER BY student_no LIMIT 1", [CLASS])[0];
    const op1 = svc.recordScoreOperation({ classId: CLASS, teacherId: 't_x', studentIds: [st.id], delta: 5, reason: '日志探针加分', subjectCode: 'chinese' });
    const op2 = svc.recordScoreOperation({ classId: CLASS, teacherId: 't_x', studentIds: [st.id], delta: 3, reason: '日志探针第二笔', subjectCode: 'chinese' });
    assert(op1.success === true && op2.success === true, '准备两笔真实赋分', { op1: op1.success, op2: op2.success });

    const win = new BrowserWindow({ width: 1600, height: 900, show: true, focusable: true, webPreferences: { contextIsolation: true, preload: path.join(ROOT, 'electron-app', 'preload.js') } });
    win.focus();
    const js = c => win.webContents.executeJavaScript(c, true);
    const clickAt = async (x, y) => {
        win.webContents.sendInputEvent({ type: 'mouseDown', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
        await sleep(250);
    };
    const rectOf = async (sel) => js('(function(){var e=document.querySelector(' + JSON.stringify(sel) + '); if(!e) return null; var r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2};})()');
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', 'v3_teacher_desk.html').replace(/\\/g, '/'));
    await sleep(2500);

    const rMore = await rectOf('.stu-row .stu-more');
    assert(!!rMore, '找到行内「⋯」按钮', rMore);
    await clickAt(rMore.x, rMore.y);
    const diag = await js(`(function(){
        var item = document.querySelector('[data-row-action="log"]');
        var menu = document.getElementById('row-menu');
        var r = item.getBoundingClientRect();
        var hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
        return { menuHidden: menu && menu.hidden, menuRect: menu ? {t: Math.round(menu.getBoundingClientRect().top), l: Math.round(menu.getBoundingClientRect().left), w: Math.round(menu.getBoundingClientRect().width), h: Math.round(menu.getBoundingClientRect().height)} : null,
                 itemRect: {t: Math.round(r.top), l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height)},
                 hitTag: hit ? hit.tagName + '.' + (hit.className || '') : null, hitIsItem: hit === item || (!!hit && item.contains(hit)) };
    })()`);
    console.log('  菜单诊断: ' + JSON.stringify(diag));
    const rLog = await rectOf('[data-row-action="log"]');
    assert(!!rLog, '行菜单里出现「学生日志」项', rLog);
    await clickAt(rLog.x, rLog.y);
    await sleep(400);
    const viaDispatch = await js("(function(){var i=document.querySelector('[data-row-action=\"log\"]'); if(i){ i.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); return 'dispatched'; } return 'missing';})()");
    console.log('  备选路径: ' + viaDispatch);
    await sleep(1600);
    const opened = await js(`(async function(){
        for (var i = 0; i < 12; i++) {
          var d0 = document.getElementById('dlg');
          if (d0 && d0.open) break;
          await new Promise(function(r){ setTimeout(r, 150); });
        }
        var dlg = document.getElementById('dlg');
        var open = dlg && (dlg.open === true || dlg.hasAttribute('open'));
        var txt = open ? (dlg.innerText || '').replace(/\\s+/g, ' ') : '';
        var allD = dlg ? [{ open: dlg.open, title: (document.getElementById('dlg-title')||{}).textContent, sub: (document.getElementById('dlg-sub')||{}).textContent }] : [];
        var t = document.getElementById('toast');
        return { dialog: !!open, text: txt.slice(0, 600), hasCloneErr: /could not be cloned/.test(txt), rows: (open ? dlg.querySelectorAll('.log-item').length : 0),
                 toast: t ? t.textContent.trim().slice(0, 120) : null, dialogs: allD.slice(0, 6),
                 errs: (window.__v3ConsoleErrors || []).slice(-3) };
    })()`);
    assert(opened && opened.dialog === true, '学生日志弹窗打开', opened);
    assert(opened && opened.hasCloneErr === false, '不再出现 "An object could not be cloned"', opened);
    assert(opened && opened.rows >= 2, '日志里有真实流水行（' + (opened && opened.rows) + ' 行）', opened);
    assert(opened && /日志探针加分/.test(opened.text) && /语文/.test(opened.text), '日志显示规则名与学科', opened && opened.text.slice(0, 200));
    assert(opened && /日志探针第二笔/.test(opened.text), '第二笔也在日志里', opened && opened.text.slice(0, 200));
    assert(opened && !/模拟数据/.test(opened.text), '弹窗里不再有「模拟数据 · 演示原型」', opened && opened.text.slice(0, 200));
    win.destroy();
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('探针异常:', e); app.exit(2); });
