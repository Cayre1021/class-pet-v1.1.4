const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-tv4f-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MEAS = `(function(){var d=document.getElementById('dlg');if(!d)return null;var b=document.getElementById('dlg-body');var r=d.getBoundingClientRect();var cs=getComputedStyle(d);return {open:d.hasAttribute('open'),rect:[Math.round(r.width),Math.round(r.height)],dlgBar:d.scrollHeight>d.clientHeight+1||d.scrollWidth>d.clientWidth+1,dlgScroll:[d.scrollHeight,d.clientHeight],bodyBar:b?(b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1):null,bodyScroll:b?[b.scrollHeight,b.clientHeight]:null,ovY:cs.overflowY,ovX:cs.overflowX};})()`;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const raw = c => win.webContents.executeJavaScript(c, true);
  const safe = async (l, c) => { try { return await raw(c); } catch (e) { return { err: l + ':' + String(e.message || e).slice(0, 60) }; } };
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1600);
  const out = { cases: [] };
  for (const a of ['ledger','excel','threshold','backup','add']) {
    await safe('open', a === 'add' ? `(function(){document.getElementById('btn-add').click();})()` : `(function(){document.querySelector('[data-action="${a}"]').click();})()`);
    await sleep(450);
    const m1 = await safe('m1', MEAS);
    await sleep(700);
    const m2 = await safe('m2', MEAS);
    out.cases.push({ a, m1, stable: m1 && m2 && m1.rect && m2.rect && m1.rect[0] === m2.rect[0] && m1.rect[1] === m2.rect[1] });
    await safe('close', `(function(){var d=document.getElementById('dlg');if(d&&d.open)d.close();})()`);
    await sleep(250);
  }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','teacher_v4_dialogs.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
