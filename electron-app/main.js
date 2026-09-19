const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');

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
    navigateMainWindow('display_bigscreen_touch_pro.html', 'Class Pet - 班级电子宠物管理系统 (学生大屏)');
});

ipcMain.on('open-teacher-window', () => {
    navigateMainWindow('teacher_panel_touch_pro.html', 'Class Pet - 班级电子宠物管理系统 (教师控制台)');
});

ipcMain.on('open-portal-window', () => {
    navigateMainWindow('portal_auth.html', 'Class Pet - 班级电子宠物管理系统 (主控制台)');
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

app.whenReady().then(() => {
    createMainWindow();

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
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
