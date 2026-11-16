const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-tv4b-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const js = c => win.webContents.executeJavaScript(c, true);
  await win.loadURL('file://' + path.join(ROOT, 'design/v3_teacher_desk.html').replace(/\\/g, '/'));
  await sleep(1600);
  const out = {};
  out.counts = await js('JSON.stringify({petCard:document.querySelectorAll(".pet-card").length, stuRow:document.querySelectorAll(".stu-row").length, dataStu:document.querySelectorAll("[data-stu]").length, grids:[...document.querySelectorAll(".lanes,.grid,.pet-grid")].map(function(g){return g.className+":"+g.children.length;})})');
  out.cardHtml = await js('(function(){var c=document.querySelector(".stu-row")||document.querySelector(".pet-card");return c?c.outerHTML.slice(0,600):"none";})()');
  out.gridCss = await js('(function(){var g=document.querySelector(".stu-row")?document.querySelector(".stu-row").parentElement:null;if(!g)return null;var s=getComputedStyle(g);return {cls:g.className,cols:s.gridTemplateColumns,display:s.display,children:g.children.length};})()');
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','teacher_v4_dom.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
