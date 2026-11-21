const path=require('path'),fs=require('fs'),os=require('os');
const initSqlJs=require(path.join(process.cwd(),'electron-app','node_modules','sql.js'));
const {SQLiteService}=require(path.join(process.cwd(),'electron-app','sqlite_service.js'));
let passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,200):''));failed++;} };
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ul2-')); const db=path.join(tmp,'x.sqlite');
 fs.copyFileSync(path.join(process.cwd(),'database','classpet.sqlite'), db);
 const SQL=await initSqlJs(); const svc=new SQLiteService();
 svc.SQL=SQL; svc.db=new SQL.Database(fs.readFileSync(db)); svc.dbPath=db; svc.isInitialized=true;
 svc.initDefaultTables();
 console.log('== 数学班的语文必须锁着（含旧数据订正）==');
 // 造一个"数学主科、被 v1 错误塞了语文行、但语文从未用过"的班
 const C='c_old_math';
 svc.db.run("INSERT OR REPLACE INTO classes (id,teacher_id,school_name,class_name,class_norm,default_subject_id,max_level,created_at,updated_at) VALUES (?, 't_x','实验小学本部','数学老班','数学老班','subj_math',20,0,0)",[C]);
 svc.db.run("INSERT OR REPLACE INTO class_subject_unlocks (class_id,code,unlocked_at) VALUES (?, 'chinese', 1)",[C]);
 svc.db.run("INSERT OR REPLACE INTO class_subject_unlocks (class_id,code,unlocked_at) VALUES (?, 'math', 2)",[C]);
 svc.saveStudent({ id:'st_om_1', student_no:'1', name:'学生甲', group:1, pets:{} }, C);   // 三科蛋（语文未破壳=未用过）
 console.log('  订正前:', JSON.stringify(svc.query("SELECT code FROM class_subject_unlocks WHERE class_id=? ORDER BY unlocked_at",[C]).map(r=>r.code)));
 const mig = svc.migrateSubjectUnlockV2();
 assert(mig.migrated === 1, 'v2 订正清理了 1 个班的语文解锁', mig);
 const codes = svc.getUnlockedSubjects(C);
 assert(codes.join(',') === 'math', '★ 数学老班：只剩数学解锁（语文被清掉）', codes);

 // 反例：真的用过语文（有已破壳语文宠物）的班，语文必须保留
 const D='c_old_mixed';
 svc.db.run("INSERT OR REPLACE INTO classes (id,teacher_id,school_name,class_name,class_norm,default_subject_id,max_level,created_at,updated_at) VALUES (?, 't_y','实验小学本部','混合班','混合班','subj_math',20,0,0)",[D]);
 svc.db.run("INSERT OR REPLACE INTO class_subject_unlocks (class_id,code,unlocked_at) VALUES (?, 'chinese', 1)",[D]);
 svc.db.run("INSERT OR REPLACE INTO class_subject_unlocks (class_id,code,unlocked_at) VALUES (?, 'math', 2)",[D]);
 svc.saveStudent({ id:'st_mx_1', student_no:'1', name:'学生乙', group:1, pets:{ chinese:{ species:'cat', exp:120, level:3, visualStage:2 } } }, D);
 svc.hatchStudentPet({ classId:D, studentId:'st_mx_1', subjectCode:'chinese', speciesCode:'cat' });
 svc.db.run("DELETE FROM app_meta WHERE key='subject_unlock_v2'");
 const mig2 = svc.migrateSubjectUnlockV2();
 const codes2 = svc.getUnlockedSubjects(D);
 assert(codes2.indexOf('chinese') >= 0, '★ 真的用过语文的班保留语文解锁', { codes: codes2, mig: mig2 });

 // 新建班：只有主科
 const E2='c_new_math';
 svc.createClassWithDefaults({ classId:E2, className:'新数学班', teacherName:'T', subjectCode:'math' });
 assert(svc.getUnlockedSubjects(E2).join(',') === 'math', '新建数学班只有数学', svc.getUnlockedSubjects(E2));
 // 种子班（语文主科）不受影响
 const seed = svc.getUnlockedSubjects('c_class02_01');
 assert(seed.indexOf('chinese') >= 0, '种子班（语文主科）语文仍可用', seed);
 console.log(''); console.log('结果: '+passed+' passed, '+failed+' failed');
 if(failed>0) process.exitCode=1;
 try{svc.db.close()}catch(e){}
})().catch(e=>{console.error('异常:',e);process.exitCode=1;});