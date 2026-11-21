// probe_pet_expr_race.cjs —— 表情残留/竞态专项：连点不同互动后必须回到基础图
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-race-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-racedb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,260):''));failed++;} };
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
const SET_NAME = "window.__name =";
const CLICK_PET = "(function(){var cards=[].slice.call(document.querySelectorAll('.pet-card'));var t=cards.filter(function(c){return (c.textContent||'').indexOf(window.__name)>=0;})[0];if(!t)return null;var img=t.querySelector('.pet-stage img');if(!img)return null;img.dispatchEvent(new MouseEvent('click',{bubbles:true}));return t.getAttribute('data-id');})()";
const READ = "(function(){var i=document.querySelector('.pet-card[data-id='+JSON.stringify(window.__owner)+' ] .pet-stage img');return i?i.getAttribute('src'):null;})()";
const CLICK = (act)=>"(function(){var b=document.querySelector('.interact-btn[data-pet-action=\""+act+"\"]');if(!b)return 'no-btn';b.dispatchEvent(new MouseEvent('click',{bubbles:true}));return 'ok';})()";
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 表情残留 / 连点竞态 专项 ==');
 const cats=svc.query("SELECT s.id, s.name FROM students s JOIN pets p ON p.student_id=s.id WHERE p.class_id='c_class02_01' AND p.species_code='cat' AND p.hatched_at IS NOT NULL AND p.is_display=1 ORDER BY s.student_no LIMIT 6");
 assert(cats.length>=5, '库里至少 5 名猫学生可用于并发测试', cats.length);
 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_looseleaf_paper.html').replace(/\\\\/g,'/'));
 await sleep(2200);
 const openCard = async (name) => {
   await js('window.__name=' + JSON.stringify(name));
   const owner = await js(CLICK_PET);
   if (owner) await js('window.__owner=' + JSON.stringify(owner));
   await sleep(350);
   return owner;
 };
 const src = () => js(READ);
 const isBase = (s) => /-stage\d\.png$/.test(String(s));
 const isExpr = (s, act) => new RegExp('-stage\\d-'+act+'\\.png$').test(String(s));

 // ① 单次：pat -> 2.6s -> 基础图
 let own = await openCard(cats[0].name);
 let base = await src();
 await js(CLICK('pat')); await sleep(700);
 let mid = await src();
 assert(isExpr(mid,'pat'), '① 单点摸摸后是 pat 表情（' + mid + '）', mid);
 await sleep(2300);
 let back = await src();
 assert(isBase(back) && back===base, '① 2.5 秒后回到基础图', { base, back });

 // ② pat 未消失就点 feed -> 最终必须回基础图（不能残留 pat）
 own = await openCard(cats[1].name); base = await src();
 await js(CLICK('pat')); await sleep(500);
 assert(isExpr(await src(),'pat'), '② 先出 pat 表情');
 await js(CLICK('feed')); await sleep(600);
 const mid2 = await src();
 assert(isExpr(mid2,'feed'), '② 紧接着点喂食 -> 变成 feed 表情', mid2);
 await sleep(3200);
 const back2 = await src();
 assert(isBase(back2) && back2===base, '★ ② 两种互动都结束后只回基础图（不残留 pat）', { base, back2 });

 // ③ 三连：pat -> feed -> play，间隔 400ms
 own = await openCard(cats[2].name); base = await src();
 await js(CLICK('pat')); await sleep(400);
 await js(CLICK('feed')); await sleep(400);
 await js(CLICK('play')); await sleep(700);
 const mid3 = await src();
 assert(isExpr(mid3,'play'), '③ 三连后停在 play 表情', mid3);
 await sleep(3500);
 const back3 = await src();
 assert(isBase(back3) && back3===base, '★ ③ 三连之后仍只回基础图', { base, back3 });

 // ④ 快到点再切：pat 等 2.0s 再点 play（第一个计时器只差 0.5s）
 own = await openCard(cats[3].name); base = await src();
 await js(CLICK('pat')); await sleep(2000);
 await js(CLICK('play')); await sleep(900);
 const mid4 = await src();
 assert(isExpr(mid4,'play'), '④ 第一个表情快还原时切到 play，仍是 play 表情', mid4);
 await sleep(2400);
 const back4 = await src();
 assert(isBase(back4) && back4===base, '★ ④ 到点后回基础图，不会闪回 pat', { base, back4 });

 // ⑤ 两个学生互不影响
 own = await openCard(cats[4].name); const baseA = await src();
 await js(CLICK('feed')); await sleep(500);
 const a1 = await src();
 await openCard(cats[0].name); await sleep(300);
 const b1 = await src();
 assert(isExpr(a1,'feed') && isBase(b1), '⑤ A 学生 feed 表情不影响 B 学生（B 仍是基础图）', { a1, b1 });
 await js('window.__owner=' + JSON.stringify(own));
 await sleep(2600);
 const a2 = await src();
 assert(isBase(a2), '⑤ A 学生自己的表情也正常还原', a2);

 win.destroy();
 console.log('\\n结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 fs.rmSync(tmp,{recursive:true,force:true});
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});