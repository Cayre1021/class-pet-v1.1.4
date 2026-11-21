// probe_multi_class_and_level.cjs —— 多班级切换（门户列表 + 教师台顶栏）+ 等级口径统一
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
const UD=path.join(os.tmpdir(),'cp-mc-'+Date.now());
app.setPath('userData', UD);
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-mcdb-'));
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
 h('db:archiveSemester',p=>svc.archiveSemester(p&&p.classId));
 h('db:getSubjectUnlocks',(c)=>svc.getUnlockedSubjects(c)); h('db:unlockSubject',p=>svc.unlockSubject(p.classId,p.code));
 h('db:getClassSubjects',(c)=>svc.getClassSubjects(c));
 h('app:get-version',()=>'1.2.9'); h('update:check',()=>({ok:true,current:'1.2.9',latest:'1.2.9',hasUpdate:false})); }
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 多班级切换 + 等级口径 ==');
 const A='c_mc_a', B='c_mc_b';
 svc.createClassWithDefaults({ classId:A, className:'一年一班', teacherName:'甲老师', subjectCode:'chinese' });
 svc.createClassWithDefaults({ classId:B, className:'一年二班', teacherName:'乙老师', subjectCode:'math' });
 svc.saveStudent({ id:'st_a1', student_no:'1', name:'甲班学生', group:1, pets:{} }, A);
 svc.saveStudent({ id:'st_b1', student_no:'1', name:'乙班学生', group:1, pets:{} }, B);
 svc.recordScoreOperation({ classId:A, teacherId:'t', studentIds:['st_a1'], delta:60, reason:'甲班加分', subjectCode:'chinese' });
 svc.hatchStudentPet({ classId:A, studentId:'st_a1', subjectCode:'chinese', speciesCode:'cat' });
 svc.recordScoreOperation({ classId:A, teacherId:'t', studentIds:['st_a1'], delta:120, reason:'甲班再加', subjectCode:'chinese' });

 const win=new BrowserWindow({width:1400,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 const ACCOUNTS=[{id:'acc_a',classId:A,className:'一年一班',teacherName:'甲老师',subject:'语文'},
                 {id:'acc_b',classId:B,className:'一年二班',teacherName:'乙老师',subject:'数学'}];
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_portal.html').replace(/\\/g,'/'));
 await sleep(700);
 await js("localStorage.setItem('classpet_accounts_list', "+JSON.stringify(JSON.stringify(ACCOUNTS))+");localStorage.setItem('classpet_current_account', JSON.stringify("+JSON.stringify(ACCOUNTS[1])+"));localStorage.setItem('classpet_active_account_id','acc_b');localStorage.removeItem('classpet.teacher.session.v3');true");
 await win.webContents.reload(); await sleep(1200);
 const list = await js("(function(){var box=document.getElementById('local-classes');var btns=[].slice.call(document.querySelectorAll('#local-class-list [data-class-id]'));return {hidden: box?box.hidden:null, n:btns.length, labels:btns.map(function(b){return b.textContent.trim();})};})()");
 assert(list.hidden === false && list.n === 2, '★ 门户登录页列出本机 2 个班级', list);
 const clicked = await js("(function(){var b=[].slice.call(document.querySelectorAll('#local-class-list [data-class-id]')).filter(function(x){return /一年一班/.test(x.textContent);})[0];if(!b)return null;b.click();return b.textContent.trim();})()");
 await sleep(800);
 const afterClick = await js("(function(){var a=null;try{a=JSON.parse(localStorage.getItem('classpet_current_account'));}catch(e){}var done=document.getElementById('panel-done');return {classId:a&&a.classId, shown: done?!done.hidden:null};})()");
 assert(!!clicked && afterClick.classId === A, '★ 点「一年一班」切到该班（localStorage 已换）', afterClick);
 assert(afterClick.shown === true, '切换后直接进入入口页', afterClick.shown);

 // 教师台：顶栏班级可点，列出两个班
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2800);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说|关闭/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(300);
 const chipText = await js("(function(){var c=document.getElementById('class-chip');return {text:c?c.textContent.trim():'', cursor:c?getComputedStyle(c).cursor:''};})()");
 assert(/一年一班/.test(chipText.text), '教师台顶栏显示当前班级', chipText);
 assert(chipText.cursor === 'pointer', '顶栏班级可点（切换入口）', chipText);
 await js("document.getElementById('class-chip').click();true");
 await sleep(700);
 const dlgBtns = await js("[].slice.call(document.querySelectorAll('#dlg-foot button')).map(function(b){return b.textContent.trim();})");
 assert(dlgBtns.some(function(x){return /一年二班/.test(x);}), '★ 顶栏弹窗里能选另一个班', dlgBtns);

 // 等级口径：教师台行显示 = VM 的 activePet（展示宠）
 const lvl = await js("(async function(){var vm=await window.classPetRuntime.getV3ViewModel();var st=vm.students[0];var row=document.querySelector('.stu-row[data-stu]');var txt=row?row.textContent:'';return {vmLevel: st.activePet.level, vmExp: st.activePet.exp, rowText: txt.replace(/\s+/g,' ').slice(0,80)};})()");
 assert(String(lvl.rowText).indexOf('LV' + lvl.vmLevel) >= 0, '★ 教师台行等级 = 展示宠等级（LV' + lvl.vmLevel + '）', lvl);

 win.destroy();
 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});