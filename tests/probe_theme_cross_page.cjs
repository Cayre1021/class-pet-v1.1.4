// probe_theme_cross_page.cjs —— 第6条前提：两个 file:// 页面是否共享 localStorage
const { app, BrowserWindow } = require('electron');
const path = require('path'); const os = require('os');
const ROOT = path.join(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.setPath('userData', path.join(os.tmpdir(), 'cp-theme-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');

let passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x) : '')); failed++; } };

async function open(file) {
    const win = new BrowserWindow({ width: 1400, height: 900, show: false, webPreferences: { contextIsolation: true } });
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', file).replace(/\\/g, '/'));
    await sleep(1200);
    return win;
}

app.whenReady().then(async () => {
    console.log('== 主题跨页：file:// 同源与 localStorage 共享实测 ==');
    const w1 = await open('v3_teacher_desk.html');
    const js1 = c => w1.webContents.executeJavaScript(c, true);
    const origin1 = await js1("location.origin + ' | ' + location.href.split('/').pop()");
    await js1("localStorage.setItem('classpet_v3_theme','forest'); document.documentElement.setAttribute('data-theme','forest'); 'ok'");
    const written = await js1("localStorage.getItem('classpet_v3_theme')");
    assert(written === 'forest', '教师台写入 classpet_v3_theme=forest', written);

    const w2 = await open('v3_looseleaf_paper.html');
    const js2 = c => w2.webContents.executeJavaScript(c, true);
    const origin2 = await js2("location.origin + ' | ' + location.href.split('/').pop()");
    const readBack = await js2("localStorage.getItem('classpet_v3_theme')");
    const themeAttr = await js2("document.documentElement.getAttribute('data-theme')");
    console.log('  教师台 origin: ' + origin1);
    console.log('  大屏  origin: ' + origin2);
    assert(readBack === 'forest', '学生大屏能读到教师台写入的主题键', readBack);
    assert(themeAttr === 'forest', '学生大屏启动即应用该主题（data-theme=forest）', themeAttr);

    // 反向：大屏改回 orange，教师台重开应跟随
    await js2("localStorage.setItem('classpet_v3_theme','orange'); 'ok'");
    w2.destroy();
    const w3 = await open('v3_teacher_desk.html');
    const attr3 = await w3.webContents.executeJavaScript("document.documentElement.getAttribute('data-theme')", true);
    assert(attr3 === 'orange', '反向：大屏改成 orange 后，教师台重开是 orange', attr3);

    w1.destroy(); w3.destroy();
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('探针异常:', e); app.exit(2); });
