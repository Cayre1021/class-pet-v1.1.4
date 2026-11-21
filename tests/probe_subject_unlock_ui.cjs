// probe_subject_unlock_ui.cjs —— 以「数学」为主科的班级进教师台：数学按钮无锁、可切、可赋分且落库
// 跑法（仓库根目录）：npx electron tests/probe_subject_unlock_ui.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
const ROOT = process.cwd();
const { SQLiteService } = require(path.join(ROOT, 'electron-app', 'sqlite_service.js'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.on('window-all-closed', () => {});
app.setPath('userData', path.join(os.tmpdir(), 'cp-subju-ud-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-subjudb-'));
const db = path.join(tmp, 'classpet.sqlite');
fs.copyFileSync(path.join(ROOT, 'database', 'classpet.sqlite'), db);
let svc = null, passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 300) : '')); failed++; } };
function regIpc() {
    const h = (ch, fn) => ipcMain.handle(ch, async (e, pl) => { try { return await fn(pl); } catch (err) { return { success: false, error: String(err && err.message || err) }; } });
    h('db:loadAllState', c => svc.loadAllState(c || 'c_class02_01'));
    h('db:createClass', p => svc.createClassWithDefaults(p));
    h('db:recordScore', p => svc.recordScoreOperation(p));
    h('db:undoScore', id => svc.undoOperation(id));
    h('db:getStudentAuditLogs', s => svc.getStudentAuditLogs(s));
    h('db:hatchPet', p => svc.hatchStudentPet(p));
    h('db:saveStudent', p => svc.saveStudent(p.student, p.classId || 'c_class02_01', p.options));
    h('db:importStudents', p => svc.importStudents(p.students, p.classId || 'c_class02_01'));
    h('db:saveAllStudents', p => svc.saveAllStudents(p.students, p.classId || 'c_class02_01'));
    h('db:archiveStudent', p => svc.archiveStudent(p.studentId, p.isArchived, p.classId));
    h('db:deleteStudent', p => svc.deleteStudent(p.studentId, p.classId));
    h('db:saveThresholds', p => svc.saveThresholds(p.thresholds, p.stages, p.classId || 'c_class02_01'));
    h('db:saveBehaviorRules', p => svc.saveBehaviorRules(p.rules, p.classId || 'c_class02_01'));
    h('db:getClassLedger', p => svc.getClassLedger(p.classId || 'c_class02_01', p.fromTs, p.toTs));
    h('db:updateStudentProfile', p => svc.updateStudentProfile(p.studentId, p.patch || {}, p.classId || 'c_class02_01'));
    h('db:restoreClassBackup', p => svc.restoreClassBackup(p.classId || 'c_class02_01', p.payload));
    h('db:query', p => svc.query(p.sql, p.params || []));
    h('db:execute', p => svc.execute(p.sql, p.params || []));
    h('app:get-version', () => '1.2.2');
}
const SUBJECT_BTN_JS = "(function(){var out={};[].slice.call(document.querySelectorAll('#subject-seg button, #subject-seg-2 button')).forEach(function(b){var n=b.getAttribute('data-subject');var locked=b.classList.contains('is-locked');var hasLock=!!b.querySelector('.seg-lock');var dis=b.getAttribute('aria-disabled');if(!out[n]||locked)out[n]={locked:locked,hasLock:hasLock,ariaDisabled:dis};});return out;})()";
const CLICK_SUBJECT_JS = (name) => "(function(){var b=[].slice.call(document.querySelectorAll('#subject-seg-2 button')).filter(function(x){return x.getAttribute('data-subject')===" + JSON.stringify(name) + "})[0];if(!b)return 'no-btn';b.click();return document.getElementById('dock-subject')?document.getElementById('dock-subject').textContent:'no-dock';})()";

