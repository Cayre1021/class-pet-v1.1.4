// test_v3_datacontract.cjs —— 批次 2 验收：真实数据契约在真 Electron 渲染下成立
// 跑法：env -u ELECTRON_RUN_AS_NODE electron-app/node_modules/electron/dist/electron.exe tests/test_v3_datacontract.cjs
// 断言：同一学生在学生大屏与教师台的 等级 / 阶段名 / 经验 三处一致；空班真实空态；改阈值两页同步跟随；
//       顶部身份来自账号缓存（不写死刘老师）；0 控制台错误 / 0 破图
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const PAGES = { paper: 'v3_looseleaf_paper.html', teacher: 'v3_teacher_desk.html' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

app.setPath('userData', path.join(process.env.TEMP || '.', 'cp-v3dc-' + Date.now()));
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

const THRESHOLDS = {};
[0, 15, 35, 60, 90, 125, 165, 210, 260, 315, 375, 440, 510, 585, 665, 750, 840, 935, 1035, 1140, 1250]
    .forEach((v, i) => { THRESHOLDS[i] = v; });
const STAGES = [
    { stage: 0, minLevel: 0, code: 'egg' }, { stage: 1, minLevel: 1, code: 'form1' },
    { stage: 2, minLevel: 4, code: 'form2' }, { stage: 3, minLevel: 8, code: 'form3' },
    { stage: 4, minLevel: 13, code: 'form4' }, { stage: 5, minLevel: 20, code: 'form5' }
];
// 账号缓存 = 真实身份（portal_auth.html 的写法）：classId/teacherId 从这里来，姓名不当身份
const LS = {
    classpet_current_account: JSON.stringify({
        id: 'acc_TEST_01', classId: 'c_TEST_01', school: '实验小学',
        className: '五年级三班', teacherName: '张老师', subject: '数学', isPreset: false
    }),
    classpet_active_account_id: 'acc_TEST_01'
};

// 夹具刻意使用不容易撞车的数字：EXP 267 / 下一级 315 / Lv.8 -> 进阶形态
function fixture(over) {
    over = over || {};
    return {
        students: over.students || [
            { id: 'st_AA', student_no: '01', name: '测试甲', group_name: '1组', display_pet_id: 'pet_AA_math', archived_at: null },
            { id: 'st_BB', student_no: '02', name: '测试乙', group_name: '2组', display_pet_id: 'pet_BB_chinese', archived_at: null }
        ],
        petsByStudent: over.petsByStudent || {
            st_AA: {
                chinese: { id: 'pet_AA_c', species_code: 'cat', subject_id: 'subj_chinese', exp: 60, level: 3, visual_stage: 1 },
                math: { id: 'pet_AA_math', species_code: 'fox', subject_id: 'subj_math', exp: 267, level: 8, visual_stage: 3 },
                english: { id: 'pet_AA_e', species_code: 'egg', subject_id: 'subj_english', exp: 0, level: 0, visual_stage: 0 }
            },
            st_BB: { chinese: { id: 'pet_BB_chinese', species_code: 'dog', subject_id: 'subj_chinese', exp: 15, level: 1, visual_stage: 1 } }
        },
        behaviorRules: [],
        thresholds: over.thresholds || Object.assign({}, THRESHOLDS),
        stages: over.stages || STAGES,
        recentOperations: []
    };
}

// 每页把「第一个学生」的表面暴露出来：学生大屏点卡片看检查器，教师台开行菜单看学生日志
const INTERACT = {
    paper: `(function(){ var c = document.querySelector('.pet-card'); if (!c) return 'no-card'; c.click(); return 'ok'; })()`,
    teacher: `(function(){
        var more = document.querySelector('.stu-more');
        if (!more) return 'no-more';
        more.click();
        var log = document.querySelector('[data-row-action="log"]');
        if (!log) return 'no-log';
        log.click();
        return 'ok';
    })()`
};

async function openPage(key, fixtureData, opts) {
    opts = opts || {};
    const win = new BrowserWindow({
        width: 1600, height: 900, show: false,
        webPreferences: {
            contextIsolation: true,
            backgroundThrottling: false,
            preload: path.join(__dirname, 'v3_fixture_preload.js')
        }
    });
    const errors = [];
    win.webContents.on('console-message', function () {
        const a = Array.prototype.slice.call(arguments);
        const d = a[1];
        const lvl = (typeof d === 'object' && d) ? d.level : a[1];
        const msg = (typeof d === 'object' && d) ? d.message : a[2];
        if (lvl === 'error' || lvl === 3) errors.push(String(msg).slice(0, 200));
    });
    process.env.CLASSPET_FIXTURE = JSON.stringify(fixtureData || {});
    process.env.CLASSPET_LS = JSON.stringify(opts.noIdentity ? {} : LS);
    await win.loadURL('file://' + path.join(ROOT, 'electron-app', 'src', PAGES[key]).replace(/\\/g, '/'));
    await sleep(1800);
    const js = code => win.webContents.executeJavaScript(code, true);
    const step = await js(INTERACT[key]);
    await sleep(600);
    const info = await js(`(function(){
        var imgs = [].slice.call(document.images || []);
        return {
            text: (document.body ? document.body.innerText : '').replace(/\\s+/g, ' ').slice(0, 40000),
            broken: imgs.filter(function(i){ return !i.complete || !i.naturalWidth; }).length,
            imgs: imgs.length,
            pageErrors: (window.__v3ConsoleErrors || []).slice(0, 5)
        };
    })()`);
    info.step = step;
    info.errors = errors;
    win.close();
    return info;
}

let passed = 0, failed = 0;
function assert(cond, msg, extra) {
    if (cond) { console.log('  PASS  ' + msg); passed++; }
    else { console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 260) : '')); failed++; }
}

