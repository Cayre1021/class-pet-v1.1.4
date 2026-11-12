const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
    const win = new BrowserWindow({ show: false });
    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    const t = await win.webContents.executeJavaScript(`localStorage.getItem('classpet_custom_level_thresholds')`);
    console.log('THRESHOLDS:', JSON.parse(t));
    app.quit();
});
