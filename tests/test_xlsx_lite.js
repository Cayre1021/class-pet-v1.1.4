// test_xlsx_lite.js —— 零依赖 xlsx/CSV 读写引擎单测（纯 node，不需要 Electron）
// 跑法: node tests/test_xlsx_lite.js
const path = require('path');
const assert = require('assert');
const xlsx = require(path.join(__dirname, '..', 'electron-app', 'xlsx_lite.js'));

let passed = 0, failed = 0;
function ok(cond, msg, extra) {
    if (cond) { console.log('  PASS  ' + msg); passed++; }
    else { console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 400) : '')); failed++; }
}
function eq(actual, expected, msg) {
    try { assert.deepStrictEqual(actual, expected); ok(true, msg); }
    catch (e) { ok(false, msg, { actual: actual, expected: expected }); }
}

/* ---------- 1. 写 -> 读 往返 ---------- */
console.log('== 1. writeXlsx -> readXlsx 往返 ==');
const basic = [
    ['学号', '姓名', '分组'],
    ['01', '陈雨桐', 1],
    ['02', '林子轩', 2],
    ['A-3', '王思远', 3]
];
const basicBuf = xlsx.writeXlsx(basic, { sheetName: '名单' });
ok(Buffer.isBuffer(basicBuf), 'writeXlsx 返回 Buffer', typeof basicBuf);
ok(basicBuf.slice(0, 2).toString('latin1') === 'PK', '产物是 zip 包（PK 头）');
const basicBack = xlsx.readXlsx(basicBuf);
ok(basicBack.ok === true, 'readXlsx 返回 ok:true', basicBack);
eq(basicBack.rows, [['学号', '姓名', '分组'], ['01', '陈雨桐', 1], ['02', '林子轩', 2], ['A-3', '王思远', 3]], '往返后内容完全一致（"01" 保留前导 0）');
ok(basicBack.sheetName === '名单', 'sheetName 中文往返正确', basicBack.sheetName);
ok(basicBuf.toString('latin1').indexOf('xl/worksheets/sheet1.xml') >= 0, 'zip 内含 xl/worksheets/sheet1.xml');
ok(basicBuf.toString('latin1').indexOf('[Content_Types].xml') >= 0, 'zip 内含 [Content_Types].xml');

/* ---------- 2. 中文 / emoji ---------- */
console.log('== 2. 中文与特殊字符 ==');
const zh = [['姓名', '备注'], ['张伟', '三年级二班 · 语文课代表'], ['李小明', '含全角标点，测试「引号」'], ['Alice 王', '🐱 emoji + tab\there']];
const zhBack = xlsx.readXlsx(xlsx.writeXlsx(zh, { sheetName: '学生名单（三年级二班）' }));
eq(zhBack.rows, zh, '中文/全角标点/emoji/tab 全部原样往返');
ok(zhBack.sheetName === '学生名单（三年级二班）', '中文+全角括号的工作表名正确', zhBack.sheetName);

/* ---------- 3. 空表 ---------- */
console.log('== 3. 空表与空行 ==');
const emptyBack = xlsx.readXlsx(xlsx.writeXlsx([], { sheetName: '空表' }));
ok(emptyBack.ok === true, '空表也能生成合法 xlsx', emptyBack);
eq(emptyBack.rows, [], '空表读回 0 行');
const blankRows = xlsx.readXlsx(xlsx.writeXlsx([['a', '', 'c'], ['', '', '']]));
eq(blankRows.rows, [['a', '', 'c']], '末尾空行被裁掉，中间空格保留（补成矩形）');

/* ---------- 4. 数字 / 负数 / 小数 ---------- */
console.log('== 4. 数字与负数 ==');
const nums = [['名称', '分值'], ['加分', 5], ['扣分', -5], ['零', 0], ['小数', 3.25], ['大数', 1234567], ['文本数字', '007']];
const numsBack = xlsx.readXlsx(xlsx.writeXlsx(nums));
eq(numsBack.rows, nums, '整数/负数/0/小数/大数仍是 number，"007" 仍是字符串');

