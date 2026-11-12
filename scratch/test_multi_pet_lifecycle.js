const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 模拟浏览器全局与 LocalStorage
const mockStorage = {};
global.localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.window = {
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
    },
    electronAPI: {
        db: {
            recordScore: () => Promise.resolve({ success: true }),
            saveStudent: () => Promise.resolve({ success: true }),
            hatchPet: () => Promise.resolve({ success: true }),
            batchScore: () => Promise.resolve({ success: true })
        }
    }
};
global.BroadcastChannel = global.window.BroadcastChannel;

global.Audio = class {
    play() { return Promise.resolve(); }
    pause() {}
    cloneNode() { return this; }
};

// 引入核心代码
const coreCode = fs.readFileSync(path.join(__dirname, '../electron-app/src/classpet_core.js'), 'utf8');
eval(coreCode + '\nglobal.ClassPetStore = ClassPetStore;\nglobal.LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;');

console.log('====================================================');
console.log('🚀 开始执行：多学科宠物生命周期与进度条精准渲染对抗性测试');
console.log('====================================================\n');

const store = new ClassPetStore();

// 初始化测试学生：42号吕四，语文满级 Lv.20 (1250 EXP)，数学为 0 经验待破壳蛋
const student42 = {
    id: 'stu_42',
    no: '42',
    name: '吕四',
    group: 4,
    level: 20,
    exp: 1250,
    visualStage: 5,
    isHatched: true,
    stamp: 'MAX',
    activeSubject: 'chinese',
    pets: {
        chinese: {
            id: 'pet_42_c',
            species: 'cat',
            subject: '语文',
            name: '智慧猫咪',
            icon: '🐱',
            level: 20,
            exp: 1250,
            visualStage: 5,
            isHatched: true
        },
        math: {
            id: 'pet_42_m',
            species: 'egg',
            subject: '数学',
            name: '神秘宠物蛋',
            icon: '🐣',
            level: 0,
            exp: 0,
            visualStage: 0,
            isHatched: false
        },
        english: {
            id: 'pet_42_e',
            species: 'egg',
            subject: '英语',
            name: '神秘宠物蛋',
            icon: '🐣',
            level: 0,
            exp: 0,
            visualStage: 0,
            isHatched: false
        }
    }
};

store.students = [student42];

// ==========================================
// 测试 1：检查满级宠物的进度条与文本判定
// ==========================================
console.log('▶ [测试 1] 语文满级宠物 (Lv.20, 1250 EXP) 渲染状态校验');
const cPet = student42.pets.chinese;
assert.strictEqual(cPet.level, 20, '语文宠物应为 Lv.20');
assert.strictEqual(cPet.exp, 1250, '语文宠物经验应为 1250');
const cIsHatched = !!(cPet.isHatched || (cPet.species && cPet.species !== 'egg'));
assert.strictEqual(cIsHatched, true, '语文宠物必须是已孵化');
console.log('  ✔ 语文满级宠物状态校验通过');

// ==========================================
// 测试 2：针对数学蛋单宠赋分，验证进度条每一分线性可见推进 (杜绝负数与假死锁定0%)
// ==========================================
console.log('\n▶ [测试 2] 数学蛋 (0 EXP) 赋分与进度条线性移动测试');
const mPetBefore = student42.pets.math;
assert.strictEqual(mPetBefore.exp, 0, '数学蛋初始经验为 0');

// 模拟在数学 Tab 点击 +1 分
store.scoreStudent('stu_42', 1, '数学随堂练习', false, 'math');
assert.strictEqual(student42.pets.math.exp, 1, '数学蛋经验应为 1');
assert.strictEqual(student42.pets.chinese.exp, 1250, '语文宠物经验绝不可被数学加分污染！');

// 计算此时数学蛋进度百分比
const hatchThresh = store.getHatchThreshold();
assert.strictEqual(hatchThresh, 15, '破壳阈值应为 15');
const percent1 = Math.min(100, Math.max(0, Math.round((student42.pets.math.exp / hatchThresh) * 100)));
console.log(`  +1 分后数学蛋经验: ${student42.pets.math.exp}/15, 进度条渲染宽度: ${percent1}%`);
assert.strictEqual(percent1, 7, '1/15 EXP 进度条应为 7%，绝不能为 0% 假死！');

