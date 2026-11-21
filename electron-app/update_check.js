/**
 * update_check.js —— 版本检查的纯逻辑（不依赖 Electron，可直接在 node 里测）
 * 只做三件事：比较版本、从 GitHub Release JSON 里挑安装包、把结果整理成前端要的形状
 */

/** '1.2.0' vs '1.10.0' -> -1 / 0 / 1；忽略前缀 v 与非法段 */
function compareVersions(a, b) {
    const pa = String(a || '').replace(/^v/i, '').split(/[.+-]/).map(x => parseInt(x, 10));
    const pb = String(b || '').replace(/^v/i, '').split(/[.+-]/).map(x => parseInt(x, 10));
    const n = Math.max(pa.length, pb.length);
    for (let i = 0; i < n; i++) {
        const x = Number.isFinite(pa[i]) ? pa[i] : 0;
        const y = Number.isFinite(pb[i]) ? pb[i] : 0;
        if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
}

/** 安装包优先选 NSIS 安装版，其次便携版，再其次任意 exe */
function pickAsset(assets) {
    const list = Array.isArray(assets) ? assets.filter(a => a && a.browser_download_url) : [];
    const exe = list.filter(a => /\.exe$/i.test(a.name || ''));
    return exe.find(a => /setup/i.test(a.name)) ||
        exe.find(a => /portable/i.test(a.name)) ||
        exe[0] ||
        null;
}

/** GitHub Release -> 前端可直接渲染的结果 */
function parseRelease(json, currentVersion) {
    if (!json || typeof json !== 'object') {
        return { ok: false, reason: 'bad-payload', message: '发布信息格式不正确' };
    }
    if (json.draft || json.prerelease) {
        return { ok: false, reason: 'not-stable', message: '最新发布是草稿或预览版，已跳过' };
    }
    const latest = String(json.tag_name || json.name || '').replace(/^v/i, '').trim();
    if (!latest) return { ok: false, reason: 'bad-payload', message: '发布信息里没有版本号' };
    const asset = pickAsset(json.assets);
    const downloadUrl = asset ? asset.browser_download_url : (json.html_url || '');
    return {
        ok: true,
        current: String(currentVersion || ''),
        latest,
        hasUpdate: compareVersions(latest, currentVersion) > 0,
        notes: String(json.body || '').slice(0, 4000),
        downloadUrl,
        assetName: asset ? asset.name : '',
        sizeBytes: asset ? Number(asset.size) || 0 : 0,
        publishedAt: json.published_at || '',
        pageUrl: json.html_url || ''
    };
}

/** 从发布列表里挑最新稳定版（releases/latest 404 时的退路） */
function selectLatestFromList(list, currentVersion) {
    const arr = Array.isArray(list) ? list.filter(r => r && !r.draft && !r.prerelease) : [];
    if (!arr.length) return { ok: false, reason: 'no-release', message: '仓库还没有发布任何正式版本' };
    arr.sort((x, y) => compareVersions(String(y.tag_name || ''), String(x.tag_name || '')));
    return parseRelease(arr[0], currentVersion);
}

/** 网络/HTTP 错误 -> 老师能看懂的一句话 */
function describeFailure(code, detail) {
    const map = {
        'timeout': '连接超时：这台电脑访问 GitHub 太慢或被拦截，可稍后重试',
        'network': '连不上 GitHub：请检查网络；若在中国大陆，可稍后用手机热点或换网络再试',
        'rate-limit': 'GitHub 请求太频繁被限流，请过几分钟再试',
        'not-found': '仓库地址不对或还没有发布版本',
        'http': 'GitHub 返回异常状态码 ' + (detail || ''),
        'bad-payload': '返回内容无法解析'
    };
    return map[code] || ('检查更新失败：' + (detail || code));
}

function formatSize(bytes) {
    const n = Number(bytes) || 0;
    if (!n) return '';
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
}

/**
 * 自定义更新源（国内镜像 / 自建 OSS 的 latest.json）
 * 允许两种形状：
 *   A) GitHub release 原样（tag_name / body / assets[]）
 *   B) 精简：{ version, url, notes, size, pageUrl }
 * 这样以后把文件放到 OSS/COS 时，不用改代码，只要配一个 URL
 */
function parseFeed(json, currentVersion) {
    if (!json || typeof json !== 'object') {
        return { ok: false, reason: 'bad-payload', message: '更新源返回内容不正确' };
    }
    if (Array.isArray(json.assets)) return parseRelease(json, currentVersion);   /* A 形 */
    const ver = String(json.version || json.tag_name || json.latest || '').replace(/^v/i, '').trim();
    if (!ver) return { ok: false, reason: 'bad-payload', message: '更新源里没有版本号' };
    const url = String(json.url || json.downloadUrl || json.browser_download_url || json.pageUrl || '');
    return {
        ok: true,
        current: String(currentVersion || ''),
        latest: ver,
        hasUpdate: compareVersions(ver, currentVersion) > 0,
        notes: String(json.notes || json.body || '').slice(0, 4000),
        downloadUrl: url,
        assetName: json.assetName || '',
        sizeBytes: Number(json.size || json.sizeBytes) || 0,
        publishedAt: json.publishedAt || json.published_at || '',
        pageUrl: json.pageUrl || json.html_url || url
    };
}

module.exports = { compareVersions, pickAsset, parseRelease, parseFeed, selectLatestFromList, describeFailure, formatSize };
