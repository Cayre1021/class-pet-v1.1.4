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
    },
    // 本地 SQLite 真实数据库访问与操作接口 (单机零配置)
    db: {
        loadAllState: (classId) => ipcRenderer.invoke('db:loadAllState', classId),
        recordScore: (payload) => ipcRenderer.invoke('db:recordScore', payload),
        undoScore: (operationId) => ipcRenderer.invoke('db:undoScore', operationId),
        getStudentAuditLogs: (studentId) => ipcRenderer.invoke('db:getStudentAuditLogs', studentId),
        hatchPet: (payload) => ipcRenderer.invoke('db:hatchPet', payload),
        saveStudent: (student, classId) => ipcRenderer.invoke('db:saveStudent', { student, classId }),
        importStudents: (students, classId) => ipcRenderer.invoke('db:importStudents', { students, classId }),
        saveAllStudents: (students, classId) => ipcRenderer.invoke('db:saveAllStudents', { students, classId }),
        archiveStudent: (studentId, isArchived, classId) => ipcRenderer.invoke('db:archiveStudent', { studentId, isArchived, classId }),
        deleteStudent: (studentId, classId) => ipcRenderer.invoke('db:deleteStudent', { studentId, classId }),
        saveThresholds: (thresholds, stages, classId) => ipcRenderer.invoke('db:saveThresholds', { thresholds, stages, classId }),
        saveBehaviorRules: (rules, classId) => ipcRenderer.invoke('db:saveBehaviorRules', { rules, classId }),
        query: (sql, params) => ipcRenderer.invoke('db:query', { sql, params }),
        execute: (sql, params) => ipcRenderer.invoke('db:execute', { sql, params })
    }
});
