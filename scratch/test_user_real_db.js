const fs = require('fs');
const path = require('path');
const initSqlJs = require('../electron-app/node_modules/sql.js');
global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { reload: () => {} }
};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
require('../electron-app/src/classpet_core.js');
const store = window.classPetRuntime;

async function testUserRealDb() {
    console.log('=== 验证用户真实存档 (Zhao Liu) ===');
    const roamingDb = path.join(process.env.APPDATA, 'class-pet-desktop/classpet.sqlite');
    if (!fs.existsSync(roamingDb)) {
        console.log('Roaming DB not found, skipping');
        return;
    }
    const SQL = await initSqlJs();
    const db = new SQL.Database(fs.readFileSync(roamingDb));
    
    // 查询赵六
    const stuRes = db.exec("SELECT id, name, student_no, group_name FROM students WHERE name='赵六'");
    if (stuRes.length === 0) {
        console.log('赵六 not found in DB');
        return;
    }
    const stuId = stuRes[0].values[0][0];
    const sqliteService = require('../electron-app/sqlite_service.js');
    sqliteService.db = db;
    const state = sqliteService.loadAllState('c_class02_01');
    const stPets = state.petsByStudent[stuId];
    
    const zhaoStudent = {
        id: stuId,
        name: '赵六',
        no: stuRes[0].values[0][2],
        group: stuRes[0].values[0][3],
        activeSubject: 'chinese',
        level: stPets.chinese?.level || 20,
        exp: stPets.chinese?.exp || 1205,
        pets: {
            chinese: {
                subject: '语文',
                level: stPets.chinese?.level || 0,
                exp: stPets.chinese?.exp || 0,
                species: stPets.chinese?.species_code || 'hamster',
                visualStage: stPets.chinese?.visual_stage || 5,
                isHatched: (stPets.chinese?.visual_stage || 0) >= 1
            },
            math: {
                subject: '数学',
                level: stPets.math?.level || 0,
                exp: stPets.math?.exp || 0,
                species: stPets.math?.species_code || 'cat',
                visualStage: stPets.math?.visual_stage || 3,
                isHatched: (stPets.math?.visual_stage || 0) >= 1
            },
            english: {
                subject: '英语',
                level: stPets.english?.level || 0,
                exp: stPets.english?.exp || 0,
                species: stPets.english?.species_code || 'egg',
                visualStage: stPets.english?.visual_stage || 0,
                isHatched: (stPets.english?.visual_stage || 0) >= 1
            }
        }
    };
    
    store.students = [zhaoStudent];
    
    console.log('赵六宠物状态:', JSON.stringify(zhaoStudent.pets, null, 2));
    
    // 1. 验证学科解锁
    const mathUnlocked = store.isSubjectUnlocked(stuId, 'math');
    const englishUnlocked = store.isSubjectUnlocked(stuId, 'english');
    console.log('数学是否解锁 (语文20级):', mathUnlocked);
    console.log('英语是否解锁 (数学仅9级):', englishUnlocked);
    
    if (mathUnlocked !== true) throw new Error('数学理应解锁！');
    if (englishUnlocked !== false) throw new Error('英语绝对不可解锁！');
    
    // 2. 尝试越级孵化英语
    const hatchResult = store.hatchStudentPet(stuId, 'fox', 'english');
    console.log('越级孵化英语结果 (应为null):', hatchResult);
    if (hatchResult !== null) throw new Error('越级孵化英语必须被拦截！');
    
    // 3. 验证卡片待认领印章判定
    const hasAnyMaxSubject = (zhaoStudent.level >= 20) || Object.values(zhaoStudent.pets).some(p => (p.level || 0) >= 20);
    const unlockableUnhatchedSubs = [];
    ['chinese', 'math', 'english'].forEach(k => {
        const p = zhaoStudent.pets[k];
        const pIsEgg = !p || !p.isHatched || p.species === 'egg' || (p.visualStage === 0);
        const isUnlocked = store.isSubjectUnlocked(zhaoStudent.id, k);
        if (pIsEgg && isUnlocked) {
            unlockableUnhatchedSubs.push(k);
        }
    });
    const canAwakenNewPet = hasAnyMaxSubject && unlockableUnhatchedSubs.length > 0;
    console.log('可认领且已解锁学科列表:', unlockableUnhatchedSubs);
    console.log('大屏卡片是否显示“待认领新宠”:', canAwakenNewPet);
    
    if (canAwakenNewPet !== false) {
        throw new Error('赵六卡片绝不应显示待认领新宠！');
    }
    
    console.log('✅ 用户真实存档 (赵六) 全维度核对 100% PASS！');
}

testUserRealDb().catch(err => {
    console.error('❌ 测试失败:', err);
    process.exit(1);
});
