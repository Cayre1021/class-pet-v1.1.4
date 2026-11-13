const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-aud-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const out = {};
  for (const f of ['v3_looseleaf_paper.html','v3_teacher_desk.html']) {
    const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
    win.setContentSize(1920,1080);
    const js = c => win.webContents.executeJavaScript(c, true);
    await win.loadURL('file://' + path.join(ROOT, 'design', f).replace(/\\/g, '/'));
    await sleep(1500);
    out[f] = await js(`(function(){var a=window.__v3audit?window.__v3audit():null;if(!a)return {no:true};return {pass:a.pass,occluded:(a.occluded||[]).slice(0,6),bad:(a.bad||a.badControls||[]).slice(0,4),clipped:(a.clipped||[]).slice(0,4),unlabeled:(a.unlabeled||[]).slice(0,3),missing:(a.missing||[]).slice(0,3),overflow:a.overflow};})()`);
    win.close();
  }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','audit_detail.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
