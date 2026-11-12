const fs = require('fs');
const path = require('path');
const SqliteService = require('../electron-app/sqlite_service.js').SQLiteService;

async function run() {
    const s = new SqliteService();
    await s.init(null, path.join(__dirname, '../database/classpet.sqlite'));
    const allState = s.loadAllState('c_class02_01');
    const stu42Row = allState.students.find(x => x.id === 'st_42');
    const pets42 = allState.petsByStudent['st_42'];

    console.log('st_42 row:', stu42Row);
    console.log('pets42:', pets42);

    // Now let's see how classpet_core.js loadFromSQLite maps it:
    const primaryPetRow = pets42.chinese || Object.values(pets42)[0];
    const stage = (primaryPetRow && primaryPetRow.visual_stage !== undefined && primaryPetRow.visual_stage !== null) ? primaryPetRow.visual_stage : 0;
    const isHatched = stage >= 1;
    const level = (primaryPetRow && primaryPetRow.level !== undefined && primaryPetRow.level !== null) ? primaryPetRow.level : (isHatched ? 1 : 0);
    const exp = (primaryPetRow && primaryPetRow.exp !== undefined && primaryPetRow.exp !== null) ? primaryPetRow.exp : (isHatched ? 15 : 0);

    console.log('Mapped: level =', level, 'exp =', exp, 'stage =', stage, 'isHatched =', isHatched);

    // What is nextLevelExp?
    // In DEFAULT_LEVEL_THRESHOLDS:
    // Lv.0: 0
    // Lv.1: 15
    // Lv.2: 35
    // Lv.3: 60
    // Lv.4: 90
    // At exp = 50, level is 2. Next level threshold (Lv.3) is 60!
    // But what does calcLevel(50 + 1) return?
    // 51 is < 60, so level is still 2!

    // NOW: Look at display_bigscreen_touch_pro.html!
    // When the user enters his card:
    // What shows "可以升级了然后可以点击弹出庆祝动画"?
    // Let's check ALL places in display_bigscreen_touch_pro.html that have "升级" or "庆祝" or "进阶" or "点击"!
}

run();
