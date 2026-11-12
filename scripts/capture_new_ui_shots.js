// scripts/capture_new_ui_shots.js - Captures high-res screenshots of the new UI direction
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Setup mock IPC handlers
ipcMain.on('toggle-fullscreen', () => {});
ipcMain.on('open-display-window', () => {});
ipcMain.on('open-teacher-window', () => {});
ipcMain.on('open-portal-window', () => {});
ipcMain.on('broadcast-sync', () => {});
ipcMain.handle('get-displays', async () => []);
ipcMain.handle('db:loadAllState', async () => null);
ipcMain.handle('db:recordScore', async () => ({ success: true, operationId: 'op_test' }));
ipcMain.handle('db:undoScore', async () => ({ success: true }));
ipcMain.handle('db:getStudentAuditLogs', async () => []);
ipcMain.handle('db:hatchPet', async () => ({ success: true }));
ipcMain.handle('db:saveStudent', async () => ({ success: true }));
ipcMain.handle('db:importStudents', async () => ({ success: true }));
ipcMain.handle('db:saveAllStudents', async () => ({ success: true }));
ipcMain.handle('db:archiveStudent', async () => ({ success: true }));
ipcMain.handle('db:deleteStudent', async () => ({ success: true }));
ipcMain.handle('db:saveThresholds', async () => ({ success: true }));
ipcMain.handle('db:saveBehaviorRules', async () => ({ success: true }));
ipcMain.handle('db:query', async () => []);
ipcMain.handle('db:execute', async () => ({ changes: 1 }));

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const outDir = path.join(__dirname, '..', 'screenshots_new_ui');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function capture(win, filename, label) {
    await sleep(400);
    const img = await win.webContents.capturePage();
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, img.toPNG());
    console.log(`📸 [Captured] ${label} -> ${filename} (${img.getSize().width}x${img.getSize().height})`);
    return filePath;
}

app.setPath('userData', path.join(app.getPath('temp'), 'classpet-capture-shots-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
    try {
        console.log('🚀 Starting New UI Screenshot Capture...');
        const preloadPath = path.join(__dirname, '..', 'electron-app', 'preload.js');

        // 1. Capture Big Screen (display_bigscreen_touch_pro.html)
        const winBigscreen = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        const bigscreenUrl = 'file://' + path.join(__dirname, '..', 'electron-app', 'src', 'display_bigscreen_touch_pro.html').replace(/\\/g, '/');
        await winBigscreen.loadURL(bigscreenUrl);
        await sleep(1500);

        // Screenshot 1: 正常情况（收纳状态，全宽卡片，卡片只保留学生姓名）
        await capture(winBigscreen, '01_bigscreen_normal_collapsed.png', '大屏正常状态：左侧档案收纳，全屏网格，卡片仅保留学生名字');

        // Screenshot 2: 点击宠物卡片后（弹出左侧档案，主要信息展示，卡片高亮）
        await winBigscreen.webContents.executeJavaScript(`
            const firstCard = document.querySelector('#gridFullView .pet-card');
            if (firstCard) {
                firstCard.click();
            }
        `);
        await sleep(500);
        await capture(winBigscreen, '02_bigscreen_pet_clicked_detail_open.png', '点击宠物后：左侧档案弹出显示核心信息，卡片高亮选中');

        // Screenshot 3: 卡片特写（放大展示纯净卡片，对比旧版消除文字噪音）
        await winBigscreen.webContents.executeJavaScript(`
            // Zoom in on cards for close-up
            document.getElementById('gridWorkspace').style.transform = 'scale(1.45)';
            document.getElementById('gridWorkspace').style.transformOrigin = 'top right';
        `);
        await sleep(400);
        await capture(winBigscreen, '03_card_closeup_comparison.png', '学生方块特写：仅留学生名字与萌宠大图，消除一切多余文字');

        // Screenshot 3b: 修复验证：第一排卡片悬浮(Hover)与选中(Selected)时顶边框无遮挡特写
        await winBigscreen.webContents.executeJavaScript(`
            document.getElementById('gridWorkspace').style.transform = 'none';
        `);
        await sleep(300);

        // 获取第一张卡片(张三/李四)和第二张卡片(王五)的精确位置
        const cardCoords = await winBigscreen.webContents.executeJavaScript(`
            (function() {
                const cards = document.querySelectorAll('#gridFullView .pet-card');
                if (cards.length >= 2) {
                    cards[1].classList.add('selected'); // 选中第二张卡片 (王五)
                    const r0 = cards[0].getBoundingClientRect();
                    return { x: Math.round(r0.left + r0.width / 2), y: Math.round(r0.top + r0.height / 2) };
                }
                return null;
            })()
        `);

        if (cardCoords) {
            // 模拟鼠标悬停在第一张卡片上触发 hover 效果
            winBigscreen.webContents.sendInputEvent({ type: 'mouseMove', x: cardCoords.x, y: cardCoords.y });
            await sleep(400);
            await capture(winBigscreen, '06_first_row_cards_unclipped.png', '第一排卡片悬浮与选中特写：顶部边框完好无遮挡');
        }

        winBigscreen.close();

        // 2. Capture Design Preview (revision-preview.html)
        const winPreview = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        const previewUrl = 'file://' + path.join(__dirname, '..', 'design', 'revision-preview.html').replace(/\\/g, '/');
        await winPreview.loadURL(previewUrl);
        await sleep(1200);

        await capture(winPreview, '04_design_preview_normal.png', '设计预览：默认正常收纳状态');

        await winPreview.webContents.executeJavaScript(`
            selectStudent(1);
        `);
        await sleep(400);
        await capture(winPreview, '05_design_preview_clicked.png', '设计预览：点击同学01后弹出左侧档案');

        winPreview.close();

        console.log('🎉 All new UI screenshots captured successfully in:', outDir);
        app.quit();
    } catch (err) {
        console.error('❌ Capture Error:', err);
        app.quit();
        process.exit(1);
    }
});
