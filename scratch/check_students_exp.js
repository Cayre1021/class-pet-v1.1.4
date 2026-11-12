const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    await new Promise(r => setTimeout(r, 1200));
    const studentsWithNullExp = await win.webContents.executeJavaScript(`
        store.students.filter(s => s.exp === null || s.exp === undefined).map(s => ({ id: s.id, name: s.name, exp: s.exp, level: s.level, pets: s.pets }))
    `);
    console.log('Students with null/undefined exp:', studentsWithNullExp);
    app.quit();
});
