// probe_hatch_ui.cjs —— 破壳：蛋显示进度/按钮灰 → 到 50 可点 → 点了才孵化（真页面）
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'); const fs = require('fs'); const os = require('os');
const ROOT = process.cwd();
const { SQLiteService } = require(path.join(ROOT, 'electron-app', 'sqlite_service.js'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.setPath('userData', path.join(os.tmpdir(), 'cp-hatchui-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-hatchuidb-'));
const db = path.join(tmp, 'classpet.sqlite');
fs.copyFileSync(path.join(ROOT, 'database', 'classpet.sqlite'), db);
let svc = null, passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 300) : '')); failed++; } };
function regIpc() {
    const h = (ch, fn) => ipcMain.handle(ch, async (e, pl) => { try { return await fn(pl); } catch (err) { return { success: false, error: String(err && err.message || err) }; } });
    h('db:loadAllState', c => svc.loadAllState(c || 'c_class02_01'));
    h('db:recordScore', p => svc.recordScoreOperation(p));
    h('db:undoScore', id => svc.undoOperation(id));
    h('db:getStudentAuditLogs', s => svc.getStudentAuditLogs(s));
    h('db:hatchPet', p => svc.hatchStudentPet(p));
    h('db:saveStudent', p => svc.saveStudent(p.student, p.classId || 'c_class02_01'));
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
}
const clickCardJs = (name) => "(function(){var cards=[].slice.call(document.querySelectorAll('.pet-card'));var t=cards.filter(function(c){return (c.textContent||'').indexOf(" + JSON.stringify(name) + ")>=0;})[0];if(!t) return null;t.click();return t.getAttribute('data-id');})()";

app.whenReady().then(async () => {
    svc = new SQLiteService();
    await svc.init(null, db);
    svc.isInitialized = true;
    svc.initDefaultTables();
    svc.migrateLegacyDefaultThresholds();
    svc.migrateHatchRuleV3();
    regIpc();
    const CLASS = 'c_class02_01';
    console.log('== 破壳 UI/逻辑端到端 ==');
    const NAME = '破壳探针甲';
    const created = svc.saveStudent({ id: 'st_hatch_ui_1', student_no: '98', name: NAME, group: 1, pets: {} }, CLASS);
    const eggId = svc.query("SELECT id FROM pets WHERE student_id = 'st_hatch_ui_1' AND subject_id = 'subj_chinese'")[0].id;
    const egg = svc.query("SELECT * FROM pets WHERE id = ?", [eggId])[0];
    egg.name = NAME;
    egg.id = eggId;
    assert(created.success === true && egg.exp === 0 && egg.hatched_at === null, '新建一个 0 经验的蛋学生', { exp: egg.exp, hatched: egg.hatched_at });

    const win = new BrowserWindow({ width: 1600, height: 900, show: false, webPreferences: { contextIsolation: true, preload: path.join(ROOT, 'electron-app', 'preload.js') } });
    const js = c => win.webContents.executeJavaScript(c, true);
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', 'v3_looseleaf_paper.html').replace(/\\/g, '/'));
    await sleep(2200);

    const clicked = await js(clickCardJs(egg.name));
    assert(!!clicked, '找到并点开这名蛋学生（' + egg.name + '）', clicked);
    await sleep(600);
    const insp = await js("(function(){var i=document.getElementById('ins-body');return i?i.innerText.replace(/\\s+/g,' '):'';})()");
    assert(/破壳进度/.test(insp) && /50/.test(insp), '检查器显示「破壳进度 X / 50 EXP」', insp.slice(0, 110));
    const btnDisabled = await js("(function(){var b=document.getElementById('btn-hatch');return b?!!b.disabled:null;})()");
    assert(btnDisabled === true, '经验不足时「破壳孵化」按钮禁用', btnDisabled);
    const img = await js("(function(){var i=document.getElementById('ins-pet');return i?i.getAttribute('src'):null;})()");
    assert(/egg\.png$/.test(String(img)), '宠物图仍是蛋', img);
    assert(svc.query("SELECT hatched_at FROM pets WHERE id = ?", [egg.id])[0].hatched_at === null, '此时 unmigrated 记录 hatched_at 仍为空');

    const up = svc.recordScoreOperation({ classId: CLASS, teacherId: 't_probe', studentIds: ['st_hatch_ui_1'], delta: 50, reason: '加到破壳线', subjectCode: 'chinese' });
    assert(up.success === true, '给探针学生加 50 分（走真实计分）', up.success);
    await win.webContents.reload(); await sleep(2000);
    await js(clickCardJs(egg.name)); await sleep(600);
    const insp2 = await js("(function(){var i=document.getElementById('ins-body');return i?i.innerText.replace(/\\s+/g,' '):'';})()");
    const btn2 = await js("(function(){var b=document.getElementById('btn-hatch');return b?{disabled:!!b.disabled}:null;})()");
    assert(/可以破壳了/.test(insp2) && btn2 && btn2.disabled === false, '到 50 才提示可破壳、按钮可点', { insp: insp2.slice(0, 90), btn2 });
    assert(svc.query("SELECT hatched_at FROM pets WHERE id = ?", [egg.id])[0].hatched_at === null, '到 50 但未点击前仍未孵化');

    const srcAfter = await js("(async function(){var b=document.getElementById('btn-hatch');if(!b)return 'no-btn';b.click();await new Promise(function(r){setTimeout(r,1800);});var i=document.getElementById('ins-pet');return i?i.getAttribute('src'):null;})()");
    const row = svc.query("SELECT species_code, visual_stage, hatched_at FROM pets WHERE id = ?", [egg.id])[0];
    assert(!!row.hatched_at && Number(row.visual_stage) >= 1, '点「破壳孵化」后才真正孵化', row);
    assert(/pets\/(cat|dog|bunny|hamster|bird|deer|fish|fox)\//.test(String(srcAfter || '')), '孵化后宠物图换成真实宠物', srcAfter);

    win.destroy();
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    try { svc.db.close(); } catch (e) {}
    fs.rmSync(tmp, { recursive: true, force: true });
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('探针异常:', e); app.exit(2); });
