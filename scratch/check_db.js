const fs = require('fs');
const path = require('path');
const initSqlJs = require(path.resolve(__dirname, '../electron-app/node_modules/sql.js'));

async function main() {
    const dbPath = 'C:/Users/PC/AppData/Roaming/class-pet-desktop/classpet.sqlite';
    const buf = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(buf);
    const maxPets = db.exec("SELECT p.student_id, s.name, s.student_no, p.subject_id, p.level, p.exp FROM pets p JOIN students s ON p.student_id = s.id WHERE p.level >= 20");
    console.log('Level 20 pets:', JSON.stringify(maxPets[0]?.values, null, 2));
}
main().catch(console.error);
