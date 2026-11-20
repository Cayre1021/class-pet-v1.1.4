// validate_pet_expressions.js —— 校验宠物表情素材（B 路线：8 物种 × 5 阶段 × 3 表情 = 120 张）
// 用法：node scripts/validate_pet_expressions.js [--species cat]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'electron-app', 'src', 'assets', 'pets');
const SPECIES = ['cat', 'dog', 'bunny', 'hamster', 'bird', 'deer', 'fish', 'fox'];
const STAGES = [1, 2, 3, 4, 5];
const EXPRS = ['pat', 'feed', 'play'];
const SIZE = 512;
const MAX_BYTES = 250 * 1024;

function readPngHeader(file) {
    const b = fs.readFileSync(file);
    if (b.length < 33 || b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4E || b[3] !== 0x47) return null;
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), bitDepth: b[24], colorType: b[25], bytes: b.length };
}

function hasAlpha(h) {
    if (!h) return false;
    // colorType: 4 = gray+alpha, 6 = RGBA；3 = palette（需 tRNS，这里从严要求直接 RGBA/GA）
    return h.colorType === 4 || h.colorType === 6;
}

const args = process.argv.slice(2);
const speciesArg = args.indexOf('--species') >= 0 ? args[args.indexOf('--species') + 1] : null;
const species = speciesArg ? [speciesArg] : SPECIES;
if (speciesArg && SPECIES.indexOf(speciesArg) < 0) {
    console.error('未知物种：' + speciesArg + '（可选：' + SPECIES.join(', ') + '）');
    process.exit(2);
}

let missing = [], errors = [], ok = 0;
const expected = new Set();
species.forEach(sp => {
    const dir = path.join(ASSETS, sp);
    if (!fs.existsSync(dir)) { missing.push(sp + '/（目录不存在）'); return; }
    STAGES.forEach(st => EXPRS.forEach(ex => {
        const name = sp + '-stage' + st + '-' + ex + '.png';
        expected.add(sp + '/' + name);
        const file = path.join(dir, name);
        if (!fs.existsSync(file)) { missing.push(sp + '/' + name); return; }
        const h = readPngHeader(file);
        if (!h) { errors.push(name + '：不是有效 PNG'); return; }
        if (h.width !== SIZE || h.height !== SIZE) errors.push(name + '：尺寸 ' + h.width + '×' + h.height + '（要求 ' + SIZE + '×' + SIZE + '）');
        if (!hasAlpha(h)) errors.push(name + '：没有 alpha 通道（colorType=' + h.colorType + '，要求 6=RGBA）');
        if (h.bytes > MAX_BYTES) errors.push(name + '：体积 ' + Math.round(h.bytes / 1024) + 'KB（上限 ' + (MAX_BYTES / 1024) + 'KB）');
        ok += 1;
    }));
});

// 多余文件（命名不符）检查
const unexpected = [];
species.forEach(sp => {
    const dir = path.join(ASSETS, sp);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => /\.png$/i.test(f)).forEach(f => {
        if (/^[a-z]+-stage[1-5]\.png$/.test(f)) return;          // 基础图
        if (!expected.has(sp + '/' + f)) unexpected.push(sp + '/' + f);
    });
});

const total = species.length * STAGES.length * EXPRS.length;
console.log('== 宠物表情素材校验 ==');
console.log('物种：' + species.join(', ') + ' | 期望 ' + total + ' 张，实际合格 ' + ok + ' 张');
if (missing.length) {
    console.log('\n缺失 ' + missing.length + ' 张：');
    missing.slice(0, 40).forEach(m => console.log('  - ' + m));
    if (missing.length > 40) console.log('  … 其余 ' + (missing.length - 40) + ' 张省略');
}
if (errors.length) {
    console.log('\n不符合规格 ' + errors.length + ' 张：');
    errors.slice(0, 40).forEach(e => console.log('  - ' + e));
    if (errors.length > 40) console.log('  … 其余 ' + (errors.length - 40) + ' 条省略');
}
if (unexpected.length) {
    console.log('\n多余/命名不符 ' + unexpected.length + ' 个：');
    unexpected.slice(0, 20).forEach(u => console.log('  - ' + u));
}
console.log('\n结果：missing=' + missing.length + ' errors=' + errors.length + ' unexpected=' + unexpected.length);
console.log(missing.length === 0 && errors.length === 0 ? '✅ 齐全且合格' : '（缺图不影响运行：代码会退回基础图 + 只出气泡）');
process.exit(missing.length === 0 && errors.length === 0 ? 0 : 1);
