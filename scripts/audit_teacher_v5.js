const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-tv5-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const js = c => win.webContents.executeJavaScript(c, true);
  const errs = [];
  win.webContents.on('console-message', function(){ var a=[].slice.call(arguments); var d=a[1]; var lvl=(typeof d==='object'&&d)?d.level:a[1]; var m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) errs.push(String(m).slice(0,140)); });
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1600);
  const out = {};
  out.scale = await js(`(function(){var c=document.querySelector('.stu-row');return {scale:getComputedStyle(document.documentElement).getPropertyValue('--stu-scale').trim(),cardH:c?Math.round(c.getBoundingClientRect().height):null,cardW:c?Math.round(c.getBoundingClientRect().width):null};})()`);
  out.toolbar = await js(`(function(){var t=document.getElementById('toolbar');return [].slice.call(t.querySelectorAll('button,select,input')).map(function(e){return e.id||e.className}).slice(0,12);})()`);
  out.railCustom = await js(`(function(){return {customMinus:!!document.getElementById('custom-minus'),customApply:!!document.getElementById('custom-apply'),scrollBox:!!document.getElementById('score-scroll'),pillHidden:(document.getElementById('score-more')||{}).hidden};})()`);
  out.scrollBox = await js(`(function(){var b=document.getElementById('score-scroll');return {scrollH:b.scrollHeight,clientH:b.clientHeight,ov:getComputedStyle(b).overflowY};})()`);
  out.audit = await js(`(function(){var a=window.__v3audit?window.__v3audit():null;return a?{pass:a.pass,occluded:(a.occluded||[]).length,missing:(a.missing||[]).length,controls:(a.controls||[]).length,overflow:a.overflow}:null;})()`);
  await js(`document.getElementById('btn-custom-rule').click()`);
  await sleep(500);
  out.dlg = await js(`(function(){var v=document.getElementById('rule-value');return {open:!!v,val:v?v.value:null,minus:!!document.getElementById('rule-minus'),plus:!!document.getElementById('rule-plus')};})()`);
  await js(`(function(){document.getElementById('rule-plus').click();document.getElementById('rule-plus').click();})()`);
  out.afterPlus = await js(`document.getElementById('rule-value').value`);
  await js(`(function(){document.getElementById('rule-minus').click();})()`);
  out.afterMinus = await js(`document.getElementById('rule-value').value`);
  await js(`(function(){document.getElementById('rule-name').value='朗读之星';})()`);
  await js(`(function(){var bs=[].slice.call(document.querySelectorAll('#dlg-foot button'));for(var i=0;i<bs.length;i++){if(bs[i].textContent.indexOf('新增规则')>=0){bs[i].click();return;}}})()`);
  await sleep(600);
  out.rules = await js(`(function(){var b=document.getElementById('extra-rules');return {count:b?b.children.length:null,text:b?b.innerText.replace(/\\s+/g,' ').slice(0,40):null};})()`);
  // 加 10 条规则看滚动提示
  for (let i = 0; i < 10; i++) {
    await js(`(function(){document.getElementById('btn-custom-rule').click();})()`);
    await sleep(200);
    await js(`(function(){document.getElementById('rule-name').value='规则${i}';document.getElementById('rule-value').value='2';var bs=[].slice.call(document.querySelectorAll('#dlg-foot button'));for(var i=0;i<bs.length;i++){if(bs[i].textContent.indexOf('新增规则')>=0){bs[i].click();return;}}})()`);
    await sleep(220);
  }
  out.overflow = await js(`(function(){var b=document.getElementById('score-scroll'),p=document.getElementById('score-more'),w=b.parentElement;return {scrollH:b.scrollHeight,clientH:b.clientHeight,canScroll:b.scrollHeight>b.clientHeight,pillHidden:p.hidden,pillText:p.textContent.replace(/\\s+/g,' ').trim(),hasMore:w.classList.contains('has-more')};})()`);
  out.overflowAfter = await js(`(function(){var b=document.getElementById('score-scroll');b.scrollTop=b.scrollHeight;return new Promise(function(res){setTimeout(function(){var p=document.getElementById('score-more');res({pillHidden:p.hidden,hasMore:b.parentElement.classList.contains('has-more')});},300);});})()`);
  out.errors = errs.slice(0,6);
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','evidence','teacher_v5_check.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
