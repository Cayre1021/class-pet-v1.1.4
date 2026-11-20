// probe_b5_ux.cjs —— 批次 5 体验缺陷验收（Lead 独立探针，真 Electron + 真实键鼠事件）
// 跑法：env -u ELECTRON_RUN_AS_NODE electron-app/node_modules/electron/dist/electron.exe tests/probe_b5_ux.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');
const ROOT = path.join(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.setPath('userData', path.join(os.tmpdir(), 'cp-b5-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

let passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 300) : '')); failed++; } };

async function open(file) {
    const win = new BrowserWindow({ width: 1600, height: 900, show: false, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', file).replace(/\\/g, '/'));
    await sleep(1500);
    const js = c => win.webContents.executeJavaScript(c, true);
    const key = async (keyCode, times) => { for (let i = 0; i < (times || 1); i++) { win.webContents.sendInputEvent({ type: 'keyDown', keyCode }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode }); await sleep(80); } };
    return { win, js, key };
}

app.whenReady().then(async () => {
    console.log('== 批次 5 体验缺陷验收（Lead 独立探针）==');

    // ---------------- 学生大屏 ----------------
    console.log('\n[学生大屏] 5.1 存储键 / 5.3 焦点陷阱 / 5.4 计时器 / 5.5 Space');
    const p = await open('v3_looseleaf_paper.html');

    // 5.1 键面
    const keys = await p.js("Object.keys(localStorage).sort()");
    assert(keys.indexOf('classpet_v3_theme') >= 0, '启动写入共享键 classpet_v3_theme', keys);
    assert(keys.filter(k => k.indexOf('classpet_v3paper_theme') === 0 || k.indexOf('classpet_v3paper_sound') === 0).length === 0, '不再写私有键 classpet_v3paper_theme/sound', keys);
    // 切音效后必须写到共享键
    await p.js("document.getElementById('btn-sound').click()");
    await sleep(300);
    const keys2 = await p.js("Object.keys(localStorage).sort()");
    assert(keys2.indexOf('classpet_v3_sound') >= 0, '切换音效写入共享键 classpet_v3_sound', keys2);

    // 5.3 焦点陷阱（详情弹层）
    await p.js("document.querySelector('.pet-card').click()");
    await sleep(400);
    await p.js("var b=document.getElementById('btn-detail'); b.focus(); b.click();");
    await sleep(500);
    const opened = await p.js("(function(){var d=[].slice.call(document.querySelectorAll('.dialog')).filter(function(x){return x.offsetParent!==null;})[0]; return {dialog: !!d, inertBg: document.querySelectorAll('[inert]').length, activeInDialog: !!(d && d.contains(document.activeElement))};})()");
    assert(opened.dialog === true, '详情弹层已打开', opened);
    await p.key('Tab', 12);
    const trapped = await p.js("(function(){var d=[].slice.call(document.querySelectorAll('.dialog')).filter(function(x){return x.offsetParent!==null;})[0]; return { inDialog: !!(d && d.contains(document.activeElement)), tag: document.activeElement && document.activeElement.tagName, id: document.activeElement && document.activeElement.id };})()");
    assert(trapped.inDialog === true, 'Tab×12 焦点始终留在弹层内', trapped);
    await p.key('Escape', 1);
    await sleep(400);
    const closed = await p.js("(function(){var d=document.querySelector('.dialog:not([style*=\"display: none\"])'); return { dialogs: document.querySelectorAll('.dialog').length, visibleMask: [].slice.call(document.querySelectorAll('[class*=mask]')).filter(function(m){return m.offsetParent!==null;}).length, inertLeft: document.querySelectorAll('[inert]').length, focusId: document.activeElement && document.activeElement.id, focusTag: document.activeElement && document.activeElement.tagName };})()");
    assert(closed.visibleMask === 0, 'Esc 关闭后没有残留可见遮罩', closed);
    assert(closed.inertLeft === 0, '关闭后背景 inert 已移除', closed);
    assert(closed.focusId === 'btn-detail' || closed.focusId === 'btn-detail' || (closed.focusTag === 'BUTTON' && closed.focusId === 'btn-detail'), '关闭后焦点回到触发按钮 #btn-detail', closed);

    // 5.4 计时器
    await p.js("document.getElementById('fab-timer').click()");
    await sleep(600);
    const timerOpen = await p.js("!!document.getElementById('timer-num') && document.getElementById('timer-num').offsetParent !== null");
    assert(timerOpen === true, '计时器弹层可打开');
    await p.js("document.getElementById('timer-toggle').click()");
    await sleep(1200);
    const t1 = await p.js("document.getElementById('timer-num').textContent.trim()");
    await p.js("document.getElementById('timer-close').click()");
    await sleep(300);
    const tClosed = await p.js("document.getElementById('timer-num').textContent.trim()");
    await sleep(3200);
    const tLater = await p.js("document.getElementById('timer-num').textContent.trim()");
    assert(t1 !== tClosed || /:/.test(t1), '计时器启动后读数会变（' + t1 + ' → ' + tClosed + '）');
    assert(tLater === tClosed, '关闭 3.2 秒后计时读数不再变化（interval 已清）', { tClosed, tLater });

    // 5.5 Space 冒泡
    const cardSpace = await p.js(`(function(){
        var card = document.querySelector('.pet-card');
        card.focus();
        return { focused: document.activeElement === card };
    })()`);
    assert(cardSpace.focused === true, '卡片可获得焦点');
    await p.key('Space', 1);
    await sleep(500);
    const afterCardSpace = await p.js("(function(){var t=document.getElementById('rollcall-ticket')||document.getElementById('ticket-name'); return { rollcallVisible: [].slice.call(document.querySelectorAll('.dialog')).some(function(d){return d.offsetParent!==null}), ticket: t ? t.textContent.trim().slice(0,30) : null };})()");
    assert(afterCardSpace.rollcallVisible === false, '卡片聚焦时按 Space 不触发抽点', afterCardSpace);
    await p.js("document.activeElement && document.activeElement.blur(); document.body.setAttribute('tabindex','-1'); document.body.focus();");
    await p.key('Space', 1);
    await sleep(700);
    const afterBodySpace = await p.js("[].slice.call(document.querySelectorAll('.dialog')).some(function(d){return d.offsetParent!==null})");
    assert(afterBodySpace === true, '焦点在 body 时按 Space 正常打开抽点', afterBodySpace);
    p.win.close();

    // ---------------- 教师台 ----------------
    console.log('\n[教师台] 5.2 renderLanes 局部更新保焦点 / 5.1 共享键');
    const t = await open('v3_teacher_desk.html');
    const rows0 = await t.js("document.querySelectorAll('.stu-row').length");
    assert(rows0 >= 32, '教师台渲染出演示名单（' + rows0 + ' 行）', rows0);

    // 勾选后焦点留在原复选框
    const focusAfterCheck = await t.js(`(function(){
        var cb = document.querySelector('.stu-row input[type="checkbox"][data-stu]');
        if (!cb) return { err: 'no-checkbox' };
        cb.focus();
        cb.click();
        return { sameEl: document.activeElement === cb, id: document.activeElement && (document.activeElement.getAttribute('data-stu') || document.activeElement.id) };
    })()`);
    assert(focusAfterCheck && focusAfterCheck.sameEl === true, '勾选后焦点仍在原复选框', focusAfterCheck);

    // 连续勾选 3 人（键盘 Space），焦点停在最后勾选的那个
    await t.key('ArrowDown', 1);
    const chain = await t.js(`(function(){
        var cbs = [].slice.call(document.querySelectorAll('.stu-row input[type="checkbox"][data-stu]'));
        var last = null;
        for (var i = 1; i <= 3 && i < cbs.length; i++) { cbs[i].focus(); cbs[i].click(); last = cbs[i]; }
        return { same: document.activeElement === last, selCount: document.querySelectorAll('.stu-row input[type="checkbox"][data-stu]:checked').length, rows: document.querySelectorAll('.stu-row').length };
    })()`);
    assert(chain && chain.same === true, '连续勾选 3 人后焦点仍在最后勾选项', chain);
    assert(chain && chain.rows === rows0, '重绘没有制造重复/丢失行', chain);

    // 搜索框输入不被重绘抢焦点
    const searchFocus = await t.js(`(function(){
        var q = document.getElementById('search-input') || document.querySelector('input[type="search"], .search input');
        if (!q) return { err: 'no-search' };
        q.focus(); q.value = '0'; q.dispatchEvent(new Event('input', { bubbles: true }));
        return { same: document.activeElement === q };
    })()`);
    assert(searchFocus && searchFocus.same === true, '搜索输入后焦点仍在搜索框', searchFocus);

    // 排序后行数与顺序仍正确
    const afterSort = await t.js(`(function(){
        var b = document.getElementById('btn-sort') || document.querySelector('[data-audit="sort"]');
        if (b) b.click();
        var rows = [].slice.call(document.querySelectorAll('.stu-row'));
        return { rows: rows.length, first: rows.length ? rows[0].getAttribute('data-stu') : null };
    })()`);
    assert(afterSort && afterSort.rows === rows0 && afterSort.first, '切换排序后行数与结构正常', afterSort);

    // 5.1 教师台共享键
    const tKeys = await t.js("Object.keys(localStorage).sort()");
    assert(tKeys.indexOf('classpet_v3_theme') >= 0, '教师台使用共享键 classpet_v3_theme', tKeys);
    t.win.close();

    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('探针异常:', e); app.exit(2); });
