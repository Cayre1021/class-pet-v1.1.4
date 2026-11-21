const { app, BrowserWindow, ipcMain, screen, globalShortcut, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const sqliteService = require('./sqlite_service.js');
const updateCheck = require('./update_check.js');
const xlsxLite = require('./xlsx_lite.js');

let mainWindow = null;

function getWindowOptions(extraOptions = {}) {
    return {
        width: 1400,
        height: 880,
        minWidth: 1024,
        minHeight: 700,
        backgroundColor: '#FFFEF9',
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'src', 'assets', 'icons', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: false
        },
        ...extraOptions
    };
}

function createMainWindow(defaultPage = 'portal_auth.html', defaultTitle = 'Class Pet - 班级电子宠物管理系统 (主控制台)') {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return mainWindow;
    }

    mainWindow = new BrowserWindow(getWindowOptions({
        title: defaultTitle
    }));

    // 严密禁止任何新窗口弹出：所有页面切换强制在当前唯一窗口内进行 (方案一：纯单窗口模式)
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });

    mainWindow.loadFile(path.join(__dirname, 'src', defaultPage));
    mainWindow.webContents.on('did-finish-load', () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(defaultTitle);   /* 页面 title 不再干扰窗口标题 */
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    return mainWindow;
}

/**
 * 方案一核心：单窗口平滑导航引擎
 * 无论是“学生大屏”、“教师工作台”还是“班级门户”，
 * 均在唯一的 mainWindow 内平滑切换页面 (loadFile)，
 * 全屏状态 (F11)、窗口尺寸与位置在页面切换时完美保持，杜绝任何新弹窗干扰。
 */
function navigateMainWindow(htmlRelativePath, title) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (title) {
            mainWindow.setTitle(title);
        }
        mainWindow.loadFile(path.join(__dirname, 'src', htmlRelativePath));
        mainWindow.webContents.once('did-finish-load', () => {
            if (title && mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(title);
        });
        mainWindow.focus();
        return mainWindow;
    }
    return createMainWindow(htmlRelativePath, title);
}

// 统一 IPC 路由：单窗口应用内原地跳转
ipcMain.on('open-display-window', () => {
    navigateMainWindow('v3_looseleaf_paper.html', 'Class Pet - 班级电子宠物管理系统 (学生大屏)');
});

ipcMain.on('open-teacher-window', () => {
    navigateMainWindow('v3_teacher_desk.html', 'Class Pet - 班级电子宠物管理系统 (教师控制台)');
});

ipcMain.on('open-portal-window', () => {
    navigateMainWindow('v3_portal.html', 'Class Pet - 班级电子宠物管理系统 (主控制台)');
});

// 全屏切换控制：直接控制唯一的 mainWindow
ipcMain.on('toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win && !win.isDestroyed()) {
        win.setFullScreen(!win.isFullScreen());
    }
});

ipcMain.handle('get-displays', () => {
    return screen.getAllDisplays();
});

// 跨进程/页面广播消息中继 (单窗口模式下依然有效并兼容扩展)
ipcMain.on('broadcast-sync', (event, data) => {
    const senderId = event.sender.id;
    BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents.id !== senderId) {
            win.webContents.send('broadcast-sync', data);
        }
    });
});

// ==========================================
// 真实本地 SQLite 数据库 IPC 管道与服务处理
// ==========================================
/* ============ 检查更新（GitHub Releases，只提示 + 打开下载页；不自动安装） ============ */
const UPDATE_REPO = process.env.CLASPET_UPDATE_REPO || 'Cayre1021/class-pet-v1.1.4';
const UPDATE_CACHE_MS = 24 * 60 * 60 * 1000;   // 静默检查每天最多一次
let updateCache = { at: 0, result: null };

