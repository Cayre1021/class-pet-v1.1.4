const { app, BrowserWindow } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    let win;
    try {
        win = new BrowserWindow({
            width: 1400,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        win.webContents.on('console-message', (ev, level, msg) => {
            console.log('[RENDERER CONSOLE]:', msg);
        });

        const target = path.join(__dirname, '../electron-app/src/teacher_panel_touch_pro.html');
        console.log('Loading target:', target);
        await win.loadFile(target);
        console.log('Loaded teacher_panel_touch_pro.html successfully!');

        const teacherCheck = await win.webContents.executeJavaScript(`
            (() => {
                const count = store.students ? store.students.length : 0;
                const rulesCount = store.behaviorRules ? store.behaviorRules.length : 0;
                return { count, rulesCount };
            })()
        `);
        console.log('Teacher panel state check result:', teacherCheck);

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        if (win) win.destroy();
        app.quit();
        process.exit(0);
    }
});
