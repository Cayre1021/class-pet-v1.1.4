// test_packaging_files.js —— 防复发：主进程 require 的本地文件必须在 package.json build.files 白名单里
// （曾因漏了 update_check.js 导致装好的 exe 启动即崩：Cannot find module './update_check.js'）
const fs = require('fs');
const path = require('path');
const root = fs.existsSync(path.join(__dirname, '..', 'electron-app')) ? path.join(__dirname, '..') : path.join(__dirname);
const pkg = require(path.join(root, 'electron-app', 'package.json'));
const mainSrc = fs.readFileSync(path.join(root, 'electron-app', 'main.js'), 'utf8');
let passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x) : '')); failed++; } };

console.log('== 打包白名单 ==');
const files = (pkg.build && pkg.build.files) || [];
const includes = (rel) => files.some((f) => f === rel || (f.endsWith('/**/*') && rel.startsWith(f.replace('/**/*', '') + '/')));
assert(Array.isArray(files) && files.length > 0, 'package.json 有 build.files 白名单', files);

// 抓 main.js 里所有 require('./xxx')
const reqs = [...mainSrc.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]);
const localFiles = [...new Set(reqs)].filter((r) => /\.(js|cjs|json)$/.test(r));
assert(localFiles.length >= 2, '主进程至少 require 了 2 个本地文件（实际 ' + localFiles.length + '）', localFiles);
localFiles.forEach((rel) => {
    assert(fs.existsSync(path.join(root, 'electron-app', rel)), '文件存在：' + rel);
    assert(includes(rel), '★ 白名单包含 ' + rel + '（漏了就会 Cannot find module）', files);
});

// preload 里 require 的本地文件（目前只有 electron 内置，兜底检查）
const pre = fs.readFileSync(path.join(root, 'electron-app', 'preload.js'), 'utf8');
[...pre.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]).forEach((rel) => {
    assert(includes(rel), '★ 白名单包含 preload 依赖 ' + rel, files);
});

// 关键资源目录必须整包进
assert(includes('src/assets/pets/cat/cat-stage1-pat.png') || files.some((f) => f === 'src/**/*'), 'src/** 整包进入安装包（含表情图）', files);

console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exitCode = 1;
