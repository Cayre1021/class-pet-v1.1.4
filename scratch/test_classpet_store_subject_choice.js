const assert = require('assert');
const path = require('path');

// Mock localStorage and window
const localStorageMock = (function() {
    let store = {};
    return {
        getItem: function(key) {
            return store[key] !== undefined ? store[key] : null;
        },
        setItem: function(key, value) {
            store[key] = value.toString();
        },
        removeItem: function(key) {
            delete store[key];
        },
        clear: function() {
            store = {};
        }
    };
})();

global.localStorage = localStorageMock;
global.window = {
    addEventListener: () => {},
    localStorage: localStorageMock
};
global.BroadcastChannel = class {
    constructor() {}
    postMessage() {}
    close() {}
};

const { ClassPetStore } = require('../electron-app/src/classpet_core.js');

const store = new ClassPetStore();
store.students = [];

// 1. 初始化测试学生 1: 语文等级仅为 Lv.5
store.students.push({
    id: 's_test_1',
    name: '张三',
    no: '01',
    level: 5,
    pets: {
        chinese: { species: 'cat', level: 5, isHatched: true, visualStage: 1 },
        math: { species: 'egg', level: 0, isHatched: false, visualStage: 0 },
        english: { species: 'egg', level: 0, isHatched: false, visualStage: 0 }
    }
});

console.log('[Test 1] 阶段 1: 语文 Lv.5 (未满20级)');
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'chinese'), true, 'Chinese is unlocked');
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'math'), false, 'Math is locked');
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'english'), false, 'English is locked');
assert.strictEqual(store.getSubjectLockPrompt('s_test_1', 'math'), '需【语文】学科宠物升至 Lv.20 满级方可唤醒');
assert.strictEqual(store.getSubjectLockPrompt('s_test_1', 'english'), '需【语文】学科宠物升至 Lv.20 满级方可唤醒');
console.log('✅ Test 1 Passed: 语文未满 20 级时，数学与英语坚决锁定并正确输出提示');

// 2. 语文达到 Lv.20 满级 (二选一阶段)
store.students[0].pets.chinese.level = 20;
store.students[0].level = 20;

console.log('[Test 2] 阶段 2: 语文升至 Lv.20 满级 (二选一自由解锁阶段)');
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'chinese'), true);
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'math'), true, 'Math IS UNLOCKED for choice');
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'english'), true, 'English IS UNLOCKED for choice');
assert.strictEqual(store.getSubjectLockPrompt('s_test_1', 'math'), null);
assert.strictEqual(store.getSubjectLockPrompt('s_test_1', 'english'), null);

const hatchOptions = store.getAvailableHatchSubjects('s_test_1');
console.log('  -> 班主任角色可选学科:', hatchOptions.allowedSubjects);
assert.deepStrictEqual(hatchOptions.allowedSubjects, ['math', 'english'], 'Both Math and English are allowed for hatching');
console.log('✅ Test 2 Passed: 语文满级后，数学和英语同时解锁二选一');

// 3. 学生选择先孵化【英语】！(English first path)
console.log('[Test 3] 阶段 3: 学生选择二选一中的【英语】进行孵化破壳 (English Lv.1)');
store.hatchStudentPet('s_test_1', 'fox', 'english');
assert.strictEqual(store.students[0].pets.english.isHatched, true);
assert.strictEqual(store.students[0].pets.english.species, 'fox');
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'english'), true, 'English is unlocked (hatched)');
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'math'), false, 'Math is now locked as third subject until English reaches 20');
assert.strictEqual(store.getSubjectLockPrompt('s_test_1', 'math'), '需【语文】与【英语】均升至 Lv.20 满级方可唤醒');
console.log('✅ Test 3 Passed: 先孵化英语后，数学成为第3门学科并正确要求语文与英语均满级');

// 4. 英语升至 Lv.20 满级 -> 数学解锁
console.log('[Test 4] 阶段 4: 英语升至 Lv.20 满级 -> 第 3 门学科【数学】解锁');
store.students[0].pets.english.level = 20;
assert.strictEqual(store.isSubjectUnlocked('s_test_1', 'math'), true, 'Math is now UNLOCKED');
assert.strictEqual(store.getSubjectLockPrompt('s_test_1', 'math'), null);
store.hatchStudentPet('s_test_1', 'dog', 'math');
assert.strictEqual(store.students[0].pets.math.isHatched, true);
assert.strictEqual(store.students[0].pets.math.species, 'dog');
console.log('✅ Test 4 Passed: 英语满级后数学成功破壳认领，三门学科全部解锁破壳！');

// 5. 经典路径: 学生 2 选择先孵化【数学】
console.log('[Test 5] 阶段 5: 验证经典路径 (先孵化数学，数学未满级时英语锁定，数学满级后英语解锁)');
store.students.push({
    id: 's_test_2',
    name: '李四',
    no: '02',
    level: 20,
    pets: {
        chinese: { species: 'cat', level: 20, isHatched: true, visualStage: 5 },
        math: { species: 'egg', level: 0, isHatched: false, visualStage: 0 },
        english: { species: 'egg', level: 0, isHatched: false, visualStage: 0 }
    }
});
assert.strictEqual(store.isSubjectUnlocked('s_test_2', 'math'), true);
assert.strictEqual(store.isSubjectUnlocked('s_test_2', 'english'), true);

store.hatchStudentPet('s_test_2', 'bunny', 'math');
assert.strictEqual(store.isSubjectUnlocked('s_test_2', 'math'), true);
assert.strictEqual(store.isSubjectUnlocked('s_test_2', 'english'), false);
assert.strictEqual(store.getSubjectLockPrompt('s_test_2', 'english'), '需【语文】与【数学】均升至 Lv.20 满级方可唤醒');

store.students[1].pets.math.level = 20;
assert.strictEqual(store.isSubjectUnlocked('s_test_2', 'english'), true);
assert.strictEqual(store.getSubjectLockPrompt('s_test_2', 'english'), null);
store.hatchStudentPet('s_test_2', 'bird', 'english');
assert.strictEqual(store.students[1].pets.english.isHatched, true);
console.log('✅ Test 5 Passed: 经典路径 (先数学再英语) 完美通过！');

console.log('\n================================================================');
console.log('🎉 ClassPetStore 真实类学科二选一自由解锁与认领自动化测试全部 100% 通过！');
console.log('================================================================');
