// probe_unlock_menu_and_autopet.cjs —— 缺科自动补蛋行赋分 + 「唤醒新学科」菜单入口
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-um-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-umdb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
function regIpc(){ const h=(ch,fn)=>ipcMain.handle(ch,async(e,pl)=>{try{return await fn(pl);}catch(err){return {success:false,error:String(err&&err.message||err),message:String(err&&err.message||err)};}});
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
 h('app:get-version',()=>'1.2.8'); h('update:check',()=>({ok:true,current:'1.2.8',latest:'1.2.8',hasUpdate:false})); }
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 缺科自动补蛋行 + 唤醒新学科入口 ==');
 const CLASS='c_um';
 svc.createClassWithDefaults({ classId: CLASS, className:'数学班', teacherName:'T', subjectCode:'math' });
 // 老学生：只有语文宠物行（模拟升级前的班）
 svc.saveStudent({ id:'st_um_1', student_no:'1', name:'老学生', group:1, pets:{ chinese:{ species:'cat', exp:120, level:2, visualStage:1 } } }, CLASS);
 svc.db.run("DELETE FROM pets WHERE class_id=? AND subject_id='subj_math'", [CLASS]);
 const beforeMath = svc.query("SELECT COUNT(*) n FROM pets WHERE class_id=? AND subject_id='subj_math'",[CLASS])[0].n;
 assert(Number(beforeMath) === 0, '前置：该生没有数学宠物行', beforeMath);
 const r1 = svc.recordScoreOperation({ classId:CLASS, teacherId:'t', studentIds:['st_um_1'], delta:5, reason:'数学试加', subjectCode:'math' });
 assert(r1.success === true, '★ 缺科时自动补蛋行并赋分成功（旧版报 NO_PET_FOR_SUBJECT）', r1.error || 'ok');
 const mathPet = svc.query("SELECT exp, species_code FROM pets WHERE class_id=? AND student_id='st_um_1' AND subject_id='subj_math'",[CLASS])[0];
 assert(!!mathPet && Number(mathPet.exp) === 5 && mathPet.species_code === 'egg', '★ 补出来的是蛋行且经验=5', mathPet);

 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_portal.html').replace(/\\/g,'/'));
 await sleep(500);
 await js("localStorage.setItem('classpet_current_account', JSON.stringify({id:'acc_um',classId:'"+CLASS+"',className:'数学班',teacherName:'T',subject:'数学'})), localStorage.setItem('classpet_active_account_id','acc_um'), localStorage.setItem('classpet_current_teaching_subject','数学'), true");
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2900);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说|关闭/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(300);

 // 没有候选时：菜单入口给出条件说明
 const hasMenu = await js("(function(){return !!document.querySelector('[data-action=\"unlock-subject\"]');})()");
 assert(hasMenu === true, '★ 数据与设置里有「唤醒新学科」入口');
 await js("(function(){document.querySelector('[data-action=\"unlock-subject\"]').click();return true;})()");
 await sleep(600);
 const d1 = await js("(function(){var d=document.getElementById('dlg');if(!d||!d.open)return null;return {title:document.getElementById('dlg-title').textContent, body:document.getElementById('dlg-body').textContent};})()");
 assert(!!d1 && /唤醒新学科/.test(d1.title), '点入口弹窗标题正确', d1 && d1.title);
 assert(!!d1 && /满级/.test(d1.body), '无候选时说明"练到 Lv.20 满级"的条件', d1 && d1.body.slice(0,80));
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open)d.close();return true;})()");

 // 把数学练到满级 -> 菜单副标题出现"N 科可选"，弹窗列出候选
 svc.execute("UPDATE pets SET exp = 1950 WHERE class_id=? AND subject_id='subj_math'",[CLASS]);
 await win.webContents.reload(); await sleep(3000);
 const sub = await js("(function(){var e=document.getElementById('mi-unlock-sub');return e?e.textContent:null;})()");
 assert(/科可选/.test(String(sub||'')), '★ 菜单副标题显示「N 科可选」：' + sub, sub);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open)d.close();document.querySelector('[data-action=\"unlock-subject\"]').click();return true;})()");
 await sleep(700);
 const btns = await js("[].slice.call(document.querySelectorAll('#dlg-foot button')).map(function(b){return b.textContent.trim();})");
 assert(btns.some(function(t){return /唤醒「语文」/.test(t);}), '★ 候选弹窗里能选「语文」', btns);

 win.destroy();
 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});