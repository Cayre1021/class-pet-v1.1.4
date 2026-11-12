const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqliteService = require('../electron-app/sqlite_service.js');

app.disableHardwareAcceleration();

async function runTest() {
    await sqliteService.init(null);

    ipcMain.handle('db:loadAllState', async (event, classId) => {
        return sqliteService.loadAllState(classId || 'c_class02_01');
    });

    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../electron-app/preload.js')
        }
    });

    const fileUrl = 'file://' + path.resolve('./electron-app/src/display_bigscreen_touch_pro.html').replace(/\\/g, '/');
    await win.loadURL(fileUrl);

    // Wait until SQLite students are loaded
    await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            const check = () => {
                if (window.store && store.students && store.students.some(s => s.id === 'st_02')) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        })
    `);

    // Click st_02 card directly
    await win.webContents.executeJavaScript("document.getElementById('petCard_st_02').click()");
    await new Promise(r => setTimeout(r, 600));

    const modalImg2 = await win.capturePage();
    fs.writeFileSync('scratch/screenshots/real_sqlite_modal_st02.png', modalImg2.toPNG());
    console.log('Saved scratch/screenshots/real_sqlite_modal_st02.png');

    // Close and open st_05
    await win.webContents.executeJavaScript("closeDetailsModal()");
    await new Promise(r => setTimeout(r, 300));
    await win.webContents.executeJavaScript("document.getElementById('petCard_st_05').click()");
    await new Promise(r => setTimeout(r, 600));

    const modalImg5 = await win.capturePage();
    fs.writeFileSync('scratch/screenshots/real_sqlite_modal_st05_max.png', modalImg5.toPNG());
    console.log('Saved scratch/screenshots/real_sqlite_modal_st05_max.png');

    win.destroy();
    app.quit();
}

app.whenReady().then(runTest);
