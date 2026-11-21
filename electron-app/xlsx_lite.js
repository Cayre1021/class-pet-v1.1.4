'use strict';
/* xlsx_lite.js —— 零依赖的最小 Excel(.xlsx) 读写 + CSV 读写
 *
 * 只依赖 Node 内置 zlib：自己拼 zip（中央目录 + 本地头 + CRC32），
 * 自己生成/解析 SpreadsheetML（[Content_Types].xml / _rels / workbook / sheet / sharedStrings / styles）。
 *
 * 约定：
 *   writeXlsx(rows, { sheetName }) -> Buffer          真 xlsx，Excel 可直接双击打开
 *   readXlsx(buffer)               -> { ok:true, sheetName, rows } | { ok:false, error }
 *   writeCsv(rows)                 -> string（带 UTF-8 BOM，Excel 打开不乱码）
 *   readCsv(text)                  -> { ok:true, rows } | { ok:false, error }
 *   rows 一律是「行数组的数组」；也接受「对象数组」（第一行的键自动当表头）。
 *
 * 保真原则：不猜。字符串原样走 sharedStrings（"007" 仍是 "007"），
 * 只有真正的 JS number / boolean 才写成数值/布尔单元格。
 * 任何损坏输入都返回 { ok:false, error }，绝不抛异常给调用方。
 */

const zlib = require('zlib');
const path = require('path');

/* ============================================================
   1. CRC32 与 zip 打包（store / deflate 二选一，取小的那个）
   ============================================================ */
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  CRC_TABLE = t;
  return t;
}

function crc32(buf) {
  const t = crcTable();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* DOS 时间戳固定为 1980-01-01 00:00，输出可复现（同样内容 -> 同样字节） */
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

function buildZip(files) {
  const entries = (files || []).map((f) => {
    const nameBuf = Buffer.from(String(f.name), 'utf8');
    const raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data == null ? '' : f.data), 'utf8');
    const packed = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = packed.length < raw.length;
    return {
      name: nameBuf,
      raw,
      data: useDeflate ? packed : raw,
      method: useDeflate ? 8 : 0,
      crc: crc32(raw)
    };
  });

  const parts = [];
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);      /* version needed */
    local.writeUInt16LE(0x0800, 6);  /* flags: 文件名 UTF-8 */
    local.writeUInt16LE(e.method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(e.crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.raw.length, 22);
    local.writeUInt16LE(e.name.length, 26);
    local.writeUInt16LE(0, 28);      /* extra len */
    parts.push(local, e.name, e.data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);        /* version made by */
    dir.writeUInt16LE(20, 6);        /* version needed */
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(e.method, 10);
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(e.crc, 16);
    dir.writeUInt32LE(e.data.length, 20);
    dir.writeUInt32LE(e.raw.length, 24);
    dir.writeUInt16LE(e.name.length, 28);
    dir.writeUInt16LE(0, 30);        /* extra */
    dir.writeUInt16LE(0, 32);        /* comment */
    dir.writeUInt16LE(0, 34);        /* disk start */
    dir.writeUInt16LE(0, 36);        /* internal attrs */
    dir.writeUInt32LE(0, 38);        /* external attrs */
    dir.writeUInt32LE(offset, 42);
    central.push(dir, e.name);

    offset += 30 + e.name.length + e.data.length;
  }

  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat(parts.concat([cd, eocd]));
}

/* ============================================================
   2. zip 解包（只读中央目录；支持 store / deflate）
   ============================================================ */
const ZIP_ERRORS = {
  notZip: '这不是有效的 .xlsx 文件（不是 zip 压缩包，可能已损坏或其实是别的格式）',
  oldXls: '这是旧版 .xls（Excel 97-2003 二进制）格式，暂不支持直接读取，请在 Excel 里「另存为」.xlsx 后再导入',
  truncated: 'Excel 文件已损坏或不完整（zip 目录缺失）',
  noSheet: '这个 Excel 文件里没有找到工作表数据'
};

class ZipError extends Error {
  constructor(code) { super(ZIP_ERRORS[code] || code); this.code = code; }
}

