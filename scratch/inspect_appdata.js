const fs = require('fs');
const path = require('path');
const initSqlJs = require('../electron-app/node_modules/sql.js');

async function inspectAppDataDB() {
    const SQL = await initSqlJs();
    const appDataPath = path.join(process.env.APPDATA, 'class-pet-desktop', 'classpet.sqlite');
    if (!fs.existsSync(appDataPath)) {
        console.log('APPDATA DB not found:', appDataPath);
        return;
    }
    const buf = fs.readFileSync(appDataPath);
    const db = new SQL.Database(buf);

    console.log("=== APPDATA DB: classes ===");
    console.log(db.exec("SELECT * FROM classes")[0]?.values);

    console.log("=== APPDATA DB: class_level_thresholds ===");
    const thresh = db.exec("SELECT class_id, level, min_exp FROM class_level_thresholds");
    console.log(thresh[0]?.values);

    console.log("=== APPDATA DB: students (sample 5) ===");
    const stu = db.exec("SELECT * FROM students LIMIT 5");
    console.log(stu[0]?.columns);
    console.log(stu[0]?.values);

    console.log("=== APPDATA DB: pets (sample 10) ===");
    const pets = db.exec("SELECT * FROM pets LIMIT 10");
    console.log(pets[0]?.columns);
    console.log(pets[0]?.values);
}
inspectAppDataDB();
