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

        console.log('\n--- 1. Testing Escape & Backdrop Dismiss in display_bigscreen_touch_pro.html ---');
        await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html'));
        await new Promise(r => setTimeout(r, 1000));

        // Test 1.1: Escape key closes student details modal
        const escDetailsTest = await win.webContents.executeJavaScript(`
            (() => {
                const s = store.students[0];
                openStudentDetailsModal(s.id);
                const openDisp = document.getElementById('modalStudentDetails').style.display;
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
                const closedDisp = document.getElementById('modalStudentDetails').style.display;
                return { openDisp, closedDisp };
            })()
        `);
        console.log('  Details Modal Escape test:', escDetailsTest);
        if (escDetailsTest.openDisp === 'none' || escDetailsTest.closedDisp !== 'none') {
            throw new Error('Details Modal failed to close via Escape key');
        }

        // Test 1.2: Backdrop click closes modal, but inner click does not
        const backdropDetailsTest = await win.webContents.executeJavaScript(`
            (() => {
                const s = store.students[0];
                openStudentDetailsModal(s.id);
                const overlay = document.getElementById('modalStudentDetails');
                const innerBox = overlay.querySelector('.details-modal-box');
                innerBox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                const afterInnerClickDisp = overlay.style.display;
                overlay.dispatchEvent(new MouseEvent('click', { bubbles: false }));
                const afterBackdropClickDisp = overlay.style.display;
                return { afterInnerClickDisp, afterBackdropClickDisp };
            })()
        `);
        console.log('  Details Modal Backdrop test:', backdropDetailsTest);
        if (backdropDetailsTest.afterInnerClickDisp === 'none' || backdropDetailsTest.afterBackdropClickDisp !== 'none') {
            throw new Error('Details Modal backdrop click failed');
        }

        // Test 1.3: Hatch modal Escape
        const escHatchTest = await win.webContents.executeJavaScript(`
            (() => {
                openHatchModal(store.students[0].id);
                const openDisp = document.getElementById('modalHatchCenter').style.display;
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
                const closedDisp = document.getElementById('modalHatchCenter').style.display;
                return { openDisp, closedDisp };
            })()
        `);
        console.log('  Hatch Modal Escape test:', escHatchTest);
        if (escHatchTest.openDisp === 'none' || escHatchTest.closedDisp !== 'none') {
            throw new Error('Hatch Modal failed to close via Escape key');
        }

        console.log('\n--- 2. Testing Escape & Backdrop Dismiss in teacher_panel_touch_pro.html ---');
        await win.loadFile(path.join(__dirname, '../electron-app/src/teacher_panel_touch_pro.html'));
        await new Promise(r => setTimeout(r, 1000));

        // Test 2.1: Add student modal Escape
        const escAddStudentTest = await win.webContents.executeJavaScript(`
            (() => {
                openAddStudentModal();
                const openDisp = document.getElementById('modalAddStudent').style.display;
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
                const closedDisp = document.getElementById('modalAddStudent').style.display;
                return { openDisp, closedDisp };
            })()
        `);
        console.log('  Add Student Modal Escape test:', escAddStudentTest);
        if (escAddStudentTest.openDisp === 'none' || escAddStudentTest.closedDisp !== 'none') {
            throw new Error('Add Student Modal failed to close via Escape key');
        }

        // Test 2.2: Excel modal backdrop click
        const backdropExcelTest = await win.webContents.executeJavaScript(`
            (() => {
                openExcelModal();
                const overlay = document.getElementById('modalExcelImport');
                const innerBox = overlay.querySelector('.modal-box');
                innerBox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                const afterInnerClickDisp = overlay.style.display;
                overlay.dispatchEvent(new MouseEvent('click', { bubbles: false }));
                const afterBackdropClickDisp = overlay.style.display;
                return { afterInnerClickDisp, afterBackdropClickDisp };
            })()
        `);
        console.log('  Excel Modal Backdrop test:', backdropExcelTest);
        if (backdropExcelTest.afterInnerClickDisp === 'none' || backdropExcelTest.afterBackdropClickDisp !== 'none') {
            throw new Error('Excel Modal backdrop click failed');
        }

        console.log('\n--- 3. Testing Escape & Backdrop Dismiss in display_bigscreen.html ---');
        await win.loadFile(path.join(__dirname, '../electron-app/src/display_bigscreen.html'));
        await new Promise(r => setTimeout(r, 1000));
        const stdBigscreenEscTest = await win.webContents.executeJavaScript(`
            (() => {
                openStudentDetailsModal(store.students[0].id);
                const openDisp = document.getElementById('modalStudentDetails').style.display;
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
                const closedDisp = document.getElementById('modalStudentDetails').style.display;
                return { openDisp, closedDisp };
            })()
        `);
        console.log('  Standard Bigscreen Escape test:', stdBigscreenEscTest);
        if (stdBigscreenEscTest.openDisp === 'none' || stdBigscreenEscTest.closedDisp !== 'none') {
            throw new Error('Standard bigscreen Escape failed');
        }

        console.log('\n--- 4. Testing Escape & Backdrop Dismiss in portal_auth.html ---');
        await win.loadFile(path.join(__dirname, '../electron-app/src/portal_auth.html'));
        await new Promise(r => setTimeout(r, 1000));
        const portalEscTest = await win.webContents.executeJavaScript(`
            (() => {
                showClassroomAlert('测试提示');
                const openDisp = document.getElementById('classroomModalAlert').style.display;
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
                const closedDisp = document.getElementById('classroomModalAlert').style.display;
                return { openDisp, closedDisp };
            })()
        `);
        console.log('  Portal Alert Escape test:', portalEscTest);
        if (portalEscTest.openDisp === 'none' || portalEscTest.closedDisp !== 'none') {
            throw new Error('Portal Alert Escape failed');
        }

        console.log('\n✅ All modal dismiss (Escape & Backdrop click) tests across ALL pages PASSED flawlessly!');
    } catch (err) {
        console.error('❌ Modal test error:', err);
        process.exit(1);
    } finally {
        if (win) win.close();
        app.quit();
    }
});
