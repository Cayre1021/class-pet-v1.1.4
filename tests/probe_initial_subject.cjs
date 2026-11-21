// probe_initial_subject.cjs —— 首进教师台：滑块必须在"本班主科"，自定义科也必须可切换
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-init-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-initdb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
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
 h('db:createClass',p=>svc.createClassWithDefaults(p));
 h('db:getSubjectUnlocks',(c)=>svc.getUnlockedSubjects(c));
 h('db:unlockSubject',p=>svc.unlockSubject(p.classId, p.code));
 h('db:getClassSubjects',(c)=>svc.getClassSubjects(c));
 h('app:get-version',()=>'1.2.7'); h('update:check',()=>({ok:true,current:'1.2.7',latest:'1.2.7',hasUpdate:false})); }
const STATE = "(function(){var seg=document.getElementById('subject-seg-2');var on=[].slice.call(seg.querySelectorAll('button')).filter(function(b){return b.getAttribute('aria-pressed')==='true';}).map(function(b){return b.getAttribute('data-subject');});var dock=document.getElementById('dock-subject');return {pressed:on, dock:dock?dock.textContent:'', labels:[].slice.call(seg.querySelectorAll('button')).map(function(b){return b.getAttribute('data-subject')+(b.classList.contains('is-locked')?'(锁)':'');})};})()";
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 首进教师台的学科滑块 ==');
 const MATH='c_init_math', SCI='c_init_science';
 svc.createClassWithDefaults({ classId: MATH, className:'数学班', teacherName:'数学老师', subjectCode:'math' });
 svc.saveStudent({ id:'st_m1', student_no:'1', name:'甲', group:1, pets:{} }, MATH);
 svc.createClassWithDefaults({ classId: SCI, className:'科学班', teacherName:'科学老师', subjectCode:'custom', subjectLabel:'科学' });
 svc.saveStudent({ id:'st_s1', student_no:'1', name:'乙', group:1, pets:{} }, SCI);

 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 const enter = async (classId, className, subject, stopper) => {
   await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_portal.html').replace(/\\/g,'/'));
   await sleep(500);
   await js("localStorage.setItem('classpet_current_account', JSON.stringify({id:'acc_"+classId+"',classId:'"+classId+"',className:'"+className+"',teacherName:'t',subject:'"+subject+"'})), localStorage.setItem('classpet_active_account_id','acc_"+classId+"'), localStorage.setItem('classpet_current_teaching_subject','"+stopper+"'), true");
   await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
   await sleep(2900);
   await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说|关闭/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
   await sleep(400);
   return js(STATE);
 };

 // ① 数学班：上次账号残留"语文"，首进必须自动落到数学
 const s1 = await enter(MATH, '数学班', '数学', '语文');
 assert(s1.pressed.join(',') === '数学', '★ 数学班首进：滑块在「数学」（不是残留的语文）', s1.pressed);
 assert(s1.dock === '数学课', '底部显示「数学课」', s1.dock);

 // ② 自定义科学班：上次残留"英语"，首进必须落到科学，且能正常切换
 const s2 = await enter(SCI, '科学班', '科学', '英语');
 assert(s2.pressed.join(',') === '科学', '★ 科学班首进：滑块在「科学」（不是残留的英语）', { pressed: s2.pressed, labels: s2.labels });
 assert(s2.dock === '科学课', '底部显示「科学课」', s2.dock);
 assert(s2.labels.join(',') === '科学,语文(锁),数学(锁),英语(锁)', '★ 科学无锁，其余三科带锁', s2.labels);

 // ③ 能切走再切回（自定义科不是"滑不过去"）
 await js("(function(){var b=[].slice.call(document.querySelectorAll('#subject-seg-2 button')).filter(function(x){return x.getAttribute('data-subject')==='数学';})[0];if(b)b.click();return true;})()");
 await sleep(500);
 const s3 = await js(STATE);
 assert(s3.dock === '科学课', '点未解锁的数学被拒绝（仍是科学课）', s3.dock);

 win.destroy();
 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});
