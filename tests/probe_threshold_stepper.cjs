// probe_threshold_stepper.cjs —— 阈值步长输入框两侧 ±10 按钮
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-step-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-stepdb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,200):''));failed++;} };
function regIpc(){ const h=(ch,fn)=>ipcMain.handle(ch,async(e,pl)=>{try{return await fn(pl);}catch(err){return {success:false,error:String(err&&err.message||err)};}});
 h('db:loadAllState',c=>svc.loadAllState(c||'c_class02_01')); h('db:saveThresholds',p=>svc.saveThresholds(p.thresholds,p.stages,p.classId||'c_class02_01'));
 h('db:recordScore',p=>svc.recordScoreOperation(p)); h('db:undoScore',id=>svc.undoOperation(id)); h('db:getStudentAuditLogs',s=>svc.getStudentAuditLogs(s));
 h('db:hatchPet',p=>svc.hatchStudentPet(p)); h('db:saveStudent',p=>svc.saveStudent(p.student,p.classId||'c_class02_01',p.options));
 h('db:importStudents',p=>svc.importStudents(p.students,p.classId||'c_class02_01')); h('db:saveAllStudents',p=>svc.saveAllStudents(p.students,p.classId||'c_class02_01'));
 h('db:archiveStudent',p=>svc.archiveStudent(p.studentId,p.isArchived,p.classId)); h('db:deleteStudent',p=>svc.deleteStudent(p.studentId,p.classId));
 h('db:saveBehaviorRules',p=>svc.saveBehaviorRules(p.rules,p.classId||'c_class02_01')); h('db:getClassLedger',p=>svc.getClassLedger(p.classId||'c_class02_01',p.fromTs,p.toTs));
 h('db:updateStudentProfile',p=>svc.updateStudentProfile(p.studentId,p.patch||{},p.classId||'c_class02_01')); h('db:restoreClassBackup',p=>svc.restoreClassBackup(p.classId||'c_class02_01',p.payload));
 h('db:query',p=>svc.query(p.sql,p.params||[])); h('db:execute',p=>svc.execute(p.sql,p.params||[])); h('app:get-version',()=>'1.2.3');
 h('update:check',()=>({ok:true,current:'1.2.3',latest:'1.2.3',hasUpdate:false})); }
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 阈值步长 ±10 ==');
 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2600);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(300);
 await js("(function(){var b=document.querySelector('[data-action=\"threshold\"]');if(b)b.click();return !!b;})()");
 await sleep(700);
 const st = await js("(function(){var s=document.querySelector('#dlg-body .stepper');if(!s)return {err:'no-stepper'};var i=s.querySelector('input');var b=[].slice.call(s.querySelectorAll('.step-btn'));return {has:true,btns:b.map(function(x){return x.textContent.trim();}), value:i.value, min:i.getAttribute('min'), max:i.getAttribute('max'), readonly:!!i.readOnly};})()");
 assert(st && st.has === true, '弹窗里出现步进器', st);
 assert(st && st.btns.join(',') === '−10,+10', '两侧按钮是 −10 / +10', st && st.btns);
 const v0 = Number(st.value);
 await js("(function(){var s=document.querySelector('#dlg-body .stepper');var p=s.querySelector('.step-btn[data-step=\"10\"]');p.click();return true;})()");
 const v1 = await js("Number(document.querySelector('#dlg-body .stepper input').value)");
 assert(v1 === v0 + 10, '+10 生效（' + v0 + ' -> ' + v1 + '）', { v0: v0, v1: v1 });
 await js("(function(){var s=document.querySelector('#dlg-body .stepper');var m=s.querySelector('.step-btn[data-step=\"-10\"]');m.click();m.click();return true;})()");
 const v2 = await js("Number(document.querySelector('#dlg-body .stepper input').value)");
 assert(v2 === v0 - 10, '−10 连点两次生效（' + v1 + ' -> ' + v2 + '）', { v2: v2 });
 // 下界夹紧
 await js("(function(){var s=document.querySelector('#dlg-body .stepper');var i=s.querySelector('input');i.value='5';var m=s.querySelector('.step-btn[data-step=\"-10\"]');m.click();return true;})()");
 const v3 = await js("Number(document.querySelector('#dlg-body .stepper input').value)");
 assert(v3 >= 1, '不会减到 0/负数（夹到 min=1）', v3);
 // 上界夹紧
 await js("(function(){var s=document.querySelector('#dlg-body .stepper');var i=s.querySelector('input');i.value='495';var p=s.querySelector('.step-btn[data-step=\"10\"]');p.click();return true;})()");
 const v4 = await js("Number(document.querySelector('#dlg-body .stepper input').value)");
 assert(v4 <= 500, '不会超过 max=500', v4);
 // 按钮可键盘聚焦
 const focusable = await js("(function(){var b=document.querySelector('#dlg-body .stepper .step-btn');b.focus();return document.activeElement===b;})()");
 assert(focusable === true, '按钮可键盘聚焦（可访问性）');
 win.destroy();
 console.log('\n结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});
