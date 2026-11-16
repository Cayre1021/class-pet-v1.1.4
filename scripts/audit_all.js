const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-auditall-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PAGES = ['v3_looseleaf_paper.html','v3_teacher_desk.html','v3_portal.html'];
const VPS = [{w:1920,h:1080},{w:1440,h:900}];
const AUDIT = `(function(){
  function rgb(s){var m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;var p=m[1].split(',').map(function(x){return parseFloat(x)});return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function lum(c){function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
  function bgOf(el){var n=el;while(n&&n!==document.documentElement){var c=rgb(getComputedStyle(n).backgroundColor);if(c&&c.a>0.85)return c;n=n.parentElement;}return {r:255,g:255,b:255,a:1};}
  function ratio(el){var cs=getComputedStyle(el);var fg=rgb(cs.color),bg=bgOf(el);if(!fg)return null;var l1=lum(fg),l2=lum(bg);var hi=Math.max(l1,l2),lo=Math.min(l1,l2);return Math.round(((hi+0.05)/(lo+0.05))*100)/100;}
  function vis(el){var s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)===0)return false;var r=el.getBoundingClientRect();return r.width>1&&r.height>1;}
  var controls=[].slice.call(document.querySelectorAll('button,a[href],input,select,[role=button]')).filter(vis);
  var small=controls.filter(function(c){var r=c.getBoundingClientRect();return r.height<44||r.width<44;}).map(function(c){var r=c.getBoundingClientRect();return {t:(c.id||c.textContent||c.getAttribute('aria-label')||'').replace(/\\s+/g,' ').trim().slice(0,14),w:Math.round(r.width),h:Math.round(r.height)};});
  var texts=[].slice.call(document.querySelectorAll('body *')).filter(function(e){return e.children.length===0&&e.textContent.trim().length>0&&vis(e);});
  var smallFonts=texts.filter(function(e){return parseFloat(getComputedStyle(e).fontSize)<12;}).map(function(e){return {t:e.textContent.trim().slice(0,12),fs:parseFloat(getComputedStyle(e).fontSize)};});
  var lowContrast=[], seen={};
  texts.forEach(function(e){var r=ratio(e);if(r!==null&&r<4.5){var k=e.textContent.trim().slice(0,10);if(!seen[k]){seen[k]=1;lowContrast.push({t:k,ratio:r,fs:parseFloat(getComputedStyle(e).fontSize)});}}});
  var overflowText=texts.filter(function(e){return e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflow!=='visible';}).map(function(e){return e.textContent.trim().slice(0,14);});
  var occluded=controls.filter(function(c){var r=c.getBoundingClientRect();var x=Math.min(Math.max(r.left+r.width/2,0),innerWidth-1),y=Math.min(Math.max(r.top+r.height/2,0),innerHeight-1);var t=document.elementFromPoint(x,y);return !(t===c||c.contains(t)||t.contains(c));}).map(function(c){return (c.id||c.textContent||'').trim().slice(0,16);});
  var de=document.documentElement;
  return {docH:de.scrollHeight,innerH:innerHeight,docW:de.scrollWidth,innerW:innerWidth,controls:controls.length,smallTargets:small.slice(0,14),smallCount:small.length,smallFonts:smallFonts.slice(0,12),smallFontCount:smallFonts.length,lowContrast:lowContrast.slice(0,12),lowContrastCount:lowContrast.length,overflowText:overflowText.slice(0,8),occluded:occluded.slice(0,10)};
})()`;
app.whenReady().then(async () => {
  const report = {};
  for (const page of PAGES) {
    report[page] = [];
    for (const vp of VPS) {
      const win = new BrowserWindow({ width: vp.w, height: vp.h, show: true, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
      win.setContentSize(vp.w, vp.h); win.setAlwaysOnTop(true); win.focus();
      const js = c => win.webContents.executeJavaScript(c, true);
      await win.loadURL('file://' + path.join(ROOT, 'design', page).replace(/\\/g, '/'));
      await sleep(1400);
      try { const r = await js(AUDIT); r.vp = vp.w + 'x' + vp.h; report[page].push(r); } catch (e) { report[page].push({ vp: vp.w+'x'+vp.h, err: String(e.message||e).slice(0,80) }); }
      win.close();
    }
  }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','evidence','audit_all.json'), JSON.stringify(report,null,2));
  console.log('done'); app.quit();
});
