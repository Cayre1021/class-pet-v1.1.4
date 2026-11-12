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

        const target = path.join(__dirname, '../electron-app/src/display_bigscreen_zoom150.html');
        console.log('Loading target:', target);
        await win.loadFile(target);
        console.log('Loaded display_bigscreen_zoom150.html successfully!');

        const modalTest = await win.webContents.executeJavaScript(`
            (() => {
                const st = store.students[0];
                openStudentDetailsModal(st.id);
                return {
                    name: document.getElementById('heroPetName')?.textContent,
                    level: document.getElementById('heroPetLevel')?.textContent,
                    start: document.getElementById('heroMilestoneStart')?.textContent,
                    target: document.getElementById('heroMilestoneTarget')?.textContent,
                    rate: document.getElementById('heroExpRate')?.textContent,
                    barWidth: document.getElementById('heroProgressBar')?.style.width
                };
            })()
        `);
        console.log('Modal execution test result (zoom150):', modalTest);

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        if (win) win.destroy();
        app.quit();
        process.exit(0);
    }
});
