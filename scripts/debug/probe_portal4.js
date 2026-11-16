const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..'); const OUT = path.join(ROOT,'screenshots_v3');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-p4-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = {}; const fails = [];
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: true, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  win.setContentSize(1920,1080); win.setAlwaysOnTop(true); win.focus();
  const js = async (label, code) => { try { return await win.webContents.executeJavaScript(code, true); } catch (e) { fails.push(label + ': ' + String(e.message||e).slice(0,80)); return null; } };
  const shot = async n => { win.webContents.invalidate(); await sleep(260); const im = await win.webContents.capturePage(); fs.writeFileSync(path.join(OUT,'portal_visual_'+n+'.png'), im.toPNG()); };
  try {
    await win.loadURL('file://' + path.join(ROOT, 'design', 'v3_portal.html').replace(/\\/g, '/'));
    await sleep(1600);
    out.layout = await js('layout', `(function(){var d=document.documentElement;return [d.scrollHeight, innerHeight, d.scrollWidth, innerWidth, /本班宠物|只在线/.test(document.body.innerText)];})()`);
    await shot('01_login');
    await js('tab', `document.getElementById('tab-register').click()`);
    await sleep(400);
    out.regFields = await js('regfields', `(function(){return ['rg-class','rg-name','rg-subject','rg-phone','rg-pw','rg-pw2'].map(function(i){return i + ':' + !!document.getElementById(i)});})()`);
    await shot('02_register');
    out.fill = await js('fill', `(function(){function s(id,v){var e=document.getElementById(id);if(!e)return id+':miss';e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));return id+':ok';}var r=[s('rg-class','三年级二班'),s('rg-name','李青'),s('rg-phone','13800138000'),s('rg-pw','pet2024'),s('rg-pw2','pet2024')];var sub=document.querySelector('#rg-subject input[value="语文"]');if(sub){sub.click();r.push('subject:ok');}else{r.push('subject:miss');}return r.join('|');})()`);
    await sleep(300);
    out.submit = await js('submit', `(function(){var p=document.getElementById('panel-register');var b=p.querySelector('button[type=submit]')||p.querySelector('.btn-primary');if(!b)return 'no-btn';b.click();return 'clicked';})()`);
    await sleep(900);
    out.state = await js('state', `(function(){var pr=localStorage.getItem('classpet.teacher.profile.v3');var done=document.getElementById('panel-done');return {stored:pr,session:localStorage.getItem('classpet.teacher.session.v3'),doneHidden:done?done.hasAttribute('hidden'):null,who:(document.getElementById('whoami')||{}).textContent};})()`);
    await shot('03_done');
    await win.reload();
    await sleep(1600);
    out.reload = await js('reload', `(function(){var d=document.getElementById('panel-done');var t=document.body.innerText;return {doneHidden:d?d.hasAttribute('hidden'):null,hasClass:/三年级二班/.test(t),hasName:/李青/.test(t),hasExit:/退出/.test(t),gates:[].slice.call(document.querySelectorAll('a.gate')).map(function(a){return a.getAttribute('href')})};})()`);
    await shot('04_persisted');
  } catch (e) { fails.push('fatal: ' + String(e.message||e).slice(0,120)); }
  out.fails = fails;
  fs.writeFileSync(path.join(OUT,'portal_check4.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