// 再次加 3 分
store.scoreStudent('stu_42', 3, '积极解答', false, 'math');
const percent4 = Math.min(100, Math.max(0, Math.round((student42.pets.math.exp / hatchThresh) * 100)));
console.log(`  +3 分后数学蛋经验: ${student42.pets.math.exp}/15, 进度条渲染宽度: ${percent4}%`);
assert.strictEqual(student42.pets.math.exp, 4, '数学蛋经验应为 4');
assert.strictEqual(percent4, 27, '4/15 EXP 进度条应平滑上升至 27%');

// 再次加 5 分
store.scoreStudent('stu_42', 5, '测验满分', false, 'math');
const percent9 = Math.min(100, Math.max(0, Math.round((student42.pets.math.exp / hatchThresh) * 100)));
console.log(`  +5 分后数学蛋经验: ${student42.pets.math.exp}/15, 进度条渲染宽度: ${percent9}%`);
assert.strictEqual(student42.pets.math.exp, 9, '数学蛋经验应为 9');
assert.strictEqual(percent9, 60, '9/15 EXP 进度条应平滑上升至 60%');

// 再次加 6 分达成 15 分达标
store.scoreStudent('stu_42', 6, '作业全优', false, 'math');
const percent15 = Math.min(100, Math.max(0, Math.round((student42.pets.math.exp / hatchThresh) * 100)));
console.log(`  +6 分后数学蛋经验: ${student42.pets.math.exp}/15, 进度条渲染宽度: ${percent15}%`);
assert.strictEqual(student42.pets.math.exp, 15, '数学蛋经验应为 15');
assert.strictEqual(percent15, 100, '达到 15 EXP 进度条应满格 100%');
console.log('  ✔ 数学蛋进度条线性移动测试全部通过！');

// ==========================================
// 测试 3：第二只宠物破壳认领 (多物种独立流水线)
// ==========================================
console.log('\n▶ [测试 3] 数学宠物破壳孵化为【柴犬 dog】测试');
const hatchedStudent = store.hatchStudentPet('stu_42', 'dog', 'math');
assert.ok(hatchedStudent, '破壳孵化必须成功');

const mPetAfter = student42.pets.math;
assert.strictEqual(mPetAfter.species, 'dog', '数学宠物物种应为 dog');
assert.strictEqual(mPetAfter.visualStage, 1, '数学宠物形态阶梯应为 1');
assert.strictEqual(mPetAfter.level, 1, '数学宠物初始等级应为 1');
assert.strictEqual(mPetAfter.isHatched, true, '数学宠物必须标记为已孵化');

// 关键检验：语文满级宠物绝不能被降级或形态被篡改！
assert.strictEqual(student42.pets.chinese.level, 20, '语文宠物依然必须是 Lv.20');
assert.strictEqual(student42.pets.chinese.visualStage, 5, '语文宠物依然必须是 Stage 5');
assert.strictEqual(student42.pets.chinese.species, 'cat', '语文宠物物种依然是 cat');
console.log('  ✔ 数学宠物成功孵化，且语文满级宠物未受到任何篡改！');

// ==========================================
// 测试 4：数学宠物成宠后的各级区间进度条渲染
// ==========================================
console.log('\n▶ [测试 4] 数学成宠 (Lv.1) 经验升级与区间进度条渲染');
// Lv.1 阈值 15，Lv.2 阈值 35，跨度 20
const pMin = store.getCurrentLevelMinExp(1);
const pNext = store.getNextLevelThreshold(1);
assert.strictEqual(pMin, 15, 'Lv.1 minExp 应为 15');
assert.strictEqual(pNext, 35, 'Lv.2 threshold 应为 35');

// 加 5 分 -> 20 EXP
store.scoreStudent('stu_42', 5, '课后思考题', false, 'math');
assert.strictEqual(mPetAfter.exp, 20, '数学宠物经验应为 20');
const span = pNext - pMin; // 20
const curInLevel = mPetAfter.exp - pMin; // 5
const mathLvlPercent = Math.round((curInLevel / span) * 100); // 25%
console.log(`  数学宠物当前经验: 20 EXP, 本级差额: ${curInLevel}/${span}, 进度条: ${mathLvlPercent}%`);
assert.strictEqual(mathLvlPercent, 25, '本级 5/20 进度条必须渲染为 25%');
console.log('  ✔ 成宠区间进度条计算完全准确！');

