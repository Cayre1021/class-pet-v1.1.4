// test_semester_archive.js —— 学期归档：清零经验/形态，保留名单/规则/阈值/台账
const path=require('path'), fs=require('fs'), os=require('os');
const root = fs.existsSync(path.join(__dirname,'..','electron-app')) ? path.join(__dirname,'..') : path.join(__dirname);
const initSqlJs=require(path.join(root,'electron-app','node_modules','sql.js'));
const {SQLiteService}=require(path.join(root,'electron-app','sqlite_service.js'));
let passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
const SRC=path.join(root,'database','classpet.sqlite'); const mt=fs.statSync(SRC).mtimeMs;
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sem-')); const db=path.join(tmp,'x.sqlite');
 fs.copyFileSync(SRC, db);
 const SQL=await initSqlJs(); const svc=new SQLiteService();
 svc.SQL=SQL; svc.db=new SQL.Database(fs.readFileSync(db)); svc.dbPath=db; svc.isInitialized=true; svc.initDefaultTables();
 const C='c_class02_01';
 const before = { students: svc.query("SELECT COUNT(*) n FROM students WHERE class_id=?",[C])[0].n,
                  rules: svc.query("SELECT COUNT(*) n FROM behavior_rules WHERE class_id=?",[C])[0].n,
                  thr: svc.query("SELECT COUNT(*) n FROM class_level_thresholds WHERE class_id=?",[C])[0].n,
                  ops: svc.query("SELECT COUNT(*) n FROM score_operations WHERE class_id=?",[C])[0].n,
                  hatched: svc.query("SELECT COUNT(*) n FROM pets WHERE class_id=? AND hatched_at IS NOT NULL",[C])[0].n };
 console.log('== 学期归档 ==');
 assert(Number(before.students) > 50 && Number(before.hatched) > 0, '前置：有名单且有已破壳宠物', before);
 const r = svc.archiveSemester(C);
 assert(r.success === true, '归档执行成功', r.error || 'ok');
 const after = { students: svc.query("SELECT COUNT(*) n FROM students WHERE class_id=?",[C])[0].n,
                 rules: svc.query("SELECT COUNT(*) n FROM behavior_rules WHERE class_id=?",[C])[0].n,
                 thr: svc.query("SELECT COUNT(*) n FROM class_level_thresholds WHERE class_id=?",[C])[0].n,
                 ops: svc.query("SELECT COUNT(*) n FROM score_operations WHERE class_id=?",[C])[0].n,
                 hatched: svc.query("SELECT COUNT(*) n FROM pets WHERE class_id=? AND hatched_at IS NOT NULL",[C])[0].n,
                 maxExp: svc.query("SELECT MAX(exp) m FROM pets WHERE class_id=?",[C])[0].m };
 assert(Number(after.students) === Number(before.students), '★ 名单保留（' + after.students + ' 人）', after.students);
 assert(Number(after.rules) === Number(before.rules), '★ 规则保留（' + after.rules + ' 条）', after.rules);
 assert(Number(after.thr) === Number(before.thr), '★ 阈值保留（' + after.thr + ' 级）', after.thr);
 assert(Number(after.ops) === Number(before.ops), '★ 历史台账保留（' + after.ops + ' 笔）', after.ops);
 assert(Number(after.hatched) === 0, '★ 全部宠物回到蛋（无已破壳）', after.hatched);
 assert(Number(after.maxExp) === 0, '★ 经验清零（max exp = 0）', after.maxExp);
 const activeAfter = svc.query("SELECT COUNT(*) n FROM students WHERE class_id=? AND archived_at IS NULL",[C])[0].n;
 assert(Number(activeAfter) === 0, '★ 名单一起移出（未归档学生 = 0，老师要的"干净新学期"）', activeAfter);
 const mark = svc.query("SELECT value FROM app_meta WHERE key=?",['semester_archived_at_'+C])[0];
 assert(!!mark, '写了学期归档标记 app_meta', mark);
 const r2 = svc.archiveSemester(C);
 assert(r2.success === true, '重复归档幂等成功', r2.error || 'ok');
 assert(fs.statSync(SRC).mtimeMs === mt, '种子库未被改动');
 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
})().catch(e=>{console.error('异常:',e);process.exitCode=1;});