function findEocd(buf) {
  const min = Math.max(0, buf.length - 66560);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

function readZip(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 32) throw new ZipError('notZip');
  /* OLE2 复合文档头 = 旧版 .xls */
  if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) throw new ZipError('oldXls');
  if (!(buf[0] === 0x50 && buf[1] === 0x4B)) throw new ZipError('notZip');

  const eocdAt = findEocd(buf);
  if (eocdAt < 0) throw new ZipError('truncated');
  const total = buf.readUInt16LE(eocdAt + 10);
  const cdOffset = buf.readUInt32LE(eocdAt + 16);
  if (cdOffset >= buf.length) throw new ZipError('truncated');

  const files = new Map();
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new ZipError('truncated');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localAt = buf.readUInt32LE(p + 42);
    if (csize === 0xFFFFFFFF || usize === 0xFFFFFFFF || localAt === 0xFFFFFFFF) throw new ZipError('truncated');
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    if (localAt + 30 > buf.length || buf.readUInt32LE(localAt) !== 0x04034b50) throw new ZipError('truncated');
    const lNameLen = buf.readUInt16LE(localAt + 26);
    const lExtraLen = buf.readUInt16LE(localAt + 28);
    const start = localAt + 30 + lNameLen + lExtraLen;
    const raw = buf.slice(start, start + csize);
    if (raw.length !== csize) throw new ZipError('truncated');

    let data;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) {
      try { data = zlib.inflateRawSync(raw); }
      catch (e) { throw new ZipError('truncated'); }
    } else throw new ZipError('truncated');

    if (!files.has(name)) files.set(name, data);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/* ============================================================
   3. XML 文本工具
   ============================================================ */
const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

function escapeXml(s) {
  return String(s)
    .replace(XML_BAD, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/\r/g, '&#13;')   /* 保证单元格里的换行原样回来 */
    .replace(/\n/g, '&#10;');
}

function unescapeXml(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => safeCodePoint(parseInt(h, 16), m))
    .replace(/&#(\d+);/g, (m, d) => safeCodePoint(parseInt(d, 10), m))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function safeCodePoint(n, fallback) {
  if (!Number.isFinite(n) || n < 0 || n > 0x10FFFF) return fallback;
  try { return String.fromCodePoint(n); } catch (e) { return fallback; }
}

/* <t>文本</t> 全部拼起来（兼容富文本 <r><t>…</t></r> 与 xml:space="preserve"） */
function collectText(xml) {
  const re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
  let out = '';
  let m;
  while ((m = re.exec(xml))) out += unescapeXml(m[1] || '');
  return out;
}

function readTextFile(files, name) {
  const b = files.get(name);
  return b ? b.toString('utf8') : '';
}

/* ============================================================
   4. 单元格地址
   ============================================================ */
