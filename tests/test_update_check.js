// test_update_check.js —— 版本检查纯逻辑（无 Electron 依赖）
const path = require('path');
const fs = require('fs');
const root = fs.existsSync(path.join(__dirname, '..', 'electron-app')) ? path.join(__dirname, '..') : path.join(__dirname);
const U = require(path.join(root, 'electron-app', 'update_check.js'));
let passed = 0, failed = 0;
const assert = (c, m, x) => { if (c) { console.log('  PASS  ' + m); passed++; } else { console.error('  FAIL  ' + m + (x !== undefined ? '  ->  ' + JSON.stringify(x).slice(0, 200) : '')); failed++; } };

console.log('== 版本比较 ==');
assert(U.compareVersions('1.2.0', '1.2.0') === 0, '相同版本 = 0');
assert(U.compareVersions('1.10.0', '1.9.9') === 1, '1.10.0 > 1.9.9（按数字比，不是字符串）');
assert(U.compareVersions('v1.2.1', '1.2.0') === 1, '带 v 前缀也能比');
assert(U.compareVersions('1.2', '1.2.0') === 0, '缺段按 0 处理');
assert(U.compareVersions('2.0.0', '10.0.0') === -1, '2.0.0 < 10.0.0');

console.log('\n== 挑安装包 ==');
const assets = [
  { name: 'ClassPet-Portable-1.2.0.exe', browser_download_url: 'https://x/portable.exe', size: 100 },
  { name: 'ClassPet Setup 1.2.0.exe', browser_download_url: 'https://x/setup.exe', size: 200 },
  { name: 'latest.yml', browser_download_url: 'https://x/latest.yml', size: 1 }
];
assert(U.pickAsset(assets).name === 'ClassPet Setup 1.2.0.exe', '优先选 Setup 安装版');
assert(U.pickAsset([assets[0], assets[2]]).name === 'ClassPet-Portable-1.2.0.exe', '没有 Setup 时选便携版');
assert(U.pickAsset([]) === null, '没有资源返回 null');
assert(U.pickAsset(null) === null, 'assets 为 null 不炸');

console.log('\n== Release 解析 ==');
const rel = {
  tag_name: 'v1.3.0', body: '修了三个 bug', published_at: '2026-11-20T10:00:00Z', html_url: 'https://github.com/x/y/releases/tag/v1.3.0',
  assets: assets
};
const r1 = U.parseRelease(rel, '1.2.0');
assert(r1.ok === true && r1.latest === '1.3.0' && r1.hasUpdate === true, '有新版本：1.2.0 -> 1.3.0', r1);
assert(r1.downloadUrl === 'https://x/setup.exe' && r1.sizeBytes === 200, '下载地址指向 Setup 安装包并带大小', { u: r1.downloadUrl, s: r1.sizeBytes });
assert(r1.notes === '修了三个 bug', '更新说明透传');
const r2 = U.parseRelease(rel, '1.3.0');
assert(r2.hasUpdate === false, '已是最新时 hasUpdate=false', r2.hasUpdate);
const r3 = U.parseRelease(rel, '2.0.0');
assert(r3.hasUpdate === false, '本地版本更高时不提示降级', r3.hasUpdate);
assert(U.parseRelease({ draft: true, tag_name: 'v9' }, '1.2.0').reason === 'not-stable', '草稿版本被跳过');
assert(U.parseRelease({}, '1.2.0').ok === false, '缺版本号时 ok=false');
const list = [{ tag_name: 'v1.1.0' }, { tag_name: 'v1.4.0', assets: assets }, { tag_name: 'v2.0.0', draft: true }];
assert(U.selectLatestFromList(list, '1.2.0').latest === '1.4.0', '列表里挑最新非草稿版本', U.selectLatestFromList(list, '1.2.0').latest);
assert(U.selectLatestFromList([], '1.2.0').reason === 'no-release', '没有发布时给出 no-release');

console.log('\n== 自定义更新源（镜像/OSS） ==');
const feedB = U.parseFeed({ version: 'v1.4.0', url: 'https://cdn.example.com/ClassPet Setup 1.4.0.exe', notes: '镜像源', size: 120000000, pageUrl: 'https://example.com/releases' }, '1.2.0');
assert(feedB.ok === true && feedB.latest === '1.4.0' && feedB.hasUpdate === true, '精简形状 latest.json 能解析', feedB);
assert(/cdn\.example\.com/.test(feedB.downloadUrl), '下载地址透传');
const feedA = U.parseFeed({ tag_name: 'v1.5.0', assets: assets, body: 'GitHub 形状' }, '1.2.0');
assert(feedA.latest === '1.5.0' && feedA.downloadUrl === 'https://x/setup.exe', 'GitHub release 形状也走同一条路', feedA);
assert(U.parseFeed({}, '1.2.0').ok === false, '空内容返回 ok=false');

console.log('\n== 错误提示 ==');
assert(/超时/.test(U.describeFailure('timeout')), '超时有中文提示');
assert(/连不上 GitHub/.test(U.describeFailure('network')), '网络失败有中文提示');
assert(U.formatSize(114900000) === '109.6 MB', '体积格式化', U.formatSize(114900000));

(async () => {
  console.log('\n== 真实 GitHub（依赖网络，失败只告警不算失败） ==');
  try {
    const real = await U.fetchLatestRelease({ repo: 'Cayre1021/class-pet-v1.1.4', currentVersion: '1.2.0', timeoutMs: 12000 });
    if (real && real.ok) {
      assert(real.hasUpdate === true, '真实源：以 1.2.0 检查能发现有新版本（' + real.latest + '）', real.latest);
      assert(/setup/i.test(real.assetName || ''), '真实源：自动挑中 Setup 安装包', real.assetName);
      assert(/github\.com/.test(real.downloadUrl || ''), '真实源：给出下载地址', String(real.downloadUrl).slice(0, 60));
    } else {
      console.log('  WARN  真实源不可达：' + (real && real.message || '未知') + '（网络问题不计失败）');
    }
  } catch (e) {
    console.log('  WARN  真实源异常：' + e.message + '（网络问题不计失败）');
  }
  console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exitCode = 1;
})();
