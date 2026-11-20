// test_v3_threshold_migration.cjs —— 阈值迁移：旧曲线（含缺 level 0 的 20 行）必须被改成 50/100；自定义的不能动
const path=require('path'), fs=require('fs'), os=require('os');
const projectRoot = fs.existsSync(path.join(__dirname,'electron-app')) ? __dirname : path.join(__dirname,'..');
const initSqlJs=require(path.join(projectRoot,'electron-app','node_modules','sql.js'));
const {SQLiteService}=require(path.join(projectRoot,'electron-app','sqlite_service.js'));
let passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };
const NEW=[0,50,150,250,350,450,550,650,750,850,950,1050,1150,1250,1350,1450,1550,1650,1750,1850,1950];
(async()=>{
 const src=path.join(projectRoot,'database','classpet.sqlite');
 const before=fs.statSync(src).mtimeMs;
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'thrmig-'));
 const db=path.join(tmp,'classpet.sqlite');
 fs.copyFileSync(src,db);
 const SQL=await initSqlJs(); const svc=new SQLiteService();
 svc.SQL=SQL; svc.db=new SQL.Database(fs.readFileSync(db)); svc.dbPath=db; svc.isInitialized=true;
 const read=(cls)=>svc.query("SELECT min_exp FROM class_level_thresholds WHERE class_id=? ORDER BY level",[cls]).map(r=>Number(r.min_exp));
 const write=(cls,list)=>{ svc.db.run("DELETE FROM class_level_thresholds WHERE class_id=?",[cls]); list.forEach((v,i)=>svc.db.run("INSERT INTO class_level_thresholds (class_id,level,min_exp) VALUES (?,?,?)",[cls,i,v])); };

 console.log('== 阈值迁移 ==');
 // ① 负责人这个班的原型：只有 1..20 行、15 + 每级 20
 const A='c_mig_20rows';
 svc.db.run("INSERT OR IGNORE INTO classes (id,teacher_id,school_name,class_name,class_norm,default_subject_id,max_level,created_at,updated_at) VALUES (?, 't','x','旧平稳档','旧平稳档','subj_chinese',20,0,0)",[A]);
 svc.db.run("DELETE FROM class_level_thresholds WHERE class_id=?",[A]);
 for(let l=1;l<=20;l++) svc.db.run("INSERT INTO class_level_thresholds (class_id,level,min_exp) VALUES (?,?,?)",[A,l,15+(l-1)*20]);
 assert(read(A).length===20 && read(A)[0]===15, '准备：20 行、从 level 1 开始的旧平稳档（15/20）', read(A).slice(0,3));
 // ② 官方旧默认曲线（21 行）
 const B='c_mig_olddef';
 svc.db.run("INSERT OR IGNORE INTO classes (id,teacher_id,school_name,class_name,class_norm,default_subject_id,max_level,created_at,updated_at) VALUES (?, 't','x','旧默认','旧默认','subj_chinese',20,0,0)",[B]);
 write(B,[0,15,35,60,90,125,165,210,260,315,375,440,510,585,665,750,840,935,1035,1140,1250]);
 // ③ 教师自己调过的曲线（破壳 80、每级 +120）→ 不许动
 const C='c_mig_custom';
 svc.db.run("INSERT OR IGNORE INTO classes (id,teacher_id,school_name,class_name,class_norm,default_subject_id,max_level,created_at,updated_at) VALUES (?, 't','x','自定义','自定义','subj_chinese',20,0,0)",[C]);
 write(C,[0,80,200,320,440,560,680,800,920,1040,1160,1280,1400,1520,1640,1760,1880,2000,2120,2240,2360]);
 const customBefore=read(C).slice();

 const mig=svc.migrateLegacyDefaultThresholds();
 assert(mig.success===true && mig.migrated>=2, '迁移执行成功（至少迁移 2 个旧曲线班级）', mig);
 const a=read(A);
 assert(a.length===21 && a[0]===0 && a[1]===50 && a[2]===150, '★ 20 行旧平稳档被补齐成 21 行 0/50/150（破壳 50、每级 100）', a.slice(0,3));
 assert(a.join(',')===NEW.join(','), '★ 整表等于新默认 0,50,150,…,1950', a.slice(0,4));
 const b2=read(B);
 assert(b2.length===21 && b2[1]===50 && b2[2]===150, '旧官方默认曲线也被迁移到 50/100', b2.slice(0,3));
 assert(read(C).join(',')===customBefore.join(','), '教师自定义的阈值（破壳 80）保持不动', read(C).slice(0,3));
 const again=svc.migrateLegacyDefaultThresholds();
 assert(again.migrated===0, '再跑一次不会重复迁移（幂等）', again);
 assert(fs.statSync(src).mtimeMs===before, 'database/classpet.sqlite 原件未被修改');
 try{svc.db.close()}catch(e){}
 fs.rmSync(tmp,{recursive:true,force:true});
 console.log('\n结果: '+passed+' passed, '+failed+' failed');
 if(failed>0) process.exitCode=1;
})().catch(e=>{console.error('测试异常:',e);process.exitCode=1;});