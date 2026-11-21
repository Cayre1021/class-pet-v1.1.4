// probe_window_title.cjs —— 标题栏文案（真窗口 getTitle，确认旧文案彻底消失）
const { app, BrowserWindow } = require('electron');
const path=require('path'), os=require('os');
const ROOT=process.cwd();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.on('window-all-closed',()=>{});
app.setPath('userData', path.join(os.tmpdir(),'cp-title-'+Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
let passed=0, failed=0;
const assert=(c,m,x)=>{ if(c){console.log('  PASS  '+m);passed++;} else {console.error('  FAIL  '+m+(x!==undefined?'  ->  '+JSON.stringify(x):''));failed++;} };
app.whenReady().then(async()=>{
  console.log('== 窗口标题 ==');
  const win=new BrowserWindow({width:1280,height:800,show:false,title:'x',webPreferences:{contextIsolation:true,preload:path.join(ROOT,'electron-app','preload.js')}});
  win.webContents.on('page-title-updated',()=>{});
  const load=async(file)=>{ await win.loadURL('file://'+path.join(ROOT,'electron-app','src',file).replace(/\\/g,'/')); await sleep(700); return win.getTitle(); };
  const paper=await load('v3_looseleaf_paper.html');
  assert(!/纸感手绘版|演示原型/.test(paper), '学生大屏标题不再含「纸感手绘版/演示原型」', paper);
  assert(paper === '班级电子宠物 · 学生大屏', '学生大屏标题 = 班级电子宠物 · 学生大屏', paper);
  const teacher=await load('v3_teacher_desk.html');
  assert(teacher === '班级电子宠物 · 教师操作台', '教师台标题 = 班级电子宠物 · 教师操作台', teacher);
  assert(!/V3$/.test(teacher), '教师台标题不再带 V3 后缀', teacher);
  const portal=await load('v3_portal.html');
  assert(portal === '班级电子宠物 · 教师登录 / 注册', '门户标题保持登录/注册', portal);
  // 再回到大屏：确认来回切换不会带回旧文案
  const back=await load('v3_looseleaf_paper.html');
  assert(!/纸感手绘版|演示原型/.test(back), '来回切换后标题仍干净', back);
  win.destroy();
  console.log('\n结果: '+passed+' passed, '+failed+' failed');
  app.exit(failed===0?0:1);
}).catch(e=>{console.error('探针异常:',e);app.exit(2);});
