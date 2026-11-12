const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
    let win;
    const errors = [];
    const logs = [];

    try {
        win = new BrowserWindow({
            width: 1440,
            height: 900,
            show: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        win.webContents.on('console-message', (event, level, message) => {
            logs.push(`[CONSOLE ${level}] ${message}`);
            if (level >= 3 || message.includes('Error') || message.includes('Uncaught')) {
                errors.push(message);
            }
        });

        const targetUrl = 'file:///' + path.resolve(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html').replace(/\\/g, '/');
        await win.loadURL(targetUrl);
        await win.webContents.executeJavaScript(`
            localStorage.removeItem('classpet_floating_ball_pos');
            localStorage.setItem('nb_selected_theme', 'classic');
        `);
        await win.reload();
        await new Promise(r => setTimeout(r, 1200));

        const brainDir = 'C:/Users/PC/.gemini/antigravity/brain/fc8df888-7586-4ef4-81f4-b64f35254df8';
        if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

        // 1. Verify Header Elements
        const headerAudit = await win.webContents.executeJavaScript(`
            (() => {
                const header = document.querySelector('.stage-header-pro');
                const portalBtn = header ? header.querySelector('button[onclick*="goToPortal"]') : null;
                const workBtnInHeader = header ? header.querySelector('button[onclick*="openTeacherWorkstation"]') : null;
                const tabsInHeader = header ? header.querySelector('.view-mode-tabs-pro') : null;
                const scaleInHeader = header ? header.querySelector('.scale-control-box') : null;
                const lotteryInHeader = header ? header.querySelector('button[onclick*="startRandomPicker"]') : null;
                const fullInHeader = header ? header.querySelector('button[onclick*="toggleAppFullscreen"]') : null;
                const themeInHeader = document.getElementById('themeSelect');
                const fixedReachBtn = document.getElementById('btnReachabilityTrigger');
                const floatingBall = document.getElementById('classpetFloatingBall');
                const radialMenu = document.getElementById('classpetRadialMenu');
                const badge = document.getElementById('headerClassBadge');

                return {
                    hasHeader: Boolean(header),
                    hasPortalBtn: Boolean(portalBtn),
                    hasWorkBtnInHeader: Boolean(workBtnInHeader),
                    hasTabsInHeader: Boolean(tabsInHeader),
                    hasScaleInHeader: Boolean(scaleInHeader),
                    hasLotteryInHeader: Boolean(lotteryInHeader),
                    hasFullInHeader: Boolean(fullInHeader),
                    hasThemeInHeader: Boolean(themeInHeader),
                    hasFixedReachBtn: Boolean(fixedReachBtn),
                    hasFloatingBall: Boolean(floatingBall),
                    hasRadialMenu: Boolean(radialMenu),
                    badgeText: badge ? badge.textContent : ''
                };
            })()
        `);
        console.log('--- HEADER AUDIT RESULT ---');
        console.log(JSON.stringify(headerAudit, null, 2));

        // Screenshot 1: Clean default grid
        const img1 = await win.webContents.capturePage();
        fs.writeFileSync(path.join(brainDir, 'streamlined_01_clean_grid.png'), img1.toPNG());
        console.log('Saved: streamlined_01_clean_grid.png');

        // 2. Open Radial Menu on Floating Ball
        await win.webContents.executeJavaScript(`
            (() => {
                toggleRadialMenu();
            })()
        `);
        await new Promise(r => setTimeout(r, 600));

        // Screenshot 2: Radial menu open
        const img2 = await win.webContents.capturePage();
        fs.writeFileSync(path.join(brainDir, 'streamlined_02_radial_menu_open.png'), img2.toPNG());
        console.log('Saved: streamlined_02_radial_menu_open.png');

        // 3. Switch to Seat Map via View Submenu
        await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('view');
            })()
        `);
        await new Promise(r => setTimeout(r, 400));
        
        await win.webContents.executeJavaScript(`
            (() => {
                triggerRadialSubAction('view', 'view_seat');
            })()
        `);
        await new Promise(r => setTimeout(r, 600));

        // Screenshot 3: Seat view
        const img3 = await win.webContents.capturePage();
        fs.writeFileSync(path.join(brainDir, 'streamlined_03_seat_view.png'), img3.toPNG());
        console.log('Saved: streamlined_03_seat_view.png');

        // 4. Switch to PK Race View via View Submenu
        await win.webContents.executeJavaScript(`
            (() => {
                toggleRadialMenu();
            })()
        `);
        await new Promise(r => setTimeout(r, 300));

        await win.webContents.executeJavaScript(`
            (() => {
                handleRadialModuleClick('view');
            })()
        `);
        await new Promise(r => setTimeout(r, 300));

        await win.webContents.executeJavaScript(`
            (() => {
                triggerRadialSubAction('view', 'view_pk');
            })()
        `);
        await new Promise(r => setTimeout(r, 600));

        // Screenshot 4: PK view
        const img4 = await win.webContents.capturePage();
        fs.writeFileSync(path.join(brainDir, 'streamlined_04_pk_view.png'), img4.toPNG());
        console.log('Saved: streamlined_04_pk_view.png');

        // 5. Switch back to Grid
        await win.webContents.executeJavaScript(`
            (() => {
                switchView('grid');
            })()
        `);
        await new Promise(r => setTimeout(r, 400));

        // Check badge text in Grid view
        const finalBadge = await win.webContents.executeJavaScript(`document.getElementById('headerClassBadge').textContent`);
        console.log('Final Badge Text:', finalBadge);

        console.log('--- ERROR CHECK ---');
        console.log('Total console errors/warnings:', errors.length);
        if (errors.length > 0) {
            console.error(errors);
        } else {
            console.log('SUCCESS: ZERO console runtime errors!');
        }

    } catch (e) {
        console.error('Test Execution Error:', e);
    } finally {
        if (win) win.close();
        app.quit();
    }
});
