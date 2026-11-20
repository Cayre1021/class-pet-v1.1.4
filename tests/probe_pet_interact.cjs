// probe_pet_interact.cjs —— 第2条宠物互动验收（真 Electron 点击）
const { app, BrowserWindow } = require('electron');
const path = require('path'); const os = require('os');
const ROOT = path.join(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.setPath('userData', path.join(os.tmpdir(), 'cp-pet-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
let passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 260) : '')); failed++; } };

app.whenReady().then(async () => {
    console.log('== 第2条 宠物互动（三个圆圈 / 气泡 / 冷却 / 不加经验）==');
    const win = new BrowserWindow({ width: 1600, height: 900, show: false, webPreferences: { contextIsolation: true } });
    const errs = [];
    win.webContents.on('console-message', function () { const a = [].slice.call(arguments); const d = a[1]; const lvl = (typeof d === 'object' && d) ? d.level : a[1]; const msg = (typeof d === 'object' && d) ? d.message : a[2]; if (lvl === 'error' || lvl === 3) errs.push(String(msg).slice(0, 160)); });
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', 'v3_looseleaf_paper.html').replace(/\\/g, '/'));
    await sleep(1600);
    const js = c => win.webContents.executeJavaScript(c, true);

    assert(errs.length === 0, '页面加载 0 控制台错误', errs);

    // 点第一张卡片里的宠物
    const ring = await js(`(function(){
        var img = document.querySelector('.pet-card .pet-stage img');
        if (!img) return { err: 'no-pet-img' };
        img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        var r = document.querySelector('.interact-ring');
        var btns = r ? [].slice.call(r.querySelectorAll('.interact-btn')) : [];
        return { ring: !!r, btns: btns.length, keys: btns.map(function(b){ return b.getAttribute('data-pet-action'); }) };
    })()`);
    assert(ring && ring.ring === true, '点宠物弹出互动圆环', ring);
    assert(ring && ring.btns === 3 && ring.keys.join(',') === 'pat,feed,play', '圆环里有 3 个按钮（摸摸/喂食/玩耍）', ring);

    // 记录经验前后
    const expBefore = await js("(function(){var c=document.querySelector('.pet-card'); return (c.querySelector('.lv-tag')||{}).textContent;})()");

    // 点「摸摸」
    const react = await js(`(function(){
        var btn = document.querySelector('.interact-btn[data-pet-action="pat"]');
        if (!btn) return { err: 'no-btn' };
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        var bub = document.querySelector('.pet-bubble');
        var after = document.querySelector('.interact-btn[data-pet-action="pat"]');
        return { bubble: bub ? bub.textContent : null, disabled: after && after.getAttribute('aria-disabled'), cool: after && after.querySelector('.ic-cool') ? after.querySelector('.ic-cool').textContent : null };
    })()`);
    assert(typeof react.bubble === 'string' && react.bubble.length > 0, '点表情/互动后出现反应气泡：' + react.bubble, react);
    assert(react.disabled === 'true' && /^\d+$/.test(String(react.cool || '')), '该互动进入冷却（按钮禁用 + 剩余秒数）', react);

    const expAfter = await js("(function(){var c=document.querySelector('.pet-card'); return (c.querySelector('.lv-tag')||{}).textContent;})()");
    assert(expAfter === expBefore, '互动不改变等级/经验（' + expBefore + '）', { expBefore, expAfter });

    // 冷却中再点：不应再次换表情/气泡重置为同一句（允许新气泡但必须仍禁用）
    const again = await js(`(function(){
        var btn = document.querySelector('.interact-btn[data-pet-action="pat"]');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        var after = document.querySelector('.interact-btn[data-pet-action="pat"]');
        return { disabled: after && after.getAttribute('aria-disabled') };
    })()`);
    assert(again.disabled === 'true', '冷却期间重复点击仍被禁用', again);

    // 等 1.2 秒，剩余秒数应减 1 或保持（不倒增）
    const c1 = await js("(function(){var b=document.querySelector('.interact-btn[data-pet-action=\"pat\"] .ic-cool'); return b?b.textContent:null;})()");
    await sleep(1300);
    const c2 = await js("(function(){var b=document.querySelector('.interact-btn[data-pet-action=\"pat\"] .ic-cool'); return b?b.textContent:null;})()");
    assert(Number(c2) <= Number(c1), '冷却倒计时不增（' + c1 + ' → ' + c2 + '）', { c1, c2 });

    // 缺表情图时不报错、图片不炸
    const imgOk = await js("(function(){var i=document.querySelector('.pet-card .pet-stage img'); return { complete: i.complete, w: i.naturalWidth };})()");
    assert(imgOk.complete && imgOk.w > 0, '缺表情图时宠物图仍正常显示（只出气泡）', imgOk);
    assert(errs.length === 0, '交互过程 0 控制台错误', errs);
    win.destroy();
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('探针异常:', e); app.exit(2); });
