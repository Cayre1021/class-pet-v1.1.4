const fs = require('fs');
const path = require('path');
const initSqlJs = require('../electron-app/node_modules/sql.js');

async function check() {
    const roamingDb = path.join(process.env.APPDATA, 'class-pet-desktop/classpet.sqlite');
    const SQL = await initSqlJs();
    const db = new SQL.Database(fs.readFileSync(roamingDb));
    const stus = db.exec("SELECT id, class_id, student_no, name FROM students WHERE class_id='c_acc_1789380697331'");
    console.log('Students in user class:', stus[0]?.values);
    const pets = db.exec("SELECT s.name, p.subject_id, p.level, p.exp, p.species_code, p.is_display FROM pets p JOIN students s ON p.student_id = s.id WHERE p.class_id='c_acc_1789380697331' ORDER BY s.student_no, p.subject_id");
    console.log('Pets in user class:', pets[0]?.values);
}
check();
