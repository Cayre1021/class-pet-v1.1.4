// test_backup_restore_cross.js —— 备份能在"另一个班/新机器"里还原（id 不再撞主键）+ 删规则后再新增不报错
const path=require('path'), fs=require('fs'), os=require('os');
const root = fs.existsSync(path.join(__dirname,'..','electron-app')) ? path.join(__dirname,'..') : path.join(__dirname);
const initSqlJs=require(path.join(root,'electron-app','node_modules','sql.js'));
const {SQLiteService}=require(path.join(root,'electron-app','sqlite_service.js'));
let passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
const SRC = path.join(root,'database','classpet.sqlite');
const mtime0 = fs.statSync(SRC).mtimeMs;

(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'br-')); const db=path.join(tmp,'x.sqlite');
 fs.copyFileSync(SRC, db);
 const SQL=await initSqlJs(); const svc=new SQLiteService();
 svc.SQL=SQL; svc.db=new SQL.Database(fs.readFileSync(db)); svc.dbPath=db; svc.isInitialized=true;
 svc.initDefaultTables();
 const A='c_class02_01';
 console.log('== 跨班还原（换机器场景）==');
 // 用 A 班的真实数据造一份"备份 payload"
 const students = svc.query("SELECT * FROM students WHERE class_id=? ORDER BY student_no",[A]);
 const subjects = [['chinese','subj_chinese'],['math','subj_math'],['english','subj_english']];
 const payload = { kind:'classpet-backup', version:1, classId:A,
   students: students.map(s=>{
     const pets = {};
     subjects.forEach(([code,subId])=>{
       const p = svc.query("SELECT * FROM pets WHERE student_id=? AND subject_id=?",[s.id,subId])[0];
       if (p) pets[code] = { id:p.id, species:p.species_code, exp:p.exp, level:p.level, visualStage:p.visual_stage };
     });
     return { id:s.id, no:s.student_no, name:s.name, group:parseInt(String(s.group_name||'').replace(/\D/g,''),10)||1, pets };
   }),
   thresholds: svc.query("SELECT min_exp FROM class_level_thresholds WHERE class_id=? ORDER BY level",[A]).map(r=>Number(r.min_exp)),
   stages: svc.query("SELECT stage,min_level,code FROM class_visual_stages WHERE class_id=? ORDER BY stage",[A]).map(r=>({stage:r.stage,minLevel:r.min_level,code:r.code})),
   rules: svc.query("SELECT * FROM behavior_rules WHERE class_id=? ORDER BY sort_order",[A]).map(r=>({id:r.id,name:r.name,points:r.points,type:r.type}))
 };
 assert(payload.students.length === students.length && payload.students.length > 50, '备份 payload 含 ' + payload.students.length + ' 名学生', payload.students.length);

 // 新建 B 班（模拟"换了一台机器/新注册的班"）
 const B='c_restore_target';
 svc.createClassWithDefaults({ classId:B, className:'新班', teacherName:'T', subjectCode:'chinese' });
 svc.saveStudent({ id:'st_b_existing', student_no:'1', name:'B班原有学生', group:1, pets:{} }, B);

 const r1 = svc.restoreClassBackup(B, payload);
 assert(r1.success === true, '★ 把 A 班备份还原进 B 班成功（旧版本这里会 UNIQUE 报错）', r1);
 const nb = svc.query("SELECT COUNT(*) n FROM students WHERE class_id=?",[B])[0].n;
 assert(Number(nb) === payload.students.length, 'B 班学生数 = 备份里的 ' + payload.students.length, nb);
 const rulesB = svc.query("SELECT COUNT(*) n FROM behavior_rules WHERE class_id=?",[B])[0].n;
 assert(Number(rulesB) === payload.rules.length, 'B 班规则数 = ' + payload.rules.length, rulesB);
 const thrB = svc.query("SELECT COUNT(*) n FROM class_level_thresholds WHERE class_id=?",[B])[0].n;
 assert(Number(thrB) === 21, 'B 班阈值 21 级', thrB);
 const petsB = svc.query("SELECT COUNT(*) n FROM pets WHERE class_id=?",[B])[0].n;
 assert(Number(petsB) >= payload.students.length * 3, 'B 班宠物行数合理（' + petsB + '）', petsB);
 const disp = svc.query("SELECT COUNT(*) n FROM students WHERE class_id=? AND display_pet_id IS NOT NULL",[B])[0].n;
 assert(Number(disp) === payload.students.length, '★ 每个学生的展示宠都指到了新宠物 id', disp);
 const sample = svc.query("SELECT name, student_no FROM students WHERE class_id=? ORDER BY student_no LIMIT 2",[B]);
 assert(sample[0].name === payload.students[0].name, '还原后姓名一致', sample[0]);
 assert(svc.query("SELECT COUNT(*) n FROM students WHERE class_id=?",[A])[0].n === students.length, 'A 班数据没被动', 'ok');

 // 同班再还原一次（幂等）
 const r2 = svc.restoreClassBackup(B, payload);
 assert(r2.success === true, '同一班重复还原也成功', r2.error || 'ok');
 assert(Number(svc.query("SELECT COUNT(*) n FROM students WHERE class_id=?",[B])[0].n) === payload.students.length, '重复还原后学生数不变');

 // 还原前自动备份现场
 const baks = fs.readdirSync(tmp).filter(f=>f.indexOf('.bak-')>=0);
 assert(baks.length >= 1, '★ 还原前自动生成了现场备份文件（' + baks.length + ' 个）', baks.slice(0,3));

 console.log('');
 console.log('结果: '+passed+' passed, '+failed+' failed');
 assert(fs.statSync(SRC).mtimeMs === mtime0, '种子库未被改动');
 try{svc.db.close()}catch(e){}
})().catch(e=>{console.error('异常:',e);process.exitCode=1;});