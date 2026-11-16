// V3 高保真页面自动审查：真实 Electron 渲染 + 几何/遮挡/控制可达性 + 截图
// 用法：node_modules\.bin\electron.cmd scripts\audit_v3_pages.js [pageKey]
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots_v3', 'evidence');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { key: 'student', file: 'design/v3_student_stage.html' },
  { key: 'teacher', file: 'design/v3_teacher_desk.html' },
  { key: 'paper',   file: 'design/v3_looseleaf_paper.html' }
];
const VIEWPORTS = [
  { w: 1440, h: 900, tag: '1440x900' },
  { w: 1920, h: 1080, tag: '1920x1080' }
];

const only = process.argv.slice(2).find(a => !a.startsWith('-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

app.setPath('userData', path.join(app.getPath('temp'), 'classpet-v3-audit-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

const AUDIT_FN = `(function(){
  function vis(el){
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }
  function label(el){
    return (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g,' ').trim().slice(0,28);
  }
  function hits(el){
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width/2, 0), innerWidth-1);
    const y = Math.min(Math.max(r.top + r.height/2, 0), innerHeight-1);
    const top = document.elementFromPoint(x, y);
    if (!top) return { ok:false, by:'(none)' };
    const ok = top === el || el.contains(top) || top.contains(el);
    return { ok, by: ok ? '' : (top.id ? '#'+top.id : top.tagName.toLowerCase()+'.'+String(top.className||'').split(' ').filter(Boolean).slice(0,2).join('.')) };
  }
  const ctrls = [...document.querySelectorAll('button,a[href],[role=button],input,select,summary')].filter(vis);
  const controls = ctrls.map(el => {
    const h = hits(el);
    return { id: el.id || null, label: label(el), cls: String(el.className||'').split(' ').slice(0,2).join('.'), centerHit: h.ok, coveredBy: h.by };
  });
  const cards = [...document.querySelectorAll('[data-student-id], .pet-card, .student-row, .roster-row')].filter(vis);
  const occluded = cards.map(el => {
    const h = hits(el);
    return h.ok ? null : { id: el.getAttribute('data-student-id') || null, cls: String(el.className||'').split(' ').slice(0,2).join('.'), coveredBy: h.by, rect: (r => ({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}))(el.getBoundingClientRect()) };
  }).filter(Boolean);
  const blockers = [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'absolute') return false;
    if (s.pointerEvents === 'none' || !vis(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width * r.height > innerWidth * innerHeight * 0.6;
  }).map(el => ({ id: el.id || null, cls: String(el.className||'').split(' ').slice(0,2).join('.'), z: getComputedStyle(el).zIndex, pe: getComputedStyle(el).pointerEvents }));
  const de = document.documentElement;
  return {
    controls,
    unhit: controls.filter(c => !c.centerHit),
    occluded,
    blockers,
    docScroll: { scrollH: de.scrollHeight, innerH: innerHeight, scrollW: de.scrollWidth, innerW: innerWidth, docScrolls: de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1 },
    hook: typeof window.__v3audit === 'function' ? window.__v3audit() : null
  };
})()`;

const ESC = "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));";

async function run() {
  await app.whenReady();
  const results = [];
  for (const p of PAGES) {
    if (only && only !== p.key) continue;
    const url = 'file://' + path.join(ROOT, p.file).replace(/\\/g, '/');
    for (const vp of VIEWPORTS) {
      const win = new BrowserWindow({ width: vp.w, height: vp.h, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
      const errors = [];
      win.webContents.on('console-message', (...a) => {
        const d = a[1];
        let isErr = false, msg = '';
        if (typeof d === 'object' && d !== null) { isErr = d.level === 'error' || d.level === 3; msg = d.message; }
        else { isErr = a[1] === 3; msg = a[2]; }
        if (isErr) errors.push(String(msg).slice(0, 160));
      });
      const shot = async name => {
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(OUT, p.key + '_' + vp.tag + '_' + name + '.png'), img.toPNG());
      };
      const js = code => win.webContents.executeJavaScript(code, true);
      const audit = async () => JSON.parse(await js('JSON.stringify(' + AUDIT_FN + ')'));
      const rec = { page: p.key, viewport: vp.tag, steps: {}, errors };
      try {
        await win.loadURL(url);
        await sleep(1400);
        rec.steps.normal = await audit();
        await shot('01_normal');

        rec.picked = await js("(function(){var c=document.querySelector('[data-student-id], .pet-card');if(!c)return null;c.click();return c.getAttribute('data-student-id')||c.className;})()");
        await sleep(800);
        rec.steps.selected = await audit();
        await shot('02_selected');

        rec.switched = await js("(function(){var all=[...document.querySelectorAll('[data-student-id], .pet-card')];var t=all[1];if(!t)return null;var r=t.getBoundingClientRect();var x=Math.min(r.left+r.width/2,innerWidth-1),y=Math.min(r.top+r.height/2,innerHeight-1);var top=document.elementFromPoint(x,y);var reach=top&&(top===t||t.contains(top));if(reach)t.click();return {reachable:!!reach,id:t.getAttribute('data-student-id')||null};})()");
        await sleep(700);
        rec.steps.switched = await audit();

        await js(ESC);
        await sleep(500);
        rec.steps.afterEsc = await audit();

        rec.ball = await js("(function(){var b=document.querySelector('#classpetFloatingBall,#floatingBallContainer,#floatingBall,.floating-ball,[data-floating-ball]');if(!b)return {found:false};b.click();return {found:true,id:b.id||b.className};})()");
        await sleep(600);
        rec.steps.ballOpen = await audit();
        await shot('03_ball_open');
        await js(ESC);
        await sleep(300);

        rec.overlays = [];
        const ids = JSON.parse(await js("JSON.stringify([...document.querySelectorAll('button[id]')].filter(function(b){return b.offsetParent!==null}).map(function(b){return b.id}).slice(0,60))"));
        for (const id of ids) {
          if (/reset|fullscreen/i.test(id)) continue;
          const ok = await js("(function(){var e=document.getElementById(" + JSON.stringify(id) + ");if(!e)return false;var r=e.getBoundingClientRect();var t=document.elementFromPoint(Math.min(r.left+r.width/2,innerWidth-1),Math.min(r.top+r.height/2,innerHeight-1));if(!(t===e||e.contains(t)))return false;e.click();return true;})()");
          if (!ok) { rec.overlays.push({ id, skipped: 'not-reachable' }); continue; }
          await sleep(500);
          const a = await audit();
          const entry = { id, unhit: a.unhit.length, occluded: a.occluded.length, blockers: a.blockers.length };
          await js(ESC);
          await sleep(250);
          entry.leftOverlayAfterClose = await js("(function(){return [...document.querySelectorAll('*')].filter(function(el){var s=getComputedStyle(el);if(s.position!=='fixed'&&s.position!=='absolute')return false;if(s.pointerEvents==='none')return false;if(s.display==='none'||s.visibility==='hidden')return false;var r=el.getBoundingClientRect();return r.width*r.height>innerWidth*innerHeight*0.6;}).length;})()");
          rec.overlays.push(entry);
        }

        rec.toggles = {};
        for (const pair of [['theme','#btn-theme-cycle,[data-action=theme],#themeBtn'],['viewSeat','#btn-view-seat,[data-view=seat]'],['viewGrid','#btn-view-grid,[data-view=grid]'],['sortLevel','[data-sort=level]'],['sortNo','[data-sort=no]']]) {
          rec.toggles[pair[0]] = await js("(function(){var e=document.querySelector(" + JSON.stringify(pair[1]) + ");if(!e)return 'missing';var b=e.getBoundingClientRect();var t=document.elementFromPoint(Math.min(b.left+b.width/2,innerWidth-1),Math.min(b.top+b.height/2,innerHeight-1));var reach=t===e||e.contains(t);if(reach)e.click();return reach?'clicked':'occluded';})()");
          await sleep(400);
        }
        await shot('04_after_toggles');
        rec.steps.final = await audit();
      } catch (e) {
        rec.fatal = String((e && e.message) || e).slice(0, 300);
      }
      win.close();
      results.push(rec);
    }
  }
  const summary = results.map(r => ({
    page: r.page, viewport: r.viewport,
    fatal: r.fatal || null,
    docScrolls: r.steps.normal ? r.steps.normal.docScroll.docScrolls : null,
    scrollDims: r.steps.normal ? r.steps.normal.docScroll : null,
    unhitNormal: r.steps.normal ? r.steps.normal.unhit.length : null,
    unhitSample: r.steps.normal ? r.steps.normal.unhit.slice(0,5) : null,
    occludedSelected: r.steps.selected ? r.steps.selected.occluded.length : null,
    occludedSample: r.steps.selected ? r.steps.selected.occluded.slice(0,4) : null,
    switched: r.switched,
    ball: r.ball,
    leftoverOverlays: r.overlays ? r.overlays.filter(o => o.leftOverlayAfterClose) : null,
    consoleErrors: r.errors.slice(0, 6),
    hookPass: r.steps.normal && r.steps.normal.hook ? r.steps.normal.hook.pass : 'no-hook',
    hookOccluded: r.steps.normal && r.steps.normal.hook && r.steps.normal.hook.occluded ? r.steps.normal.hook.occluded.length : null,
    toggles: r.toggles
  }));
  console.log('AUDITJSON ' + JSON.stringify({ summary }));
  fs.writeFileSync(path.join(OUT, 'audit_report.json'), JSON.stringify({ summary, detail: results }, null, 2));
  app.quit();
}
run().catch(e => { console.error('FATAL', e); app.quit(); process.exit(1); });
