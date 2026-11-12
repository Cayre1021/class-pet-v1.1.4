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

    const check = await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students[0];
            openStudentDetailsModal(s.id);
            const m = document.getElementById('modalStudentDetails');
            const comp = window.getComputedStyle(m);
            return {
                studentId: s.id,
                inlineDisplay: m ? m.style.display : null,
                computedDisplay: m ? comp.display : null,
                visibility: m ? comp.visibility : null,
                opacity: m ? comp.opacity : null,
                zIndex: m ? comp.zIndex : null
            };
        })()
    `);
    console.log('Modal check:', check);
    win.destroy();
    app.quit();
}
app.whenReady().then(run);
