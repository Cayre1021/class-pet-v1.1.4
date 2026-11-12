const { app, BrowserWindow } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

async function run() {
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
    await new Promise(r => setTimeout(r, 1500));

    const check = await win.webContents.executeJavaScript(`
        (() => {
            const s = store.students.find(x => x.no === '05') || store.students[4];
            s.level = 20;
            s.pets.chinese = {
                id: 'pet_c_' + s.id,
                subject: '语文',
                species: 'cat',
                name: '灵动橘猫',
                icon: '🐱',
                level: 20,
                exp: 1300,
                visualStage: 5,
                isHatched: true
            };
            store.save();

            openHatchModal(s.id, 'english');

            const m = document.getElementById('modalHatchCenter');
            const innerBox = m.querySelector('.details-modal-box');
            return {
                mDisplay: m.style.display,
                mComputedDisplay: window.getComputedStyle(m).display,
                mRect: m.getBoundingClientRect(),
                boxRect: innerBox ? innerBox.getBoundingClientRect() : null,
                boxComp: innerBox ? {
                    display: window.getComputedStyle(innerBox).display,
                    visibility: window.getComputedStyle(innerBox).visibility,
                    width: window.getComputedStyle(innerBox).width,
                    height: window.getComputedStyle(innerBox).height,
                    bg: window.getComputedStyle(innerBox).backgroundColor
                } : null
            };
        })()
    `);

    console.log('Hatch box debug:', JSON.stringify(check, null, 2));
    win.destroy();
    app.quit();
}
app.whenReady().then(run);
