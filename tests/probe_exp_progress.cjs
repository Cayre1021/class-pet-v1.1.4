// probe_exp_progress.cjs —— 加分后进度条必须动；教师台与大屏必须同一只宠物（经验一致）
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-ep-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-epdb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,300):''));failed++;} };
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
 h('app:get-version',()=>'1.3.0'); h('update:check',()=>({ok:true,current:'1.3.0',latest:'1.3.0',hasUpdate:false})); }
const BAR = "(function(){var row=document.querySelector('.stu-row[data-stu]');var bar=row?row.querySelector('.stu-exp'):null;var sp=bar?bar.querySelector('span'):null;return {title: bar?bar.getAttribute('title'):'', width: sp?sp.style.width:''};})()";
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 加分后进度条是否变化（数学主科新班）==');
 const CLASS='c_ep';
 svc.createClassWithDefaults({ classId: CLASS, className:'数学新班', teacherName:'T', subjectCode:'math' });
 // 关键场景：学生建的时候展示宠是语文（模拟旧数据/导入的学生）
 svc.saveStudent({ id:'st_ep_1', student_no:'1', name:'同学甲', group:1, pets:{}, activeSubject:'chinese' }, CLASS);
 const disp0 = svc.query("SELECT s.display_pet_id, p.subject_id FROM students s LEFT JOIN pets p ON p.id=s.display_pet_id WHERE s.id='st_ep_1'")[0];
 console.log('  建学生后的展示宠: ' + JSON.stringify(disp0));
 assert(disp0 && disp0.subject_id === 'subj_chinese', '前置：展示宠在语文（模拟会出错的状态）', disp0);

 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_portal.html').replace(/\\/g,'/'));
 await sleep(500);
 await js("localStorage.setItem('classpet_current_account', JSON.stringify({id:'acc_ep',classId:'"+CLASS+"',className:'数学新班',teacherName:'T',subject:'数学'})), localStorage.setItem('classpet_active_account_id','acc_ep'), localStorage.setItem('classpet_current_teaching_subject','数学'), true");
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2800);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说|关闭/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(300);
 const barBefore = await js(BAR);
 console.log('  加分前进度条: ' + JSON.stringify(barBefore));
 await js("(function(){var r=document.querySelector('.stu-row[data-stu]');if(r)r.click();return true;})()");
 await sleep(500);
 await js("(function(){var b=document.querySelector('#score-grid .score-btn');if(b)b.click();return true;})()");
 await sleep(2200);
 const barAfter = await js(BAR);
 console.log('  加分后进度条: ' + JSON.stringify(barAfter));
 assert(barBefore.width !== barAfter.width, '★ 教师台进度条宽度变化（' + barBefore.width + ' → ' + barAfter.width + '）', {before:barBefore, after:barAfter});
 assert(/经验 5 \/ 50/.test(barAfter.title), '★ 进度条提示显示 5/50', barAfter.title);
 const disp1 = svc.query("SELECT p.subject_id, p.exp FROM students s JOIN pets p ON p.id=s.display_pet_id WHERE s.id='st_ep_1'")[0];
 assert(disp1 && disp1.subject_id === 'subj_math' && Number(disp1.exp) === 5, '★ 展示宠已切到正在赋分的数学宠物（exp=5）', disp1);

 const paper=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const pjs=c=>paper.webContents.executeJavaScript(c,true);
 await paper.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_looseleaf_paper.html').replace(/\\/g,'/'));
 await sleep(2600);
 const big = await pjs("(async function(){var vm=await window.classPetRuntime.getV3ViewModel();var s=vm.students[0];return {exp:s.activePet.exp, pct:s.activePet.percent, subject:s.activePet.speciesCode, img:s.activePet.image};})()");
 console.log('  大屏: ' + JSON.stringify(big));
 assert(Number(big.exp) === 5 && Number(big.pct) === 10, '★ 大屏显示同一只宠物：5 EXP / 10%', big);

 win.destroy(); paper.destroy();
 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});