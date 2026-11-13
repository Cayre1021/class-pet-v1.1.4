// 教师台专项交互审查：批量条 / 行内菜单翻转 / 设置菜单 / 筛选 / 残留点击层
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots_v3');
fs.mkdirSync(OUT, { recursive: true });
app.setPath('userData', path.join(app.getPath('temp'), 'classpet-tflow-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = {};
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { contextIsolation: true } });
  const js = c => win.webContents.executeJavaScript(c, true);
  const errs = [];
  win.webContents.on('console-message', (...a) => { const d=a[1]; const lvl = (typeof d==='object'&&d)?d.level:a[1]; const m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) errs.push(String(m).slice(0,140)); });
  try {
    await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g,'/'));
    await sleep(1500);
    const clickSel = sel => js('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');if(!e)return "missing";var r=e.getBoundingClientRect();var t=document.elementFromPoint(Math.min(r.left+r.width/2,innerWidth-1),Math.min(r.top+r.height/2,innerHeight-1));if(!(t===e||e.contains(t)))return "occluded";e.click();return "clicked";})()');
    const snap = () => js('(function(){var b=document.getElementById("batchbar");var bb=b?b.getBoundingClientRect():null;var h=document.elementFromPoint(innerWidth/2, innerHeight-24);var m=document.getElementById("row-menu");var d=document.getElementById("data-menu");return {batch: b?getComputedStyle(b).display+"/"+getComputedStyle(b).visibility:"none", batchRect: bb?{x:Math.round(bb.x),y:Math.round(bb.y),w:Math.round(bb.width),h:Math.round(bb.height)}:null, batchCount: (document.getElementById("batch-count")||{}).textContent, selCount: (document.getElementById("sel-count")||{}).textContent, rowMenu: m?{disp:getComputedStyle(m).display, vis:getComputedStyle(m).visibility, rect:(r=>({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}))(m.getBoundingClientRect())}:null, dataMenu: d?{disp:getComputedStyle(d).display}:null, bottomHit: h?(h.id||h.className):null, lanes: document.querySelectorAll(\".lane\").length, rows: document.querySelectorAll(\".lane-rows > *\").length, toast: (document.getElementById("toast-text")||{}).textContent};})()');
    R.initial = await snap();

    // 1) 勾选 3 名学生
    R.checks = [];
    for (let i = 0; i < 3; i++) R.checks.push(await js('(function(){var c=document.querySelectorAll("input[type=checkbox] .x, .lane-rows input[type=checkbox]");var a=[...c];if(!a[' + i + '])return "missing";a[' + i + '].click();return "clicked";})()'));
    await sleep(400);
    R.afterSelect3 = await snap();
    const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(OUT,'teacher_flow_01_selected3.png'), img.toPNG());

    // 2) 批量加分
    R.batchAdd = await clickSel('#batch-add');
    await sleep(600);
    R.afterBatchAdd = await snap();

    // 3) 清空 → 批量条必须消失且不残留点击层
    R.batchClear = await clickSel('#batch-clear');
    await sleep(400);
    R.afterClear = await snap();
    R.hitAfterClear = await js('(function(){var e=document.querySelector(".lane-rows");var r=e.getBoundingClientRect();var t=document.elementFromPoint(r.x+80,r.y+60);return t?t.className||t.tagName:null;})()');

    // 4) 最后一行「⋯」菜单翻转（贴底）
    R.rowMenuOpen = await js('(function(){var rows=[...document.querySelectorAll(".lane-rows > *")];var last=rows[rows.length-1];if(!last)return "no-row";last.scrollIntoView({block:"center"});var more=last.querySelector(".row-more, [data-row-menu], .row-actions button, button");if(!more)return "no-more-btn";more.click();return "clicked";})()');
    await sleep(500);
    R.afterRowMenu = await snap();
    R.rowMenuInView = await js('(function(){var m=document.getElementById("row-menu");if(!m)return "no-menu";var r=m.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;})()');
    R.rowMenuItemsHit = await js('(function(){var m=document.getElementById("row-menu");if(!m)return 0;var bs=[...m.querySelectorAll("button")];return bs.filter(function(b){var r=b.getBoundingClientRect();var t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return t===b||b.contains(t);}).length + "/" + bs.length;})()');
    const img2 = await win.webContents.capturePage(); fs.writeFileSync(path.join(OUT,'teacher_flow_02_rowmenu.png'), img2.toPNG());
    await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));');
    await sleep(300);
    R.afterRowMenuClose = await snap();
    R.rowMenuResidual = await js('(function(){var m=document.getElementById("row-menu");if(!m)return "absent";var s=getComputedStyle(m);return s.display+"/"+s.visibility+"/"+s.pointerEvents;})()');

    // 5) 数据与设置菜单
    R.dataMenuOpen = await clickSel('#btn-data-menu');
    await sleep(400);
    R.afterDataMenu = await snap();
    R.dataMenuInView = await js('(function(){var m=document.getElementById("data-menu");if(!m)return "no";var r=m.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;})()');
    R.dataMenuItems = await js('(function(){var m=document.getElementById("data-menu");return m?[...m.querySelectorAll("button")].map(function(b){return (b.textContent||"").replace(/\\s+/g," ").trim().slice(0,16);}):[];})()');
    await js('document.body.click();');
    await sleep(300);
    R.afterDataMenuClose = await snap();

    // 6) 筛选 / 搜索空态
    R.filter2 = await js('(function(){var b=[...document.querySelectorAll("#group-seg button, .group-seg button")].find(function(x){return /2组/.test(x.textContent);});if(!b)return "missing";b.click();return "clicked";})()');
    await sleep(400);
    R.afterFilter2 = await snap();
    await js('(function(){var b=[...document.querySelectorAll("#group-seg button, .group-seg button")].find(function(x){return /全班/.test(x.textContent);});if(b)b.click();})()');
    await sleep(300);
    await js('(function(){var i=document.getElementById("search-input");i.value="zzz";i.dispatchEvent(new Event("input",{bubbles:true}));})()');
    await sleep(400);
    R.afterSearchEmpty = await snap();
    R.emptyText = await js('(function(){var e=document.querySelector(".lane-empty");return e?e.textContent.trim().slice(0,40):null;})()');
    R.consoleErrors = errs.slice(0,6);
  } catch (e) { R.fatal = String(e && e.message || e).slice(0,300); }
  console.log('TEACHERFLOW ' + JSON.stringify(R));
  fs.writeFileSync(path.join(OUT, 'teacher_flow.json'), JSON.stringify(R, null, 2));
  win.close(); app.quit();
});
