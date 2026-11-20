const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const sqliteService = require('./sqlite_service.js');

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

ipcMain.handle('db:saveStudent', async (event, { student, classId }) => {
    try {
        return sqliteService.saveStudent(student, classId || 'c_class02_01');
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
    } catch (e) {
        console.error('[Main] SQLite 初始化发生异常:', e);
    }

    const startPage = process.env.CLASSPET_START_PAGE || 'portal_auth.html';
    const startTitle = startPage.includes('display') ? 'Class Pet - 班级电子宠物管理系统 (学生大屏)' : 'Class Pet - 班级电子宠物管理系统 (主控制台)';
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
