// probe_xlsx_io.cjs —— 用真实 main.js + 真实 preload 验证 io:exportRoster / io:importRoster / io:exportLedger
// 桩掉 dialog（只换返回值），其余全走真实主进程：fs 落盘 -> 真 xlsx -> 再读回
// 跑法: env -u ELECTRON_RUN_AS_NODE "electron-app/node_modules/electron/dist/electron.exe" tests/probe_xlsx_io.cjs
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { app, BrowserWindow, dialog } = require('electron');

const ROOT = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-xlsxio-'));

app.setPath('userData', path.join(TMP, 'userdata'));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

/* ---- dialog 桩：只替换「弹窗」这一步，返回临时路径 ---- */
let nextOpen = null;
let nextSave = null;
dialog.showOpenDialog = async () => (nextOpen ? { canceled: false, filePaths: [nextOpen] } : { canceled: true, filePaths: [] });
dialog.showSaveDialog = async () => (nextSave ? { canceled: false, filePath: nextSave } : { canceled: true, filePath: '' });

const xlsxLite = require(path.join(ROOT, 'electron-app', 'xlsx_lite.js'));
const dbPath = path.join(ROOT, 'database', 'classpet.sqlite');
const dbHashBefore = crypto.createHash('md5').update(fs.readFileSync(dbPath)).digest('hex');

require(path.join(ROOT, 'electron-app', 'main.js'));   // 真实主进程

let passed = 0, failed = 0;
const ok = (c, m, x) => {
    if (c) { console.log('  PASS  ' + m); passed++; }
    else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 400) : '')); failed++; }
};

const ROSTER = [
    ['学号', '姓名', '分组', '宠物'],
    ['01', '陈雨桐', 1, 'cat'],
    ['02', '林子轩', 2, 'dog'],
    ['03', '王思远', 1, 'bunny'],
    ['04', '张伟，小张', 3, 'fox'],
    ['05', '含"引号"的名字', 4, 'bird']
];
const LEDGER = [
    ['时间', '学号', '姓名', '规则 / 事由', '学科', '分值', '状态'],
    ['09:12', '01', '陈雨桐', '课堂回答正确', '语文', 5, '有效'],
    ['09:20', '02', '林子轩', '作业未交', '数学', -3, '有效'],
    ['09:31', '01', '陈雨桐', '小组合作', '英语', 2, '已撤销']
];

