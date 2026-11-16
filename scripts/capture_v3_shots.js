// 可见窗口截图：隐藏窗口会冻结 CSS 过渡，检查器会停在 2px
const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots_v3', 'evidence');
fs.mkdirSync(OUT, { recursive: true });
app.setPath('userData', path.join(app.getPath('temp'), 'cp-shots-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = [];
const PAGES = [
  { key: 'student', file: 'design/v3_student_stage.html' },
  { key: 'teacher', file: 'design/v3_teacher_desk.html' },
  { key: 'paper', file: 'design/v3_looseleaf_paper.html' }
];
const GEO = '(function(){var insp=document.getElementById("inspector");var grid=document.getElementById("petGrid");var cards=[].slice.call(document.querySelectorAll(".pet-card"));var bad=cards.filter(function(c){var r=c.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return false;var x=Math.min(r.left+r.width/2,innerWidth-1),y=Math.min(r.top+r.height/2,innerHeight-1);var t=document.elementFromPoint(x,y);return !(t===c||c.contains(t)||t.contains(c));}).length;return {vp:[innerWidth,innerHeight],inspW:insp?Math.round(insp.getBoundingClientRect().width):null,cols:grid?getComputedStyle(grid).gridTemplateColumns.split(" ").length:null,cards:cards.length,occluded:bad,docH:document.documentElement.scrollHeight,innerH:innerHeight};})()';
async function run(only) {
  await app.whenReady();
  for (const p of PAGES) {
    if (only && only !== p.key) continue;
    const win = new BrowserWindow({ width: 1920, height: 1080, show: true, webPreferences: { contextIsolation: true } });
    win.setContentSize(1920, 1080);
    win.setAlwaysOnTop(true);
    win.focus();
    const js = c => win.webContents.executeJavaScript(c, true);
    const ent = { page: p.key, steps: {}, errors: [] };
    win.webContents.on('console-message', function(){ var a=[].slice.call(arguments); var d=a[1]; var lvl=(typeof d==='object'&&d)?d.level:a[1]; var m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) ent.errors.push(String(m).slice(0,120)); });
    const shot = async n => { win.webContents.invalidate(); await sleep(220); const im = await win.webContents.capturePage(); const buf = im.toPNG(); fs.writeFileSync(path.join(OUT, p.key + '_visual_' + n + '.png'), buf); return buf.length; };
    try {
      await win.loadURL('file://' + path.join(ROOT, p.file).replace(/\\/g, '/'));
      await sleep(2000);
      ent.steps.normal = await js(GEO);
      await shot('01_normal');
      if (p.key !== 'teacher') {
        await js('(function(){var c=document.querySelector(".pet-card");if(c)c.click();})()');
        await sleep(1100);
        ent.steps.selected = await js(GEO);
        await shot('02_selected');
        await js('(function(){var f=document.getElementById("fab");if(f)f.click();})()');
        await sleep(700);
        await shot('03_fab');
        ent.steps.fabMenu = await js('(function(){var m=document.querySelector("#fabMenu,#fab-menu,.fab-menu");if(!m)return null;var r=m.getBoundingClientRect();return {inView:r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],items:m.querySelectorAll("button").length};})()');
        await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));');
        await sleep(500);
        await js('(function(){var s=document.getElementById("segSeat");if(s)s.click();})()');
        await sleep(900);
        await shot('04_seatmap');
        await js('(function(){var g=document.getElementById("segGrid");if(g)g.click();})()');
        await sleep(600);
      } else {
        await js('(function(){var cbs=[].slice.call(document.querySelectorAll(".stu-row input[type=checkbox], .lane-rows input[type=checkbox]"));cbs.slice(0,3).forEach(function(c){c.click();});})()');
        await sleep(700);
        await shot('05_batch3');
        ent.steps.batch = await js('(function(){var b=document.getElementById("batchbar");var sel=document.getElementById("sel-count");return {batchbar: b?getComputedStyle(b).display:"absent",sel: sel?sel.textContent:null};})()');
      }
    } catch (e) { ent.fatal = String(e && e.message || e).slice(0, 200); }
    report.push(ent);
    win.close();
  }
  fs.writeFileSync(path.join(OUT, 'visual_report.json'), JSON.stringify(report, null, 2));
  console.log('VISUAL ' + JSON.stringify(report));
  app.quit();
}
run(process.argv.slice(2).find(a => !a.startsWith('-'))).catch(e => { console.error('FATAL', e); app.quit(); });