function colName(index) {
  let i = index + 1;
  let s = '';
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function colIndex(letters) {
  let n = 0;
  const s = String(letters || '').toUpperCase();
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return Math.max(0, n - 1);
}

/* ============================================================
   5. 行数组规整（数组行 / 对象行都吃）
   ============================================================ */
function cellValue(v) {
  if (v === null || v === undefined) return '';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function normalizeRows(rows) {
  const src = Array.isArray(rows) ? rows : [];
  if (!src.length) return [];
  const first = src[0];
  const objectRows = !!first && typeof first === 'object' && !Array.isArray(first) && !(first instanceof Date);
  const keys = objectRows ? Object.keys(first) : null;
  const out = [];
  if (objectRows) out.push(keys.slice());
  for (const r of src) {
    if (Array.isArray(r)) out.push(r.map(cellValue));
    else if (r && typeof r === 'object' && !(r instanceof Date)) out.push(keys.map((k) => cellValue(r[k])));
    else out.push([cellValue(r)]);
  }
  return out;
}

function matrixWidth(matrix) {
  let w = 0;
  for (const r of matrix) if (r.length > w) w = r.length;
  return w;
}

/* ============================================================
   6. 写 xlsx
   ============================================================ */
function sanitizeSheetName(name) {
  let s = String(name == null ? '' : name).replace(/[\\/?*[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim();
  if (!s) s = 'Sheet1';
  if (s.length > 31) s = s.slice(0, 31);
  return s;
}

function writeXlsx(rows, opts) {
  const options = opts || {};
  const sheetName = sanitizeSheetName(options.sheetName || '名单');
  const matrix = normalizeRows(rows);
  const width = matrixWidth(matrix);

  /* ---- sharedStrings ---- */
  const shared = [];
  const sharedAt = new Map();
  function sharedId(text) {
    const s = String(text);
    if (sharedAt.has(s)) return sharedAt.get(s);
    const id = shared.length;
    shared.push(s);
    sharedAt.set(s, id);
    return id;
  }

  /* ---- sheet1.xml ---- */
  let totalStrings = 0;
  const rowsXml = matrix.map((row, ri) => {
    const cells = [];
    for (let ci = 0; ci < width; ci++) {
      const v = row[ci];
      if (v === undefined || v === null || v === '') continue;
      const ref = colName(ci) + (ri + 1);
      const bold = ri === 0 ? ' s="1"' : '';   /* 表头加粗 */
      if (typeof v === 'number' && Number.isFinite(v)) {
        cells.push('<c r="' + ref + '"' + bold + '><v>' + v + '</v></c>');
      } else if (typeof v === 'boolean') {
        cells.push('<c r="' + ref + '"' + bold + ' t="b"><v>' + (v ? 1 : 0) + '</v></c>');
      } else {
        totalStrings++;
        cells.push('<c r="' + ref + '"' + bold + ' t="s"><v>' + sharedId(String(v)) + '</v></c>');
      }
    }
    return '<row r="' + (ri + 1) + '">' + cells.join('') + '</row>';
  }).join('');

  const cols = width > 0
    ? '<cols><col min="1" max="' + width + '" width="16" customWidth="1"/></cols>'
    : '';
  const pane = matrix.length > 1
    ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
      '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>'
    : '';

  const sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetViews><sheetView workbookViewId="0">' + pane + '</sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="16.5"/>' +
    cols +
    '<sheetData>' + rowsXml + '</sheetData>' +
    '</worksheet>';

  const sstXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + totalStrings +
    '" uniqueCount="' + shared.length + '">' +
    shared.map((t) => {
      const preserve = /^\s|\s$|[\n\r\t]/.test(t) ? ' xml:space="preserve"' : '';
      return '<si><t' + preserve + '>' + escapeXml(t) + '</t></si>';
    }).join('') +
    '</sst>';

  const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="宋体"/><family val="3"/><charset val="134"/></font>' +
    '<font><b/><sz val="11"/><name val="宋体"/><family val="3"/><charset val="134"/></font>' +
    '</fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    '</Types>';

  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="' + escapeXml(sheetName) + '" sheetId="1" r:id="rId1"/></sheets>' +
    '</workbook>';

  const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
    '</Relationships>';

  return buildZip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml },
    { name: 'xl/sharedStrings.xml', data: sstXml },
    { name: 'xl/styles.xml', data: stylesXml }
  ]);
}

/* ============================================================
   7. 读 xlsx
   ============================================================ */
function parseSharedStrings(xml) {
  const list = [];
  const re = /<si\b[^>]*(?:\/>|>([\s\S]*?)<\/si>)/g;
  let m;
  while ((m = re.exec(xml))) list.push(collectText(m[1] || ''));
  return list;
}

function sheetPathOf(files) {
  const wb = readTextFile(files, 'xl/workbook.xml');
  const rels = readTextFile(files, 'xl/_rels/workbook.xml.rels');
  if (wb && rels) {
    const idM = /<sheet\b[^>]*\br:id="([^"]*)"/.exec(wb);
    const relM = idM ? new RegExp('<Relationship\\b[^>]*\\bId="' + idM[1] + '"[^>]*>', 'i').exec(rels) : null;
    const targetM = relM ? /\bTarget="([^"]*)"/.exec(relM[0]) : null;
    if (targetM) {
      const target = targetM[1];
      const resolved = target.charAt(0) === '/' ? target.slice(1) : path.posix.normalize('xl/' + target);
      if (files.has(resolved)) return resolved;
      if (files.has(target)) return target;
    }
  }
  for (const name of files.keys()) if (/^xl\/worksheets\/[^/]+\.xml$/.test(name)) return name;
  return null;
}

function sheetNameOf(files) {
  const wb = readTextFile(files, 'xl/workbook.xml');
  const m = wb ? /<sheet\b[^>]*\bname="([^"]*)"/.exec(wb) : null;
  return m ? unescapeXml(m[1]) : 'Sheet1';
}

