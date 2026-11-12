const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    win.webContents.on('console-message', (ev, level, msg) => console.log('LOG:', level, msg));
    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    
    const initTheme = await win.webContents.executeJavaScript(`document.documentElement.getAttribute('data-theme')`);
    console.log('initTheme:', initTheme);

    await win.webContents.executeJavaScript(`setGlobalTheme('orange')`);
    await new Promise(r => setTimeout(r, 1000));
    const afterTheme = await win.webContents.executeJavaScript(`document.documentElement.getAttribute('data-theme')`);
    console.log('afterTheme after 1s:', afterTheme);
    app.quit();
});