async function fetchLatestRelease(currentVersion) {
    /* 网络与解析都在 update_check.js 里（可单测）；这里只负责选源与缓存 */
    return updateCheck.fetchLatestRelease({
        currentVersion: currentVersion,
        repo: UPDATE_REPO,
        feed: process.env.CLASPET_UPDATE_FEED || '',
        timeoutMs: 8000
    });
}


ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('update:check', async (event, opts) => {
    const force = !!(opts && opts.force);
    const now = Date.now();
    if (!force && updateCache.result && (now - updateCache.at) < UPDATE_CACHE_MS) {
        return Object.assign({}, updateCache.result, { cached: true, checkedAt: updateCache.at });
    }
    let result;
    try {
        result = await fetchLatestRelease(app.getVersion());
    } catch (e) {
        result = { ok: false, reason: 'network', message: updateCheck.describeFailure('network') };
    }
    result.current = app.getVersion();
    result.repo = process.env.CLASPET_UPDATE_FEED ? String(process.env.CLASPET_UPDATE_FEED) : UPDATE_REPO;
    updateCache = { at: now, result };
    return Object.assign({}, result, { cached: false, checkedAt: now });
});
ipcMain.handle('update:open', async (event, url) => {
    const u = String(url || '');
    let host = '';
    try { host = new URL(u).hostname; } catch (e) { return { ok: false, reason: 'bad-url' }; }
    const allowed = ['github.com', 'objects.githubusercontent.com', 'github-releases.githubusercontent.com', 'raw.githubusercontent.com'];
    if (!allowed.includes(host)) return { ok: false, reason: 'host-not-allowed', host };
    await shell.openExternal(u);
    return { ok: true, host };
});

/* ==========================================
   Excel(.xlsx) / CSV 导入导出：dialog + fs 全在主进程，渲染层永远不碰 Node
   ========================================== */
const XLS_HINT = '这是旧版 .xls（Excel 97-2003）格式，暂不支持直接读取。请在 Excel 里「文件 → 另存为」，选「Excel 工作簿(*.xlsx)」后重新导入。';

function ipcWindow(event) {
    try { return BrowserWindow.fromWebContents(event.sender) || mainWindow; } catch (e) { return mainWindow; }
}

function errText(err) {
    return String((err && err.message) || err || '未知错误');
}

function defaultSaveDir() {
    try { return app.getPath('documents'); } catch (e) { try { return app.getPath('home'); } catch (e2) { return __dirname; } }
}

ipcMain.handle('io:importRoster', async (event, opts) => {
    try {
        const res = await dialog.showOpenDialog(ipcWindow(event), {
            title: '导入名单（Excel / CSV）',
            buttonLabel: '导入',
            properties: ['openFile'],
            filters: [{ name: '表格', extensions: ['xlsx', 'csv'] }]
        });
        if (!res || res.canceled || !res.filePaths || !res.filePaths.length) return { ok: false, canceled: true };
        const filePath = res.filePaths[0];
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.xls') return { ok: false, error: XLS_HINT, fileName: fileName };   /* 旧二进制格式：给清晰提示 */

        const buf = fs.readFileSync(filePath);
        const parsed = (ext === '.csv' || ext === '.txt')
            ? xlsxLite.readCsv(xlsxLite.decodeTextBuffer(buf))
            : xlsxLite.readXlsx(buf);
        if (!parsed || !parsed.ok) {
            return { ok: false, error: (parsed && parsed.error) || '读取失败', fileName: fileName, filePath: filePath };
        }
        return {
            ok: true,
            rows: parsed.rows,
            source: ext === '.csv' || ext === '.txt' ? 'csv' : 'xlsx',
            sheetName: parsed.sheetName || '',
            fileName: fileName,
            filePath: filePath
        };
    } catch (err) {
        console.error('[Main IPC] io:importRoster 失败:', err);
        return { ok: false, error: '读取失败：' + errText(err) };
    }
});

