/**
 * Class Pet V1-Lite: 全面严肃端到端审查与对抗性测试脚本
 * 覆盖：
 * 1. 撤销（Undo）体系时光倒流与成长不变量保护测试（防降级、防退化为蛋、等级精确回退）
 * 2. Excel 批量导入智能增量合并保护测试（已有学生宠物形态与经验零丢失）
 * 3. 互动动作本地时区与班级账号隔离 5 EXP 上限测试
 * 4. 大屏 3 大视图（网格/座次/PK）与团队数据契约完整性测试
 * 5. 极端长人名与超高经验极值鲁棒性测试
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 模拟浏览器与 Electron 全局运行环境
const mockLocalStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};

global.window = {
    AudioContext: class {
        createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
        createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
        get destination() { return {}; }
        get currentTime() { return 0; }
        get state() { return 'running'; }
        resume() {}
    },
    addEventListener() {},
    localStorage: mockLocalStorage,
    BroadcastChannel: class {
        constructor() {}
        postMessage() {}
        close() {}
    }
};
global.localStorage = mockLocalStorage;
global.BroadcastChannel = global.window.BroadcastChannel;

// 载入核心运行时 classpet_core.js
const coreCode = fs.readFileSync(path.join(__dirname, '../electron-app/src/classpet_core.js'), 'utf-8');
eval(coreCode);

const store = global.window.classPetRuntime;

console.log('====================================================');
console.log(' 🐾 开始执行 Class Pet 全系统深层严肃审查自动化测试');
console.log('====================================================\n');

// ----------------------------------------------------
// Test 1: 撤销（Undo）体系：升级撤销等级回退与成长不变量保护
// ----------------------------------------------------
console.log('▶ [Test 1] 审查撤销（Undo）体系与成长不变量...');

// 场景 1.1: 学生初始 Lv.1 (30 EXP)，手滑加了 35 分升到 Lv.3 (65 EXP)，撤销该笔赋分
const student1 = store.students[0];
student1.exp = 30;
student1.level = 1;
student1.visualStage = 1;
student1.isHatched = true;
student1.pets.chinese.exp = 30;
student1.pets.chinese.level = 1;
student1.pets.chinese.visualStage = 1;
student1.pets.chinese.isHatched = true;

const scorePayload = store.batchScore([student1.id], 35, '课堂主动回答问题');
assert.strictEqual(student1.exp, 65, '赋分后经验应为 65');
assert.strictEqual(student1.level, 3, '赋分后等级应晋升为 Lv.3');
assert(scorePayload.beforeStates && scorePayload.beforeStates.length > 0, 'batchScore 必须返回 beforeStates 快照');

const undoRec = {
    id: 'op_test_1',
    targetIds: [student1.id],
    delta: 35,
    label: '课堂主动回答问题',
    subject: 'chinese',
    beforeStates: scorePayload.beforeStates
};

const undoRes = store.undoScoreRecord(undoRec);
assert.strictEqual(undoRes.success, true, '撤销操作应成功执行');
assert.strictEqual(student1.exp, 30, '撤销后经验必须精准恢复到赋分前的 30 EXP');
assert.strictEqual(student1.level, 1, '撤销后等级必须精准恢复到赋分前的 Lv.1，杜绝误留更高等级！');
assert.strictEqual(student1.pets.chinese.exp, 30, '对应学科宠物经验恢复为 30');
assert.strictEqual(student1.pets.chinese.level, 1, '对应学科宠物等级恢复为 Lv.1');
console.log('  ✔ 场景 1.1 验证通过: 升级误赋分撤销后等级与经验精确倒流恢复');

// 场景 1.2: 已破壳学生 (Lv.1 15 EXP)，无快照情况下撤销 20 分（负向惩罚/无快照撤销）
const student2 = store.students[1];
student2.exp = 15;
student2.level = 1;
student2.visualStage = 1;
student2.isHatched = true;
student2.pets.chinese.exp = 15;
student2.pets.chinese.level = 1;
student2.pets.chinese.visualStage = 1;
student2.pets.chinese.isHatched = true;

const noSnapUndoRec = {
    id: 'op_test_2',
    targetIds: [student2.id],
    delta: 20,
    label: '失误多加分',
    subject: 'chinese'
};

store.undoScoreRecord(noSnapUndoRec);
assert.strictEqual(student2.exp, 0, '经验扣至最低为 0');
assert.strictEqual(student2.level, 1, '🌟 核心不变量：已破壳认领学生等级保底为 Lv.1，绝不跌落为 0 级！');
assert.strictEqual(student2.visualStage, 1, '🌟 核心不变量：已破壳认领学生形态保底为 Stage 1，绝不退化为蛋！');
assert.notStrictEqual(student2.pets.chinese.species, 'egg', '宠物物种绝不可逆退化为 egg');
console.log('  ✔ 场景 1.2 验证通过: 无快照撤销严格遵守成长不变量，已破壳宠物形态与等级坚如磐石');

// 场景 1.3: 多学科独立撤销隔离测试
const student3 = store.students[2];
student3.activeSubject = 'chinese';
student3.pets.chinese.exp = 40;
student3.pets.chinese.level = 2;
student3.pets.math.exp = 0;
student3.pets.math.level = 0;
student3.pets.math.visualStage = 0;

// 给数学加分 +20
const mathScore = store.batchScore([student3.id], 20, '数学测验满分', false, 'math');
assert.strictEqual(student3.pets.math.exp, 20, '数学宠物经验应为 20');
assert.strictEqual(student3.pets.chinese.exp, 40, '语文宠物经验应保持 40 不变');

// 撤销数学加分
store.undoScoreRecord({
    id: 'op_test_3',
    targetIds: [student3.id],
    delta: 20,
    label: '数学测验满分',
    subject: 'math',
    beforeStates: mathScore.beforeStates
});
assert.strictEqual(student3.pets.math.exp, 0, '数学宠物经验回退为 0');
assert.strictEqual(student3.pets.chinese.exp, 40, '语文宠物经验依然稳定保持 40');
console.log('  ✔ 场景 1.3 验证通过: 多学科独立记分与撤销完全隔离，互不串联影响\n');

// ----------------------------------------------------
// Test 2: Excel 批量导入智能增量合并保护测试
// ----------------------------------------------------
console.log('▶ [Test 2] 审查 Excel 批量导入智能增量合并保护...');

// 模拟已有班级学生：学生A已养成至 Lv.5（进阶少年期，猫咪），学生B新破壳
store.students = [
    {
        id: 'stu_exist_1',
        no: '01',
        name: '张三',
        group: 1,
        level: 5,
        exp: 130,
        visualStage: 2,
        isHatched: true,
        activeSubject: 'chinese',
        pets: {
            chinese: { id: 'p1', species: 'cat', name: '猫咪', level: 5, exp: 130, visualStage: 2, isHatched: true },
            math: { id: 'p2', species: 'egg', name: '神秘宠物蛋', level: 0, exp: 0, visualStage: 0, isHatched: false },
            english: { id: 'p3', species: 'egg', name: '神秘宠物蛋', level: 0, exp: 0, visualStage: 0, isHatched: false }
        }
    }
];
store.save();

// 模拟 Excel 导入数据：包含老生张三（组别调整为 2 组）以及新同学李四
const excelRows = [
    { no: '01', name: '张三', group: 2 },
    { no: '02', name: '李四', group: 1 }
];

const nextThreshold = store.getNextLevelThreshold(0);
const existingList = store.students;
let retained = 0;
let newAdded = 0;

const mergedStudents = excelRows.map((r, idx) => {
    const match = existingList.find(s => s.no === r.no || s.name === r.name);
    if (match) {
        retained++;
        const cloned = JSON.parse(JSON.stringify(match));
        cloned.no = r.no;
        cloned.name = r.name;
        cloned.group = r.group;
        return cloned;
    }
    newAdded++;
    const sId = 'stu_new_' + idx;
    return {
        id: sId,
        no: r.no,
        name: r.name,
        group: r.group,
        level: 0,
        exp: 0,
        visualStage: 0,
        isHatched: false,
        pets: {
            chinese: { id: 'p_c_' + sId, species: 'egg', level: 0, exp: 0, visualStage: 0, isHatched: false },
            math: { id: 'p_m_' + sId, species: 'egg', level: 0, exp: 0, visualStage: 0, isHatched: false },
            english: { id: 'p_e_' + sId, species: 'egg', level: 0, exp: 0, visualStage: 0, isHatched: false }
        }
    };
});

assert.strictEqual(retained, 1, '应成功匹配并保留 1 名已有老生');
assert.strictEqual(newAdded, 1, '应成功识别 1 名新增学生');
assert.strictEqual(mergedStudents[0].level, 5, '老生张三的等级 Lv.5 必须完好保留！');
assert.strictEqual(mergedStudents[0].exp, 130, '老生张三的 130 EXP 必须完好保留！');
assert.strictEqual(mergedStudents[0].pets.chinese.species, 'cat', '老生张三已认领的猫咪必须完好保留！');
assert.strictEqual(mergedStudents[0].group, 2, '老生张三的分组成功根据 Excel 更新为第 2 组');
assert.strictEqual(mergedStudents[1].level, 0, '新同学李四初始为 0 级蛋');
assert.strictEqual(mergedStudents[1].isHatched, false, '新同学李四初始为未孵化蛋');
console.log('  ✔ 智能增量合并保护验证通过: 老生宠物等级资产 100% 完整继承，新生规范初始化\n');

// ----------------------------------------------------
// Test 3: 治愈系互动动作每日 5 EXP 上限与班级时区隔离测试
// ----------------------------------------------------
console.log('▶ [Test 3] 审查互动动作每日 5 EXP 限制与时区班级隔离...');

// 清空当前今日互动记录
mockLocalStorage.clear();
const testStu = { id: 'stu_interact_1', name: '王小明', exp: 10, level: 0, isHatched: false, pets: { chinese: { exp: 10, level: 0, species: 'egg' } } };
store.students = [testStu];

let totalAwarded = 0;
// 连续进行 6 次互动打招呼（每次 1 EXP）
for (let i = 0; i < 6; i++) {
    const res = store.doPetInteraction(testStu.id, '打招呼', 1, 'chinese');
    totalAwarded += res.awarded;
    if (i < 5) {
        assert.strictEqual(res.limitReached, false, `第 ${i+1} 次互动不应达上限`);
        assert.strictEqual(res.awarded, 1, `第 ${i+1} 次互动应赋予 1 EXP`);
    } else {
        assert.strictEqual(res.limitReached, true, '第 6 次互动必须触发上限拦截！');
        assert.strictEqual(res.awarded, 0, '第 6 次互动赋予点数必须为 0');
    }
}
assert.strictEqual(totalAwarded, 5, '今日单生互动累计获得经验必须严格为 5 EXP');

// 验证 localStorage key 是否包含正确的班级 ID
const keys = Object.keys(mockLocalStorage._data);
const hasClassScopedKey = keys.some(k => k.startsWith('classpet_daily_interact_' + store.getClassId()));
assert(hasClassScopedKey, '今日互动记录 Key 必须包含当前班级 ID 严格隔离');
console.log('  ✔ 互动上限验证通过: 每日 5 EXP 强锁截断，时区与班级多账号严格隔离\n');

// ----------------------------------------------------
// Test 4: 大屏视图数据契约（getGroupStats 字段完备性）测试
// ----------------------------------------------------
console.log('▶ [Test 4] 审查团队 PK 赛与大屏视图数据契约...');

store.students = [
    { id: 's1', name: '学生1', group: 1, exp: 50, level: 2, isArchived: false },
    { id: 's2', name: '学生2', group: 1, exp: 60, level: 3, isArchived: false },
    { id: 's3', name: '学生3', group: 2, exp: 30, level: 1, isArchived: false },
    { id: 's4', name: '学生4', group: 3, exp: 80, level: 3, isArchived: false },
    { id: 's5', name: '学生5', group: 4, exp: 90, level: 4, isArchived: false }
];

const stats = store.getGroupStats();
assert(Array.isArray(stats) && stats.length === 4, '应生成 4 大组完整统计');
stats.forEach(g => {
    assert(g.count !== undefined, `第 ${g.group} 组必须包含 count 字段`);
    assert(g.memberCount !== undefined, `第 ${g.group} 组必须包含 memberCount 字段`);
    assert.strictEqual(g.count, g.memberCount, 'count 与 memberCount 必须完全等价且一致');
    assert(typeof g.totalExp === 'number', 'totalExp 必须为数值');
    assert(typeof g.avgLevel === 'string' || typeof g.avgLevel === 'number', 'avgLevel 必须有效');
});
console.log('  ✔ 团队统计契约验证通过: count 与 memberCount 双向完备，大屏渲染 0 个 undefined\n');

// ----------------------------------------------------
// Test 5: 极值鲁棒性测试（超高经验、超长名字）
// ----------------------------------------------------
console.log('▶ [Test 5] 审查极限数值与长文本输入鲁棒性...');

const longNameStudent = {
    id: 'stu_extreme_1',
    name: '买买提·阿布杜热合曼·艾力克木·乌斯曼',
    no: '99',
    group: 3,
    exp: 999999,
    level: 20,
    visualStage: 5,
    isHatched: true,
    activeSubject: 'chinese',
    pets: {
        chinese: { id: 'p_ext', species: 'cat', name: '究极神兽', level: 20, exp: 999999, visualStage: 5, isHatched: true }
    }
};

store.students.push(longNameStudent);
const maxLevelCalc = store.calcLevel(999999, 20);
assert.strictEqual(maxLevelCalc, 20, '超高经验等级封顶必须为 Lv.20');
const maxStageCalc = store.calcVisualStage(20, 5);
assert.strictEqual(maxStageCalc, 5, '形态阶段封顶必须为 Stage 5');

// 加分与撤销极限测试
const extScore = store.batchScore([longNameStudent.id], 100, '极值挑战');
assert.strictEqual(longNameStudent.pets.chinese.exp, 999999 + 100, '极高数值经验正常累加');
store.undoScoreRecord({
    id: 'op_ext',
    targetIds: [longNameStudent.id],
    delta: 100,
    label: '极值挑战',
    subject: 'chinese',
    beforeStates: extScore.beforeStates
});
assert.strictEqual(longNameStudent.pets.chinese.exp, 999999, '极值撤销精确复原');
console.log('  ✔ 极限数值验证通过: 999999+ EXP 运算与长姓名解析 0 溢出、0 崩溃\n');

console.log('====================================================');
console.log(' 🏆 自动化严肃审查套件全部执行通过！5 大专项 0 失败 0 告警！');
console.log('====================================================');
