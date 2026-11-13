const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-v7-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const out = {};
  async function open(file) {
    const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
    win.setContentSize(1920, 1080);
    const js = c => win.webContents.executeJavaScript(c, true);
    const errs = [];
    win.webContents.on('console-message', function(){ var a=[].slice.call(arguments); var d=a[1]; var lvl=(typeof d==='object'&&d)?d.level:a[1]; var m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) errs.push(String(m).slice(0,120)); });
    await win.loadURL('file://' + path.join(ROOT, 'design', file).replace(/\\/g, '/'));
    await sleep(1500);
    return { win, js, errs };
  }
  // 学生大屏
  const s = await open('v3_looseleaf_paper.html');
  out.student = await s.js(`(function(){return {simbadge:document.querySelectorAll('.simbadge').length, theme:document.documentElement.getAttribute('data-theme'), themeLabel:(document.getElementById('fab-theme-name')||{}).textContent, teacherLink:(document.getElementById('btn-teacher')||{}).getAttribute?a:null};})()`).catch(()=>null);
  out.student2 = await s.js(`(function(){var t=document.getElementById('btn-teacher');return {simbadge:document.querySelectorAll('.simbadge').length, theme:document.documentElement.getAttribute('data-theme'), themeLabel:(document.getElementById('fab-theme-name')||{}).textContent, teacherHref:t?t.getAttribute('href'):null};})()`);
  out.studentAudit = await s.js(`(function(){var a=window.__v3audit?window.__v3audit():null;return a?{pass:a.pass,occluded:(a.occluded||[]).length}:null;})()`);
  // 打开档案后悬浮球是否还在右下（应可自由摆放）
  await s.js(`document.querySelector('.pet-card').click()`);
  await sleep(800);
  out.fabAfterIns = await s.js(`(function(){var w=document.getElementById('fab-wrap');var r=w.getBoundingClientRect();return {left:Math.round(r.left),top:Math.round(r.top),right:Math.round(innerWidth-r.right),bottom:Math.round(innerHeight-r.bottom),hatchVisible:(function(){var h=document.getElementById('btn-hatch');if(!h)return 'no-hatch';var b=h.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;})()};})()`);
  out.studentErrors = s.errs.slice(0,4);
  s.win.close();
  // 教师台
  const t = await open('v3_teacher_desk.html');
  out.teacher = await t.js(`(function(){return {badge:document.querySelectorAll('.demo-badge').length, grain:getComputedStyle(document.querySelector('.stu-row')).backgroundImage.indexOf('svg')>=0, subjectText:(document.getElementById('dock-subject')||{}).textContent};})()`);
  await t.js(`(function(){var bs=document.querySelectorAll('#subject-seg-2 button');bs[1].click();})()`);
  await sleep(300);
  out.subjectAfter = await t.js(`(function(){var bs=[].slice.call(document.querySelectorAll('#subject-seg-2 button'));return {dock:(document.getElementById('dock-subject')||{}).textContent, pressed:bs.map(function(b){return b.getAttribute('aria-pressed');})};})()`);
  out.teacherAudit = await t.js(`(function(){var a=window.__v3audit?window.__v3audit():null;return a?{pass:a.pass,occluded:(a.occluded||[]).length,missing:(a.missing||[]).length}:null;})()`);
  out.teacherErrors = t.errs.slice(0,4);
  t.win.close();
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','v7_check.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
