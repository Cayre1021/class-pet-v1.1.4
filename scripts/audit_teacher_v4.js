// 教师台 v4 独立审查：选中模型 / 赋分 / 自定义 / 菜单翻转 / 弹窗滚动条 / 遮挡
const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-tv4-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CARDS = '.pet-card, .stu-row, [data-stu], [data-student-id]';
app.whenReady().then(async () => {
  const out = { viewports: [] };
  for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }]) {
    const win = new BrowserWindow({ width: vp.w, height: vp.h, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
    win.setContentSize(vp.w, vp.h);
    const js = c => win.webContents.executeJavaScript(c, true);
    const errs = [];
    win.webContents.on('console-message', function(){ var a=[].slice.call(arguments); var d=a[1]; var lvl=(typeof d==='object'&&d)?d.level:a[1]; var m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) errs.push(String(m).slice(0,120)); });
    const rec = { vp: vp.w + 'x' + vp.h };
    try {
      await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g, '/'));
      await sleep(1600);
      rec.base = await js('(function(){var d=document.documentElement;var a=window.__v3audit?window.__v3audit():null;return {docH:d.scrollHeight,innerH:innerHeight,cards:document.querySelectorAll("' + CARDS + '").length,lanes:document.querySelectorAll(".lane").length,hasFakeKeyboard:/J\\s*加分/.test(document.body.innerText),hook:a?a.pass:"no-hook"};})()');
      rec.select = await js('(function(){var cs=document.querySelectorAll("' + CARDS + '");if(!cs.length)return "no-card";cs[0].click();var n=document.querySelectorAll(".is-selected,.selected").length;cs[0].click();var m=document.querySelectorAll(".is-selected,.selected").length;return {after1:n,after2:m};})()');
      rec.checkbox = await js('(function(){var cb=document.querySelector("' + CARDS + ' input[type=checkbox]");if(!cb)return "no-checkbox";cb.click();var n=document.querySelectorAll(".is-selected,.selected").length;cb.click();var m=document.querySelectorAll(".is-selected,.selected").length;return {after1:n,after2:m};})()');
      rec.score = await js('(function(){var cs=document.querySelectorAll("' + CARDS + '");for(var i=0;i<3&&i<cs.length;i++)cs[i].click();" + "var b=document.querySelector(\'[data-score=\\"3\\"]\');if(!b)return {err:\'no-score-btn\',sel:document.querySelectorAll(\'.is-selected,.selected\').length};" + "var toastBefore=(document.getElementById(\'toast-text\')||{}).textContent;b.click();return {sel:document.querySelectorAll(\'.is-selected,.selected\').length,toastBefore:toastBefore};})()');
      await sleep(500);
      rec.scoreAfter = await js('(function(){var t=(document.getElementById("toast-text")||document.querySelector(".toast"))||{};return {toast:(t.textContent||"").trim().slice(0,40)};})()');
      rec.custom = await js('(function(){var s=document.querySelector("[data-step=\\"-1\\"]"),p=document.querySelector("[data-step=\\"1\\"]"),ap=document.querySelector("[data-custom-apply]");if(!s||!ap)return "missing";var read=function(){var n=ap.querySelector("span");return n?n.textContent:ap.textContent;};var v0=read();p.click();p.click();var v1=read();ap.click();return {v0:v0,v1:v1};})()');
      rec.moreMenu = await js('(function(){var cs=document.querySelectorAll("' + CARDS + '");var last=cs[cs.length-1];if(!last)return "no";last.scrollIntoView({block:"center"});var b=last.querySelector("[data-more],.card-more,.stu-more,button");if(!b)return "no-more";b.click();var m=document.querySelector("#row-menu,.card-menu,.row-menu");if(!m)return "no-menu";var r=m.getBoundingClientRect();var inView=r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;var bs=[].slice.call(m.querySelectorAll("button"));var hit=bs.filter(function(x){var q=x.getBoundingClientRect();var t=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return t===x||x.contains(t);}).length;return {inView:inView,items:bs.length,hit:hit};})()');
      await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));');
      await sleep(300);
      rec.residual = await js('(function(){var m=document.querySelector("#row-menu,.card-menu,.row-menu");if(!m)return "absent";var s=getComputedStyle(m);return s.display+"/"+s.visibility+"/"+s.pointerEvents;})()');
      rec.dialogs = [];
      const ids = JSON.parse(await js('JSON.stringify([].slice.call(document.querySelectorAll("button[id]")).filter(function(b){return b.offsetParent!==null}).map(function(b){return b.id}).slice(0,40))'));
      for (const id of ids) {
        if (!/add|ledger|backup|threshold|edit|log|menu/i.test(id)) continue;
        const ok = await js('(function(){var e=document.getElementById(' + JSON.stringify(id) + ');if(!e)return false;var r=e.getBoundingClientRect();var t=document.elementFromPoint(Math.min(r.left+r.width/2,innerWidth-1),Math.min(r.top+r.height/2,innerHeight-1));if(!(t===e||e.contains(t)))return false;e.click();return true;})()');
        if (!ok) { rec.dialogs.push({ id, skipped: 'not-reachable' }); continue; }
        await sleep(400);
        const d = await js('(function(){var ds=[].slice.call(document.querySelectorAll(".dialog,.modal,[role=dialog]")).filter(function(x){return x.offsetParent!==null});return ds.map(function(x){return {w:Math.round(x.getBoundingClientRect().width),h:Math.round(x.getBoundingClientRect().height),bar:x.scrollHeight>x.clientHeight+1||x.scrollWidth>x.clientWidth+1,ovY:getComputedStyle(x).overflowY};});})()');
        rec.dialogs.push({ id, count: d.length, bars: d.filter(x => x.bar).length, sample: d.slice(0,2) });
        await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));');
        await js('(function(){var m=document.querySelector(".mask:not([hidden])");if(m)m.hidden=true;})()');
        await sleep(200);
      }
      rec.errors = errs.slice(0, 5);
    } catch (e) { rec.fatal = String(e && e.message || e).slice(0, 200); }
    win.close();
    out.viewports.push(rec);
  }
  fs.writeFileSync(path.join(ROOT, 'screenshots_v3', 'teacher_v4_check.json'), JSON.stringify(out, null, 2));
  console.log('done'); app.quit();
});
