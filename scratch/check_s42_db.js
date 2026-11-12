const fs = require('fs');
const path = require('path');
const SqliteService = require('../electron-app/sqlite_service.js').SQLiteService;

async function checkDetails() {
    const s = new SqliteService();
    await s.init(null, path.join(__dirname, '../database/classpet.sqlite'));
    const allState = s.loadAllState('c_class02_01');

    console.log('--- Checking all students named 吕四 or with student_no 42 ---');
    const matches = allState.students.filter(x => x.name.includes('吕四') || x.student_no === '42' || x.id === 'st_42' || x.id === 'stu_42');
    matches.forEach(m => {
        const pets = allState.petsByStudent[m.id];
        console.log('Student:', m.id, m.name, 'no:', m.student_no, 'exp:', m.exp, 'level:', m.level, 'group:', m.group, 'stage:', m.visualStage);
        console.log('Pets:', pets);
    });
}

checkDetails();
