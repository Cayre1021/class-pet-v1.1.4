const sqliteService = require('../electron-app/sqlite_service.js');
(async () => {
    await sqliteService.init();
    const state = sqliteService.loadAllState('c_class02_01');
    console.log('st_01 pets in state:', state.petsByStudent['st_01']);
    const allPetsForSt01 = sqliteService.query("SELECT * FROM pets WHERE student_id = 'st_01'");
    console.log('allPetsForSt01:', allPetsForSt01);
})();
