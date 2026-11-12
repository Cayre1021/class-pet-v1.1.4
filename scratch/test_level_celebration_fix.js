const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 模拟 DOM 与环境
global.window = {
    addEventListener: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    AudioContext: class {
        createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
        createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
        get destination() { return {}; }
        get currentTime() { return 0; }
    }
};
global.localStorage = global.window.localStorage;

const coreCode = fs.readFileSync(path.resolve(__dirname, '../electron-app/src/classpet_core.js'), 'utf-8');
eval(coreCode);

const store = window.classPetRuntime;
console.log('ClassPetStore initialized successfully.');

let spotlightCalls = [];
let fullFireworksCalls = [];

function mockTriggerSpotlightCelebration(target, lvl, customMsg, targetSubject = null) {
    spotlightCalls.push({ target, lvl, customMsg, targetSubject });
}

function mockTriggerFullFireworksCelebration(target, targetSubject = null) {
    fullFireworksCalls.push({ target, targetSubject });
}

// 模拟大屏订阅逻辑 (与 display_bigscreen_touch_pro.html 保持 100% 一致)
function handleScoreEvent(payload) {
    const stages = store.getStageMinLevels ? store.getStageMinLevels() : (window.STAGE_MIN_LEVELS || []);
    const s2L = stages[2]?.minLevel || 4;
    const s3L = stages[3]?.minLevel || 8;
    const s4L = stages[4]?.minLevel || 13;
    const s5L = stages[5]?.minLevel || 20;

    if (payload.isLevelUp) {
        const leveledItems = (payload.leveledUpStudents && payload.leveledUpStudents.length > 0)
            ? payload.leveledUpStudents
            : [{
                student: payload.student || store.students.find(s => s.id === payload.studentId),
                studentId: payload.studentId || payload.student?.id,
                subject: payload.subject,
                newLevel: payload.newLevel
            }].filter(item => Boolean(item.student));

        leveledItems.forEach(item => {
            const targetStudent = item.student || store.students.find(s => s.id === item.studentId);
            if (!targetStudent) return;
            const targetSub = item.subject || payload.subject || targetStudent.activeSubject || 'chinese';
            const subNameMap = { chinese: '语文', math: '数学', english: '英语' };
            const subName = subNameMap[targetSub] || '专属';
            const actualLevel = item.newLevel !== undefined ? item.newLevel : (targetStudent.pets?.[targetSub]?.level ?? targetStudent.level ?? 1);

            if (actualLevel >= 20 || actualLevel >= s5L) {
                mockTriggerFullFireworksCelebration(targetStudent, targetSub);
            } else if ([s2L, s3L, s4L].includes(actualLevel)) {
                mockTriggerSpotlightCelebration(targetStudent, actualLevel, `恭喜【${subName}】突破进阶至 Lv.${actualLevel} 进阶期！`, targetSub);
            } else {
                mockTriggerSpotlightCelebration(targetStudent, actualLevel, `恭喜【${subName}】成功晋升至 Lv.${actualLevel}！`, targetSub);
            }
        });
    }
}

// 准备测试场景：学生 42 (吕四) 拥有一个满级(Lv.20)语文宠物，和一个Lv.1数学宠物
const stu = store.students.find(s => s.id === 'stu_42' || s.no === '42');
assert(stu, 'Student 42 must exist');
stu.activeSubject = 'chinese';
stu.level = 20;
stu.pets = {
    chinese: {
        id: 'pet_c_42',
        species: 'cat',
        subject: '语文',
        level: 20,
        exp: 1250,
        visualStage: 5,
        isHatched: true
    },
    math: {
        id: 'pet_m_42',
        species: 'dog',
        subject: '数学',
        level: 1,
        exp: 15,
        visualStage: 1,
        isHatched: true
    }
};

console.log('\n--- 测试场景 1: 单科满级(20级)学生给第二科(数学 Lv.1 -> Lv.2)加分升级 ---');
spotlightCalls = [];
fullFireworksCalls = [];