function parseSheet(xml, shared) {
  const rows = [];
  const rowRe = /<row\b[^>]*(?:\/>|>([\s\S]*?)<\/row>)/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const body = rm[1] || '';
    const cells = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(body))) {
      const attrs = cm[1] || '';
      const inner = cm[2] || '';
      const refM = /\br="([A-Za-z]+)\d*"/.exec(attrs);
      const at = refM ? colIndex(refM[1]) : cells.length;
      const typeM = /\bt="([^"]*)"/.exec(attrs);
      const type = typeM ? typeM[1] : 'n';
      const vM = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner);
      const raw = vM ? unescapeXml(vM[1]) : '';
      let value;
      if (type === 's') {
        const id = parseInt(raw, 10);
        value = Number.isFinite(id) && shared[id] !== undefined ? shared[id] : '';
      } else if (type === 'inlineStr') {
        value = collectText(inner);
      } else if (type === 'b') {
        value = raw === '1' || raw.toLowerCase() === 'true';
      } else if (type === 'str' || type === 'e' || type === 'd') {
        value = raw;
      } else {
        if (raw === '') value = '';
        else {
          const n = Number(raw);
          value = Number.isFinite(n) ? n : raw;
        }
      }
      cells[at] = value;
    }
    const width = cells.length;
    const row = new Array(width);
    for (let i = 0; i < width; i++) row[i] = cells[i] === undefined ? '' : cells[i];
    rows.push(row);
  }

  /* 去掉末尾整行为空的行（Excel 常留一堆空行） */
  while (rows.length) {
    const last = rows[rows.length - 1];
    if (last.some((v) => v !== '' && v !== null && v !== undefined)) break;
    rows.pop();
  }

  /* 补齐成矩形，方便渲染层直接按列取 */
  const width = matrixWidth(rows);
  for (const r of rows) while (r.length < width) r.push('');
  return rows;
}

function readXlsx(buffer) {
  try {
    const files = readZip(buffer);
    const sheetPath = sheetPathOf(files);
    if (!sheetPath) return { ok: false, error: ZIP_ERRORS.noSheet };
    const shared = parseSharedStrings(readTextFile(files, 'xl/sharedStrings.xml'));
    const rows = parseSheet(readTextFile(files, sheetPath), shared);
    return { ok: true, sheetName: sheetNameOf(files), rows };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err || '读取 xlsx 失败') };
  }
}

/* ============================================================
   8. CSV（与页面既有 CSV 行为一致：BOM + 引号转义 + 公式注入防护）
   ============================================================ */
function csvCell(v) {
  let s = (v === undefined || v === null) ? '' : String(v);
  if (/^[=+@\t\r]/.test(s) || (/^-/.test(s) && !/^-?\d+(\.\d+)?$/.test(s))) s = "'" + s;   /* 公式注入防护 */
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function writeCsv(rows) {
  const matrix = normalizeRows(rows);
  return '\ufeff' + matrix.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

function readCsv(text) {
  try {
    const s = String(text === undefined || text === null ? '' : text).replace(/^\ufeff/, '');
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    let i = 0;
    while (i < s.length) {
      const c = s.charAt(i);
      if (inQuotes) {
        if (c === '"') {
          if (s.charAt(i + 1) === '"') { cell += '"'; i += 2; continue; }
          inQuotes = false; i += 1; continue;
        }
        cell += c; i += 1; continue;
      }
      if (c === '"') { inQuotes = true; i += 1; continue; }
      if (c === ',') { row.push(cell); cell = ''; i += 1; continue; }
      if (c === '\r') { i += 1; continue; }
      if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i += 1; continue; }
      cell += c; i += 1;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return { ok: true, rows: rows.filter((r) => r.some((v) => String(v).trim() !== '')) };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

/* 老师用 Windows 版 Excel 存 CSV 时常见 GBK 编码：先按严格 UTF-8 解，失败再退 GBK */
function decodeTextBuffer(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf == null ? '' : buf);
  if (!b.length) return '';
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch (e) {
    try { return new TextDecoder('gbk').decode(b); }
    catch (e2) { return b.toString('latin1'); }
  }
}

module.exports = {
  writeXlsx: writeXlsx,
  readXlsx: readXlsx,
  writeCsv: writeCsv,
  readCsv: readCsv,
  normalizeRows: normalizeRows,
  decodeTextBuffer: decodeTextBuffer,
  buildZip: buildZip   /* 内部实现，导出给测试构造 inlineStr 等特殊 xlsx */
};
