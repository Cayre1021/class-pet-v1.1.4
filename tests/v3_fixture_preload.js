// v3_fixture_preload.js —— 数据契约验收用的桩 preload：只提供只读 loadAllState，并预置账号缓存
const { contextBridge } = require('electron');
const raw = process.env.CLASSPET_FIXTURE || '{}';
let data = {};
try { data = JSON.parse(raw); } catch (e) { data = {}; }
// 账号缓存（模拟 portal_auth.html 写入的真实身份），供 core 的 getV3Identity 读取
try {
    const ls = process.env.CLASSPET_LS ? JSON.parse(process.env.CLASSPET_LS) : null;
    if (ls && typeof ls === 'object') {
        Object.keys(ls).forEach(k => { window.localStorage.setItem(k, String(ls[k])); });
    }
} catch (e) {}
contextBridge.exposeInMainWorld('electronAPI', {
    db: {
        loadAllState: async () => {
            if (data && data.__throw) throw new Error(data.__throw);
            return data;
        }
    }
});
