const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-scr2-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const js = c => win.webContents.executeJavaScript(c, true);
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1500);
  for (let i = 0; i < 12; i++) await js(`window.__v3.state.extraRules.push({name:'r${i}',value:2});`);
  await js(`(function(){var b=document.getElementById('extra-rules');b.innerHTML=window.__v3.state.extraRules.map(function(r){return '<button class="score-btn"><span>'+r.name+'</span></button>';}).join('');})()`);
  await sleep(300);
  const mock = await js(`(function(){var box=document.getElementById('score-scroll');box.addEventListener('scroll',function(){window.__scrollHits=(window.__scrollHits||0)+1;});box.scrollTop=120;return new Promise(function(res){setTimeout(function(){res({hits:window.__scrollHits||0,top:box.scrollTop,pill:document.getElementById('score-more').hidden});},300);});})()`);
  const manual = await js(`(function(){document.getElementById('score-scroll').dispatchEvent(new Event('scroll'));return new Promise(function(res){setTimeout(function(){res({pill:document.getElementById('score-more').hidden});},200);});})()`);
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','scroll_probe2.json'), JSON.stringify({mock, manual},null,2));
  console.log('done'); app.quit();
});
