const { app, BrowserWindow } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

async function dump() {
    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
    
    const dumpData = await win.webContents.executeJavaScript(`
        (() => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                data[k] = localStorage.getItem(k);
            }
            return data;
        })()
    `);

    console.log('LocalStorage keys count:', Object.keys(dumpData).length);
    for (const [k, v] of Object.entries(dumpData)) {
        if (k.includes('account') || k.includes('current') || k.includes('interact') || k.includes('threshold') || k.includes('students')) {
            console.log(`=== KEY: ${k} ===`);
            try {
                const obj = JSON.parse(v);
                if (Array.isArray(obj)) {
                    console.log('Array of length', obj.length);
                    const s42 = obj.find(x => x && (x.id === 'st_42' || x.no === '42' || x.name === '吕四'));
                    if (s42) console.log('Found s42:', s42);
                } else {
                    console.log(obj);
                }
            } catch (e) {
                console.log(v.slice(0, 100));
            }
        }
    }

    win.destroy();
    app.quit();
}

app.whenReady().then(dump);
