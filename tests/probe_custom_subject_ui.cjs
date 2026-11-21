// probe_custom_subject_ui.cjs —— 自定义科目「综合」必须出现在教师台、能解锁能赋分
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-cus-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-cusdb-'));
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
 h('db:addClassSubject',p=>svc.addClassSubject(p.classId, p.name));
 h('app:get-version',()=>'1.2.6'); h('update:check',()=>({ok:true,current:'1.2.6',latest:'1.2.6',hasUpdate:false})); }
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 自定义科目「综合」==');
 const CLASS='c_custom_probe';
 const created = svc.createClassWithDefaults({ classId: CLASS, className:'综合班', teacherName:'王老师', subjectCode:'custom', subjectLabel:'综合' });
 assert(created.success === true, '以自定义科目「综合」建班', created.error || 'ok');
 const subs = svc.getClassSubjects(CLASS);
 assert(subs.length === 4, '科目表 4 项（含自定义）', subs.map(s=>s.name));
 const custom = subs.filter(s=>s.name==='综合')[0];
 assert(!!custom && custom.isPrimary === true && custom.unlocked === true, '「综合」是主科且已解锁', custom);
 assert(subs.filter(s=>s.isPrimary).length === 1, '主科只有一个', subs.filter(s=>s.isPrimary).map(s=>s.name));
 const otherLocked = subs.filter(s=>s.name!=='综合').every(s=>s.unlocked === false);
 assert(otherLocked, '语文/数学/英语都未解锁', subs.map(s=>s.name+':'+s.unlocked));

 const stu = svc.saveStudent({ id:'st_cus_1', student_no:'1', name:'综合课代表', group:1, pets:{} }, CLASS);
 assert(stu.success === true, '班里加一名学生');
 const pets = svc.query("SELECT subject_id FROM pets WHERE student_id='st_cus_1' ORDER BY subject_id").map(r=>r.subject_id);
 assert(pets.length === 4 && pets.indexOf('subj_custom1') >= 0, '★ 该生有 4 条宠物行（含 subj_custom1）', pets);

 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_portal.html').replace(/\\/g,'/'));
 await sleep(600);
 await js("localStorage.setItem('classpet_current_account', JSON.stringify({id:'acc_cus',classId:'"+CLASS+"',className:'综合班',teacherName:'王老师',subject:'综合'})), localStorage.setItem('classpet_active_account_id','acc_cus'), localStorage.setItem('classpet_current_teaching_subject','综合'), true");
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2900);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说|关闭/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(400);

 const btns = await js("[].slice.call(document.querySelectorAll('#subject-seg-2 button')).map(function(b){return {name:b.getAttribute('data-subject'), code:b.getAttribute('data-code'), locked:b.classList.contains('is-locked'), pressed:b.getAttribute('aria-pressed')};})");
 assert(btns.length === 4, '★ 教师台显示 4 个学科按钮', btns.map(b=>b.name));
 assert(btns.some(b=>b.name==='综合'), '★ 自定义科目「综合」出现在学科按钮里', btns.map(b=>b.name));
 const cBtn = btns.filter(b=>b.name==='综合')[0];
 assert(!!cBtn && cBtn.locked === false && cBtn.pressed === 'true', '★ 「综合」无锁且是当前学科', cBtn);
 assert(btns.filter(b=>b.name!=='综合').every(b=>b.locked === true), '语文/数学/英语显示锁', btns.map(b=>b.name+':'+b.locked));

 const dockTxt = await js("(function(){var d=document.getElementById('dock-subject');return d?d.textContent:'';})()");
 assert(dockTxt === '综合课', '底部授课科目显示「综合课」', dockTxt);

 // 赋分：选学生 -> 点第一条规则
 await js("(function(){var r=document.querySelector('.stu-row[data-stu]');if(r)r.click();return true;})()");
 await sleep(700);
 const clicked = await js("(function(){var b=document.querySelector('#score-grid .score-btn');if(!b)return 'no-btn';var label=b.textContent.trim();b.click();return label;})()");
 await sleep(2000);
 const expRow = svc.query("SELECT exp FROM pets WHERE student_id='st_cus_1' AND subject_id='subj_custom1'")[0];
 assert(!!expRow && Number(expRow.exp) > 0, '★ 赋分落到自定义科 pets.subj_custom1（exp=' + (expRow && expRow.exp) + '）', expRow);
 const chineseExp = svc.query("SELECT exp FROM pets WHERE student_id='st_cus_1' AND subject_id='subj_chinese'")[0];
 assert(!chineseExp || Number(chineseExp.exp) === 0, '★ 语文没有被误加（仍 0）', chineseExp);

 // 点语文被拒
 await js("(function(){var b=[].slice.call(document.querySelectorAll('#subject-seg-2 button')).filter(function(x){return x.getAttribute('data-subject')==='语文';})[0];if(b)b.click();return true;})()");
 await sleep(500);
 const dockAfter = await js("(function(){var d=document.getElementById('dock-subject');return d?d.textContent:'';})()");
 assert(dockAfter === '综合课', '点语文被拒后授课科目仍是综合', dockAfter);

 win.destroy();
 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});