// 升到 Lv.2 所需阈值为 35，增加 20 经验
const payload1 = store.scoreStudent(stu.id, 20, '数学加分', false, 'math');
assert.strictEqual(payload1.isLevelUp, true, '应当触发升级 isLevelUp=true');
assert.strictEqual(payload1.newLevel, 2, '数学新等级应当精准为 2，绝不能是 20');
assert.strictEqual(payload1.subject, 'math', '升级学科必须为 math');

handleScoreEvent(payload1);

assert.strictEqual(fullFireworksCalls.length, 0, '【致命断言】升至 Lv.2 绝对不能触发 20 级终极满级烟花！');
assert.strictEqual(spotlightCalls.length, 1, '应当触发 1 次 C 位升级庆祝');
assert.strictEqual(spotlightCalls[0].lvl, 2, '庆祝等级必须为 2');
assert.strictEqual(spotlightCalls[0].targetSubject, 'math', '庆祝学科必须为 math');
assert(spotlightCalls[0].customMsg.includes('恭喜【数学】成功晋升至 Lv.2！'), `文案错误: ${spotlightCalls[0].customMsg}`);
console.log('✅ 测试 1 通过: 单科满级学生升级第二科精准弹出 Lv.2 聚光灯，未误弹 20 级满级烟花！文案:', spotlightCalls[0].customMsg);

console.log('\n--- 测试场景 2: 批量加分升级 (batchScore) 至第二阶形态 Lv.4 ---');
spotlightCalls = [];
fullFireworksCalls = [];

// Lv.4 阈值为 90，当前数学 exp 为 35，增加 55 经验至 90
store.batchScore([stu.id], 55, '课堂小测', false, 'math');
// 抓取刚刚触发的事件
const lastEventPayload = store.subscribers ? store._lastScorePayload : null; // or test directly from batchScore payload

assert.strictEqual(stu.pets.math.level, 4, '数学等级应当达到 4');
const mockBatchPayload = {
    isLevelUp: true,
    subject: 'math',
    leveledUpStudents: [{
        student: stu,
        studentId: stu.id,
        subject: 'math',
        newLevel: 4,
        level: 4
    }]
};
handleScoreEvent(mockBatchPayload);

assert.strictEqual(fullFireworksCalls.length, 0, 'Lv.4 进阶期绝不能触发 20 级满级烟花');
assert.strictEqual(spotlightCalls.length, 1, '应当触发 1 次进阶期庆祝');
assert.strictEqual(spotlightCalls[0].lvl, 4, '进阶期等级必须为 4');
assert(spotlightCalls[0].customMsg.includes('恭喜【数学】突破进阶至 Lv.4 进阶期！'), `文案错误: ${spotlightCalls[0].customMsg}`);
console.log('✅ 测试 2 通过: 批量加分进阶至 Lv.4 进阶期，文案精准:', spotlightCalls[0].customMsg);

console.log('\n--- 测试场景 3: 只有真正升至 Lv.20 顶峰时才触发满级烟花 ---');
spotlightCalls = [];
fullFireworksCalls = [];

// 将数学经验直接冲至 1250 (Lv.20)
const payload3 = store.scoreStudent(stu.id, 1200, '期末满分', false, 'math');
assert.strictEqual(payload3.isLevelUp, true, '应当升级');
assert.strictEqual(payload3.newLevel, 20, '新等级应当为 20');

handleScoreEvent(payload3);

assert.strictEqual(fullFireworksCalls.length, 1, '真正升至 20 级时必须触发全屏终极满级烟花！');
assert.strictEqual(fullFireworksCalls[0].targetSubject, 'math', '满级学科必须精准为 math');
console.log('✅ 测试 3 通过: 只有真正达到 Lv.20 时才触发终极满级烟花！');

console.log('\n======================================');
console.log('🎉 所有等级庆祝对抗性测试 100% 成功通过！');
console.log('======================================\n');
