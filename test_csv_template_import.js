// test_csv_template_import.js - Automated test for importing D:\Desk\班级花名册标准导入模板.csv
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

ipcMain.on('toggle-fullscreen', () => {});
ipcMain.on('open-display-window', () => {});
ipcMain.on('open-teacher-window', () => {});
ipcMain.on('open-portal-window', () => {});
ipcMain.on('broadcast-sync', () => {});
ipcMain.handle('get-displays', async () => []);
ipcMain.handle('db:loadAllState', async () => null);
ipcMain.handle('db:importStudents', async () => ({ success: true }));
ipcMain.handle('db:saveAllStudents', async () => ({ success: true }));

app.whenReady().then(async () => {
    try {
        console.log('🧪 Starting CSV Roster Import Test...');
        const preloadPath = path.join(__dirname, 'electron-app', 'preload.js');
        const csvPath = 'D:\\Desk\\班级花名册标准导入模板.csv';

        if (!fs.existsSync(csvPath)) {
            console.error('❌ CSV file not found:', csvPath);
            process.exit(1);
        }

        const csvBuffer = fs.readFileSync(csvPath);
        console.log(`  📄 Loaded CSV file (${csvBuffer.length} bytes, starts with: ${csvBuffer.slice(0, 4).toString('hex')})`);

        const win = new BrowserWindow({
            width: 1440,
            height: 900,
            show: false,
            webPreferences: {
                preload: preloadPath,
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        win.webContents.on('console-message', (evt, lvl, msg) => {
            if (lvl === 3) console.error('[Console Error]', msg);
        });

        const teacherUrl = 'file://' + path.join(__dirname, 'electron-app', 'src', 'teacher_panel_touch_pro.html').replace(/\\/g, '/');
        await win.loadURL(teacherUrl);
        await new Promise(r => setTimeout(r, 800));

        // Pass buffer as base64 to execute in renderer
        const b64 = csvBuffer.toString('base64');

        const result = await win.webContents.executeJavaScript(`
            (async () => {
                const results = [];
                function assert(cond, msg) {
                    results.push({ pass: !!cond, msg });
                    if (!cond) console.error('ASSERTION FAILED: ' + msg);
                }

                // 1. Convert base64 back to Uint8Array File
                const binaryStr = atob('${b64}');
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const testFile = new File([bytes], '班级花名册标准导入模板.csv', { type: 'text/csv' });

                // 2. Open modal and simulate file upload
                openExcelModal();
                assert(document.getElementById('modalExcelImport').style.display === 'flex', '导入模态框正常打开');

                // Track confirmation dialog trigger
                let confirmTitle = '';
                let confirmMsg = '';
                let confirmCallback = null;
                const origConfirm = window.showClassroomConfirm;
                window.showClassroomConfirm = function(msg, title, onConfirm, onCancel, icon, confirmText, confirmBg, cancelText) {
                    confirmMsg = msg;
                    confirmTitle = title;
                    confirmCallback = onConfirm;
                };

                // Trigger handleExcelFile
                handleExcelFile(testFile);
                await new Promise(r => setTimeout(r, 300));

                // 3. Verify encoding parsed correctly (no mojibake)
                assert(parsedExcelRawData && parsedExcelRawData.length >= 8, '成功解析出至少 8 行数据 (实测: ' + parsedExcelRawData.length + '行)');
                const headers = parsedExcelRawData[0];
                assert(headers.includes('学号') && headers.includes('姓名') && headers.includes('组别'), 'GBK 编码自动探测成功，表头无乱码 (学号/姓名/组别): ' + JSON.stringify(headers));

                // 4. Verify diagnostic popup triggered
                assert(confirmTitle.includes('花名册数据校验提示'), '针对表格缺陷成功触发诊断弹窗，标题：' + confirmTitle);
                assert(confirmMsg.includes('许秀') && confirmMsg.includes('缺少大组'), '诊断弹窗准确指出第8行【许秀】缺少组别');
                assert(confirmMsg.includes('找不到') && confirmMsg.includes('缺少学号'), '诊断弹窗准确指出第9行【找不到】缺少学号');

                // 5. Execute Smart Auto-Repair callback
                assert(typeof confirmCallback === 'function', '提供【智能补齐并继续】修复决策函数');
                if (confirmCallback) {
                    confirmCallback();
                    await new Promise(r => setTimeout(r, 200));
                }

                // Verify preview table
                const mappingArea = document.getElementById('mappingConfigArea');
                assert(mappingArea && mappingArea.style.display === 'block', '第二步字段映射与预览区成功展开');
                const tbody = document.getElementById('previewTableBody');
                const trs = tbody.querySelectorAll('tr');
                assert(trs.length === 8, '预览表格完整展示全部 8 名学生名单 (当前: ' + trs.length + '行)');

                // Verify Xu Xiu row has group auto-assigned
                const xuXiuTr = Array.from(trs).find(tr => tr.textContent.includes('许秀'));
                assert(xuXiuTr && xuXiuTr.textContent.includes('第') && xuXiuTr.textContent.includes('组'), '【许秀】大组自动补全成功：' + (xuXiuTr ? xuXiuTr.textContent : 'none'));

                // Verify Zhao Bu Dao row has student number auto-assigned
                const zbdTr = Array.from(trs).find(tr => tr.textContent.includes('找不到'));
                assert(zbdTr && zbdTr.textContent.includes('#08'), '【找不到】学号自动顺延补齐成功 (#08)：' + (zbdTr ? zbdTr.textContent : 'none'));

                // 6. Confirm final import
                await confirmExcelImport();
                await new Promise(r => setTimeout(r, 300));

                assert(store.students.length === 8, '学生库成功导入 8 名学生！');
                const importedXuXiu = store.students.find(s => s.name === '许秀');
                assert(importedXuXiu && importedXuXiu.no === '07' && importedXuXiu.group >= 1, '已导入学生库包含【许秀】(#07, 第' + importedXuXiu?.group + '组)');

                const importedZBD = store.students.find(s => s.name === '找不到');
                assert(importedZBD && importedZBD.no === '08' && importedZBD.group === 2, '已导入学生库包含【找不到】(自动补齐学号 #08, 第2组)');

                window.showClassroomConfirm = origConfirm;
                return results;
            })();
        `);

        let passCount = 0;
        result.forEach(r => {
            if (r.pass) {
                console.log(`  ✅ PASS: ${r.msg}`);
                passCount++;
            } else {
                console.error(`  ❌ FAIL: ${r.msg}`);
            }
        });

        win.close();
        if (passCount === result.length) {
            console.log(`\n🎉 CSV Template Import Test Passed 100%! (${passCount}/${result.length})`);
            app.exit(0);
        } else {
            app.exit(1);
        }
    } catch (err) {
        console.error('Test error:', err);
        app.exit(1);
    }
});
