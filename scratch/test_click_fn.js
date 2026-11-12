const sqliteService = require('../electron-app/sqlite_service.js');
const { ClassPetStore, LEVEL_THRESHOLDS } = require('../electron-app/src/classpet_core.js');

(async () => {
    await sqliteService.init(null);
    global.window = { electronAPI: { db: sqliteService } };
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

    const store = new ClassPetStore();
    await store.loadFromSQLite();

    console.log("=== Testing refreshModal logic for SQLite students ===");
    store.students.slice(0, 15).forEach(s => {
        const activeModalSubject = s.activeSubject || 'chinese';
        const pet = (s.pets && (s.pets[activeModalSubject] || s.pets.chinese)) || (s.pets && Object.values(s.pets)[0]);
        const isThisPetHatched = !!(pet.isHatched || (pet.species && pet.species !== 'egg'));
        const petExp = Math.max(0, pet.exp !== undefined ? pet.exp : 0);
        const petLevel = isThisPetHatched ? Math.max(1, pet.level || 1) : 0;
        const hatchThresh = 15;

        let percent = 0;
        let expRateLabel = '';
        let expDetailLabel = '';

        if (!isThisPetHatched) {
            percent = Math.min(100, Math.max(0, Math.round((petExp / hatchThresh) * 100)));
            expRateLabel = `${petExp} / ${hatchThresh} EXP (${percent}%)`;
        } else if (petLevel >= 20) {
            percent = 100;
            expRateLabel = `MAX (已达顶峰)`;
            expDetailLabel = `已达成最高满级 (王者) · 累计总经验：${petExp} EXP`;
        } else {
            const petMinExp = store.getCurrentLevelMinExp ? store.getCurrentLevelMinExp(petLevel) : (LEVEL_THRESHOLDS[petLevel] || 0);
            const petNextMax = store.getNextLevelThreshold ? store.getNextLevelThreshold(petLevel) : (LEVEL_THRESHOLDS[petLevel + 1] || 1250);
            const levelSpan = Math.max(1, petNextMax - petMinExp);
            const currentProgressInLevel = Math.max(0, petExp - petMinExp);
            percent = Math.min(100, Math.max(0, Math.round((currentProgressInLevel / levelSpan) * 100)));
            const needExp = Math.max(0, petNextMax - petExp);

            expRateLabel = `${currentProgressInLevel} / ${levelSpan} EXP (${percent}%)`;
            expDetailLabel = `总经验: ${petExp} EXP · 升至 Lv.${petLevel + 1} 还差 ${needExp} EXP`;
        }
        console.log(`${s.id} (${s.name}) Lv.${petLevel} exp=${petExp} -> Rate: '${expRateLabel}' | Detail: '${expDetailLabel}'`);
    });
    process.exit(0);
})();