app.whenReady().then(async () => {
    svc = new SQLiteService();
    await svc.init(null, db);
    svc.isInitialized = true;
    svc.initDefaultTables();
    svc.migrateLegacyDefaultThresholds();
    svc.migrateHatchRuleV3();
    regIpc();
    console.log('== 主科（数学）在教师台无锁可赋分 ==');
    const CLASS = 'c_mathmain_ui';
    const made = svc.createClassWithDefaults({ classId: CLASS, className: '数学主科班UI', teacherName: '张老师', subjectCode: 'math', teacherId: 't_mathmain_ui' });
    assert(made && made.success === true, '建班：注册时选数学（default_subject_id=subj_math）', made);
    assert(svc.getClassDefaultSubject(CLASS) === 'math', 'svc.getClassDefaultSubject()=math', svc.getClassDefaultSubject(CLASS));
    const STU = 'st_mathmain_ui';
    const saved = svc.saveStudent({ id: STU, student_no: '93', name: '数学探针甲', group: 1, pets: {} }, CLASS);
    assert(saved && saved.success === true, '班里加 1 名学生（三科蛋宠）', saved);

    const win = new BrowserWindow({ width: 1600, height: 900, show: false, webPreferences: { contextIsolation: true, preload: path.join(ROOT, 'electron-app', 'preload.js') } });
    const js = c => win.webContents.executeJavaScript(c, true);
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', 'v3_teacher_desk.html').replace(/\\/g, '/'));
    await sleep(1200);
    await js("(function(){localStorage.setItem('classpet_current_account', JSON.stringify({id:'t_mathmain_ui',classId:'" + CLASS + "',className:'数学主科班UI',teacherName:'张老师',school:'实验小学本部',subject:'数学'}));localStorage.setItem('classpet_active_account_id','t_mathmain_ui');localStorage.setItem('classpet_current_teaching_subject','数学');localStorage.setItem('classpet_v3_unlock_seen',JSON.stringify({math:true,english:true}));return true;})()");
    await win.webContents.reload();
    await sleep(2600);

    // 桥接层：loadAllState 必须带出 defaultSubject
    const bridge = await js("(async function(){var st=await window.electronAPI.db.loadAllState('" + CLASS + "');return {defaultSubject:st.defaultSubject,students:st.students.length};})()");
    assert(bridge && bridge.defaultSubject === 'math', '桥接 loadAllState 返回 defaultSubject=math', bridge);

    const st1 = await js(SUBJECT_BTN_JS);
    assert(!!st1 && st1['数学'] && st1['数学'].locked === false && st1['数学'].hasLock === false && st1['数学'].ariaDisabled === 'false', '★ 教师台「数学」按钮无锁、可点（aria-disabled=false）', st1 && st1['数学']);
    assert(!!st1 && st1['语文'] && st1['语文'].locked === false, '「语文」仍无锁', st1 && st1['语文']);
    assert(!!st1 && st1['英语'] && st1['英语'].locked === true && st1['英语'].hasLock === true, '「英语」仍按链式规则显示锁', st1 && st1['英语']);

    const dockText = await js(CLICK_SUBJECT_JS('数学'));
    assert(dockText === '数学课', '★ 点「数学」后授课科目切到数学（底部显示数学课）', dockText);

    // 选学生 -> 点「小组之星 +5」-> 必须落库到数学宠物
    const sel = await js("(function(){var r=document.querySelector('.stu-row[data-stu]');if(!r)return 'no-row';r.click();return r.getAttribute('data-stu');})()");
    assert(sel && sel !== 'no-row', '选中这名学生', sel);
    await sleep(500);
    const scoreClick = await js("(function(){var b=document.querySelector('#dock-scroll [data-audit=\"score-star\"]')||document.querySelector('#dock-scroll [data-score=\"5\"]');if(!b)return 'no-btn';b.click();return b.getAttribute('data-rule')+'|'+b.getAttribute('data-score');})()");
    assert(scoreClick && scoreClick !== 'no-btn', '点赋分按钮「小组之星 +5」', scoreClick);
    console.log('  实际点击的规则=' + JSON.stringify(scoreClick));
    await sleep(1500);

    const mathExp = svc.query("SELECT exp FROM pets WHERE student_id = ? AND subject_id = 'subj_math'", [STU])[0];
    const cnExp = svc.query("SELECT exp FROM pets WHERE student_id = ? AND subject_id = 'subj_chinese'", [STU])[0];
    const opRow = svc.query("SELECT ent.exp_before, ent.exp_after FROM score_entries ent JOIN pets p ON p.id = ent.pet_id WHERE ent.student_id = ? AND p.subject_id = 'subj_math'", [STU]);
    assert(Number(mathExp && mathExp.exp) === 5, '★ 数学赋分已落库（subj_math.exp=5）', mathExp);
    assert(cnExp === undefined || Number(cnExp.exp) === 0, '语文没被误加分（仍 0）', cnExp);
    assert(opRow.length === 1 && Number(opRow[0].exp_after) === 5, 'score_entries 记在数学宠物上', opRow);
    const toast = await js("(function(){var t=document.querySelector('.toast,.toast-wrap,#toast');return t?t.textContent.replace(/\\s+/g,' ').slice(0,80):'';})()");
    console.log('  提示条=' + JSON.stringify(toast));

    win.destroy();
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmp, { recursive: true, force: true });
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('探针异常:', e); app.exit(2); });
