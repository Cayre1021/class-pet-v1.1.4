const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-fade-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: true, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  win.setContentSize(1920,1080); win.setAlwaysOnTop(true); win.focus();
  const js = c => win.webContents.executeJavaScript(c, true);
  await win.loadURL('file://' + path.join(ROOT, 'design', 'v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1500);
  const snap = `(function(){function c(sel){var e=document.querySelector(sel);return e?getComputedStyle(e).backgroundColor:null;}return {body:c('body'),lanes:c('.lanes'),card:c('.stu-row'),top:c('.topbar'),dock:c('#dock')};})()`;
  const out = { before: await js(snap), series: [] };
  await js(`(function(){var b=document.getElementById('btn-data-menu');b.click();var m=document.getElementById('data-menu');var t=m.querySelector('[data-action="theme-forest"]');t.click();})()`);
  for (const t of [0, 80, 160, 260, 420, 700]) {
    await sleep(t === 0 ? 0 : 60);
    const s = await js(snap);
    out.series.push({ t: t, body: s.body, lanes: s.lanes, card: s.card });
  }
  out.after = await js(snap);
  out.fadeClass = await js(`document.documentElement.classList.contains('theme-fade')`);
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','theme_fade.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
