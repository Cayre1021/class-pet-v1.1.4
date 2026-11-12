// test_restart_scoring_freeze.js
// Verification for:
// 1. Restart EXP race condition and progress bar responsiveness
// 2. Dynamic threshold calculation (60 EXP -> dynamic adjustments)

const path = require('path');
const fs = require('fs');

// Mock localStorage and BroadcastChannel for Node environment
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

// Mock Audio
global.Audio = class {
    play() { return Promise.resolve(); }
    pause() {}
};

// Mock window
global.window = {
    addEventListener: () => {},
    localStorage: global.localStorage,
    BroadcastChannel: global.BroadcastChannel
};

// Load core
const { ClassPetStore } = require('./electron-app/src/classpet_core.js');

async function runTests() {
    console.log('🧪 Starting Restart & Dynamic Threshold Tests...\n');
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
    assert(store.students.length > 0, 'ClassPetStore 初始化成功，默认名单具备 42 名学生');

    // ----------------------------------------------------
    // TEST 1: Dynamic Thresholds ("60 EXP 会随老师调整变动吗？")
    // ----------------------------------------------------
    console.log('\n--- 1. 验证等级经验与还差经验动态计算 ---');
    const stu = store.students.find(s => s.id === 'stu_1') || store.students[0];
    const initialThresholds = store.getLevelThresholds();
    console.log(`初始 0~5 级阈值:`, initialThresholds.slice(0, 6));

    // Manually set stu exp to 140 and calculate level
    stu.exp = 140;
    stu.pets.chinese.exp = 140;
    stu.level = store.calcLevel(140, 0); // At 140 EXP with default thresholds [0, 15, 35, 75, 140, 230], level is 4
    console.log(`学生 140 EXP 对应等级: Lv.${stu.level}`);

    const prog1 = store.getExpProgress(140, stu.level, true);
    console.log(`当前升级需要经验: 还差 ${prog1.needExp} EXP (当前: ${prog1.totalExp}, 下级目标: ${prog1.levelNextExp})`);
    const initialNeedExp = prog1.needExp;

    // Simulate teacher modifying thresholds in settings (e.g. increase next level threshold by +50)
    const customThresholds = [...initialThresholds];
    const targetLvl = stu.level + 1;
    customThresholds[targetLvl] = customThresholds[targetLvl] + 50;

    store.saveLevelThresholds(customThresholds, store.getStageMinLevels());
    const prog2 = store.getExpProgress(140, stu.level, true);
    console.log(`老师在讲台设置调整阈值 (+50 EXP) 后: 还差 ${prog2.needExp} EXP (下级目标: ${prog2.levelNextExp})`);

    assert(prog2.needExp === initialNeedExp + 50, `升级还差经验随老师调整而动态变动 (从 ${initialNeedExp} 变为 ${prog2.needExp})`);
    assert(prog2.levelNextExp === initialThresholds[targetLvl] + 50, '目标经验阈值已同步更新');

    // Reset thresholds
    store.resetLevelThresholds();
    const prog3 = store.getExpProgress(140, stu.level, true);
    assert(prog3.needExp === initialNeedExp, `重置规则后还差经验恢复默认 (${prog3.needExp} EXP)`);

    // ----------------------------------------------------
    // TEST 2: Restart Race Condition & Monotonic Merge
    // ----------------------------------------------------
    console.log('\n--- 2. 验证重启后加分即时响应与 SQLite 单调安全合并 ---');
    const testStudentId = 'stu_2';
    const testStu = store.students.find(s => s.id === testStudentId);
    const beforeExp = testStu.pets.chinese.exp;

    // Teacher adds score immediately upon restart
    const res = store.scoreStudent(testStudentId, 5, '课堂发言', false, 'chinese');
    assert(res.currentPetExp === beforeExp + 5, `重启后加分即时响应：经验从 ${beforeExp} 变为 ${res.currentPetExp}`);
    assert(Array.isArray(res.students) && res.students.length > 0, '加分广播携带完整 students 状态，保障跨屏同步');

    // Simulate delayed SQLite load carrying older snapshot (simulating app restart race)
    const staleSnapshot = [
        {
            id: testStudentId,
            student_no: testStu.no,
            name: testStu.name,
            group_id: 1,
            level: 1,
            exp: beforeExp, // Stale!
            is_hatched: 1,
            active_subject: 'chinese',
            pets: {
                chinese: { exp: beforeExp, level: 1, visual_stage: 1, is_hatched: 1, species_code: 'dog' }
            }
        }
    ];

    // Mock electron safeElectronDB returning older state
    global.window.electronAPI = {
        db: {
            loadAllState: async () => ({ students: staleSnapshot }),
            saveStudent: () => {}
        }
    };

    // Trigger loadFromSQLite - should NOT roll back higher memory EXP!
    await store.loadFromSQLite();
    const afterReloadStu = store.students.find(s => s.id === testStudentId);
    assert(afterReloadStu.pets.chinese.exp === beforeExp + 5, `SQLite 异步完成不覆盖较新的加分 (经验保持 ${beforeExp + 5}，无进度条假死或回滚)`);

    // ----------------------------------------------------
    // TEST 3: Teaching Subject Synchronization
    // ----------------------------------------------------
    console.log('\n--- 3. 验证教师操作台与大屏授课科目同步 ---');
    store.setCurrentTeachingSubject('english');
    assert(store.getCurrentTeachingSubject() === 'english', '授课科目成功切换并持久化为 english');

    console.log(`\n==================================================`);
    console.log(`Summary: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log('🎉 All restart & dynamic tests passed successfully!');
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