/* 名单 / 台账共用：.xlsx 默认，用户把文件名写成 .csv 就导 CSV */
async function exportTable(event, payload, defaults) {
    try {
        const p = payload || {};
        const rows = p.rows || [];
        if (!Array.isArray(rows) || !rows.length) return { ok: false, error: '没有可导出的数据' };
        const sheetName = String(p.sheetName || defaults.sheetName);
        const suggested = path.basename(String(p.fileName || defaults.fileName));

        const res = await dialog.showSaveDialog(ipcWindow(event), {
            title: defaults.title,
            buttonLabel: '导出',
            defaultPath: path.join(defaultSaveDir(), suggested),
            filters: [
                { name: 'Excel 工作簿', extensions: ['xlsx'] },
                { name: 'CSV', extensions: ['csv'] }
            ]
        });
        if (!res || res.canceled || !res.filePath) return { ok: false, canceled: true };

        let filePath = res.filePath;
        let ext = path.extname(filePath).toLowerCase();
        if (ext !== '.xlsx' && ext !== '.csv') { filePath += '.xlsx'; ext = '.xlsx'; }

        if (ext === '.csv') fs.writeFileSync(filePath, xlsxLite.writeCsv(rows), 'utf8');
        else fs.writeFileSync(filePath, xlsxLite.writeXlsx(rows, { sheetName: sheetName }));

        return { ok: true, filePath: filePath, source: ext === '.csv' ? 'csv' : 'xlsx', bytes: fs.statSync(filePath).size };
    } catch (err) {
        console.error('[Main IPC] io:export 失败:', err);
        return { ok: false, error: '导出失败：' + errText(err) };
    }
}

ipcMain.handle('io:exportRoster', (event, payload) =>
    exportTable(event, payload, { title: '导出名单', fileName: '班级名单.xlsx', sheetName: '名单' }));

ipcMain.handle('io:exportLedger', (event, payload) =>
    exportTable(event, payload, { title: '导出赋分台账', fileName: '赋分台账.xlsx', sheetName: '赋分台账' }));

ipcMain.handle('db:createClass', async (event, payload) => {
    try {
        return sqliteService.createClassWithDefaults(payload || {});
    } catch (err) {
        return { success: false, error: String((err && err.message) || err) };
    }
});
ipcMain.handle('db:loadAllState', async (event, classId) => {
    try {
        return sqliteService.loadAllState(classId || 'c_class02_01');
    } catch (err) {
        console.error('[Main IPC] db:loadAllState 失败:', err);
        return null;
    }
});

