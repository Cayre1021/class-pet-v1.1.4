const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-dbg2-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 900, show: true, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const js = c => win.webContents.executeJavaScript(c, true);
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_looseleaf_paper.html').replace(/\\/g, '/'));
  await sleep(1200); win.focus(); win.setAlwaysOnTop(true); await sleep(500);
  await js('document.querySelector(".pet-card").click()');
  await sleep(600);
  const out = { samples: [], vis: await js("(function(){return {state:document.visibilityState, focus:document.hasFocus()};})()") };
  await js('(function(){var bs=document.querySelectorAll("#ins-body [data-score]");for(var i=0;i<bs.length;i++){if(bs[i].getAttribute("data-score")==="3"){bs[i].click();return;}}})()');
  for (let k = 0; k < 16; k++) {
    await sleep(120);
    const st = await js('(function(){var c=document.getElementById("fx");var g=c.getContext("2d");var d=g.getImageData(0,0,300,300).data;var n=0;for(var i=3;i<d.length;i+=32){if(d[i]>8)n++;}var dbg=window.__fwDbg?window.__fwDbg():null;return {nz:n,dbg:dbg};})()');
    out.samples.push({ t: (k+1)*120, nz: st.nz, parts: st.dbg && st.dbg.parts, running: st.dbg && st.dbg.running });
  }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','fx_debug2.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
