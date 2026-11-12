const fs = require('fs');
const path = require('path');
const initSqlJs = require('../electron-app/node_modules/sql.js');

async function main() {
    const paths = [
        path.resolve(__dirname, '../database/classpet.sqlite'),
        path.join(process.env.APPDATA, 'class-pet-desktop/classpet.sqlite')
    ];
    const SQL = await initSqlJs();
    for (const p of paths) {
        console.log('\n=============================================');
        console.log('Database Path:', p);
        if (!fs.existsSync(p)) {
            console.log('File does not exist.');
            continue;
        }
        const db = new SQL.Database(fs.readFileSync(p));
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', tables[0]?.values.map(v => v[0]).join(', '));
        const pInfo = db.exec("PRAGMA table_info(pets)");
        console.log('Pets columns:', pInfo[0]?.values.map(v => v[1]).join(', '));
        const res = db.exec("SELECT s.id, s.name, p.subject_id, p.level, p.exp, p.species_code, p.nickname FROM students s JOIN pets p ON s.id = p.student_id WHERE s.name IN ('赵六', '孙七', '钱八') ORDER BY s.name, p.subject_id");
        if (res.length > 0) {
            res[0].values.forEach(v => {
                console.log(`[${v[1]}] 学科: ${v[2]} | 等级: ${v[3]} | 经验: ${v[4]} | 物种: ${v[5]} | 昵称: ${v[6]}`);
            });
        } else {
            console.log('No matching rows found in pets table.');
        }

        const audit = db.exec("SELECT count(*) FROM score_operations");
        if (audit.length > 0) {
            console.log('Score operations count:', audit[0].values[0][0]);
        }
    }
}

main().catch(console.error);
