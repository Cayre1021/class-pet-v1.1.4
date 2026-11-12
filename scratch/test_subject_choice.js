const assert = require('assert');

// Simulate the logic
class SubjectLogicSimulation {
    constructor() {
        this.students = [];
    }

    isSubjectUnlocked(studentId, subjectKey) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return false;
        if (subjectKey === 'chinese') return true; // 语文初始开放

        const curPet = student.pets?.[subjectKey];
        if (curPet && (curPet.isHatched || (curPet.species && curPet.species !== 'egg') || (curPet.visualStage && curPet.visualStage >= 1))) {
            return true; // 已经破壳/认领的学科宠物永久处于解锁状态
        }

        const chinesePet = student.pets?.chinese;
        const isChineseHatched = !!(chinesePet && (chinesePet.isHatched || (chinesePet.species && chinesePet.species !== 'egg')));
        const isChineseMax = isChineseHatched && ((chinesePet.level || 0) >= 20 || (student.level || 0) >= 20);

        // 前置基础：必须语文达成 Lv.20 满级方可进入后续学科觉醒
        if (!isChineseMax) return false;

        // 语文已达 20 级，判断数学与英语：
        if (subjectKey === 'math' || subjectKey === 'english') {
            const otherKey = subjectKey === 'math' ? 'english' : 'math';
            const otherPet = student.pets?.[otherKey];
            const isOtherHatched = !!(otherPet && (otherPet.isHatched || (otherPet.species && otherPet.species !== 'egg') || (otherPet.visualStage && otherPet.visualStage >= 1)));

            // 若另一门学科尚未认领/破壳，说明当前处于【二选一】阶段，两门均允许破壳认领！
            if (!isOtherHatched) {
                return true;
            }

            // 若另一门学科已经破壳，则当前学科属于第 3 门最终学科：
            // 必须该学科（即第二门学科）也达成 Lv.20 满级，方可解锁第三门！
            const isOtherMax = (otherPet.level || 0) >= 20;
            return isOtherMax;
        }

        return false;
    }

    getSubjectLockPrompt(studentId, subjectKey) {
        if (this.isSubjectUnlocked(studentId, subjectKey)) return null;
        const student = this.students.find(s => s.id === studentId);
        if (!student) return '学生不存在';
        const chinesePet = student.pets?.chinese;
        const isChineseHatched = !!(chinesePet && (chinesePet.isHatched || (chinesePet.species && chinesePet.species !== 'egg')));
        const isChineseMax = isChineseHatched && ((chinesePet.level || 0) >= 20 || (student.level || 0) >= 20);
        if (!isChineseMax) {
            return '需【语文】学科宠物升至 Lv.20 满级方可唤醒';
        }
        const otherKey = subjectKey === 'math' ? 'english' : 'math';
        const otherName = otherKey === 'math' ? '数学' : '英语';
        return `需【语文】与【${otherName}】均升至 Lv.20 满级方可唤醒`;
    }
}

const sim = new SubjectLogicSimulation();

// Test 1: Student A with Chinese Lv.5 (Early stage)
sim.students.push({
    id: 'stu_A',
    level: 5,
    pets: {
        chinese: { species: 'cat', level: 5, isHatched: true },
        math: { species: 'egg', level: 0, isHatched: false },
        english: { species: 'egg', level: 0, isHatched: false }
    }
});
assert.strictEqual(sim.isSubjectUnlocked('stu_A', 'chinese'), true, 'Chinese is unlocked');
assert.strictEqual(sim.isSubjectUnlocked('stu_A', 'math'), false, 'Math is locked when Chinese < 20');
assert.strictEqual(sim.isSubjectUnlocked('stu_A', 'english'), false, 'English is locked when Chinese < 20');
assert.strictEqual(sim.getSubjectLockPrompt('stu_A', 'math'), '需【语文】学科宠物升至 Lv.20 满级方可唤醒');
assert.strictEqual(sim.getSubjectLockPrompt('stu_A', 'english'), '需【语文】学科宠物升至 Lv.20 满级方可唤醒');
console.log('✅ Test 1 (Chinese < 20) Passed');

// Test 2: Student B with Chinese Lv.20 (Max level, 二选一阶段)
sim.students.push({
    id: 'stu_B',
    level: 20,
    pets: {
        chinese: { species: 'cat', level: 20, isHatched: true },
        math: { species: 'egg', level: 0, isHatched: false },
        english: { species: 'egg', level: 0, isHatched: false }
    }
});
assert.strictEqual(sim.isSubjectUnlocked('stu_B', 'chinese'), true, 'Chinese is unlocked');
assert.strictEqual(sim.isSubjectUnlocked('stu_B', 'math'), true, 'Math IS UNLOCKED (二选一)');
assert.strictEqual(sim.isSubjectUnlocked('stu_B', 'english'), true, 'English IS UNLOCKED (二选一)');
console.log('✅ Test 2 (Chinese = 20, 2-choice stage) Passed');

// Test 3: Student B chooses English first! (English hatched Lv.1)
sim.students[1].pets.english = { species: 'fox', level: 1, isHatched: true, visualStage: 1 };
assert.strictEqual(sim.isSubjectUnlocked('stu_B', 'chinese'), true, 'Chinese is unlocked');
assert.strictEqual(sim.isSubjectUnlocked('stu_B', 'english'), true, 'English is unlocked (hatched)');
assert.strictEqual(sim.isSubjectUnlocked('stu_B', 'math'), false, 'Math is locked because English is not yet 20');
assert.strictEqual(sim.getSubjectLockPrompt('stu_B', 'math'), '需【语文】与【英语】均升至 Lv.20 满级方可唤醒');
console.log('✅ Test 3 (English hatched first, Math locked pending English 20) Passed');

// Test 4: Student B levels English to 20! (Both Chinese 20 and English 20)
sim.students[1].pets.english.level = 20;
assert.strictEqual(sim.isSubjectUnlocked('stu_B', 'math'), true, 'Math is UNLOCKED now that English is 20');
console.log('✅ Test 4 (Both Chinese & English 20 -> Math unlocked) Passed');

// Test 5: Classical path - Student C chooses Math first! (Math hatched Lv.1)
sim.students.push({
    id: 'stu_C',
    level: 20,
    pets: {
        chinese: { species: 'cat', level: 20, isHatched: true },
        math: { species: 'dog', level: 1, isHatched: true, visualStage: 1 },
        english: { species: 'egg', level: 0, isHatched: false }
    }
});
assert.strictEqual(sim.isSubjectUnlocked('stu_C', 'chinese'), true);
assert.strictEqual(sim.isSubjectUnlocked('stu_C', 'math'), true);
assert.strictEqual(sim.isSubjectUnlocked('stu_C', 'english'), false, 'English is locked because Math is not yet 20');
assert.strictEqual(sim.getSubjectLockPrompt('stu_C', 'english'), '需【语文】与【数学】均升至 Lv.20 满级方可唤醒');

sim.students[2].pets.math.level = 20;
assert.strictEqual(sim.isSubjectUnlocked('stu_C', 'english'), true, 'English is UNLOCKED now that Math is 20');
console.log('✅ Test 5 (Classical path: Math first -> English 2nd) Passed');

console.log('\n🎉 ALL 5 SUBJECT CHOICE TESTS PASSED 100%!');
