const fs = require('fs');
const path = require('path');
const initSqlJs = require('../electron-app/node_modules/sql.js');

async function check() {
    const SQL = await initSqlJs();
    const appDataPath = path.join(process.env.APPDATA, 'class-pet-desktop', 'classpet.sqlite');
    const localPath = path.join(__dirname, '../database/classpet.sqlite');
    
    for (const [name, targetPath] of [['APPDATA DB', appDataPath], ['REPO DB', localPath]]) {
        console.log(`\n=== Checking ${name}: ${targetPath} ===`);
        if (!fs.existsSync(targetPath)) {
            console.log('File does not exist');
            continue;
        }
        const buf = fs.readFileSync(targetPath);
        const db = new SQL.Database(buf);
        
        const countRes = db.exec('SELECT count(*) FROM students');
        console.log('Total students:', countRes[0]?.values[0][0]);

        const s42Res = db.exec("SELECT id, student_no, name, group_name FROM students WHERE student_no = '42' OR id = 'st_42'");
        console.log('Student 42 row:', s42Res[0]?.values);

        const pets42 = db.exec("SELECT id, student_id, subject_id, species_code, exp, level, visual_stage FROM pets WHERE student_id = 'st_42'");
        console.log('Pets 42 rows:', pets42[0]?.values);

        const allPets = db.exec("SELECT subject_id, count(*), min(exp), max(exp), min(level), max(level) FROM pets GROUP BY subject_id");
        console.log('Pets stats by subject:', allPets[0]?.values);

        const threshRes = db.exec("SELECT key, value FROM configs WHERE key LIKE '%threshold%' OR key LIKE '%stage%'");
        console.log('Configs:', threshRes[0]?.values);
    }
}
check();
