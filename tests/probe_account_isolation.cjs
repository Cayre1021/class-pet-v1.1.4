// probe_account_isolation.cjs —— 注册新账号后必须看到"自己的空班级"，绝不能串到上一个账号的数据
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const REG_JS = "(async function(){\n  document.getElementById('tab-register').click();\n  await new Promise(function(r){setTimeout(r,150);});\n  var c=document.getElementById('rg-class'), n=document.getElementById('rg-name');\n  c.value='测试班A'; c.dispatchEvent(new Event('input',{bubbles:true}));\n  n.value='王老师'; n.dispatchEvent(new Event('input',{bubbles:true}));\n  var yw=document.querySelector('#rg-subject input[value=\"语文\"]');\n  if(yw){yw.checked=true;yw.dispatchEvent(new Event('change',{bubbles:true}));}\n  document.getElementById('panel-register').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));\n  await new Promise(function(r){setTimeout(r,1800);});\n  var acc=null; try{acc=JSON.parse(localStorage.getItem('classpet_current_account'));}catch(e){}\n  var note=document.getElementById('entry-note');\n  return { acc: acc, note: note && !note.hidden ? note.textContent : '' };\n})()";
const CLOSE_AND_READ = "(function(){\n  var d=document.getElementById('dlg');\n  if(d&&d.open){var x=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(y){return /稍后再说/.test(y.textContent);})[0];if(x)x.click();}\n  return { text:(document.body.textContent||'').slice(0,4000), rows:document.querySelectorAll('.stu-row').length };\n})()";
app.on('window-all-closed',()=>{});
const UD = path.join(os.tmpdir(),'cp-acct-'+Date.now());
app.setPath('userData', UD);
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-acctdb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
function regIpc(){ const h=(ch,fn)=>ipcMain.handle(ch,async(e,pl)=>{try{return await fn(pl);}catch(err){return {success:false,error:String(err&&err.message||err)};}});
 h('db:loadAllState',c=>svc.loadAllState(c||'c_class02_01'));
 h('db:createClass',p=>svc.createClassWithDefaults(p));
 h('db:recordScore',p=>svc.recordScoreOperation(p)); h('db:undoScore',id=>svc.undoOperation(id));
 h('db:getStudentAuditLogs',s=>svc.getStudentAuditLogs(s)); h('db:hatchPet',p=>svc.hatchStudentPet(p));
 h('db:saveStudent',p=>svc.saveStudent(p.student,p.classId||'c_class02_01',p.options));
 h('db:importStudents',p=>svc.importStudents(p.students,p.classId||'c_class02_01'));
 h('db:saveAllStudents',p=>svc.saveAllStudents(p.students,p.classId||'c_class02_01'));
 h('db:archiveStudent',p=>svc.archiveStudent(p.studentId,p.isArchived,p.classId)); h('db:deleteStudent',p=>svc.deleteStudent(p.studentId,p.classId));
 h('db:saveThresholds',p=>svc.saveThresholds(p.thresholds,p.stages,p.classId||'c_class02_01'));
 h('db:saveBehaviorRules',p=>svc.saveBehaviorRules(p.rules,p.classId||'c_class02_01'));
 h('db:getClassLedger',p=>svc.getClassLedger(p.classId||'c_class02_01',p.fromTs,p.toTs));
 h('db:updateStudentProfile',p=>svc.updateStudentProfile(p.studentId,p.patch||{},p.classId||'c_class02_01'));
 h('db:restoreClassBackup',p=>svc.restoreClassBackup(p.classId||'c_class02_01',p.payload));
 h('db:query',p=>svc.query(p.sql,p.params||[])); h('db:execute',p=>svc.execute(p.sql,p.params||[]));
 h('app:get-version',()=> '1.2.1');
}

app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 账号隔离（注册 -> 只看到自己的空班级）==');
 const win=new BrowserWindow({width:1400,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_portal.html').replace(/\\/g,'/'));
 await sleep(1600);
 await js("(function(){localStorage.setItem('classpet_current_account', JSON.stringify({id:'acc_old',classId:'c_class02_01',className:'试验班0930',teacherName:'许',subject:'语文'}));localStorage.setItem('classpet_active_account_id','acc_old');return true;})()");
 const before = await js("JSON.parse(localStorage.getItem('classpet_current_account')).classId");
 assert(before === 'c_class02_01', '前置：缓存里是旧账号（试验班0930 -> c_class02_01）', before);

 const reg = await js(REG_JS);
 assert(!!reg && !!reg.acc, '注册后写入了当前账号缓存', reg && reg.acc);
 assert(reg.acc && reg.acc.className === '测试班A' && reg.acc.teacherName === '王老师', '账号缓存换成了新班级/新教师', reg.acc && { c: reg.acc.className, t: reg.acc.teacherName });
 assert(reg.acc && reg.acc.classId && reg.acc.classId !== 'c_class02_01', '★ 新账号拿到新 classId（不再是预设班）', reg.acc && reg.acc.classId);
 const newClassId = reg.acc.classId;
 const stuN = svc.query("SELECT COUNT(*) n FROM students WHERE class_id=?", [newClassId])[0].n;
 const thrN = svc.query("SELECT COUNT(*) n FROM class_level_thresholds WHERE class_id=?", [newClassId])[0].n;
 const rulN = svc.query("SELECT COUNT(*) n FROM behavior_rules WHERE class_id=?", [newClassId])[0].n;
 const stgN = svc.query("SELECT COUNT(*) n FROM class_visual_stages WHERE class_id=?", [newClassId])[0].n;
 assert(Number(stuN) === 0, '★ 新班级名单为空（0 人）', stuN);
 assert(Number(thrN) === 21 && Number(stgN) === 6 && Number(rulN) === 13, '新班级自带 21 级阈值 / 6 形态 / 13 条规则', { thr: thrN, stg: stgN, rul: rulN });
 assert(/独立班级/.test(reg.note || ''), '界面明确提示"已创建独立班级"', reg.note);

 const t=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const tjs=c=>t.webContents.executeJavaScript(c,true);
 await t.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2800);
 const view = await tjs(CLOSE_AND_READ);
 assert(/测试班A/.test(view.text), '★ 教师台显示新班级「测试班A」', view.text.slice(0,60));
 assert(!/试验班0930/.test(view.text), '★ 教师台不再出现「试验班0930」', /试验班0930/.test(view.text));
 assert(view.rows === 0, '★ 教师台名单为空（0 行）', view.rows);

 win.destroy(); t.destroy();
 console.log('\n结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try { fs.rmSync(tmp,{recursive:true,force:true}); } catch (e) {}
 try { fs.rmSync(UD,{recursive:true,force:true}); } catch (e) {}   /* 窗口占用时跳过清理，不影响结论 */
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});
