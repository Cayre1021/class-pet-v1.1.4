const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-fx3-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 900, show: false, webPreferences: { contextIsolation: true } });
  const js = c => win.webContents.executeJavaScript(c, true);
  const out = {}; const errs = [];
  win.webContents.on('console-message', function(){ var a=[].slice.call(arguments); var d=a[1]; var lvl=(typeof d==='object'&&d)?d.level:a[1]; var m=(typeof d==='object'&&d)?d.message:a[2]; if(lvl==='error'||lvl===3) errs.push(String(m).slice(0,140)); });
  try {
    await win.loadURL('file://' + path.join(ROOT, 'design/v3_looseleaf_paper.html').replace(/\\/g, '/'));
    await sleep(1500);
    out.theme = await js('(function(){return {attr:document.documentElement.getAttribute("data-theme"), accent:getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(), items:document.querySelectorAll("[data-theme-set]").length};})()');
    await js('document.querySelector(".pet-card").click()');
    await sleep(800);
    out.cardExp = await js('(function(){var n=document.getElementById("ins-exp");return n?n.textContent:null;})()');
    out.btnLabels = await js('JSON.stringify([].map.call(document.querySelectorAll("#ins-body [data-score]"),function(b){return b.textContent.trim();}))');
    out.fireworks = await js('(function(){var bs=document.querySelectorAll("#ins-body [data-score]");for(var i=0;i<bs.length;i++){if(bs[i].getAttribute("data-score")==="3"){bs[i].click();return "clicked3";}}return "none";})()');
    await sleep(900);
    out.pixels = await js('(function(){var c=document.getElementById("fx");var g=c.getContext("2d");var d=g.getImageData(0,0,c.width,c.height).data;var nz=0,hues={};var step=4;for(var i=0;i<d.length;i+=4*step){var r=d[i],gg=d[i+1],b=d[i+2],a=d[i+3];if(a<8)continue;nz++;var mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);if(mx===mn)continue;var h;if(mx===r)h=60*(((gg-b)/(mx-mn))%6);else if(mx===gg)h=60*((b-r)/(mx-mn)+2);else h=60*((r-gg)/(mx-mn)+4);if(h<0)h+=360;var k=Math.floor(h/30);hues[k]=(hues[k]||0)+1;}return{nonTransparent:nz,hueBuckets:Object.keys(hues).map(Number).sort(function(a,b){return a-b}),hueCount:Object.keys(hues).length,canvas:[c.width,c.height]};})()');
    await sleep(2600);
    out.afterFade = await js('(function(){var c=document.getElementById("fx");var g=c.getContext("2d");var d=g.getImageData(0,0,Math.min(400,c.width),Math.min(400,c.height)).data;var nz=0;for(var i=3;i<d.length;i+=4*8){if(d[i]>8)nz++;}return nz;})()');
    out.errors = errs.slice(0,5);
  } catch (e) { out.fatal = String(e && e.message || e).slice(0,200); }
  fs.writeFileSync(path.join(ROOT,'screenshots_v3','fx_probe.json'), JSON.stringify(out,null,2));
  console.log('done'); app.quit();
});
