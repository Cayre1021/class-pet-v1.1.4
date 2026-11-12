const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    await new Promise(r => setTimeout(r, 1200));

    const res = await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students[0];
            const initialExp = s.exp;
            const initialLvl = s.level;
            
            openStudentDetailsModal(s.id);
            quickModalScore(3, '测试加分');
            const expAfterAdd = s.exp;
            
            quickModalScore(-3, '测试扣分');
            const expAfterSub = s.exp;

            closeDetailsModal();
            return {
                s_id: s.id,
                initialExp,
                expAfterAdd,
                expAfterSub,
                levelMatches: s.level >= initialLvl
            };
        })()
    `);
    console.log('Result:', res);
    app.quit();
});
