// probe_subject_unlock_sequence_ui.cjs —— 数学班：语文必须锁着；满级后由老师选择解锁
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-unlock-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-unlockdb-'));
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
 h('db:getSubjectUnlocks',(classId)=>svc.getUnlockedSubjects(classId));
 h('db:unlockSubject',p=>svc.unlockSubject(p.classId, p.code));
 h('app:get-version',()=>'1.2.4'); h('update:check',()=>({ok:true,current:'1.2.4',latest:'1.2.4',hasUpdate:false})); }
const LOCKS = "(function(){var b={};['语文','数学','英语'].forEach(function(n){var el=[].slice.call(document.querySelectorAll('#subject-seg-2 button')).filter(function(x){return x.textContent.indexOf(n)>=0;})[0];b[n]= el? {locked: el.classList.contains('is-locked'), disabled: el.getAttribute('aria-disabled')} : null;});return b;})()";
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 数学班的学科解锁顺序 ==');
 const CLASS='c_probe_math';
 const created = svc.createClassWithDefaults({ classId: CLASS, className:'数学班', teacherName:'数学老师', subjectCode:'math' });
 assert(created.success === true, '建一个以数学为主科的班级', created.error || 'ok');
 const stu = svc.saveStudent({ id:'st_math_1', student_no:'1', name:'数学课代表', group:1, pets:{} }, CLASS);
 assert(stu.success === true, '班里加一名学生');

 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 // 先在同源页面写账号缓存，再进教师台
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_portal.html').replace(/\\/g,'/'));
 await sleep(600);
 await js("localStorage.setItem('classpet_current_account', JSON.stringify({id:'acc_math',classId:'"+CLASS+"',className:'数学班',teacherName:'数学老师',subject:'数学'})), localStorage.setItem('classpet_active_account_id','acc_math'), localStorage.setItem('classpet_current_teaching_subject','数学'), true");
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2800);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说|关闭/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(400);

 const locks = await js(LOCKS);
 assert(locks['数学'] && locks['数学'].locked === false, '★ 数学：可用（无锁）', locks['数学']);
 assert(locks['语文'] && locks['语文'].locked === true, '★ 语文：锁着（数学班不该解锁语文）', locks['语文']);
 assert(locks['英语'] && locks['英语'].locked === true, '★ 英语：锁着', locks['英语']);

 // 点语文应被拒绝，科目仍是数学
 await js("(function(){var el=[].slice.call(document.querySelectorAll('#subject-seg-2 button')).filter(function(x){return x.textContent.indexOf('语文')>=0;})[0];if(el)el.click();return true;})()");
 await sleep(600);
 const afterClick = await js(LOCKS);
 const toastTxt = await js("(function(){var t=document.getElementById('toast');return t?t.textContent.trim():'';})()");
 assert(afterClick['数学'].disabled !== 'true', '点语文后授课科目仍是数学', afterClick);
 assert(/还没有解锁|尚未解锁/.test(toastTxt), '点语文给出"还没解锁"提示：' + toastTxt, toastTxt);

 // 把数学宠物练到满级 -> 出现"可解锁"候选
 svc.execute("UPDATE pets SET level = 20, exp = 1950 WHERE student_id='st_math_1' AND subject_id='subj_math'");
 await win.webContents.reload(); await sleep(3200);
 const dlg = await js("(function(){var d=document.getElementById('dlg');if(!d||!d.open)return null;return {title:document.getElementById('dlg-title').textContent, btns:[].slice.call(document.querySelectorAll('#dlg-foot button')).map(function(b){return b.textContent.trim();})};})()");
 assert(!!dlg && /新学科可以解锁/.test(dlg.title), '★ 数学满级后弹出"新学科可以解锁了"', dlg && dlg.title);
 assert(!!dlg && dlg.btns.some(function(t){return /语文/.test(t);}) && dlg.btns.some(function(t){return /英语/.test(t);}), '★ 候选里同时给出语文与英语（由老师选）', dlg && dlg.btns);
 const unlBefore = svc.getUnlockedSubjects(CLASS);
 assert(unlBefore.join(',') === 'math', '★ 此时库里仍只有数学（没自动解锁）', unlBefore);

 // 老师选择解锁语文
 await js("(function(){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /唤醒「语文」/.test(x.textContent);})[0];if(b)b.click();return true;})()");
 await sleep(2600);
 const unlAfter = svc.getUnlockedSubjects(CLASS);
 assert(unlAfter.join(',') === 'math,chinese', '★ 老师选了语文后库里解锁集合 = math,chinese', unlAfter);
 const locks2 = await js(LOCKS);
 assert(locks2['语文'] && locks2['语文'].locked === false, '★ 语文现在可用了', locks2['语文']);
 assert(locks2['英语'] && locks2['英语'].locked === true, '英语仍锁着（等语文满级再选）', locks2['英语']);

 // ⑥ 存量数学班：曾被旧迁移错误塞入语文解锁（负责人遇到的就是这种）
 const OLD='c_legacy_math';
 svc.db.run("INSERT OR REPLACE INTO classes (id,teacher_id,school_name,class_name,class_norm,default_subject_id,max_level,created_at,updated_at) VALUES (?, 't_old','实验小学本部','数学老班','数学老班','subj_math',20,0,0)",[OLD]);
 svc.db.run("INSERT OR REPLACE INTO class_subject_unlocks (class_id,code,unlocked_at) VALUES (?, 'chinese', 1)",[OLD]);
 svc.db.run("INSERT OR REPLACE INTO class_subject_unlocks (class_id,code,unlocked_at) VALUES (?, 'math', 2)",[OLD]);
 svc.saveStudent({ id:'st_legacy_1', student_no:'1', name:'老班学生', group:1, pets:{} }, OLD);
 svc.db.run("DELETE FROM app_meta WHERE key='subject_unlock_v2'");
 svc._subjectUnlockMigrated = false;   /* 模拟"新进程首次读库"：清掉内存里的一次性标记 */
 await js("localStorage.setItem('classpet_current_account', JSON.stringify({id:'acc_legacy',classId:'"+OLD+"',className:'数学老班',teacherName:'数学老师',subject:'数学'})), localStorage.setItem('classpet_active_account_id','acc_legacy'), true");
 await win.webContents.reload(); await sleep(3000);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说|关闭/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(400);
 const legacyLocks = await js(LOCKS);
 const legacyUnlocks = svc.getUnlockedSubjects(OLD);
 assert(legacyUnlocks.join(',') === 'math', '★ 存量数学班：库里只剩数学（旧语文解锁被订正掉）', legacyUnlocks);
 assert(legacyLocks['语文'] && legacyLocks['语文'].locked === true, '★ 存量数学班：界面上语文是锁着的（负责人报的那个问题）', legacyLocks['语文']);
 assert(legacyLocks['数学'] && legacyLocks['数学'].locked === false, '存量数学班：数学可用', legacyLocks['数学']);

 win.destroy();
 console.log('\n结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});