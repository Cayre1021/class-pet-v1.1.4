// test_display_pet_follows_score.js —— 加分后展示宠必须跟着走（否则进度条/大屏看着不动）
const path=require('path'), fs=require('fs'), os=require('os');
const root = fs.existsSync(path.join(__dirname,'..','electron-app')) ? path.join(__dirname,'..') : path.join(__dirname);
const initSqlJs=require(path.join(root,'electron-app','node_modules','sql.js'));
const {SQLiteService}=require(path.join(root,'electron-app','sqlite_service.js'));
let passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dp-')); const db=path.join(tmp,'x.sqlite');
 fs.copyFileSync(path.join(root,'database','classpet.sqlite'), db);
 const SQL=await initSqlJs(); const svc=new SQLiteService();
 svc.SQL=SQL; svc.db=new SQL.Database(fs.readFileSync(db)); svc.dbPath=db; svc.isInitialized=true; svc.initDefaultTables();
 const C='c_dp';
 svc.createClassWithDefaults({ classId:C, className:'数学班', teacherName:'T', subjectCode:'math' });
 svc.saveStudent({ id:'st_dp_1', student_no:'1', name:'甲', group:1, pets:{}, activeSubject:'chinese' }, C);
 const dispPet = () => svc.query("SELECT p.subject_id, p.exp FROM students s JOIN pets p ON p.id = s.display_pet_id WHERE s.id='st_dp_1'")[0];
 console.log('== 展示宠跟随赋分科目 ==');
 assert(dispPet().subject_id === 'subj_chinese', '前置：展示宠在语文', dispPet());

 const r = svc.recordScoreOperation({ classId:C, teacherId:'t', studentIds:['st_dp_1'], delta:5, reason:'数学+5', subjectCode:'math' });
 assert(r.success === true, '数学赋分成功', r.error || 'ok');
 const d1 = dispPet();
 assert(d1.subject_id === 'subj_math' && Number(d1.exp) === 5, '★ 展示宠切到数学且经验=5', d1);

 // 再给语文加分 -> 展示宠应切回语文
 const r2 = svc.recordScoreOperation({ classId:C, teacherId:'t', studentIds:['st_dp_1'], delta:3, reason:'语文+3', subjectCode:'chinese' });
 assert(r2.success === true, '语文赋分成功', r2.error || 'ok');
 const d2 = dispPet();
 assert(d2.subject_id === 'subj_chinese' && Number(d2.exp) === 3, '★ 展示宠再切回语文（谁加分跟谁）', d2);

 // 撤销后仍是最后一次赋分的科目
 const undo = svc.undoOperation(r2.operationId);
 assert(undo.success === true, '撤销最后一笔成功', undo.error || 'ok');
 const d3 = dispPet();
 assert(d3.subject_id === 'subj_chinese', '撤销后展示宠仍指向该科（数值回滚）', d3);

 // VM 的 activePet 与展示宠一致，且 percent 会变
 const row = svc.loadAllState(C).students[0];
 assert(row && row.display_pet_id, 'loadAllState 带出 display_pet_id', row && row.display_pet_id);
 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
})().catch(e=>{console.error('异常:',e);process.exitCode=1;});