/* ---------- 5. 逗号 / 引号 / 换行 ---------- */
console.log('== 5. 逗号、引号、换行 ==');
const tricky = [
    ['a,b', 'say "hi"', 'line1\nline2'],
    ['=1+1', '@cmd', ' 前后空格 '],
    ['制表\t符', '结尾空格 ', '<b>不是标签</b>']
];
const trickyBack = xlsx.readXlsx(xlsx.writeXlsx(tricky));
eq(trickyBack.rows, tricky, '逗号/双引号/换行/公式文本/首尾空格 全部保真');

/* ---------- 6. 100 行 ---------- */
console.log('== 6. 100 行 ==');
const big = [['序号', '姓名', '分值']];
for (let i = 1; i <= 100; i++) big.push([i, '学生' + i, (i % 7) - 3]);
const bigBuf = xlsx.writeXlsx(big, { sheetName: '百人名单' });
const bigBack = xlsx.readXlsx(bigBuf);
ok(bigBack.ok === true && bigBack.rows.length === 101, '100 行数据 + 表头共 101 行', bigBack.rows && bigBack.rows.length);
eq(bigBack.rows, big, '100 行内容逐行一致');
ok(bigBuf.length < 200 * 1024, '100 行文件体积合理（<200KB，实际 ' + bigBuf.length + ' 字节）', bigBuf.length);

/* ---------- 7. 损坏 / 非 xlsx 输入不得抛异常 ---------- */
console.log('== 7. 损坏输入返回 ok:false ==');
const badCases = [
    ['纯文本', Buffer.from('这不是 xlsx，只是一段普通文本内容而已', 'utf8')],
    ['空 Buffer', Buffer.alloc(0)],
    ['大段随机字节', require('crypto').randomBytes(4096)],
    ['截断的真 xlsx', basicBuf.slice(0, 300)],
    ['被截掉 zip 目录的 xlsx', basicBuf.slice(0, basicBuf.length - 400)],
    ['旧版 .xls 头（OLE2）', Buffer.concat([Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), Buffer.alloc(600)])]
];
let threw = null;
for (const [label, buf] of badCases) {
    let r;
    try { r = xlsx.readXlsx(buf); } catch (e) { threw = label + ': ' + e.message; r = null; }
    ok(r && r.ok === false && typeof r.error === 'string' && r.error.length > 0, label + ' -> {ok:false, error}', r);
}
ok(threw === null, '损坏输入一个都没抛异常（全部走返回值）', threw);
const xlsMsg = xlsx.readXlsx(badCases[5][1]);
ok(/\.xls/.test(xlsMsg.error) && /另存为/.test(xlsMsg.error), '.xls 提示里说清「另存为」导出建议', xlsMsg.error);
ok(xlsx.readXlsx(null).ok === false, 'readXlsx(null) 返回 ok:false 而不是崩溃', xlsx.readXlsx(null));

/* ---------- 8. 读真实世界形态：inlineStr / 富文本 / 布尔 / 公式结果 / 列空缺 ---------- */
console.log('== 8. 读各种单元格形态 ==');
const sheetXml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    '<row r="1"><c r="A1" t="inlineStr"><is><t>内联字符串</t></is></c><c r="B1" t="inlineStr"><is><t xml:space="preserve"> 保留空格 </t></is></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>0</v></c><c r="C2"><v>-12.5</v></c><c r="D2" t="b"><v>1</v></c></row>' +
    '<row r="3"><c r="A3" t="str"><v>公式结果</v></c><c r="B3" t="e"><v>#N/A</v></c></row>' +
    '<row r="4"/>' +
    '</sheetData></worksheet>';
const sstXml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">' +
    '<si><r><t>富文本</t></r><r><t>拼接</t></r></si></sst>';
const custom = xlsx.buildZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="数据&amp;汇总" sheetId="1" r:id="rId9"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/data.xml"/></Relationships>' },
    { name: 'xl/worksheets/data.xml', data: sheetXml },
    { name: 'xl/sharedStrings.xml', data: sstXml }
]);
const customBack = xlsx.readXlsx(custom);
ok(customBack.ok === true, '手工构造的 xlsx 能读（工作表不在 sheet1.xml 也能按 rels 找到）', customBack);
eq(customBack.rows, [
    ['内联字符串', ' 保留空格 ', '', ''],
    ['富文本拼接', '', -12.5, true],
    ['公式结果', '#N/A', '', '']
], 'inlineStr / 共享字符串(富文本) / 数字 / 布尔 / 错误值 / 列空缺 / 空行 全部正确');
ok(customBack.sheetName === '数据&汇总', '工作表名 XML 实体被反转义', customBack.sheetName);