app.whenReady().then(async () => {
    console.log('== V3 数据契约验收（真 Electron 渲染）==');
    const keys = Object.keys(PAGES);

    // ---------- 场景 1：真实数据态 ----------
    console.log('\n[场景1] 真实库数据驱动两页（exp 267 / Lv.8 / display_pet_id 指向数学宠物）');
    const s1 = {};
    for (const key of keys) {
        s1[key] = await openPage(key, fixture());
        assert(s1[key].step === 'ok', key + ' 页成功展开第一个学生的详情面（step=' + s1[key].step + '）');
        assert(s1[key].errors.length === 0, key + ' 页 0 控制台错误', s1[key].errors);
        assert(s1[key].broken === 0, key + ' 页 0 破图', { broken: s1[key].broken, imgs: s1[key].imgs });
        assert(s1[key].text.indexOf('测试甲') >= 0, key + ' 页渲染出真实学生「测试甲」');
        assert(s1[key].text.indexOf('测试乙') >= 0, key + ' 页渲染出真实学生「测试乙」');
        // 顶部身份来自账号缓存（2.4：登录张老师就不写刘老师）
        assert(s1[key].text.indexOf('五年级三班') >= 0 && s1[key].text.indexOf('张老师') >= 0, key + ' 页顶部显示账号缓存身份「五年级三班 · 张老师」');
        assert(s1[key].text.indexOf('刘老师') < 0 && s1[key].text.indexOf('三年级二班') < 0, key + ' 页未写死演示身份「三年级二班/刘老师」');
        assert(s1[key].text.indexOf('陈雨桐') < 0, key + ' 页未混入演示名单');
    }
    const triple = [
        [/(?:LV|Lv|lv)\.?\s*8/, '等级 Lv.8'],
        [/267/, '经验 267'],
        [/315/, '下一级阈值 315'],
        [/进阶形态/, '阶段名「进阶形态」']
    ];
    for (const [re, label] of triple) {
        assert(re.test(s1.paper.text), '学生大屏显示 ' + label);
        assert(re.test(s1.teacher.text), '教师台显示 ' + label);
    }

    // ---------- 场景 2：空班 -> 真实空态 ----------
    console.log('\n[场景2] 空班（students=[]）');
    for (const key of keys) {
        const s2 = await openPage(key, fixture({ students: [], petsByStudent: {} }));
        assert(s2.errors.length === 0, key + ' 页空班时 0 控制台错误', s2.errors);
        assert(s2.text.indexOf('测试甲') < 0 && s2.text.indexOf('陈雨桐') < 0, key + ' 页空班没有渲染任何学生');
        assert(/还没有学生|暂无学生/.test(s2.text), key + ' 页空班显示真实空态文案');
        assert(s2.text.indexOf('张老师') >= 0, key + ' 页空班仍显示真实身份（不是演示身份）');
    }

    // ---------- 场景 3：改库里阈值 -> 两页同时跟随 ----------
    console.log('\n[场景3] 把 8 级阈值 260 改到 300（模拟改库后重启）');
    const t3 = Object.assign({}, THRESHOLDS, { 8: 300 });
    for (const key of keys) {
        const s3 = await openPage(key, fixture({ thresholds: t3 }));
        assert(s3.errors.length === 0, key + ' 页改阈值后 0 控制台错误', s3.errors);
        assert(/(?:LV|Lv|lv)\.?\s*7/.test(s3.text), key + ' 页等级跟随降为 Lv.7');
        assert(/300/.test(s3.text), key + ' 页下一级阈值跟随变为 300');
        // 形态只升不降：库里的 visual_stage=3 是已获得形态，阈值上调不回退（core 不变量）
        assert(/进阶形态/.test(s3.text), key + ' 页阶段名保留已获得的「进阶形态」（只升不降）');
    }

    // ---------- 场景 4：读库失败 -> 失败态，不用演示数据顶替 ----------
    console.log('\n[场景4] loadAllState 抛错');
    for (const key of keys) {
        const s4 = await openPage(key, { __throw: 'disk gone' });
        assert(s4.text.indexOf('测试甲') < 0, key + ' 页读库失败时没有渲染任何学生数据');
        assert(/读取班级数据失败|读取失败/.test(s4.text), key + ' 页读库失败显示失败态文案');
    }

    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    fs.writeFileSync(path.join(ROOT, 'screenshots_v3', 'evidence', 'v3_datacontract.json'),
        JSON.stringify({ passed, failed, at: new Date().toISOString() }, null, 2));
    app.exit(failed === 0 ? 0 : 1);
}).catch(e => { console.error('验收脚本异常:', e); app.exit(2); });
