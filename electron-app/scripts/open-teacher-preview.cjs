const { app, BrowserWindow } = require('electron');
const path = require('path');

app.setPath('userData', path.join(app.getPath('temp'), 'classpet-teacher-preview'));
app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 760,
    minHeight: 640,
    autoHideMenuBar: true,
    title: 'Class Pet - 教师控制台三案预览',
    backgroundColor: '#f4f3ef',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  window.loadFile(path.resolve(__dirname, '../../design/teacher-preview.html'));
});
app.on('window-all-closed', () => app.quit());
