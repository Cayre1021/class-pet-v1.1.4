const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
    openDisplayWindow: () => ipcRenderer.send('open-display-window'),
    openTeacherWindow: () => ipcRenderer.send('open-teacher-window'),
    openPortalWindow: () => ipcRenderer.send('open-portal-window'),
    getDisplays: () => ipcRenderer.invoke('get-displays'),
    broadcastSync: (data) => ipcRenderer.send('broadcast-sync', data),
    onBroadcastSync: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('broadcast-sync', handler);
        return () => ipcRenderer.removeListener('broadcast-sync', handler);
    }
});
