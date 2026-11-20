// test_v3_viewmodel.js
// 批次 2 验收：getV3ViewModel() 统一 ViewModel 契约（只读，不写库）
// 覆盖：无桥 / 读库 / 等级随阈值 / 形态随 STAGE_MIN_LEVELS / display_pet_id / 空班 / 读失败
const path = require('path');
const fs = require('fs');
const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');

const storage = {};
global.localStorage = {
    getItem: (k) => storage[k] !== undefined ? storage[k] : null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.BroadcastChannel = class { constructor() {} postMessage() {} close() {} };
global.Audio = class { play() { return Promise.resolve(); } pause() {} };
global.window = { addEventListener: () => {}, localStorage: global.localStorage, BroadcastChannel: global.BroadcastChannel };

const { ClassPetStore } = require(path.join(projectRoot, 'electron-app', 'src', 'classpet_core.js'));

const DEFAULT_THRESHOLDS = {
    0: 0, 1: 15, 2: 35, 3: 60, 4: 90, 5: 125, 6: 165, 7: 210, 8: 260, 9: 315,
    10: 375, 11: 440, 12: 510, 13: 585, 14: 665, 15: 750, 16: 840, 17: 935, 18: 1035, 19: 1140, 20: 1250
};
const DEFAULT_STAGES = [
    { stage: 0, minLevel: 0, code: 'egg' }, { stage: 1, minLevel: 1, code: 'form1' },
    { stage: 2, minLevel: 4, code: 'form2' }, { stage: 3, minLevel: 8, code: 'form3' },
    { stage: 4, minLevel: 13, code: 'form4' }, { stage: 5, minLevel: 20, code: 'form5' }
];

function fixture(over) {
    over = over || {};
    return {
        students: over.students !== undefined ? over.students : [
            { id: 'st_01', student_no: '01', name: '陈雨桐', group_name: '1组', display_pet_id: 'pet_01_math', archived_at: null },
            { id: 'st_02', student_no: '02', name: '林子轩', group_name: '2组', display_pet_id: null, archived_at: null }
        ],
        petsByStudent: over.petsByStudent !== undefined ? over.petsByStudent : {
            st_01: {
                chinese: { id: 'pet_01_c', species_code: 'cat', subject_id: 'subj_chinese', exp: 130, level: 5, visual_stage: 2 },
                math: { id: 'pet_01_math', species_code: 'fox', subject_id: 'subj_math', exp: 265, level: 8, visual_stage: 3 },
                english: { id: 'pet_01_e', species_code: 'egg', subject_id: 'subj_english', exp: 0, level: 0, visual_stage: 0 }
            },
            st_02: {}
        },
        thresholds: over.thresholds !== undefined ? over.thresholds : DEFAULT_THRESHOLDS,
        stages: over.stages !== undefined ? over.stages : DEFAULT_STAGES
    };
}

let calls = 0;
let writes = 0;
let nextState = null;
function installBridge(stateOrThrower) {
    calls = 0;
    writes = 0;
    nextState = stateOrThrower;
    global.window.electronAPI = {
        db: {
            loadAllState: async (classId) => {
                calls++;
                if (typeof nextState === 'function') return nextState(classId);
                return nextState;
            },
            // 只读适配：任何写入口被调用都算违规，测试里计数
            saveStudent: () => { writes++; return true; },
            importStudents: () => { writes++; return true; },
            saveAllStudents: () => { writes++; return true; }
        }
    };
}
function removeBridge() { delete global.window.electronAPI; }

async function runTests() {
    console.log('== V3 ViewModel 契约测试 ==');
    let passed = 0, failed = 0;
    const assert = (cond, msg, extra) => {
        if (cond) { console.log('  PASS  ' + msg); passed++; }
        else { console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra) : '')); failed++; }
    };

    // 1. 无桥：明确失败，不冒充数据
    removeBridge();
    let store = new ClassPetStore();
    let vm = await store.getV3ViewModel();
    assert(vm.ok === false && vm.reason === 'no-bridge', '无 electronAPI 时 ok=false / reason=no-bridge', vm.reason);
    assert(Array.isArray(vm.students) && vm.students.length === 0, '无桥时不返回任何学生（不冒充真实数据）', vm.students.length);

    // 2. 读库：等级由 exp + 阈值推导，形态由 STAGE_MIN_LEVELS 取名
    installBridge(fixture());
    writes = 0;
    store = new ClassPetStore();
    await new Promise(r => setTimeout(r, 0));   // 等构造函数里并发的 loadFromSQLite 落定
    assert(writes === 0, '演示名单不会被写进班级库（构造期 saveStudent/importStudents 调用次数=0）', writes);
    calls = 0; writes = 0;
    vm = await store.getV3ViewModel();
    assert(vm.ok === true && vm.reason === 'db', '有桥时 ok=true / reason=db', vm.reason);
    assert(calls === 1, '构建 VM 只读一次库（loadAllState 调用次数=1）', calls);
    assert(writes === 0, '构建 VM 期间零写库（saveStudent/importStudents 均未被调用）', writes);
    const s1 = vm.students[0];
    assert(typeof s1.id === 'string' && s1.id === 'st_01', '学生 id 保持字符串', s1.id);
    assert(s1.activePet.exp === 265 && s1.activePet.level === 8, '等级/经验来自库：exp 265 -> Lv.8', { exp: s1.activePet.exp, level: s1.activePet.level });
    assert(s1.activePet.visualStage === 3 && s1.activePet.stageName === '进阶形态', 'Lv.8 -> stage3 进阶形态（STAGE_MIN_LEVELS 取名）', { stage: s1.activePet.visualStage, name: s1.activePet.stageName });
    assert(s1.activePet.percent === Math.round((265 - 260) / (315 - 260) * 100), '进度百分比按当前等级区间计算', { got: s1.activePet.percent });
    assert(s1.activePet.needExp === 315 - 265, 'needExp = 下一级阈值 - 当前经验', { got: s1.activePet.needExp });
    assert(typeof s1.activePet.image === 'string' && /fox-stage3\.png$/.test(s1.activePet.image), '图片路径由 species + visualStage 决定', s1.activePet.image);

    // 3. D7=A：卡片按 display_pet_id 显示，不随授课科目换宠
    assert(s1.displayPetId === 'pet_01_math', 'displayPetId 透传自 students.display_pet_id', s1.displayPetId);
    assert(s1.activePet.subjectCode === 'math', 'activePet 取 display_pet_id 指向的数学宠物（科目=语文也不换）', s1.activePet.subjectCode);
    assert(s1.petsBySubject.chinese && s1.petsBySubject.math && s1.petsBySubject.english, 'petsBySubject 三科齐备', Object.keys(s1.petsBySubject));
    const s2 = vm.students[1];
    assert(s2.displayPetId === null && s2.activePet.level === 0 && s2.activePet.isEgg === true, '无宠物学生回落为蛋形态（不造 cat + 15 EXP）', { lvl: s2.activePet.level });

    // 4. 形态取名随 STAGE_MIN_LEVELS 配置变化
    installBridge(fixture({ stages: DEFAULT_STAGES.map(s => s.stage === 3 ? { stage: 3, minLevel: 5, code: 'form3' } : s) }));
    store = new ClassPetStore();
    vm = await store.getV3ViewModel();
    assert(vm.students[0].petsBySubject.chinese.visualStage === 3 && vm.students[0].petsBySubject.chinese.stageName === '进阶形态',
        '形阶 minLevel 从 8 降到 5 后，Lv.5 宠物取到 stage3（形态真按 STAGE_MIN_LEVELS 推导）', { s: vm.students[0].petsBySubject.chinese.visualStage });
    assert(vm.students[0].petsBySubject.english.stageName === '初始宠物蛋', '未孵化蛋形态取 stage0 名称', vm.students[0].petsBySubject.english.stageName);

    // 5. 阈值改库后等级跟着变（批次 0 修复的运行期验收点）
    const raised = Object.assign({}, DEFAULT_THRESHOLDS, { 8: 300 });
    installBridge(fixture({ thresholds: raised }));
    store = new ClassPetStore();
    vm = await store.getV3ViewModel();
    assert(vm.students[0].petsBySubject.math.level === 7,
        '把 8 级阈值从 260 改到 300 后，exp 265 的宠物降为 Lv.7（阈值真被消费）', vm.students[0].petsBySubject.math.level);
    assert(vm.thresholds[8] === 300, 'VM 透出库里的 21 级阈值', vm.thresholds[8]);

    // 6. 空班：返回真实空名单，不注入演示名单
    installBridge(fixture({ students: [], petsByStudent: {} }));
    store = new ClassPetStore();
    vm = await store.getV3ViewModel();
    assert(vm.ok === true && vm.students.length === 0, '空班返回 ok=true 且 students=[]（不注入 32/43 人演示样例）', { ok: vm.ok, n: vm.students.length });

    // 7. 读失败：明确失败态
    installBridge(() => { throw new Error('disk gone'); });
    store = new ClassPetStore();
    vm = await store.getV3ViewModel();
    assert(vm.ok === false && vm.reason === 'load-failed' && /disk gone/.test(vm.error || ''), '读库抛错时 ok=false / reason=load-failed 且带错误原因', { reason: vm.reason, error: vm.error });

    // 8. 账号上下文：classId/teacherId 取缓存，姓名不当身份
    storage['classpet_current_account'] = JSON.stringify({ id: 'acc_173000', classId: 'c_acc_173000', teacherName: '张老师', className: '五年级三班', subject: '数学' });
    storage['classpet_active_account_id'] = 'acc_173000';
    storage['classpet_active_account_id'] = 'acc_173000';
    installBridge(fixture({ students: [] }));
    store = new ClassPetStore();
    vm = await store.getV3ViewModel();
    assert(vm.classId === 'c_acc_173000' && vm.teacherId === 'acc_173000', 'classId/teacherId 来自账号缓存', { classId: vm.classId, teacherId: vm.teacherId });
    assert(vm.teacher.name === '张老师' && vm.teacher.name !== '刘老师', '老师姓名取账号缓存（不写死刘老师）', vm.teacher.name);

    removeBridge();
    console.log('\n结果: ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exitCode = 1;
}
runTests().catch(e => { console.error('测试异常:', e); process.exitCode = 1; });
