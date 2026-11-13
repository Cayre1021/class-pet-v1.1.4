const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'screenshots_new_ui');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.setPath('userData', path.join(app.getPath('temp'), 'classpet-demo-shots-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
    try {
        console.log('🚀 Capturing Swarm Prototype Screenshots...');

        // 1. Capture Demo A (Neo-Brutalism Light 2.0)
        const winA = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: { contextIsolation: true, nodeIntegration: false }
        });
        const urlA = 'file://' + path.join(__dirname, '..', 'design', 'demo_a_neo_brutalism.html').replace(/\\/g, '/');
        await winA.loadURL(urlA);
        await sleep(1000);

        // Demo A Normal
        let imgA1 = await winA.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'demo_a_normal.png'), imgA1.toPNG());
        console.log('📸 Captured: demo_a_normal.png');

        // Demo A Click Card
        await winA.webContents.executeJavaScript(`
            const card = document.querySelector('.pet-card');
            if (card) card.click();
        `);
        await sleep(500);
        let imgA2 = await winA.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'demo_a_drawer_open.png'), imgA2.toPNG());
        console.log('📸 Captured: demo_a_drawer_open.png');
        winA.close();

        // 2. Capture Demo B (Modern Bento Glassmorphism)
        const winB = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: { contextIsolation: true, nodeIntegration: false }
        });
        const urlB = 'file://' + path.join(__dirname, '..', 'design', 'demo_b_modern_bento.html').replace(/\\/g, '/');
        await winB.loadURL(urlB);
        await sleep(1000);

        // Demo B Normal
        let imgB1 = await winB.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'demo_b_normal.png'), imgB1.toPNG());
        console.log('📸 Captured: demo_b_normal.png');

        // Demo B Click Card
        await winB.webContents.executeJavaScript(`
            const card = document.querySelector('.pet-card');
            if (card) card.click();
        `);
        await sleep(500);
        let imgB2 = await winB.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'demo_b_drawer_open.png'), imgB2.toPNG());
        console.log('📸 Captured: demo_b_drawer_open.png');
        winB.close();

        console.log('🎉 All prototype screenshots captured!');
        app.quit();
    } catch (err) {
        console.error('❌ Error capturing demo shots:', err);
        app.quit();
        process.exit(1);
    }
});
