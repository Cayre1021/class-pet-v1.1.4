const SqliteService = require('../electron-app/sqlite_service.js').SQLiteService;
const path = require('path');
const fs = require('fs');

async function testStudent42() {
    const s = new SqliteService();
    await s.init(null, path.join(__dirname, '../database/classpet.sqlite'));
    const allState = s.loadAllState('c_class02_01');
    console.log('Total students in c_class02_01:', allState.students.length);
    const stu = allState.students.find(x => x.student_no === '42' || x.no === '42' || x.name === '吕四');
    console.log('Student 42 from SQLite loadAllState:');
    console.log(stu);

    const pets = allState.petsByStudent[stu.id];
    console.log('Pets for student 42:');
    console.log(pets);

    console.log('Thresholds in SQLite:');
    console.log(allState.thresholds);

    console.log('Stages in SQLite:');
    console.log(allState.stages);
}

testStudent42();
