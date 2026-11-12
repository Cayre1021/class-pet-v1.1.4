const fs = require('fs');
const path = require('path');
const initSqlJs = require('../electron-app/node_modules/sql.js');

async function check() {
    const SQL = await initSqlJs();
    const appDataPath = path.join(process.env.APPDATA, 'class-pet-desktop', 'classpet.sqlite');
    const buf = fs.readFileSync(appDataPath);
    const db = new SQL.Database(buf);
    
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables[0]?.values.flat());
    
    for (const t of tables[0]?.values.flat() || []) {
        const count = db.exec(`SELECT count(*) FROM ${t}`)[0]?.values[0][0];
        console.log(`Table ${t}: ${count} rows`);
    }

    const classes = db.exec('SELECT * FROM classes');
    console.log('Classes cols:', classes[0]?.columns);
    console.log('Classes rows:', classes[0]?.values);

    const levelConfigs = db.exec("SELECT class_id, level, required_exp FROM class_level_thresholds WHERE class_id = 'c_class02_01' ORDER BY level ASC");
    console.log('Thresholds for c_class02_01:', levelConfigs[0]?.values);

    const stageConfigs = db.exec("SELECT class_id, stage, min_level, stage_code FROM class_visual_stages WHERE class_id = 'c_class02_01' ORDER BY stage ASC");
    console.log('Stages for c_class02_01:', stageConfigs[0]?.values);
}
check();
