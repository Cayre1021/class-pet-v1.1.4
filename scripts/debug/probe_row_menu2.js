const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(app.getPath('temp'), 'cp-rm2-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { contextIsolation: true } });
  const js = c => win.webContents.executeJavaScript(c, true);
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1400);
  const sample = await js('(function(){var ms=[...document.querySelectorAll(".stu-more")];return ms.length;})()');
  const results = [];
  for (const idx of [0, 5, 15, 31]) {
    await js('(function(){var ms=[...document.querySelectorAll(".stu-more")];var b=ms[' + idx + '];if(!b)return;b.dispatchEvent(new MouseEvent("click",{bubbles:true}));})()');
    await sleep(400);
    const st = await js('(function(){var m=document.getElementById("row-menu");var cs=getComputedStyle(m);var r=m.getBoundingClientRect();var bs=[...m.querySelectorAll("button")];var hit=bs.length?document.elementFromPoint(bs[0].getBoundingClientRect().left+bs[0].getBoundingClientRect().width/2, bs[0].getBoundingClientRect().top+bs[0].getBoundingClientRect().height/2):null;return {disp:cs.display,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],globalHidden:m.hasAttribute("hidden"),firstHit:hit?(hit.id||String(hit.className).slice(0,20)):null,selected:document.querySelectorAll(".stu-row.selected").length};})()');
    results.push({ idx, st });
    await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));');
    await sleep(200);
  }
  const details = await js('(function(){var m=document.getElementById("row-menu");var b=m.querySelector("button");var s=b.getBoundingClientRect();var stack=[];for(var i=0;i<4;i++){var t=document.elementFromPoint(Math.min(s.left+s.width/2,innerWidth-1),Math.min(s.top+s.height/2,innerHeight-1));if(!t)break;stack.push(t.id||String(t.className).slice(0,22));t.style.pointerEvents="none";}return stack;})()');
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','row_menu_probe2.json'), JSON.stringify({ sample, results, details },null,2));
  console.log(JSON.stringify({ sample, results }));
  app.quit();
});
