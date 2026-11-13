const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-occ-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: true, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  win.setContentSize(1920,1080); win.setAlwaysOnTop(true); win.focus();
  const js = c => win.webContents.executeJavaScript(c, true);
  await win.loadURL('file://' + path.join(ROOT, 'design', 'v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1500);
  const out = await js(`(function(){
    var ms=[].slice.call(document.querySelectorAll('.stu-more'));
    var res=[];
    ms.forEach(function(b,i){
      var r=b.getBoundingClientRect();
      var x=Math.min(Math.max(r.left+r.width/2,0),innerWidth-1), y=Math.min(Math.max(r.top+r.height/2,0),innerHeight-1);
      if(r.bottom<0||r.top>innerHeight) return;
      var t=document.elementFromPoint(x,y);
      var ok=(t===b||b.contains(t)||t.contains(b));
      if(!ok) res.push({i:i, rect:[Math.round(r.left),Math.round(r.top)], hit:(t?(t.tagName+'.'+String(t.className).slice(0,30)):null), hidden:getComputedStyle(b).visibility});
    });
    return {total:ms.length, bad:res.slice(0,6), badCount:res.length};
  })()`);
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','occ_check.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
