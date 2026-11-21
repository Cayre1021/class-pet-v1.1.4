// probe_archive_newclass.cjs —— 新注册班级（dbId 是长串）里"移出班级"必须真的移除卡片
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-an-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-andb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,260):''));failed++;} };
function regIpc(){ const h=(ch,fn)=>ipcMain.handle(ch,async(e,pl)=>{try{return await fn(pl);}catch(err){return {success:false,error:String(err&&err.message||err)};}});
 h('db:loadAllState',c=>svc.loadAllState(c||'c_class02_01')); h('db:recordScore',p=>svc.recordScoreOperation(p));
 h('db:undoScore',id=>svc.undoOperation(id)); h('db:getStudentAuditLogs',s=>svc.getStudentAuditLogs(s));
 h('db:hatchPet',p=>svc.hatchStudentPet(p)); h('db:saveStudent',p=>svc.saveStudent(p.student,p.classId||'c_class02_01',p.options));
 h('db:importStudents',p=>svc.importStudents(p.students,p.classId||'c_class02_01'));
 h('db:saveAllStudents',p=>svc.saveAllStudents(p.students,p.classId||'c_class02_01'));
 h('db:archiveStudent',p=>svc.archiveStudent(p.studentId,p.isArchived,p.classId)); h('db:deleteStudent',p=>svc.deleteStudent(p.studentId,p.classId));
 h('db:saveThresholds',p=>svc.saveThresholds(p.thresholds,p.stages,p.classId||'c_class02_01'));
 h('db:saveBehaviorRules',p=>svc.saveBehaviorRules(p.rules,p.classId||'c_class02_01'));
 h('db:getClassLedger',p=>svc.getClassLedger(p.classId||'c_class02_01',p.fromTs,p.toTs));
 h('db:updateStudentProfile',p=>svc.updateStudentProfile(p.studentId,p.patch||{},p.classId||'c_class02_01'));
 h('db:restoreClassBackup',p=>svc.restoreClassBackup(p.classId||'c_class02_01',p.payload));
 h('db:query',p=>svc.query(p.sql,p.params||[])); h('db:execute',p=>svc.execute(p.sql,p.params||[]));
 h('db:createClass',p=>svc.createClassWithDefaults(p)); h('db:archiveSemester',p=>svc.archiveSemester(p&&p.classId));
 h('db:getSubjectUnlocks',(c)=>svc.getUnlockedSubjects(c)); h('db:unlockSubject',p=>svc.unlockSubject(p.classId,p.code));
 h('db:getClassSubjects',(c)=>svc.getClassSubjects(c));
 h('app:get-version',()=>'1.3.2'); h('update:check',()=>({ok:true,current:'1.3.2',latest:'1.3.2',hasUpdate:false})); }
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 新注册班级里移出学生 ==');
 const C='c_acc_probe_new';
 svc.createClassWithDefaults({ classId:C, className:'新班', teacherName:'新老师', subjectCode:'chinese' });
 ['st_probe_new_1','st_probe_new_2','st_probe_new_3'].forEach(function(id, i){
   svc.saveStudent({ id:id, student_no:String(i+1), name:'新同学'+String.fromCharCode(65+i), group:1, pets:{} }, C);
 });
 console.log('  库内学生 id: ' + JSON.stringify(svc.query("SELECT id FROM students WHERE class_id=? ORDER BY student_no",[C]).map(r=>r.id)));

 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_portal.html').replace(/\\/g,'/'));
 await sleep(500);
 await js("localStorage.setItem('classpet_current_account', JSON.stringify({id:'acc_pn',classId:'"+C+"',className:'新班',teacherName:'新老师',subject:'语文'})), localStorage.setItem('classpet_active_account_id','acc_pn'), localStorage.setItem('classpet_current_teaching_subject','语文'), true");
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2800);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说|关闭/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(300);
 const before = await js("document.querySelectorAll('.stu-row[data-stu]').length");
 assert(before === 3, '前置：新班显示 3 张卡片', before);
 // 点第一行的 ⋯ -> 移出班级 -> 确认
 await js("(function(){var m=document.querySelector('.stu-row .stu-more');if(m)m.click();return true;})()");
 await sleep(300);
 await js("(function(){var b=document.querySelector('[data-row-action=\"archive\"]');if(b)b.click();return true;})()");
 await sleep(600);
 await js("(function(){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /移出班级/.test(x.textContent);})[0];if(b)b.click();return true;})()");
 await sleep(2600);
 const after = await js("document.querySelectorAll('.stu-row[data-stu]').length");
 const toastTxt = await js("(function(){var t=document.getElementById('toast');return t?t.textContent.trim():'';})()");
 console.log('  点后 toast: ' + toastTxt);
 assert(after === 2, '★ 新班里移出后卡片 3 → 2（旧版这里不动，因为传了页面序号）', {before:before, after:after});
 const archived = svc.query("SELECT id, name FROM students WHERE class_id=? AND archived_at IS NOT NULL",[C]);
 assert(archived.length === 1, '库里恰好 1 人已归档（不是 0 也不是多个）', archived);
 // 已移出名单 -> 恢复
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open)d.close();var m=document.querySelector('[data-action=\"archived\"]');if(m)m.click();return true;})()");
 await sleep(800);
 const arkDlg = await js("(function(){var d=document.getElementById('dlg');if(!d||!d.open)return null;return {title:document.getElementById('dlg-title').textContent, body:document.getElementById('dlg-body').textContent, btns:[].slice.call(document.querySelectorAll('#dlg-foot button')).map(function(b){return b.textContent.trim();})};})()");
 assert(!!arkDlg && /已移出名单/.test(arkDlg.title), '数据与设置里有「已移出名单」入口', arkDlg && arkDlg.title);
 assert(!!arkDlg && /新同学A/.test(arkDlg.body), '★ 刚移出的学生出现在已移出名单里', arkDlg && arkDlg.body.slice(0,60));
 assert(!!arkDlg && arkDlg.btns.some(function(x){return /恢复 新同学A/.test(x);}), '★ 提供「恢复」按钮', arkDlg && arkDlg.btns);
 await js("(function(){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /恢复 新同学A/.test(x.textContent);})[0];if(b)b.click();return true;})()");
 await sleep(2600);
 const restored = await js("document.querySelectorAll('.stu-row[data-stu]').length");
 assert(restored === 3, '★ 恢复后卡片回到 3 张（' + after + ' → ' + restored + '）', restored);
 const stillArchived = svc.query("SELECT COUNT(*) n FROM students WHERE class_id=? AND archived_at IS NOT NULL",[C])[0].n;
 assert(Number(stillArchived) === 0, '库里已无归档学生', stillArchived);

 win.destroy();
 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});