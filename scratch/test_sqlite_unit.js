const fs = require('fs');
const path = require('path');
const sqliteModule = require('../electron-app/sqlite_service.js');
const SQLiteService = sqliteModule.SQLiteService;

async function testSqlite() {
    console.log('--- 1. Testing SqliteService Initialisation ---');
    const service = new SQLiteService();
    // Test with in-memory or test sqlite file
    const testDbPath = path.join(__dirname, 'test_classpet.sqlite');
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }

    await service.init(null, testDbPath);
    console.log('[OK] SQLite service initialised successfully');

    console.log('--- 2. Testing loadAllState for default class ---');
    const state = service.loadAllState('c_class02_01');
    console.log('Loaded state:', {
        studentsCount: state.students.length,
        thresholdsCount: Object.keys(state.thresholds).length,
        rulesCount: state.behaviorRules.length
    });

    console.log('--- 3. Testing student creation & saving ---');
    const newStudent = {
        id: 'stu_test_999',
        no: '99',
        name: '测试学生',
        group: 2,
        isArchived: false,
        isAbsent: false,
        exp: 0,
        level: 0,
        activeSubject: 'chinese',
        pets: {
            chinese: {
                subject: 'chinese',
                species: 'cat',
                name: '小猫咪',
                level: 0,
                exp: 0,
                visualStage: 0
            }
        }
    };
    service.saveStudent(newStudent, 'c_class02_01');
    console.log('[OK] saveStudent passed');

    console.log('--- 4. Testing recordScoreOperation ---');
    const opResult = service.recordScoreOperation({
        classId: 'c_class02_01',
        teacherId: 't_liu_01',
        studentIds: ['stu_test_999'],
        delta: 10,
        reason: '单元测验满分',
        ruleId: 'r_pos_1'
    });
    console.log('[OK] recordScoreOperation result:', opResult);

    console.log('--- 5. Testing getStudentAuditLogs ---');
    const logs = service.getStudentAuditLogs('stu_test_999');
    console.log('[OK] getStudentAuditLogs count:', logs.length);
    if (logs.length === 0) {
        throw new Error('Audit log was not recorded for stu_test_999!');
    }
    const logItem = logs[0];
    console.log('First log item:', logItem);

    console.log('--- 6. Testing undoOperation ---');
    const undoResult = service.undoOperation(logItem.operation_id);
    console.log('[OK] undoOperation result:', undoResult);

    const logsAfterUndo = service.getStudentAuditLogs('stu_test_999');
    console.log('Log undone_at after undo:', logsAfterUndo[0].undone_at);
    if (!logsAfterUndo[0].undone_at) {
        throw new Error('Undo operation did not set undone_at timestamp!');
    }

    console.log('--- 7. Testing hatchStudentPet ---');
    const hatchResult = service.hatchStudentPet({
        classId: 'c_class02_01',
        studentId: 'stu_test_999',
        subjectCode: 'chinese',
        speciesCode: 'cat',
        nickname: '小花'
    });
    console.log('[OK] hatchStudentPet result:', hatchResult);

    console.log('--- 8. Testing archiveStudent & deleteStudent ---');
    service.archiveStudent('stu_test_999', true);
    console.log('[OK] archiveStudent passed');
    service.deleteStudent('stu_test_999');
    console.log('[OK] deleteStudent passed');

    const verifyDeleted = service.query('SELECT * FROM students WHERE id = ?', ['stu_test_999']);
    console.log('Verify deleted from DB:', verifyDeleted.length === 0 ? 'DELETED' : 'STILL_EXISTS');
    if (verifyDeleted.length !== 0) {
        throw new Error('Student was not properly deleted from database!');
    }

    // Clean up test db
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    console.log('=== ALL SQLITE UNIT TESTS PASSED 100% ===');
}

testSqlite().catch(err => {
    console.error('SQLITE TEST ERROR:', err);
    process.exit(1);
});
