// probe_pet_expr_all.cjs —— 8 物种逐个验证：点宠物 → 点摸摸 → 换成 <sp>-stageN-pat.png → 2.5s 还原
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-exprall-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-expralldb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
function regIpc(){ const h=(ch,fn)=>ipcMain.handle(ch,async(e,pl)=>{try{return await fn(pl);}catch(err){return {success:false,error:String(err&&err.message||err)};}});
 h('db:loadAllState',c=>svc.loadAllState(c||'c_class02_01')); h('db:recordScore',p=>svc.recordScoreOperation(p));
 h('db:undoScore',id=>svc.undoOperation(id)); h('db:getStudentAuditLogs',s=>svc.getStudentAuditLogs(s));
 h('db:hatchPet',p=>svc.hatchStudentPet(p)); h('db:saveStudent',p=>svc.saveStudent(p.student,p.classId||'c_class02_01'));
 h('db:importStudents',p=>svc.importStudents(p.students,p.classId||'c_class02_01'));
 h('db:saveAllStudents',p=>svc.saveAllStudents(p.students,p.classId||'c_class02_01'));
 h('db:archiveStudent',p=>svc.archiveStudent(p.studentId,p.isArchived,p.classId)); h('db:deleteStudent',p=>svc.deleteStudent(p.studentId,p.classId));
 h('db:saveThresholds',p=>svc.saveThresholds(p.thresholds,p.stages,p.classId||'c_class02_01'));
 h('db:saveBehaviorRules',p=>svc.saveBehaviorRules(p.rules,p.classId||'c_class02_01'));
 h('db:getClassLedger',p=>svc.getClassLedger(p.classId||'c_class02_01',p.fromTs,p.toTs));
 h('db:updateStudentProfile',p=>svc.updateStudentProfile(p.studentId,p.patch||{},p.classId||'c_class02_01'));
 h('db:restoreClassBackup',p=>svc.restoreClassBackup(p.classId||'c_class02_01',p.payload));
 h('db:query',p=>svc.query(p.sql,p.params||[])); h('db:execute',p=>svc.execute(p.sql,p.params||[])); }
const CLICK_PET = "(function(){var cards=[].slice.call(document.querySelectorAll('.pet-card'));var t=cards.filter(function(c){return (c.textContent||'').indexOf(window.__name)>=0;})[0];if(!t)return null;var img=t.querySelector('.pet-stage img');if(!img)return null;img.dispatchEvent(new MouseEvent('click',{bubbles:true}));return t.getAttribute('data-id');})()";
const READ_SRC = "(function(){var i=document.querySelector('.pet-card[data-id='+JSON.stringify(window.__owner)+' ] .pet-stage img');return i?i.getAttribute('src'):null;})()";
const CLICK_PAT = "(async function(){var b=document.querySelector('.interact-btn[data-pet-action=\"pat\"]');if(!b)return 'no-btn';b.dispatchEvent(new MouseEvent('click',{bubbles:true}));await new Promise(function(r){setTimeout(r,800);});var i=document.querySelector('.pet-card[data-id='+JSON.stringify(window.__owner)+' ] .pet-stage img');return i?i.getAttribute('src'):null;})()";
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 8 物种表情实装验证 ==');
 const SPECIES=['cat','dog','bunny','hamster','bird','deer','fish','fox'];
 const picks={};
 SPECIES.forEach(sp=>{
   const row=svc.query("SELECT p.id, p.visual_stage, s.name FROM pets p JOIN students s ON s.id=p.student_id WHERE p.class_id='c_class02_01' AND p.species_code=? AND p.hatched_at IS NOT NULL ORDER BY s.student_no LIMIT 1",[sp])[0];
   if(row) picks[sp]=row;
 });
 const missing=SPECIES.filter(s=>!picks[s]);
 assert(missing.length===0, '库里 8 个物种都有已孵化样例可测（缺：'+(missing.join(',')||'无')+'）', missing);
 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_looseleaf_paper.html').replace(/\\\\/g,'/'));
 await sleep(2200);
 for(const sp of SPECIES){
   const row=picks[sp]; if(!row) continue;
   await js('window.__name=' + JSON.stringify(row.name));
   const owner=await js(CLICK_PET);
   if(!owner){ console.log('  (跳过 '+sp+'：页面没找到 '+row.name+' 的卡片)'); continue; }
   await js('window.__owner=' + JSON.stringify(owner));
   await sleep(500);
   const before=await js(READ_SRC);
   const m=String(before).match(new RegExp(sp+'-stage(\\d)\\.png$'));
   assert(!!m, sp+': 点击前是基础图 '+before, before);
   if(!m) continue;
   const st=m[1];
   const patFile=path.join(ROOT,'electron-app','src','assets','pets',sp,sp+'-stage'+st+'-pat.png');
   assert(fs.existsSync(patFile), sp+' stage'+st+' 的 pat 表情图存在');
   const after=await js(CLICK_PAT);
   assert(new RegExp(sp+'-stage'+st+'-pat\\.png$').test(String(after)), sp+': 点摸摸后换成 '+sp+'-stage'+st+'-pat.png', after);
   await sleep(2500);
   const back=await js(READ_SRC);
   assert(new RegExp(sp+'-stage'+st+'\\.png$').test(String(back)), sp+': 2.5 秒后还原', back);
 }
 win.destroy();
 console.log('\\n结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 fs.rmSync(tmp,{recursive:true,force:true});
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});