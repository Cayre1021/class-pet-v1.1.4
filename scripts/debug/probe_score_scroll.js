const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-scr-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const js = c => win.webContents.executeJavaScript(c, true);
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1500);
  // 灌入 12 条规则
  for (let i = 0; i < 12; i++) {
    await js(`window.__v3.state.extraRules.push({name:'规则${i}',value:2});`);
  }
  await js(`(function(){var b=document.getElementById('extra-rules');b.innerHTML=window.__v3.state.extraRules.map(function(r){return '<button class="score-btn"><span>'+r.name+'</span><span class="val">+2</span></button>';}).join('');})()`);
  await sleep(400);
  const before = await js(`(function(){var b=document.getElementById('score-scroll');return {scrollH:b.scrollHeight,clientH:b.clientHeight,top:b.scrollTop,pill:document.getElementById('score-more').hidden};})()`);
  const after = await js(`(function(){var b=document.getElementById('score-scroll');b.scrollTop=b.scrollHeight;return new Promise(function(res){setTimeout(function(){res({scrollH:b.scrollHeight,clientH:b.clientHeight,top:b.scrollTop,pill:document.getElementById('score-more').hidden,rest:b.scrollHeight-b.clientHeight-b.scrollTop});},400);});})()`);
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','scroll_probe.json'), JSON.stringify({before, after},null,2));
  console.log('done'); app.quit();
});
