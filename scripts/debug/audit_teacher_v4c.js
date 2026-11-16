const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-tv4e-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIALOG = `(function(){var ds=[].slice.call(document.querySelectorAll('.dialog,.modal,[role=dialog]')).filter(function(x){return x.getBoundingClientRect().height>10});return ds.map(function(x){var q=x.getBoundingClientRect();return {w:Math.round(q.width),h:Math.round(q.height),bar:x.scrollHeight>x.clientHeight+1||x.scrollWidth>x.clientWidth+1,ovY:getComputedStyle(x).overflowY,inView:q.top>=0&&q.bottom<=innerHeight&&q.left>=0&&q.right<=innerWidth};});})()`;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const raw = c => win.webContents.executeJavaScript(c, true);
  const out = { dialogs: [] }; const fails = [];
  const safe = async (l, c) => { try { return await raw(c); } catch (e) { fails.push(l + ': ' + String(e.message || e).slice(0, 70)); return null; } };
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1600);
  // 自定义控件（真实 id）
  out.customIds = await safe('ids', `(function(){return {minus:!!document.getElementById('custom-minus'),plus:!!document.getElementById('custom-plus'),apply:!!document.getElementById('custom-apply'),val:(document.getElementById('custom-apply')||{}).textContent};})()`);
  await safe('plus2', `(function(){var p=document.getElementById('custom-plus');p.click();p.click();})()`);
  out.customVal = await safe('val', `(function(){return (document.getElementById('custom-apply')||{}).textContent;})()`);
  await safe('sel', `(function(){var rs=document.querySelectorAll('.stu-row');for(var i=0;i<2;i++)rs[i].click();})()`);
  out.selCount = await safe('selcount', `(function(){return document.querySelectorAll('.stu-row.is-selected,.stu-row.selected').length;})()`);
  await safe('apply', `(function(){var a=document.getElementById('custom-apply');a.click();})()`);
  await sleep(400);
  out.customToast = await safe('ctoast', `(function(){var t=document.getElementById('toast-text');return t?t.textContent.trim().slice(0,44):null;})()`);
  // 设置菜单里的四个数据弹窗 + 新增
  const actions = ['ledger','excel','threshold','backup'];
  for (const a of actions) {
    await safe('open-' + a, `(function(){var b=document.querySelector('[data-action="${a}"]');if(!b)return 'no-btn';b.click();})()`);
    await sleep(400);
    const d = await safe('dlg-' + a, DIALOG);
    out.dialogs.push({ a, count: d ? d.length : null, bars: d ? d.filter(x => x.bar).length : null, sample: d && d[0] });
    await safe('close-' + a, `[].slice.call(document.querySelectorAll('.mask,[role=dialog]')).forEach(function(m){if(!m.hidden)m.hidden=true;});var dm=document.getElementById('data-menu');if(dm)dm.hidden=true;`);
    await sleep(200);
  }
  await safe('open-add', `(function(){var b=document.getElementById('btn-add');if(!b)return 'no-add';b.click();})()`);
  await sleep(400);
  const dadd = await safe('dlg-add', DIALOG);
  out.dialogs.push({ a: 'add', count: dadd ? dadd.length : null, bars: dadd ? dadd.filter(x => x.bar).length : null, sample: dadd && dadd[0] });
  await safe('close-add', `[].slice.call(document.querySelectorAll('.mask,[role=dialog]')).forEach(function(m){if(!m.hidden)m.hidden=true;});`);
  out.fails = fails;
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','teacher_v4_check3.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
