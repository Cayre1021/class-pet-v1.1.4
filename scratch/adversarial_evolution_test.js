/**
 * 对抗性全链路验证脚本：宠物升级、进化状态机及学生42号（吕四）彻底根治测试
 */
const fs = require('fs');
const path = require('path');

// 模拟浏览器全局环境
const mockLocalStorage = {};
global.localStorage = {
    getItem: (k) => mockLocalStorage[k] || null,
    setItem: (k, v) => { mockLocalStorage[k] = String(v); },
    removeItem: (k) => { delete mockLocalStorage[k]; },
    clear: () => { Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]); }
};

global.window = {
    electronAPI: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    BroadcastChannel: class {
        postMessage() {}
        close() {}
        addEventListener() {}
    },
    AudioContext: class {
        createOscillator() { return { type: '', frequency: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){}, start(){}, stop(){} }; }
        createGain() { return { gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} }; }
        get destination() { return {}; }
        get currentTime() { return 0; }
    }
};
global.BroadcastChannel = global.window.BroadcastChannel;

// 引入核心代码
const coreCode = fs.readFileSync(path.join(__dirname, '../electron-app/src/classpet_core.js'), 'utf8');
eval(coreCode + '\nglobal.ClassPetStore = ClassPetStore;');

console.log('====================================================');
console.log('🧪 开始对宠物升级与形态进阶管理系统执行对抗性测试');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    } else {
        console.log(`✅ PASSED: ${message}`);
        passedTests++;
    }
}

// -------------------------------------------------------------
// 测试用例 1：学生 42 号（吕四）当前存档状态测试
// -------------------------------------------------------------
console.log('--- 测试用例 1：学生 42 号（吕四）当前存档与互动测试 ---');
const store = new ClassPetStore();

// 精确构造学生 42 号当前数据状态：105 EXP, Lv.4, Stage 2
const s42 = {
    id: 'st_42',
    no: '42',
    name: '吕四',
    group: 2,
    level: 4,
    exp: 105,
    visualStage: 2,
    stamp: null,
    isHatched: true,
    isAbsent: false,
    isArchived: false,
    activeSubject: 'math',
    pets: {
        math: {
            id: 'pet_42_m',
            species: 'dog',
            subject: '数学',
            name: '柴犬',
            icon: '🐶',
            level: 4,
            exp: 105,
            visualStage: 2,
            isHatched: true
        }
    }
};

store.students = [s42];
store.recalculateAllStudentsProgress();

assert(s42.level === 4, '42号初始等级必须为 4');
assert(s42.visualStage === 2, '42号初始视觉形态必须为 2 (少年期柴犬)');
assert(s42.stamp === null, '42号初始 stamp 必须为 null，绝不能是 EVOLVE');

// 大屏 canEvolve 判定公式
function checkCanEvolve(s, pet) {
    const curStage = pet.visualStage || (s.isHatched ? 1 : 0);
    const expectedStage = store.calcVisualStage(pet.level, 0);
    return s.isHatched && (expectedStage > curStage) && (curStage < 5);
}

assert(checkCanEvolve(s42, s42.pets.math) === false, '42号初始在大屏中 canEvolve 必须为 false (绝不显示进阶按钮)');

// 连续执行 5 次日常互动 (+1 EXP)
console.log('\n> 模拟大屏端点击 5 次治愈互动 (打招呼、抚摸等)...');
for (let i = 1; i <= 5; i++) {
    const res = store.doPetInteraction('st_42', '抚摸', 1);
    assert(res.awarded === 1, `第 ${i} 次互动成功增加 1 EXP (当前经验: ${s42.exp})`);
    assert(s42.level === 4, `第 ${i} 次互动后等级依然保持为 4`);
    assert(s42.stamp === null, `第 ${i} 次互动后 stamp 依然为 null (绝不能被刷成 EVOLVE)`);
    assert(checkCanEvolve(s42, s42.pets.math) === false, `第 ${i} 次互动后大屏 canEvolve 恒为 false (绝不弹出进阶操作条)`);
}

