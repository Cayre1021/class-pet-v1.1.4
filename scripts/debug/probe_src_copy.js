const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-srcv3-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const out = {};
  for (const f of ['v3_portal.html','v3_looseleaf_paper.html','v3_teacher_desk.html']) {
    const win = new BrowserWindow({ width: 1600, height: 900, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
    const js = c => win.webContents.executeJavaScript(c, true);
    const errs = [];
    win.webContents.on('console-message', function(){ var a=[].slice.call(arguments); var d=a[1]; var lvl=(typeof d==='object'&&d)?d.level:a[1]; var m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) errs.push(String(m).slice(0,90)); });
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', f).replace(/\\/g, '/'));
    await sleep(1200);
    const r = await js(`(function(){var imgs=[].slice.call(document.images);return {imgs:imgs.length,broken:imgs.filter(function(i){return !i.complete||!i.naturalWidth}).length,docH:document.documentElement.scrollHeight,innerH:innerHeight};})()`);
    out[f] = { broken: r.broken, imgs: r.imgs, doc: r.docH + '/' + r.innerH, errors: errs.slice(0,2) };
    win.close();
  }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','evidence','src_copy_check.json'), JSON.stringify(out,null,2));
  console.log(JSON.stringify(out)); app.quit();
});
