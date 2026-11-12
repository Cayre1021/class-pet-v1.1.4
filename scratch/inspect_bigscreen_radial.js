const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    await new Promise(r => setTimeout(r, 600));

    // Inspect before toggle
    const res = await win.webContents.executeJavaScript(`
        (() => {
            const menu = document.getElementById('classpetRadialMenu');
            const ball = document.getElementById('classpetFloatingBall');
            const container = document.getElementById('floatingBallContainer');
            
            // disable transition for instant evaluation
            const s = document.createElement('style');
            s.innerHTML = '* { transition: none !important; }';
            document.head.appendChild(s);

            const beforeOpen = {
                menuClass: menu.className,
                ballRect: ball.getBoundingClientRect(),
                containerRect: container.getBoundingClientRect()
            };

            toggleRadialMenu();

            const afterOpen = {
                menuClass: menu.className,
                containerRect: container.getBoundingClientRect(),
                items: Array.from(document.querySelectorAll('.radial-item')).map(el => ({
                    id: el.id,
                    rect: el.getBoundingClientRect(),
                    display: getComputedStyle(el).display,
                    opacity: getComputedStyle(el).opacity,
                    transform: getComputedStyle(el).transform,
                    visibility: getComputedStyle(el).visibility,
                    zIndex: getComputedStyle(el).zIndex
                }))
            };

            return { beforeOpen, afterOpen };
        })()
    `);

    console.log('Inspection result:', JSON.stringify(res, null, 2));

    const img = await win.webContents.capturePage();
    fs.writeFileSync('C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8/overhaul_bigscreen_menu_open.png', img.toPNG());
    console.log('Saved overhaul_bigscreen_menu_open.png');

    app.quit();
});