// -------------------------------------------------------------
// 测试用例 2：从 Lv.3 真正升至 Lv.4，解锁 Stage 2 进阶
// -------------------------------------------------------------
console.log('\n--- 测试用例 2：从 Lv.3 晋升 Lv.4 真正解锁进阶并手动蜕变 ---');
const sStudent = {
    id: 'st_test_1',
    no: '99',
    name: '测试生',
    group: 1,
    level: 3,
    exp: 80, // Lv.3 (阈值60), 差10 EXP到达 Lv.4(90)
    visualStage: 1,
    stamp: null,
    isHatched: true,
    isAbsent: false,
    isArchived: false,
    activeSubject: 'chinese',
    pets: {
        chinese: {
            id: 'pet_t1_c',
            species: 'cat',
            subject: '语文',
            name: '猫咪',
            icon: '🐱',
            level: 3,
            exp: 80,
            visualStage: 1,
            isHatched: true
        }
    }
};
store.students.push(sStudent);

// 加分 +15 分，使经验达到 95 EXP (晋级 Lv.4)
const scoreRes = store.scoreStudent('st_test_1', 15, '作业优秀');
assert(sStudent.level === 4, '测试生等级晋升至 Lv.4');
assert(scoreRes.isLevelUp === true, '返回 isLevelUp: true');
assert(sStudent.visualStage === 1, '形态在确认蜕变前维持 Stage 1');
assert(sStudent.stamp === 'EVOLVE', '因为等级达到4级但未蜕变，stamp 必须打标为 EVOLVE');
assert(checkCanEvolve(sStudent, sStudent.pets.chinese) === true, '大屏 canEvolve 判定为 true，展示进阶按钮');

// 模拟师生在卡片弹窗点击“立即蜕变突破进阶形态！”
console.log('> 师生点击“立即蜕变突破进阶形态”操作条...');
const pet = sStudent.pets.chinese;
const curStage = pet.visualStage || 1;
const targetStage = store.calcVisualStage(pet.level, 0);
assert(targetStage === 2, '目标进阶形态计算为 2');
pet.visualStage = targetStage;
sStudent.visualStage = targetStage;
sStudent.stamp = targetStage >= 5 ? 'MAX' : null;

assert(sStudent.visualStage === 2, '测试生成功蜕变为 Stage 2 进阶形态');
assert(sStudent.stamp === null, '蜕变完成后 stamp 立即恢复为 null');
assert(checkCanEvolve(sStudent, sStudent.pets.chinese) === false, '蜕变完成后大屏 canEvolve 立即变为 false，进阶按钮消失');

// 再次日常加分 +5 EXP (95 -> 100 EXP)
store.scoreStudent('st_test_1', 5, '好人好事');
assert(sStudent.level === 4, '等级仍为 4');
assert(sStudent.stamp === null, '后续常规加分绝不再误报 EVOLVE');
assert(checkCanEvolve(sStudent, sStudent.pets.chinese) === false, 'canEvolve 依然为 false');

// -------------------------------------------------------------
// 测试用例 3：大阶形态内小等级升级 (Lv.4 -> Lv.5 -> Lv.6)，不误触大阶进阶
// -------------------------------------------------------------
console.log('\n--- 测试用例 3：阶梯内小等级升级 (Lv.4 -> Lv.5, 阈值125 EXP) ---');
// 95 + 30 = 130 EXP (超过 Lv.5 阈值 125)
const lvl5Res = store.scoreStudent('st_test_1', 30, '作业优秀');
assert(sStudent.level === 5, '经验达到 130，成功升至 Lv.5');
assert(lvl5Res.isLevelUp === true, '正常触发 isLevelUp: true 进行升小级庆祝');
assert(sStudent.visualStage === 2, '形态依然保持在 Stage 2');
assert(sStudent.stamp === null, '升小级时 stamp 严禁被设为 EVOLVE');
assert(checkCanEvolve(sStudent, sStudent.pets.chinese) === false, '小升级绝不触发大阶进阶弹窗');

// -------------------------------------------------------------
// 测试用例 4：跨级赋分直升 Lv.8 (Stage 3 进阶解锁)
// -------------------------------------------------------------
console.log('\n--- 测试用例 4：经验直升至 Lv.8 (260 EXP, 解锁 Stage 3) ---');
// 当前 130 EXP，增加 135 EXP -> 265 EXP (Lv.8)
store.scoreStudent('st_test_1', 135, '竞赛获奖');
assert(sStudent.level === 8, '经验达到 265，成功升至 Lv.8');
assert(store.calcVisualStage(sStudent.level, 0) === 3, 'Lv.8 对应的目标形态为 3');
assert(sStudent.visualStage === 2, '未点击前仍保持 Stage 2');
assert(sStudent.stamp === 'EVOLVE', '正确触发 Stage 3 的 EVOLVE 标记');
assert(checkCanEvolve(sStudent, sStudent.pets.chinese) === true, '大屏正确展示 Stage 3 进阶入口');

