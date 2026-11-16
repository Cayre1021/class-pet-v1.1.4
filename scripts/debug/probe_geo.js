const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-geo-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  win.setContentSize(1920,1080);
  const js = c => win.webContents.executeJavaScript(c, true);
  await win.loadURL('file://' + path.join(ROOT, 'design', 'v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1500);
  const out = await js(`(function(){
    var row=document.querySelector('.stu-row');
    var chk=row.querySelector('.chk'); var more=row.querySelector('.stu-more');
    var r1=chk.getBoundingClientRect(), r2=more.getBoundingClientRect(), r0=row.getBoundingClientRect();
    var x=r1.left+r1.width/2, y=r1.top+r1.height/2;
    var hit=document.elementFromPoint(x,y);
    return {row:[Math.round(r0.width),Math.round(r0.height)], chk:[Math.round(r1.x),Math.round(r1.y),Math.round(r1.width),Math.round(r1.height)], more:[Math.round(r2.x),Math.round(r2.y),Math.round(r2.width),Math.round(r2.height)], chkHit:hit?(hit.getAttribute('data-audit')||hit.className):null, chkPos:getComputedStyle(chk).position, morePos:getComputedStyle(more).position, rowOverflow:getComputedStyle(row).overflow};
  })()`);
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','geo_check.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
