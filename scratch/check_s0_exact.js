const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    await new Promise(r => setTimeout(r, 1200));
    
    // Switch views
    await win.webContents.executeJavaScript(`switchView('seat'); switchView('pk'); switchView('grid');`);
    await new Promise(r => setTimeout(r, 500));
    
    // Random picker
    await win.webContents.executeJavaScript(`startRandomPicker();`);
    await new Promise(r => setTimeout(r, 1500));
    await win.webContents.executeJavaScript(`
        if (typeof closeDetailsModal === 'function') closeDetailsModal();
        const pickOverlay = document.getElementById('randomPickerOverlay');
        if (pickOverlay) pickOverlay.style.display = 'none';
    `);

    // Check store.students[0]
    const s0 = await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students[0];
            return {
                id: s.id,
                name: s.name,
                hasExpProp: 'exp' in s,
                expValue: s.exp,
                typeofExp: typeof s.exp,
                petsChineseExp: s.pets?.chinese?.exp
            };
        })()
    `);
    console.log('s0 right before score test:', s0);
    app.quit();
});
