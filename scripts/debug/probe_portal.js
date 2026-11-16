const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-portal-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const out = {};
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  win.setContentSize(1920,1080);
  const js = c => win.webContents.executeJavaScript(c, true);
  const errs = [];
  win.webContents.on('console-message', function(){ var a=[].slice.call(arguments); var d=a[1]; var lvl=(typeof d==='object'&&d)?d.level:a[1]; var m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) errs.push(String(m).slice(0,120)); });
  await win.loadURL('file://' + path.join(ROOT, 'design', 'v3_portal.html').replace(/\\/g, '/'));
  await sleep(1500);
  out.base = await js(`(function(){var d=document.documentElement;return {docH:d.scrollHeight,innerH:innerHeight,docW:d.scrollWidth,innerW:innerWidth,tabs:document.querySelectorAll('[role=tab]').length,forms:document.querySelectorAll('form').length,img:document.querySelectorAll('img').length,brokenImgs:[].slice.call(document.images).filter(function(i){return !i.complete||!i.naturalWidth}).length};})()`);
  // 空提交
  out.empty = await js(`(function(){var f=document.querySelector('#panel-login form')||document.querySelector('form');var btn=f?f.querySelector('button[type=submit],button'):null;if(btn)btn.click();return {msgs:[].slice.call(document.querySelectorAll('.err-msg,.msg,.error,[id$=Msg]')).map(function(e){return e.textContent.trim()}).filter(Boolean).slice(0,4)};})()`);
  await sleep(300);
  out.emptyMsgs = await js(`(function(){return [].slice.call(document.querySelectorAll('[id$=Msg],[class*=err]')).map(function(e){return e.textContent.trim()}).filter(Boolean).slice(0,4);})()`);
  // 填表并提交
  out.fill = await js(`(function(){
    var id=document.getElementById('lg-id'), pw=document.getElementById('lg-pw');
    if(!id||!pw) return 'no-fields';
    id.value='13800138000'; id.dispatchEvent(new Event('input',{bubbles:true}));
    pw.value='pet2024'; pw.dispatchEvent(new Event('input',{bubbles:true}));
    return 'filled';
  })()`);
  await js(`(function(){var f=document.querySelector('#panel-login form')||document.querySelector('form');var b=f.querySelector('button[type=submit],button.btn-primary,button');b.click();})()`);
  await sleep(600);
  out.done = await js(`(function(){var gs=[].slice.call(document.querySelectorAll('a.gate,a[href$=".html"]')).map(function(a){return {href:a.getAttribute('href'),title:(a.textContent||'').replace(/\\s+/g,' ').trim().slice(0,24)}});var d=document.documentElement;return {gates:gs,docH:d.scrollHeight,innerH:innerHeight,doneVisible:!!document.querySelector('#panel-done:not([hidden])')||gs.length>0};})()`);
  out.errors = errs.slice(0,5);
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','portal_check.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
