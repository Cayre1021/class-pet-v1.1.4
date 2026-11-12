const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

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

        const htmlPath = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
        await win.loadFile(htmlPath);
        await new Promise(r => setTimeout(r, 1500));

        const results = await win.webContents.executeJavaScript(`
            (function() {
                const res = [];
                const cards = document.querySelectorAll('.pet-card');
                for (let i = 0; i < Math.min(8, cards.length); i++) {
                    cards[i].click();
                    res.push({
                        name: document.getElementById('modalStudentName')?.textContent,
                        level: document.getElementById('heroPetLevel')?.textContent,
                        rate: document.getElementById('heroExpRate')?.textContent,
                        milestoneStart: document.getElementById('heroMilestoneStart')?.textContent,
                        milestoneTarget: document.getElementById('heroMilestoneTarget')?.textContent,
                        detail: document.getElementById('heroExpText')?.textContent
                    });
                    closeDetailsModal();
                }
                return res;
            })()
        `);

        console.log('RESULTS_START');
        console.log(JSON.stringify(results, null, 2));
        console.log('RESULTS_END');

        // Capture screenshot of student #02 (Lv.2) modal
        await win.webContents.executeJavaScript("document.querySelectorAll('.pet-card')[1].click()");
        await new Promise(r => setTimeout(r, 500));
        const img2 = await win.capturePage();
        fs.writeFileSync('scratch/screenshots/modal_lv2_new.png', img2.toPNG());
        console.log('Saved scratch/screenshots/modal_lv2_new.png');
    } catch (err) {
        console.error('Error in test:', err);
    } finally {
        if (win) win.destroy();
        app.quit();
        process.exit(0);
    }
});