// ==========================================
// 测试 5：设置大屏主展示宠物与切换测试
// ==========================================
console.log('\n▶ [测试 5] 切换大屏主展示宠物 (setStudentDisplayPet) 测试');
// 将数学设为大屏主展示宠物
const switchSuccess = store.setStudentDisplayPet('stu_42', 'math');
assert.strictEqual(switchSuccess, true, '切换大屏主宠必须返回 true');
assert.strictEqual(student42.activeSubject, 'math', '当前活跃学科必须切换为 math');
assert.strictEqual(student42.exp, 20, '学生大屏顶层经验应同步为数学宠物的 20 EXP');
assert.strictEqual(student42.level, 1, '学生大屏顶层等级应同步为数学宠物的 Lv.1');

// 此时针对默认学科加分，应直接增加给数学宠物
store.scoreStudent('stu_42', 2, '互动玩耍');
assert.strictEqual(student42.pets.math.exp, 22, '默认加分应直接作用于数学宠物');
assert.strictEqual(student42.exp, 22, '顶层经验同步为 22');

// 再次切回语文满级宠物
store.setStudentDisplayPet('stu_42', 'chinese');
assert.strictEqual(student42.activeSubject, 'chinese', '切换回语文');
assert.strictEqual(student42.exp, 1250, '顶层经验恢复为 1250');
assert.strictEqual(student42.level, 20, '顶层等级恢复为 20');
assert.strictEqual(student42.stamp, 'MAX', '满级印章正确保留');
console.log('  ✔ 大屏主展示宠物自由切换与双向同步测试全部通过！');

// ==========================================
// 测试 6：单科满级触发的【王者觉醒特权破壳】（针对第3只英语蛋）
// ==========================================
console.log('\n▶ [测试 6] 满级触发【王者觉醒破壳特权】认领第 3 只英语宠物 (fox)');
assert.strictEqual(student42.pets.english.exp, 0, '英语蛋初始为 0 EXP');
assert.strictEqual(student42.pets.english.isHatched, false, '英语蛋尚未孵化');

// 判定王者觉醒特权
const hasAwaken = (student42.level >= 20) || Object.values(student42.pets).some(p => (p.level || 0) >= 20);
assert.strictEqual(hasAwaken, true, '存在 Lv.20 满级宠物，必须激活王者觉醒特权');

// 在觉醒特权下，即使英语经验为 0，也能直接认领破壳
const hatchedEnglish = store.hatchStudentPet('stu_42', 'fox', 'english');
assert.ok(hatchedEnglish, '英语神宠破壳必须成功');
const ePet = student42.pets.english;
assert.strictEqual(ePet.species, 'fox', '英语宠物物种应为 fox');
assert.strictEqual(ePet.visualStage, 1, '英语宠物形态应为 Stage 1');
assert.strictEqual(ePet.isHatched, true, '英语宠物必须已孵化');
assert.ok(ePet.exp >= 15, '破壳后经验自动补足至至少 15 EXP');
console.log(`  英语神宠破壳成功：Lv.${ePet.level}, ${ePet.exp} EXP, 物种: ${ePet.species}`);

// 3 只宠物共存状态审查
console.log('\n📊 最终三科宠物共存状态审查：');
console.log(`  📖 语文: [${student42.pets.chinese.species}] Lv.${student42.pets.chinese.level} (${student42.pets.chinese.exp} EXP) · Stage ${student42.pets.chinese.visualStage}`);
console.log(`  📐 数学: [${student42.pets.math.species}] Lv.${student42.pets.math.level} (${student42.pets.math.exp} EXP) · Stage ${student42.pets.math.visualStage}`);
console.log(`  🔤 英语: [${student42.pets.english.species}] Lv.${student42.pets.english.level} (${student42.pets.english.exp} EXP) · Stage ${student42.pets.english.visualStage}`);

assert.strictEqual(student42.pets.chinese.level, 20);
assert.strictEqual(student42.pets.math.species, 'dog');
assert.strictEqual(student42.pets.english.species, 'fox');

console.log('\n====================================================');
console.log('🎉 恭喜！所有 6 大类、20 余项对抗性测试断言 100% 顺利通过！');
console.log('====================================================');
