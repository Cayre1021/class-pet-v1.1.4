const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-fx4-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SAMPLE = '(function(){var c=document.getElementById("fx");var g=c.getContext("2d");var W=c.width,H=c.height;var d=g.getImageData(0,0,W,H).data;var nz=0,hues={},maxS=0;for(var i=0;i<d.length;i+=16){var r=d[i],gg=d[i+1],b=d[i+2],a=d[i+3];if(a<10)continue;nz++;var mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);if(mx===mn)continue;var h;if(mx===r)h=60*(((gg-b)/(mx-mn))%6);else if(mx===gg)h=60*((b-r)/(mx-mn)+2);else h=60*((r-gg)/(mx-mn)+4);if(h<0)h+=360;hues[Math.floor(h/30)]=1;if(mx-mn>maxS)maxS=mx-mn;}return {nz:nz,hues:Object.keys(hues).map(Number),maxSat:maxS};})()';
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 900, show: true, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const js = c => win.webContents.executeJavaScript(c, true);
  const out = { samples: [], hueSet: [] };
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_looseleaf_paper.html').replace(/\\/g, '/'));
  await sleep(1500);
  await js('document.querySelector(".pet-card").click()');
  await sleep(700);
  await js('(function(){var bs=document.querySelectorAll("#ins-body [data-score]");for(var i=0;i<bs.length;i++){if(bs[i].getAttribute("data-score")==="3"){bs[i].click();return;}}})()');
  for (let k = 0; k < 12; k++) {
    await sleep(200);
    const s = await js(SAMPLE);
    out.samples.push({ t: (k + 1) * 200, nz: s.nz, hues: s.hues.length, maxSat: s.maxSat });
    s.hues.forEach(h => { if (out.hueSet.indexOf(h) < 0) out.hueSet.push(h); });
  }
  out.hueSet.sort((a, b) => a - b);
  fs.writeFileSync(path.join(ROOT, 'screenshots_v3', 'fx_probe2.json'), JSON.stringify(out, null, 2));
  console.log('done'); app.quit();
});
