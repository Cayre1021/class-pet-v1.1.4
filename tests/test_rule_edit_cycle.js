// test_rule_edit_cycle.js —— 删中间一条规则后再新增不能报 UNIQUE（旧版必挂）
const path=require('path'), fs=require('fs'), os=require('os');
const root = fs.existsSync(path.join(__dirname,'..','electron-app')) ? path.join(__dirname,'..') : path.join(__dirname);
const initSqlJs=require(path.join(root,'electron-app','node_modules','sql.js'));
const {SQLiteService}=require(path.join(root,'electron-app','sqlite_service.js'));
const storage={};
global.localStorage={getItem:k=>storage[k]!==undefined?storage[k]:null,setItem:(k,v)=>{storage[k]=String(v);},removeItem:k=>{delete storage[k];},clear:()=>{Object.keys(storage).forEach(k=>delete storage[k]);}};
global.window = global.window || {};
global.window.localStorage = global.localStorage;
global.window.addEventListener = function(){};
let passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rule-')); const db=path.join(tmp,'x.sqlite');
 fs.copyFileSync(path.join(root,'database','classpet.sqlite'), db);
 const SQL=await initSqlJs(); const svc=new SQLiteService();
 svc.SQL=SQL; svc.db=new SQL.Database(fs.readFileSync(db)); svc.dbPath=db; svc.isInitialized=true;
 svc.initDefaultTables();
 const CLASS='c_class02_01';
 global.window.electronAPI = { db: {
   loadAllState:(c)=>svc.loadAllState(c||CLASS), recordScore:(p)=>svc.recordScoreOperation(p), undoScore:(id)=>svc.undoOperation(id),
   getStudentAuditLogs:(s)=>svc.getStudentAuditLogs(s), hatchPet:(p)=>svc.hatchStudentPet(p),
   saveStudent:(s,c,o)=>svc.saveStudent(s,c,o), importStudents:(s,c)=>svc.importStudents(s,c), saveAllStudents:(s,c)=>svc.saveAllStudents(s,c),
   archiveStudent:(id,a,c)=>svc.archiveStudent(id,a,c), deleteStudent:(id,c)=>svc.deleteStudent(id,c),
   saveThresholds:(t,st,c)=>svc.saveThresholds(t,st,c), saveBehaviorRules:(r,c)=>svc.saveBehaviorRules(r,c),
   getClassLedger:(c,f,t)=>svc.getClassLedger(c,f,t), updateStudentProfile:(id,p,c)=>svc.updateStudentProfile(id,p,c),
   restoreClassBackup:(c,p)=>svc.restoreClassBackup(c,p), query:(s,p)=>svc.query(s,p), execute:(s,p)=>svc.execute(s,p),
   getSubjectUnlocks:(c)=>svc.getUnlockedSubjects(c), unlockSubject:(c,code)=>svc.unlockSubject(c,code), getClassSubjects:(c)=>svc.getClassSubjects(c)
 }};
 const before = svc.query("SELECT * FROM behavior_rules WHERE class_id=? ORDER BY sort_order",[CLASS]);
 console.log('== 规则增删循环 ==');
 assert(before.length === 13, '初始 13 条规则', before.length);

 // 删掉中间一条（第 3 条「作业优秀」）
 const target = svc.query("SELECT * FROM behavior_rules WHERE class_id=? ORDER BY sort_order",[CLASS])[2];
 const delRes = svc.query("SELECT name FROM behavior_rules WHERE id=?",[target.id])[0];
 svc.execute("DELETE FROM behavior_rules WHERE id=?",[target.id]);
 assert(svc.query("SELECT COUNT(*) n FROM behavior_rules WHERE class_id=?",[CLASS])[0].n === 12, '删掉中间一条后 12 条', delRes);

 // 通过 core 的规则保存链路再加一条（旧版这里会 UNIQUE constraint failed）
 const remain = svc.query("SELECT id,name,points,type FROM behavior_rules WHERE class_id=? ORDER BY sort_order",[CLASS]);
 const nextRules = remain.map(r=>({id:r.id,name:r.name,points:Number(r.points),type:r.type})).concat([{name:'下课阅读',points:1,type:'positive'}]);
 const saveRes = svc.saveBehaviorRules(nextRules, CLASS);
 const after = svc.query("SELECT id,name,points FROM behavior_rules WHERE class_id=? ORDER BY sort_order",[CLASS]);
 assert(after.length === 13, '★ 删后再新增成功：13 条（旧版会报 UNIQUE 失败）', { count: after.length, saveRes });
 assert(after.some(r=>r.name==='下课阅读'), '新增的「下课阅读」在库里', after.map(r=>r.name).slice(-2));
 const ids = after.map(r=>r.id);
 assert(new Set(ids).size === ids.length, '规则 id 无重复', ids.slice(-3));

 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
})().catch(e=>{console.error('异常:',e);process.exitCode=1;});