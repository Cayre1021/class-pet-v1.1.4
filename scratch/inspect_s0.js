const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    await new Promise(r => setTimeout(r, 1500));
    const s0 = await win.webContents.executeJavaScript('JSON.stringify({ s0: store.students[0], len: store.students.length })');
    console.log('s0 result:', s0);
    app.quit();
});
