const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    const file = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
    await win.loadFile(file);
    await new Promise(r => setTimeout(r, 600));

    const check = await win.webContents.executeJavaScript(`
        (() => {
            const style = document.createElement('style');
            style.innerHTML = '* { transition: none !important; }';
            document.head.appendChild(style);

            const ball = document.getElementById('classpetFloatingBall');
            const menu = document.getElementById('classpetRadialMenu');
            toggleRadialMenu();
            const btn = document.getElementById('radialMod_theme');
            const rect = btn ? btn.getBoundingClientRect() : null;
            const cs = btn ? window.getComputedStyle(btn) : null;
            const topEl = document.elementFromPoint(1185, 481);
            return {
                menuClass: menu.className,
                btnExists: !!btn,
                btnRect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
                btnOpacity: cs ? cs.opacity : null,
                btnTransform: cs ? cs.transform : null,
                btnDisplay: cs ? cs.display : null,
                topElementAtCenter: topEl ? { tag: topEl.tagName, id: topEl.id, class: topEl.className } : null,
                overflowClip: {
                    parent: menu.parentElement ? menu.parentElement.id : null,
                    parentOverflow: menu.parentElement ? window.getComputedStyle(menu.parentElement).overflow : null
                }
            };
        })()
    `);
    console.log('Diagnostic result before animation:', check);

    await new Promise(r => setTimeout(r, 500));

    const image = await win.webContents.capturePage();
    const fs = require('fs');
    fs.writeFileSync(path.join(__dirname, 'bigscreen_test_inspect.png'), image.toPNG());
    console.log('Saved bigscreen_test_inspect.png');

    win.destroy();
    app.quit();
});
