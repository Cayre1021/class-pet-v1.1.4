const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-pv2-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RECT = '(function(sel){var d=document.querySelector(sel);if(!d)return null;var r=d.getBoundingClientRect();var cs=getComputedStyle(d);return {rect:[Math.round(r.width),Math.round(r.height)],scrollH:d.scrollHeight,clientH:d.clientHeight,overflowY:cs.overflowY,overflowX:cs.overflowX,hasBar:d.scrollHeight>d.clientHeight+1||d.scrollWidth>d.clientWidth+1};})';
const SAMPLE = '(function(){var c=document.getElementById("fx");var g=c.getContext("2d");var d=g.getImageData(0,0,c.width,c.height).data;var nz=0,hues={};for(var i=0;i<d.length;i+=16){var r=d[i],gg=d[i+1],b=d[i+2],a=d[i+3];if(a<10)continue;nz++;var mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);if(mx===mn)continue;var h;if(mx===r)h=60*(((gg-b)/(mx-mn))%6);else if(mx===gg)h=60*((b-r)/(mx-mn)+2);else h=60*((r-gg)/(mx-mn)+4);if(h<0)h+=360;hues[Math.floor(h/30)]=1;}return {nz:nz,hues:Object.keys(hues).length};})';
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 900, show: true, webPreferences: { contextIsolation: true } });
  const js = c => win.webContents.executeJavaScript(c, true);
  const out = {}; const errs = [];
  win.webContents.on('console-message', function(){ var a=[].slice.call(arguments); var d=a[1]; var lvl=(typeof d==='object'&&d)?d.level:a[1]; var m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) errs.push(String(m).slice(0,120)); });
  try {
    await win.loadURL('file://' + path.join(ROOT, 'design/v3_looseleaf_paper.html').replace(/\\/g, '/'));
    await sleep(1500);
    await js('document.getElementById("fab").click()'); await sleep(250);
    await js('document.getElementById("fab-rollcall").click()'); await sleep(600);
    out.rollcall = await js(RECT + '("#mask-rollcall .dialog")');
    await js('document.getElementById("rollcall-start").click()'); await sleep(2200);
    out.rollcallAfter = await js(RECT + '("#mask-rollcall .dialog")');
    await js('document.getElementById("rollcall-close").click()'); await sleep(400);
    await js('document.getElementById("fab").click()'); await sleep(250);
    await js('document.getElementById("fab-timer").click()'); await sleep(600);
    out.timer = await js(RECT + '("#mask-timer .dialog")');
    await js('document.getElementById("timer-toggle").click()'); await sleep(1500);
    out.timerAfter = await js(RECT + '("#mask-timer .dialog")');
    await js('document.getElementById("timer-close").click()'); await sleep(400);
    // 赋分行
    await js('document.querySelector(".pet-card").click()'); await sleep(700);
    out.scoreLabels = await js('JSON.stringify([].map.call(document.querySelectorAll("#ins-body .score-grid button, #ins-body .score-grid .cc-step"),function(b){return (b.textContent||"").replace(/\s+/g," ").trim();}))');
    out.expBefore = await js('(function(){var n=document.getElementById("ins-exp");return n?n.textContent:null;})()');
    out.step = await js('(function(){var b=document.querySelector("[data-step=\\"-1\\"]");if(!b)return "no-step";b.click();b.click();return document.querySelector(".cc-apply span").textContent;})()');
    out.apply = await js('(function(){var b=document.querySelector("[data-custom-apply]");if(!b)return "no-apply";b.click();return "clicked";})()');
    await sleep(400);
    out.expAfter = await js('(function(){var n=document.getElementById("ins-exp");return n?n.textContent:null;})()');
    // 烟花峰值
    await js('(function(){var bs=document.querySelectorAll("#ins-body [data-score]");for(var i=0;i<bs.length;i++){if(bs[i].getAttribute("data-score")==="3"){bs[i].click();return;}}})()');
    out.peak = 0; out.hues = 0;
    for (let k = 0; k < 12; k++) { await sleep(200); const s = await js(SAMPLE + "()"); if (s.nz > out.peak) out.peak = s.nz; if (s.hues > out.hues) out.hues = s.hues; }
    out.errors = errs.slice(0,4);
  } catch (e) { out.fatal = String(e && e.message || e).slice(0,200); }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','paper_v2_check.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
