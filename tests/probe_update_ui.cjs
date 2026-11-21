// probe_update_ui.cjs —— 检查更新 UI/流程（GitHub Releases，只提示 + 打开下载）
const { app, BrowserWindow, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const ROOT=process.cwd();
const {SQLiteService}=require(path.join(ROOT,'electron-app','sqlite_service.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-upd-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cp-upddb-'));
const db=path.join(tmp,'classpet.sqlite');
fs.copyFileSync(path.join(ROOT,'database','classpet.sqlite'), db);
let svc=null, passed=0, failed=0, scenario='new', openedUrl=null;
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
 h('db:query',p=>svc.query(p.sql,p.params||[])); h('db:execute',p=>svc.execute(p.sql,p.params||[]));
 h('app:get-version',()=> '1.2.0');
 h('update:check',()=> {
   if (scenario === 'error') return { ok:false, reason:'network', message:'连不上 GitHub：请检查网络；若在中国大陆，可稍后用手机热点或换网络再试', current:'1.2.0', repo:'Cayre1021/class-pet-v1.1.4' };
   if (scenario === 'latest') return { ok:true, current:'1.2.0', latest:'1.2.0', hasUpdate:false, cached:false };
   return { ok:true, current:'1.2.0', latest:'1.3.0', hasUpdate:true,
            notes:'· 修复宠物表情残留\n· 新增检查更新',
            downloadUrl:'https://github.com/Cayre1021/class-pet-v1.1.4/releases/download/v1.3.0/ClassPet Setup 1.3.0.exe',
            assetName:'ClassPet Setup 1.3.0.exe', sizeBytes:120000000, publishedAt:'2026-11-20T10:00:00Z',
            pageUrl:'https://github.com/Cayre1021/class-pet-v1.1.4/releases/tag/v1.3.0', repo:'Cayre1021/class-pet-v1.1.4' };
 });
 h('update:open',(url)=> { openedUrl = url; return { ok:true }; });
}
const clickMenu = (action)=>"(function(){var b=document.querySelector('[data-action=\""+action+"\"]');if(!b)return 'no-item';b.click();return 'ok';})()";
const dlgText = "(function(){var d=document.getElementById('dlg');if(!d||!d.open)return null;return (document.getElementById('dlg-title').textContent+'|'+document.getElementById('dlg-body').textContent);})()";
const dlgBtns = "[].slice.call(document.querySelectorAll('#dlg-foot button')).map(function(b){return b.textContent.trim();})";
const closeDlg = "(function(){var d=document.getElementById('dlg');if(d&&d.open)d.close();return true;})()";
app.whenReady().then(async()=>{
 svc=new SQLiteService(); await svc.init(null,db); svc.isInitialized=true;
 svc.initDefaultTables(); svc.migrateLegacyDefaultThresholds(); svc.migrateHatchRuleV3(); regIpc();
 console.log('== 检查更新（GitHub Releases）==');
 const win=new BrowserWindow({width:1600,height:900,show:false,webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
 const js=c=>win.webContents.executeJavaScript(c,true);
 await win.loadURL('file://'+path.join(ROOT,'electron-app','src','v3_teacher_desk.html').replace(/\\/g,'/'));
 await sleep(2600);
 await js(closeDlg); await sleep(300);

 const sub0 = await js("(function(){var e=document.getElementById('mi-update-sub');return e?e.textContent:null;})()");
 assert(sub0 === 'v1.2.0', '菜单里显示当前版本 v1.2.0', sub0);
 const hasMenuItem = await js("(function(){return !!document.querySelector('[data-action=\"update\"]');})()");
 assert(hasMenuItem === true, '「数据与设置」里有「检查更新」入口');

 scenario='new';
 await js(clickMenu('update')); await sleep(1000);
 const t1 = await js(dlgText);
 assert(!!t1 && /发现新版本 v1\.3\.0/.test(t1), '弹窗标题显示新版本', t1 && t1.slice(0,60));
 assert(/当前 v1\.2\.0 → 最新 v1\.3\.0/.test(t1||''), '弹窗正文显示版本对比', t1 && t1.slice(0,160));
 if (!/ClassPet Setup 1\.3\.0\.exe/.test(t1||'') || !/MB/.test(t1||'')) {
   const rawHtml = await js("(function(){var b=document.getElementById('dlg-body');return b?b.innerHTML:'';})()");
   console.log('    [调试] t1=' + JSON.stringify(t1) + ' / html=' + String(rawHtml).slice(0, 200));
 }
 assert(/ClassPet Setup 1\.3\.0\.exe/.test(t1||'') && /MB/.test(t1||''), '显示安装包名与体积');
 assert(/修复宠物表情残留/.test(t1||''), '显示更新说明内容');
 const btnLabels = await js(dlgBtns);
 assert(btnLabels.indexOf('下载新版本')>=0, '有「下载新版本」按钮', btnLabels);
 await js("(function(){var b=[].slice.call(document.querySelectorAll('#dlg-foot button')).filter(function(x){return /下载新版本/.test(x.textContent);})[0];if(b)b.click();return true;})()");
 await sleep(800);
 assert(typeof openedUrl === 'string' && /releases\/download/.test(openedUrl) && /Setup/.test(openedUrl), '点下载调用 openUpdateDownload 并带正确安装包地址', openedUrl);
 const badge = await js("(function(){var b=document.getElementById('btn-data-menu');return b?b.classList.contains('has-update'):null;})()");
 assert(badge === true, '有新版本时「数据与设置」按钮出现红点');

 await js(closeDlg); await sleep(200);
 scenario='latest';
 await js(clickMenu('update')); await sleep(1000);
 const t2 = await js(dlgText);
 const toastTxt = await js("(function(){var t=document.getElementById('toast');return t?t.textContent.trim():'';})()");
 assert(!t2 && /已是最新版本 v1\.2\.0/.test(toastTxt), '已是最新时只提示、不弹窗', { dlg: t2, toast: toastTxt });

 scenario='error';
 await js(clickMenu('update')); await sleep(1000);
 const t3 = await js(dlgText);
 assert(!!t3 && /检查更新失败/.test(t3), '网络失败时弹窗标题为「检查更新失败」', t3 && t3.slice(0,50));
 assert(/连不上 GitHub/.test(t3||''), '给出中文原因与建议', t3 && t3.slice(0,180));
 const btn3 = await js(dlgBtns);
 assert(btn3.indexOf('重试')>=0 && btn3.indexOf('打开发布页')>=0, '失败时提供「重试」与「打开发布页」', btn3);

 win.destroy();
 console.log('\n结果: '+passed+' passed, '+failed+' failed');
 try{svc.db.close()}catch(e){}
 fs.rmSync(tmp,{recursive:true,force:true});
 app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});