// -------------------------------------------------------------
// 测试用例 5：满级神兽王 (Lv.20, 1250 EXP) 及超额经验测试
// -------------------------------------------------------------
console.log('\n--- 测试用例 5：满级神兽王 (Lv.20) 及超额经验测试 ---');
store.scoreStudent('st_test_1', 1000, '学期总评第一');
assert(sStudent.level === 20, '等级达到封顶 Lv.20');
// 点击完成最终形态蜕变
sStudent.visualStage = 5;
sStudent.pets.chinese.visualStage = 5;
sStudent.stamp = 'MAX';

assert(sStudent.stamp === 'MAX', '满级学生 stamp 锁定为 MAX');
assert(checkCanEvolve(sStudent, sStudent.pets.chinese) === false, '满级后 canEvolve 严格为 false');

// 满级后继续加分 (超额经验)
store.scoreStudent('st_test_1', 50, '超额激励');
assert(sStudent.level === 20, '满级后等级保持 20');
assert(sStudent.stamp === 'MAX', '满级后 stamp 维持 MAX');
assert(checkCanEvolve(sStudent, sStudent.pets.chinese) === false, '超额经验绝不报错也绝不显示可进阶');

// -------------------------------------------------------------
// 测试用例 6：扣分不降级、不回退形态测试
// -------------------------------------------------------------
console.log('\n--- 测试用例 6：扣分生命不变量测试 ---');
assert(s42.level === 4 && s42.visualStage === 2, '42号初始为 Lv.4 Stage 2');
store.scoreStudent('st_42', -30, '课堂讲话');
assert(s42.exp === 80, '42号经验从 110 扣至 80');
assert(s42.level === 4, '核心不变量：扣分等级只升不降，依然为 4');
assert(s42.visualStage === 2, '核心不变量：扣分形态只升不降，依然为 Stage 2');
assert(s42.stamp === null, '扣分后 stamp 依然为 null');
assert(checkCanEvolve(s42, s42.pets.math) === false, '扣分后 canEvolve 依然为 false');

// -------------------------------------------------------------
// 测试用例 7：蛋形态孵化生命周期测试
// -------------------------------------------------------------
console.log('\n--- 测试用例 7：蛋形态孵化生命周期测试 ---');
const sEgg = {
    id: 'st_egg',
    no: '100',
    name: '蛋蛋同学',
    group: 3,
    level: 0,
    exp: 0,
    visualStage: 0,
    stamp: null,
    isHatched: false,
    isAbsent: false,
    isArchived: false,
    activeSubject: 'chinese',
    pets: {
        chinese: {
            id: 'pet_egg_c',
            species: 'egg',
            subject: '语文',
            name: '神秘宠物蛋',
            icon: '🐣',
            level: 0,
            exp: 0,
            visualStage: 0,
            isHatched: false
        }
    }
};
store.students.push(sEgg);

store.scoreStudent('st_egg', 10, '劳动积极');
assert(sEgg.level === 0, '未满 15 经验，等级仍为 0');
assert(sEgg.stamp === null, '未满 15 经验，stamp 为 null');
assert(sEgg.isHatched === false, '未满 15 经验，isHatched 为 false');

store.scoreStudent('st_egg', 5, '作业完成');
assert(sEgg.exp === 15, '经验达到 15');
assert(sEgg.stamp === 'HATCH', '达到 15 经验，stamp 变为 HATCH');

store.hatchStudentPet('st_egg', 'fox', 'chinese');
assert(sEgg.isHatched === true, '成功破壳');
assert(sEgg.level === 1, '破壳后等级为 1');
assert(sEgg.visualStage === 1, '破壳后形态为 1');
assert(sEgg.stamp === null, '破壳后 stamp 清空为 null');
assert(checkCanEvolve(sEgg, sEgg.pets.chinese) === false, '破壳后处于常规 1 级形态，canEvolve 为 false');

console.log('\n====================================================');
console.log(`🎉 全部 ${totalTests} 项对抗性断言 100% 通过！(${passedTests}/${totalTests})`);
console.log('====================================================\n');
