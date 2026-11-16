const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-jit2-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const prog = [];
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 900, show: true, webPreferences: { contextIsolation: true } });
  const js = async (c) => { const v = await win.webContents.executeJavaScript(c, true); return v; };
  const res = {};
  try {
    await win.loadURL('file://' + path.join(ROOT, 'design/v3_looseleaf_paper.html').replace(/\\/g, '/'));
    await sleep(1500);
    await js('window.__S={runs:[]};window.__go=function(sel,ms){var el=document.querySelector(sel);if(!el)return "no-el";var t0=performance.now(),last=null;var tm=setInterval(function(){var r=el.getBoundingClientRect();var k=[Math.round(r.x*10)/10,Math.round(r.y*10)/10,Math.round(r.width*10)/10,Math.round(r.height*10)/10].join("|");if(k!==last){window.__S.runs.push([Math.round(performance.now()-t0),k]);last=k;}},16);setTimeout(function(){clearInterval(tm);},ms);return "ok";}; 0;');
    await js('document.getElementById("fab").click()');
    await sleep(300);
    await js('document.getElementById("fab-rollcall").click()');
    await sleep(700);
    res.rollDialog = await js('(function(){var d=document.querySelector("#mask-rollcall .dialog");var r=d.getBoundingClientRect();var a=document.querySelector("#mask-rollcall .dlg-actions");return {w:Math.round(r.width),h:Math.round(r.height),scroll:d.scrollHeight>d.clientHeight,dialogScrollH:d.scrollHeight,dialogClientH:d.clientHeight,actsH:Math.round(a.getBoundingClientRect().height),ticket:Math.round(document.getElementById("ticket").getBoundingClientRect().width)};})()');
    await js('window.__go("#mask-rollcall .dialog", 3400)');
    await js('document.getElementById("rollcall-start").click()');
    await sleep(3600);
    res.rollRuns = JSON.parse(await js('JSON.stringify(window.__S.runs)'));
    await js('window.__S.runs=[]');
    await js('document.getElementById("rollcall-close").click()');
    await sleep(500);
    await js('document.getElementById("fab").click()');
    await sleep(300);
    await js('document.getElementById("fab-timer").click()');
    await sleep(700);
    await js('window.__go("#mask-timer .dialog", 3400)');
    
    await js('document.getElementById("timer-toggle").click()');
    await sleep(3600);
    res.timerRuns = JSON.parse(await js('JSON.stringify(window.__S.runs)'));
    res.timerNum = await js('(function(){var n=document.getElementById("timer-num");var r=n.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),txt:n.textContent};})()');
  } catch (e) { res.fatal = String(e && e.message || e).slice(0, 300); }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','jitter_probe.json'), JSON.stringify(res,null,2));
  console.log('done');
  app.quit();
});
