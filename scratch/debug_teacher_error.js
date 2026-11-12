const { app, BrowserWindow } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.webContents.on('console-message', (ev, level, msg) => {
        console.log('[RENDERER CONSOLE]:', msg);
    });

    await win.loadFile(path.join(__dirname, '../electron-app/src/teacher_panel_touch_pro.html'));
    await new Promise(r => setTimeout(r, 1200));

    const result = await win.webContents.executeJavaScript(`
        (() => {
            try {
                const s = store.students[0];
                console.log('Student 0:', s ? s.id : 'none');
                console.log('selectedIds:', typeof selectedIds);
                console.log('handleStudentRowClick:', typeof handleStudentRowClick);
                console.log('triggerScore:', typeof triggerScore);
                
                handleStudentRowClick(s.id);
                console.log('After handleStudentRowClick, selectedIds size:', selectedIds.size);
                
                const rule = store.behaviorRules[0];
                console.log('Rule 0:', rule);
                triggerScore(rule.points, rule.name);
                console.log('After triggerScore, s.exp:', s.exp);

                return { success: true };
            } catch (err) {
                return { success: false, error: err.message, stack: err.stack };
            }
        })()
    `);

    console.log('Test result:', result);
    win.destroy();
    app.quit();
});
