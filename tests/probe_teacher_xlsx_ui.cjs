// probe_teacher_xlsx_ui.cjs —— 教师台「名单导入导出」真的走 xlsx（导出落盘 + 读回 + 导入写库）
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const xlsxLite=require(path.join(ROOT,'electron-app','xlsx_lite.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-txls-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-txsldb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0, lastExport=null, importPath='';
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x).slice(0,240):''));failed++;} };

// 桩掉系统对话框：保存到 tmp，打开 importPath
dialog.showSaveDialog = async (win, opts) => {
  const p = String((opts && opts.defaultPath) || 'out.xlsx');
  const name = path.basename(p).replace(/[\\/:*?"<>|]/g, '_');
  const target = path.join(tmp, name.endsWith('.xlsx') || name.endsWith('.csv') ? name : name + '.xlsx');
  lastExport = target;
  return { canceled: false, filePath: target };
};
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [importPath] });

function regIpc(){ const h=(ch,fn)=>ipcMain.handle(ch,async(e,pl)=>{try{return await fn(pl);}catch(err){return {success:false,error:String(err&&err.message||err)};}});
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
 h('app:get-version',()=>'1.2.3');
 h('update:check',()=>({ok:true,current:'1.2.3',latest:'1.2.3',hasUpdate:false}));
 // 真 io 通道（复用 main.js 的同一套 xlsxLite 逻辑）
 h('io:exportRoster', async (p)=>{ const rows=(p&&p.rows)||[]; if(!rows.length) return {ok:false,error:'空'};
   const res = await dialog.showSaveDialog(null, { defaultPath: path.join(tmp, (p&&p.fileName)||'名单.xlsx') });
   if(!res||res.canceled) return {ok:false,canceled:true};
   fs.writeFileSync(res.filePath, xlsxLite.writeXlsx(rows,{sheetName:(p&&p.sheetName)||'名单'}));
   return {ok:true, filePath: res.filePath, bytes: fs.statSync(res.filePath).size}; });
 h('io:exportLedger', async (p)=>{ const rows=(p&&p.rows)||[]; const res = await dialog.showSaveDialog(null,{defaultPath:path.join(tmp,(p&&p.fileName)||'台账.xlsx')});
   if(!res||res.canceled) return {ok:false,canceled:true};
   fs.writeFileSync(res.filePath, xlsxLite.writeXlsx(rows,{sheetName:(p&&p.sheetName)||'赋分台账'}));
   return {ok:true, filePath: res.filePath}; });
 h('io:importRoster', async ()=>{ const res = await dialog.showOpenDialog(null,{});
   if(!res||res.canceled) return {ok:false,canceled:true};
   const p=res.filePaths[0]; const buf=fs.readFileSync(p); const ext=path.extname(p).toLowerCase();
   const parsed = ext==='.csv' ? xlsxLite.readCsv(xlsxLite.decodeTextBuffer(buf)) : xlsxLite.readXlsx(buf);
   if(!parsed||!parsed.ok) return {ok:false,error:(parsed&&parsed.error)||'读取失败'};
   return {ok:true, rows:parsed.rows, source: ext==='.csv'?'csv':'xlsx', fileName: path.basename(p)}; });
}
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 教师台 名单导入导出（XLSX）==');
 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2600);
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /稍后再说/.test(x.textContent);})[0];if(b)b.click();}return true;})()");
 await sleep(300);

 const menu = await js("(function(){var b=document.querySelector('[data-action=\"excel\"]');return b?b.textContent.replace(/\\s+/g,' ').trim():null;})()");
 assert(/名单导入导出/.test(menu||'') && /XLSX/i.test(menu||''), '菜单项是「名单导入导出 · XLSX」：' + menu, menu);

 await js("(function(){document.querySelector('[data-action=\"excel\"]').click();return true;})()");
 await sleep(600);
 const body = await js("(function(){var b=document.getElementById('dlg-body');return b?b.textContent:'';})()");
 assert(/\.xlsx/.test(body), '弹窗正文明确写 .xlsx', body.slice(0,80));
 assert(/另存为 \.xlsx/.test(body), '提示旧版 .xls 需另存为 .xlsx');
 const btns = await js("[].slice.call(document.querySelectorAll('#dlg-foot button')).map(function(b){return b.textContent.trim();})");
 assert(btns.some(function(t){return /导出名单 XLSX/.test(t);}), '有「导出名单 XLSX」按钮', btns);

 // 导出 -> 落盘 xlsx -> 读回
 await js("(function(){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /导出名单 XLSX/.test(x.textContent);})[0];b.click();return true;})()");
 await sleep(1800);
 assert(!!lastExport && fs.existsSync(lastExport), '导出文件真的落盘了：' + lastExport, lastExport);
 const buf = fs.readFileSync(lastExport);
 assert(buf.slice(0,2).toString() === 'PK', '落盘文件是 xlsx（zip 头 PK）', buf.slice(0,2).toString());
 const back = xlsxLite.readXlsx(buf);
 assert(back.ok === true && back.rows.length === svc.query("SELECT COUNT(*) n FROM students WHERE class_id='c_class02_01'")[0].n + 1,
   'readXlsx 读回：表头 1 行 + 学生 ' + (back.rows.length - 1) + ' 行', back.rows.length);
 assert(back.rows[0].join(',') === '学号,姓名,小组,等级,经验,物种', '表头列名正确', back.rows[0]);

 // 导入：构造一份 xlsx（新学生 9901/9902 + 一个改名），走 UI 导入
 const importer = path.join(tmp, '导入测试.xlsx');
 xlsxLite.writeXlsx ? fs.writeFileSync(importer, xlsxLite.writeXlsx([['学号','姓名','小组','等级','经验','物种'],['9901','新同学甲',2,1,0,'cat'],['9902','新同学乙',3,1,0,'dog']], { sheetName:'名单' })) : null;
 importPath = importer;
 await js("(function(){var d=document.getElementById('dlg');if(d&&d.open)d.close();return true;})()");
 await sleep(200);
 await js("(function(){document.querySelector('[data-action=\"excel\"]').click();return true;})()");
 await sleep(500);
 await js("(function(){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /导入名单/.test(x.textContent);})[0];b.click();return true;})()");
 await sleep(3000);
 const got1 = svc.query("SELECT student_no, name FROM students WHERE class_id='c_class02_01' AND student_no='9901'")[0];
 const got2 = svc.query("SELECT student_no, name FROM students WHERE class_id='c_class02_01' AND student_no='9902'")[0];
 assert(!!got1 && got1.name === '新同学甲', '导入落库：9901 新同学甲', got1);
 assert(!!got2 && got2.name === '新同学乙', '导入落库：9902 新同学乙', got2);
 const pets = svc.query("SELECT COUNT(*) n FROM pets WHERE student_id=(SELECT id FROM students WHERE class_id='c_class02_01' AND student_no='9901')")[0];
 assert(Number(pets.n) === 3, '新导入的学生有三科宠物行', pets.n);

 win.destroy();
 console.log('\n结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});