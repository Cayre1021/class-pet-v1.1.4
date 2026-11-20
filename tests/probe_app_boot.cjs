// probe_app_boot.cjs —— 用真实 main.js 启动一次，验证默认进入 V3 门户（不写库）
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const dbPath = path.join(ROOT, 'database', 'classpet.sqlite');
const hashOf = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
const beforeHash = hashOf(dbPath);
const beforeMtime = fs.statSync(dbPath).mtimeMs;
const sleep = ms => new Promise(r => setTimeout(r, ms));

require(path.join(ROOT, 'electron-app', 'main.js'));   // 真实主进程路径

app.whenReady().then(async () => {
    await sleep(4500);
    const wins = BrowserWindow.getAllWindows();
    let out = { windows: wins.length };
    if (wins.length) {
        const w = wins[0];
        out.url = w.webContents.getURL();
        out.title = w.getTitle();
        out.body = await w.webContents.executeJavaScript("(function(){return (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,400);})()", true);
        out.hasNav = await w.webContents.executeJavaScript("!!document.querySelector('.gate') || !!document.getElementById('tab-login')", true);
        out.errors = await w.webContents.executeJavaScript("(window.__v3ConsoleErrors||[]).slice(0,3)", true).catch(() => []);
    }
    out.dbHashSame = hashOf(dbPath) === beforeHash;
    out.dbMtimeSame = fs.statSync(dbPath).mtimeMs === beforeMtime;
    console.log('BOOT_PROBE ' + JSON.stringify(out));
    app.exit(0);
});
