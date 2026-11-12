const { app, BrowserWindow } = require('electron');
const path = require('path');
app.setPath('userData', path.join(app.getPath('temp'), 'classpet-revision-preview'));
app.whenReady().then(() => {
  const window = new BrowserWindow({width:1600,height:1000,minWidth:390,minHeight:640,autoHideMenuBar:true,title:'Class Pet - Design Preview',backgroundColor:'#f1f5f2',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.loadFile(path.resolve(__dirname, '../../design/revision-preview.html'), {hash:'login'});
});
app.on('window-all-closed', () => app.quit());
