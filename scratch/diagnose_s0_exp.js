const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    await new Promise(r => setTimeout(r, 1500));
    const diag = await win.webContents.executeJavaScript(`
        (async () => {
            const hasElectronAPI = typeof window.electronAPI !== 'undefined';
            const hasDb = !!(window.electronAPI && window.electronAPI.db);
            const loadRes = await store.loadFromSQLite();
            const s = store.students[0];
            return {
                hasElectronAPI,
                hasDb,
                loadRes,
                id: s.id,
                name: s.name,
                level: s.level,
                exp: s.exp,
                activeSubject: s.activeSubject,
                chineseExp: s.pets?.chinese?.exp,
                petsKeys: Object.keys(s.pets || {})
            };
        })()
    `);
    console.log('diag:', diag);
    app.quit();
});
