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
            show: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const htmlPath = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
        await win.loadFile(htmlPath);
        await new Promise(r => setTimeout(r, 2000));

        // 1. Grid overview
        const gridImg = await win.capturePage();
        fs.writeFileSync('scratch/screenshots/real_grid_dynamic_scale.png', gridImg.toPNG());
        console.log('CAPTURED_GRID');

        // 2. Open st_02 modal (李四 Lv.2, 50 EXP)
        await win.webContents.executeJavaScript("openStudentDetailsModal('st_02')");
        await new Promise(r => setTimeout(r, 1000));
        const modalLv2 = await win.capturePage();
        fs.writeFileSync('scratch/screenshots/real_modal_dynamic_scale_lv2.png', modalLv2.toPNG());
        console.log('CAPTURED_LV2');

        // Close modal
        await win.webContents.executeJavaScript("closeDetailsModal()");
        await new Promise(r => setTimeout(r, 500));

        // 3. Open st_01 modal (张三 Lv.8, 280 EXP)
        await win.webContents.executeJavaScript("openStudentDetailsModal('st_01')");
        await new Promise(r => setTimeout(r, 1000));
        const modalLv8 = await win.capturePage();
        fs.writeFileSync('scratch/screenshots/real_modal_dynamic_scale_lv8.png', modalLv8.toPNG());
        console.log('CAPTURED_LV8');

        // Close modal
        await win.webContents.executeJavaScript("closeDetailsModal()");
        await new Promise(r => setTimeout(r, 500));

        // 4. Open st_04 modal (赵六 Lv.13, 600 EXP)
        await win.webContents.executeJavaScript("openStudentDetailsModal('st_04')");
        await new Promise(r => setTimeout(r, 1000));
        const modalLv13 = await win.capturePage();
        fs.writeFileSync('scratch/screenshots/real_modal_dynamic_scale_lv13.png', modalLv13.toPNG());
        console.log('CAPTURED_LV13');

        // Close modal
        await win.webContents.executeJavaScript("closeDetailsModal()");
        await new Promise(r => setTimeout(r, 500));

        // 5. Open st_05 modal (钱七/孙七 Lv.20 MAX, 1250 EXP)
        await win.webContents.executeJavaScript("openStudentDetailsModal('st_05')");
        await new Promise(r => setTimeout(r, 1000));
        const modalLv20 = await win.capturePage();
        fs.writeFileSync('scratch/screenshots/real_modal_dynamic_scale_lv20.png', modalLv20.toPNG());
        console.log('CAPTURED_LV20');

        // 6. Inside st_05 modal, switch to Math subject to capture unhatched egg state
        await win.webContents.executeJavaScript("switchModalSubject('math')");
        await new Promise(r => setTimeout(r, 800));
        const modalEgg = await win.capturePage();
        fs.writeFileSync('scratch/screenshots/real_modal_dynamic_scale_egg.png', modalEgg.toPNG());
        console.log('CAPTURED_EGG');

    } catch (e) {
        console.error('Error during screenshot capture:', e);
    } finally {
        if (win) win.destroy();
        app.quit();
        process.exit(0);
    }
});
