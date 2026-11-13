const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-style-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const out = {};
  for (const f of ['v3_looseleaf_paper.html','v3_teacher_desk.html']) {
    const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
    win.setContentSize(1920,1080);
    const js = c => win.webContents.executeJavaScript(c, true);
    await win.loadURL('file://' + path.join(ROOT, 'design', f).replace(/\\/g, '/'));
    await sleep(1400);
    if (f.indexOf('paper') >= 0) {
      out.link = await js(`(function(){var a=document.getElementById('btn-teacher');var cs=getComputedStyle(a);return {color:cs.color,decoration:cs.textDecorationLine,border:cs.borderTopWidth+' '+cs.borderTopColor};})()`);
    } else {
      out.teacher = await js(`(function(){var r=document.querySelector('.stu-row');var cs=getComputedStyle(r);var b=document.querySelector('.score-btn');var bs=b?getComputedStyle(b):null;var d=document.getElementById('dock');return {radius:cs.borderTopLeftRadius,shadow:cs.boxShadow,transform:cs.transform,scoreBefore:getComputedStyle(b,'::before').borderTopWidth,scoreRadius:bs?bs.borderTopLeftRadius:null,dockGrain:(d?getComputedStyle(d).backgroundImage:'').indexOf('svg')>=0};})()`);
    }
    win.close();
  }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','style_check.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