/* ---------- 9. 对象行 -> 表头 ---------- */
console.log('== 9. 对象数组自动加表头 ==');
const objBack = xlsx.readXlsx(xlsx.writeXlsx([{ 学号: '01', 姓名: '陈雨桐' }, { 学号: '02', 姓名: '林子轩' }]));
eq(objBack.rows, [['学号', '姓名'], ['01', '陈雨桐'], ['02', '林子轩']], '对象数组把键名当表头写出');

/* ---------- 10. CSV 往返 + BOM ---------- */
console.log('== 10. CSV 往返与 BOM ==');
const csvRows = [['时间', '学号', '姓名', '分值'], ['09:12', '01', '陈雨桐', 5], ['09:13', '02', '林子轩', -3]];
const csvText = xlsx.writeCsv(csvRows);
ok(csvText.charAt(0) === '\ufeff', 'writeCsv 开头带 UTF-8 BOM（Excel 打开不乱码）');
ok(Buffer.from(csvText, 'utf8').slice(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF])), 'BOM 落成 EF BB BF 三字节');
const csvBack = xlsx.readCsv(csvText);
ok(csvBack.ok === true, 'readCsv 返回 ok:true', csvBack);
eq(csvBack.rows, [['时间', '学号', '姓名', '分值'], ['09:12', '01', '陈雨桐', '5'], ['09:13', '02', '林子轩', '-3']], 'CSV 往返一致（CSV 一律返回字符串）');
eq(xlsx.readCsv(xlsx.writeCsv([['+5']])).rows, [["'+5"]], '与页面既有行为一致：CSV 里以 + 开头的单元格被加上单引号（公式注入防护）');
eq(xlsx.readCsv('a,"b,c","他说""好"""\r\n1,2,3').rows, [['a', 'b,c', '他说"好"'], ['1', '2', '3']], '引号包裹的逗号/双写引号正确解析，CRLF 兼容');
ok(xlsx.writeCsv([['a,b', 'c"d', 'e\nf']]).indexOf('"a,b","c""d","e\nf"') > 0, '含逗号/引号/换行的单元格被引号包裹转义');
ok(xlsx.writeCsv([['=SUM(A1)', '@cmd', '-3']]).indexOf("'=SUM(A1),'@cmd,-3") > 0, '公式注入防护：= / @ 前缀加单引号，纯数字 -3 不加');
eq(xlsx.readCsv(xlsx.writeCsv([])).rows, [], '空表 CSV 往返为空');
eq(xlsx.readCsv('a,b\n\n  ,  \n').rows, [['a', 'b']], 'CSV 全空行被过滤（与页面既有行为一致）');
eq(xlsx.readCsv('第一行,\n第二行,2').rows.length, 2, 'readCsv 无 BOM 也能读');

/* ---------- 11. GBK 编码的 CSV 兜底 ---------- */
console.log('== 11. 编码兜底 ==');
const utf8Buf = Buffer.from('\ufeff学号,姓名\r\n01,陈雨桐', 'utf8');
ok(xlsx.decodeTextBuffer(utf8Buf).indexOf('陈雨桐') > 0, 'UTF-8(带BOM) 文件正确解码');
/* 中文 Windows 版 Excel 存 CSV 默认 GBK："学号,姓名\r\n01,陈雨桐" 的 GBK 字节（python: '...'.encode('gbk').hex()） */
const gbkBuf = Buffer.concat([
    Buffer.from('d1a7bac52cd0d5c3fb', 'hex'), Buffer.from([13, 10]),
    Buffer.from('30312cb3c2d3eacda9', 'hex')
]);
const gbkText = xlsx.decodeTextBuffer(gbkBuf);
ok(gbkText.indexOf('学号,姓名') === 0 && gbkText.indexOf('陈雨桐') > 0, 'GBK 编码的 CSV 退路解码出正确中文', gbkText);
eq(xlsx.readCsv(gbkText).rows, [['学号', '姓名'], ['01', '陈雨桐']], 'GBK CSV 走 readCsv 得到正确名单');

console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
