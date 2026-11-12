// test_subject_switch_locked_hatch.js
// Verification for:
// 1. When switching subjects, unhatched or locked pets cannot be scored
// 2. Strict defensive guards at Store and UI levels
// 3. Permitted scoring after pet is properly unlocked and hatched

const path = require('path');
const fs = require('fs');

// Mock localStorage and BroadcastChannel
const storage = {};
global.localStorage = {
    getItem: (k) => storage[k] !== undefined ? storage[k] : null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

global.BroadcastChannel = class {
    constructor(name) { this.name = name; }
    postMessage(msg) {}
    close() {}
};

global.Audio = class {
    play() { return Promise.resolve(); }
    pause() {}
};

global.window = {
    addEventListener: () => {},
    localStorage: global.localStorage,
    BroadcastChannel: global.BroadcastChannel
};

const { ClassPetStore } = require('./electron-app/src/classpet_core.js');

async function runTests() {
    console.log('🧪 Starting Subject Switch & Unhatched/Locked Pet Scoring Guard Verification...\n');
    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
        if (cond) {
            console.log(`  ✅ PASS: ${msg}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${msg}`);
            failed++;
        }
    }

    const store = new ClassPetStore();
    assert(store.students.length === 42, 'Store 成功加载 42 名学生种子数据');

    // ----------------------------------------------------
    // TEST 1: Chinese Subject (Initial Baseline)
    // ----------------------------------------------------
    console.log('\n--- 1. 验证语文科目初始加分资格（语文蛋形态允许正常加分） ---');
    const s1 = store.students.find(s => s.name === '张三'); // 张三, Lv.1, 已破壳
    const s40 = store.students.find(s => s.name === '魏三'); // 魏三, Lv.0, 未孵化蛋 (10 EXP)
    const s41 = store.students.find(s => s.name === '吕四'); // 吕四, Lv.1, 待破壳蛋 (15 EXP)
    const sMax = store.students.find(s => s.name === '孙七'); // 孙七, Lv.20, 终极满级已破壳

    // 模拟新增学生【许3】（初始为蛋形态，0分0级）
    const xu3 = await store.addStudent({ name: '许3', group: 1 });
    assert(xu3 !== null && xu3.name === '许3', '成功新增学生【许3】');

    const chkS1_cn = store.canScoreStudentPet(s1.id, 'chinese');
    assert(chkS1_cn.allowed === true, '张三（已破壳萌宠）在语文科目具备加分资格');

    const chkXu3_cn = store.canScoreStudentPet(xu3.id, 'chinese');
    assert(chkXu3_cn.allowed === true, '许3（新增学生，初始语文蛋）具备加分资格（语文的蛋允许加分！）');

    const chkS40_cn = store.canScoreStudentPet(s40.id, 'chinese');
    assert(chkS40_cn.allowed === true, '魏三（未孵化蛋形态）在语文科目具备正常加分资格');

    // 实际执行加分：对新增学生许3赋分
    const xu3ScoreRes = store.scoreStudent(xu3.id, 5, '课前预习优秀', false, 'chinese');
    assert(xu3ScoreRes.success === true && xu3ScoreRes.blocked !== true, '成功对新增学生许3的语文蛋完成加分！');
    assert(xu3.pets.chinese.exp === 5, '许3语文蛋经验顺利从 0 增至 5 EXP');

    // ----------------------------------------------------
    // TEST 2: Switch to Math Subject
    // ----------------------------------------------------
    console.log('\n--- 2. 验证切换至【数学】科目后的严格加分锁定 ---');
    store.setCurrentTeachingSubject('math');
    assert(store.getCurrentTeachingSubject() === 'math', '当前授课科目已切换为数学');

    // A. 普通学生（张三，语文未满20级）：数学未解锁
    const chkS1_ma = store.canScoreStudentPet(s1.id, 'math');
    assert(chkS1_ma.allowed === false, '张三（语文未满20级）在数学科目被判定为不可赋分');
    assert(chkS1_ma.type === 'LOCKED', '张三数学锁定原因准确为 LOCKED (需前置学科达成满级)');

    const s1MathBefore = s1.pets.math.exp || 0;
    const s1MathScoreRes = store.scoreStudent(s1.id, 5, '数学作业', false, 'math');
    assert(s1MathScoreRes.blocked === true, '张三在数学科目赋分被严格拦截 (blocked === true)');
    assert((s1.pets.math.exp || 0) === s1MathBefore, '张三数学宠物经验严格保持 ' + s1MathBefore + '，未被增加');

    // B. 孙七（语文已达20级满级）：数学已具备解锁资格，但尚未破壳认领（仍为蛋形态）
    const chkSMax_ma = store.canScoreStudentPet(sMax.id, 'math');
    assert(store.isSubjectUnlocked(sMax.id, 'math') === true, '孙七语文已达 Lv.20 满级，数学科目已解锁觉醒资格');
    assert(chkSMax_ma.allowed === false, '孙七数学宠物尚未孵化破壳，被加分拦截 (allowed === false)');
    assert(chkSMax_ma.type === 'UNHATCHED', '孙七数学锁定原因准确为 UNHATCHED (未孵化蛋形态)');

    const sMaxMathBefore = sMax.pets.math.exp || 0;
    const sMaxMathScoreRes = store.scoreStudent(sMax.id, 5, '数学发言', false, 'math');
    assert(sMaxMathScoreRes.blocked === true, '孙七未孵化数学蛋赋分被拦截 (blocked === true)');
    assert((sMax.pets.math.exp || 0) === sMaxMathBefore, '孙七数学蛋经验严格保持 ' + sMaxMathBefore);

    // C. 批量赋分测试：全员未解锁/未孵化时整批被拦截
    const batchRes = store.batchScore([s1.id, sMax.id], 5, '全班数学加分', false, 'math');
    assert(batchRes.blocked === true, '批量赋分在全员未解锁/未破壳时整体安全拦截 (blocked === true)');
    assert(batchRes.eligibleIds.length === 0, '合格加分学生列表为空 (eligibleIds.length === 0)');
    assert(batchRes.blockedRecords.length === 2, '详细记录 2 名学生的拦截原因');

    // ----------------------------------------------------
    // TEST 3: Hatching Unlocks Scoring Capability
    // ----------------------------------------------------
    console.log('\n--- 3. 验证破壳孵化诞生后成功开放加分通道 ---');
    // 孙七在数学科目破壳认领【柴犬】
    const hatchedPet = store.hatchStudentPet(sMax.id, 'dog', 'math');
    assert(hatchedPet !== null, '孙七成功破壳认领数学专属宠物【柴犬】');
    assert(sMax.pets.math.isHatched === true, '孙七数学宠物 isHatched 状态变为 true');
    assert(sMax.pets.math.species === 'dog', '孙七数学宠物物种确认为 dog');
    assert(sMax.pets.math.level >= 1, '孙七数学宠物初始等级为 Lv.1 幼宠期');

    // 检查孙七在数学科目的加分资格
    const chkSMax_ma_after = store.canScoreStudentPet(sMax.id, 'math');
    assert(chkSMax_ma_after.allowed === true, '破壳认领后，孙七在数学科目正式具备加分资格！');

    // 赋予数学加分
    const sMaxExpBeforeHatchScore = sMax.pets.math.exp;
    const scoreMathRes = store.scoreStudent(sMax.id, 5, '数学奥数解题优秀', false, 'math');
    assert(scoreMathRes.blocked !== true && scoreMathRes.success === true, '孙七数学加分成功执行！');
    assert(sMax.pets.math.exp === sMaxExpBeforeHatchScore + 5, `孙七数学宠物经验从 ${sMaxExpBeforeHatchScore} 增至 ${sMax.pets.math.exp}`);

    // 混合批量赋分：张三（未解锁拦截） + 孙七（已破壳加分）
    const mixBatchRes = store.batchScore([s1.id, sMax.id], 3, '随堂小测', false, 'math');
    assert(mixBatchRes.success === true, '混合批量赋分安全通过');
    assert(mixBatchRes.eligibleIds.length === 1 && mixBatchRes.eligibleIds[0] === sMax.id, '仅对具备资格的孙七加分');
    assert(mixBatchRes.blockedRecords.length === 1 && mixBatchRes.blockedRecords[0].id === s1.id, '张三被安全保护跳过');
    assert(sMax.pets.math.exp === sMaxExpBeforeHatchScore + 5 + 3, '孙七经验再累加 3 分');
    assert((s1.pets.math.exp || 0) === s1MathBefore, '张三经验始终保持 0 未受干扰');

    // ----------------------------------------------------
    // TEST 4: Pet Interaction Daily Guard
    // ----------------------------------------------------
    console.log('\n--- 4. 验证宠物深度互动收益守卫 ---');
    // 对张三的未解锁数学宠物进行互动：收益必须为 0
    const interactResLocked = store.doPetInteraction(s1.id, '抚摸', 1, 'math');
    assert(interactResLocked.awarded === 0, '对未解锁数学宠物互动经验收益严格为 0');
    assert(interactResLocked.quote.includes('尚未解锁'), '互动提示明确告知尚未解锁');

    // 对孙七已破壳的数学宠物进行互动：正常获得 1 EXP 收益
    const interactResHatched = store.doPetInteraction(sMax.id, '抚摸', 1, 'math');
    assert(interactResHatched.awarded === 1, '对已破壳数学宠物互动正常获得 1 EXP');

    console.log(`\n==================================================`);
    console.log(`Summary: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log('🎉 All unhatched/locked pet scoring guard tests passed successfully! (100%)');
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