ipcMain.handle('db:recordScore', async (event, payload) => {
    try {
        return sqliteService.recordScoreOperation(payload);
    } catch (err) {
        console.error('[Main IPC] db:recordScore 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:undoScore', async (event, operationId) => {
    try {
        return sqliteService.undoOperation(operationId);
    } catch (err) {
        console.error('[Main IPC] db:undoScore 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:getStudentAuditLogs', async (event, studentId) => {
    try {
        return sqliteService.getStudentAuditLogs(studentId);
    } catch (err) {
        console.error('[Main IPC] db:getStudentAuditLogs 失败:', err);
        return [];
    }
});

ipcMain.handle('db:hatchPet', async (event, payload) => {
    try {
        return sqliteService.hatchStudentPet(payload);
    } catch (err) {
        console.error('[Main IPC] db:hatchPet 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:saveStudent', async (event, { student, classId, options }) => {
    try {
        return sqliteService.saveStudent(student, classId || 'c_class02_01', options);
    } catch (err) {
        console.error('[Main IPC] db:saveStudent 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:importStudents', async (event, { students, classId }) => {
    try {
        return sqliteService.importStudents(students, classId || 'c_class02_01');
    } catch (err) {
        console.error('[Main IPC] db:importStudents 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:saveAllStudents', async (event, { students, classId }) => {
    try {
        return sqliteService.saveAllStudents(students, classId || 'c_class02_01');
    } catch (err) {
        console.error('[Main IPC] db:saveAllStudents 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:archiveStudent', async (event, { studentId, isArchived, classId }) => {
    try {
        return sqliteService.archiveStudent(studentId, isArchived, classId || 'c_class02_01');
    } catch (err) {
        console.error('[Main IPC] db:archiveStudent 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:deleteStudent', async (event, { studentId, classId }) => {
    try {
        return sqliteService.deleteStudent(studentId, classId || 'c_class02_01');
    } catch (err) {
        console.error('[Main IPC] db:deleteStudent 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:saveThresholds', async (event, { thresholds, stages, classId }) => {
    try {
        return sqliteService.saveThresholds(thresholds, stages, classId || 'c_class02_01');
    } catch (err) {
        console.error('[Main IPC] db:saveThresholds 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:saveBehaviorRules', async (event, { rules, classId }) => {
    try {
        return sqliteService.saveBehaviorRules(rules, classId || 'c_class02_01');
    } catch (err) {
        console.error('[Main IPC] db:saveBehaviorRules 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:getClassLedger', async (event, { classId, fromTs, toTs }) => {
    try {
        return sqliteService.getClassLedger(classId || 'c_class02_01', fromTs, toTs);
    } catch (err) {
        console.error('[Main IPC] db:getClassLedger 失败:', err);
        return [];
    }
});

ipcMain.handle('db:updateStudentProfile', async (event, { studentId, patch, classId }) => {
    try {
        return sqliteService.updateStudentProfile(studentId, patch || {}, classId || 'c_class02_01');
    } catch (err) {
        console.error('[Main IPC] db:updateStudentProfile 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:restoreClassBackup', async (event, { classId, payload }) => {
    try {
        return sqliteService.restoreClassBackup(classId || 'c_class02_01', payload);
    } catch (err) {
        console.error('[Main IPC] db:restoreClassBackup 失败:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:query', async (event, { sql, params }) => {
    try {
        return sqliteService.query(sql, params);
    } catch (err) {
        console.error('[Main IPC] db:query 失败:', err);
        return [];
    }
});

ipcMain.handle('db:execute', async (event, { sql, params }) => {
    try {
        return sqliteService.execute(sql, params);
    } catch (err) {
        console.error('[Main IPC] db:execute 失败:', err);
        return false;
    }
});

app.whenReady().then(async () => {
    try {
        await sqliteService.init(app);
        console.log('[Main] SQLite 服务初始化就绪！');
        try {
            const mig = sqliteService.migrateLegacyDefaultThresholds();
            if (mig && mig.migrated) console.log('[Main] 已把 ' + mig.migrated + ' 个班级的默认经验阈值升级为新默认');
            // 顺序很重要：阈值先迁到 50/100，再按新门槛把"经验不足却被当成已孵化"的宠物退回蛋
            sqliteService.migrateHatchRuleV3();
        } catch (e) { console.error('[Main] 阈值/孵化规则迁移异常:', e); }
    } catch (e) {
        console.error('[Main] SQLite 初始化发生异常:', e);
    }

    // 默认启动页 = V3 门户（离线档案：班级+姓名，D13=A）；老门户口令流程仍可用 CLASSPET_START_PAGE=portal_auth.html 启动
    const startPage = process.env.CLASSPET_START_PAGE || 'v3_portal.html';
    const startTitle = startPage.includes('display') || startPage.includes('looseleaf')
        ? 'Class Pet - 班级电子宠物管理系统 (学生大屏)'
        : (startPage.includes('teacher') ? 'Class Pet - 班级电子宠物管理系统 (教师控制台)' : 'Class Pet - 班级电子宠物管理系统 (主控制台)');
    createMainWindow(startPage, startTitle);

    // 注册全局 F11 全屏切换快捷键 (支持教室一体机全屏使用)
    globalShortcut.register('F11', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('will-quit', () => {
    if (sqliteService) {
        sqliteService.saveToDiskSync();
    }
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