app.whenReady().then(async () => {
    await sleep(3000);                                     // 等 main.js 自己建窗口 + 初始化 sqlite

    const win = new BrowserWindow({
        width: 900, height: 600, show: false,
        webPreferences: {
            preload: path.join(ROOT, 'electron-app', 'preload.js'),
            contextIsolation: true, nodeIntegration: false
        }
    });
    const pagePath = path.join(TMP, 'probe.html');
    fs.writeFileSync(pagePath, '<!doctype html><meta charset="utf-8"><body>io probe</body>', 'utf8');
    await win.loadFile(pagePath);
    await sleep(400);
    const js = (code) => win.webContents.executeJavaScript(code, true);

    ok(await js("typeof window.electronAPI.io === 'object'"), 'preload 暴露了 window.electronAPI.io');
    ok(await js("['importRoster','exportRoster','exportLedger'].every(function(k){return typeof window.electronAPI.io[k] === 'function';})"),
        'io 上三个方法都是函数（importRoster / exportRoster / exportLedger）');
    ok(await js("typeof require === 'undefined' && typeof process === 'undefined'"), '渲染层确实拿不到 Node（contextIsolation 生效）');

    /* ---------- 1. exportRoster -> 真 .xlsx ---------- */
    console.log('== 1. io:exportRoster 落盘真 xlsx ==');
    const xlsxPath = path.join(TMP, '班级名单.xlsx');
    nextSave = xlsxPath;
    const exp = await js('window.electronAPI.io.exportRoster(' + JSON.stringify({ rows: ROSTER, fileName: '班级名单.xlsx', sheetName: '名单' }) + ')');
    ok(exp && exp.ok === true, 'exportRoster 返回 ok:true', exp);
    ok(exp && exp.filePath === xlsxPath, '落盘路径 = 保存对话框返回的路径', exp && exp.filePath);
    ok(fs.existsSync(xlsxPath), '文件真的写到了磁盘');
    const buf = fs.readFileSync(xlsxPath);
    ok(buf[0] === 0x50 && buf[1] === 0x4B, '文件头是 PK（合法 zip/xlsx）', buf.slice(0, 4).toString('hex'));
    ok(buf.toString('latin1').indexOf('xl/worksheets/sheet1.xml') > 0, 'zip 内含 xl/worksheets/sheet1.xml');
    ok(exp && exp.bytes === buf.length && buf.length > 500, '返回的字节数与文件一致（' + buf.length + ' 字节）', exp && exp.bytes);
    const diskRows = xlsxLite.readXlsx(buf);
    ok(diskRows.ok === true, '落盘的 xlsx 能被 readXlsx 读回', diskRows);
    ok(JSON.stringify(diskRows.rows) === JSON.stringify(ROSTER), '落盘的 xlsx 内容与导出数据一致（含中文/逗号/引号）', diskRows.rows && diskRows.rows.length);
    ok(diskRows.sheetName === '名单', '工作表名正确（名单）', diskRows.sheetName);

    /* ---------- 2. importRoster <- 同一个 xlsx ---------- */
    console.log('== 2. io:importRoster 读回同样数据 ==');
    nextOpen = xlsxPath;
    const imp = await js('window.electronAPI.io.importRoster()');
    ok(imp && imp.ok === true, 'importRoster 返回 ok:true', imp);
    ok(imp && imp.source === 'xlsx', "source 标记为 'xlsx'", imp && imp.source);
    ok(imp && imp.fileName === '班级名单.xlsx', '回传了文件名', imp && imp.fileName);
    ok(imp && JSON.stringify(imp.rows) === JSON.stringify(ROSTER), '导入的 rows 与导出时的完全一致（写->读闭环）', imp && imp.rows);

    /* ---------- 3. exportLedger -> 真 xlsx ---------- */
    console.log('== 3. io:exportLedger 落盘真 xlsx ==');
    const ledgerPath = path.join(TMP, '赋分台账.xlsx');
    nextSave = ledgerPath;
    const expL = await js('window.electronAPI.io.exportLedger(' + JSON.stringify({ rows: LEDGER, fileName: '赋分台账.xlsx' }) + ')');
    ok(expL && expL.ok === true && fs.existsSync(ledgerPath), 'exportLedger 返回 ok:true 且文件存在', expL);
    const ledgerRows = xlsxLite.readXlsx(fs.readFileSync(ledgerPath));
    ok(ledgerRows.ok === true && ledgerRows.sheetName === '赋分台账', "默认工作表名就是「赋分台账」（没传 sheetName 时用默认）", ledgerRows.sheetName);
    ok(JSON.stringify(ledgerRows.rows) === JSON.stringify(LEDGER), '台账内容往返一致（含 -3 负分与中文规则）', ledgerRows.rows);

    /* ---------- 4. 用户把名字写成 .csv 就导 CSV ---------- */
    console.log('== 4. 导出 CSV（含 BOM）==');
    const csvPath = path.join(TMP, '班级名单.csv');
    nextSave = csvPath;
    const expC = await js('window.electronAPI.io.exportRoster(' + JSON.stringify({ rows: ROSTER, fileName: '班级名单.csv' }) + ')');
    ok(expC && expC.ok === true && expC.source === 'csv', "选 .csv 时走 CSV 分支（source='csv'）", expC);
    const csvBuf = fs.readFileSync(csvPath);
    ok(csvBuf[0] === 0xEF && csvBuf[1] === 0xBB && csvBuf[2] === 0xBF, 'CSV 文件带 UTF-8 BOM（Excel 打开不乱码）', csvBuf.slice(0, 3).toString('hex'));
    const csvText = csvBuf.toString('utf8').replace(/^\ufeff/, '');
    ok(csvText.indexOf('学号,姓名,分组,宠物') === 0, 'CSV 首行是表头', csvText.split(/\r?\n/)[0]);
    nextOpen = csvPath;
    const impC = await js('window.electronAPI.io.importRoster()');
    ok(impC && impC.ok === true && impC.source === 'csv', "CSV 也能读回（source='csv'）", impC);
    ok(impC && impC.rows && impC.rows[1] && impC.rows[1][1] === '陈雨桐', 'CSV 读回的中文正确', impC && impC.rows && impC.rows[1]);

    /* ---------- 5. 补充扩展名时自动补 .xlsx ---------- */
    console.log('== 5. 只写文件名就自动补 .xlsx ==');
    nextSave = path.join(TMP, '没写扩展名');
    const expNoExt = await js('window.electronAPI.io.exportRoster(' + JSON.stringify({ rows: ROSTER }) + ')');
    ok(expNoExt && expNoExt.ok === true && /\.xlsx$/.test(expNoExt.filePath), '没有扩展名时自动补成 .xlsx', expNoExt && expNoExt.filePath);
    ok(expNoExt && fs.existsSync(expNoExt.filePath) && xlsxLite.readXlsx(fs.readFileSync(expNoExt.filePath)).ok === true,
        '自动补扩展名后的文件仍是可读 xlsx');

    /* ---------- 6. 旧版 .xls 与损坏文件：给清晰提示，不崩 ---------- */
    console.log('== 6. .xls / 损坏文件给清晰提示 ==');
    const xlsPath = path.join(TMP, '旧名单.xls');
    fs.writeFileSync(xlsPath, Buffer.concat([Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), Buffer.alloc(800)]));
    nextOpen = xlsPath;
    const impXls = await js('window.electronAPI.io.importRoster()');
    ok(impXls && impXls.ok === false, '.xls 导入返回 ok:false（不抛异常、不假装成功）', impXls);
    ok(impXls && /\.xls/.test(impXls.error) && /另存为/.test(impXls.error), '.xls 的提示明确要求「另存为 .xlsx」', impXls && impXls.error);

    const brokenPath = path.join(TMP, '坏文件.xlsx');
    fs.writeFileSync(brokenPath, Buffer.from('这不是一个 Excel 文件，只是一段文本', 'utf8'));
    nextOpen = brokenPath;
    const impBad = await js('window.electronAPI.io.importRoster()');
    ok(impBad && impBad.ok === false && typeof impBad.error === 'string' && impBad.error.length > 0, '损坏的 .xlsx 返回 ok:false + 错误说明', impBad);

    /* ---------- 7. 取消 / 空数据 ---------- */
    console.log('== 7. 取消与空数据 ==');
    nextOpen = null;
    const impCancel = await js('window.electronAPI.io.importRoster()');
    ok(impCancel && impCancel.ok === false && impCancel.canceled === true, '用户取消打开对话框 -> canceled:true', impCancel);
    nextSave = null;
    const expCancel = await js('window.electronAPI.io.exportRoster(' + JSON.stringify({ rows: ROSTER }) + ')');
    ok(expCancel && expCancel.ok === false && expCancel.canceled === true, '用户取消保存对话框 -> canceled:true', expCancel);
    nextSave = path.join(TMP, '空.xlsx');
    const expEmpty = await js('window.electronAPI.io.exportRoster({ rows: [] })');
    ok(expEmpty && expEmpty.ok === false && !fs.existsSync(path.join(TMP, '空.xlsx')), '空数据不落盘空文件，直接返回 ok:false', expEmpty);

    /* ---------- 8. GBK 编码的 CSV（中文 Windows Excel 默认） ---------- */
    console.log('== 8. GBK CSV ==');
    const gbkPath = path.join(TMP, 'gbk名单.csv');
    fs.writeFileSync(gbkPath, Buffer.concat([
        Buffer.from('d1a7bac52cd0d5c3fb', 'hex'), Buffer.from([13, 10]),
        Buffer.from('30312cb3c2d3eacda9', 'hex')
    ]));
    nextOpen = gbkPath;
    const impGbk = await js('window.electronAPI.io.importRoster()');
    ok(impGbk && impGbk.ok === true && impGbk.source === 'csv', 'GBK 的 CSV 能导入', impGbk);
    ok(impGbk && JSON.stringify(impGbk.rows) === JSON.stringify([['学号', '姓名'], ['01', '陈雨桐']]), 'GBK 中文没有乱码', impGbk && impGbk.rows);

    /* ---------- 9. 不动正式库 ---------- */
    const dbHashAfter = crypto.createHash('md5').update(fs.readFileSync(dbPath)).digest('hex');
    ok(dbHashAfter === dbHashBefore, 'database/classpet.sqlite 原件未被改动');
    ok(BrowserWindow.getAllWindows().length >= 1, 'main.js 自己那个主窗口仍在（探针没干扰应用启动）', BrowserWindow.getAllWindows().length);

    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    try { win.destroy(); } catch (e) {}
    /* Chromium 还占着 userData 缓存，删不掉就交给系统清理临时目录，绝不因此判失败 */
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
    app.exit(failed === 0 ? 0 : 1);
}).catch((e) => {
    console.error('探针异常:', e && e.stack || e);
    app.exit(2);
});
