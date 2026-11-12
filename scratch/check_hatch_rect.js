const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();

async function run() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../electron-app/preload.js')
        }
    });

    const fileUrl = 'file://' + path.resolve('./electron-app/src/display_bigscreen_touch_pro.html').replace(/\\/g, '/');
    await win.loadURL(fileUrl);
    await new Promise(r => setTimeout(r, 1500));

    const info = await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students.find(x => x.no === '05') || store.students[4];
            openHatchModal(s.id, 'english');
            const m = document.getElementById('modalHatchCenter');
            const rect = m.getBoundingClientRect();
            const comp = window.getComputedStyle(m);
            return {
                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                comp: { display: comp.display, visibility: comp.visibility, opacity: comp.opacity, zIndex: comp.zIndex },
                parentDisplay: window.getComputedStyle(m.parentElement).display
            };
        })()
    `);
    console.log('Hatch rect info:', info);
    win.destroy();
    app.quit();
}
app.whenReady().then(run);
