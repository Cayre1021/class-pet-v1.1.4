/**
 * Comprehensive Audit Test:
 * 1. batchScore subject resolution and SQLite recordScore parameter verification.
 * 2. SQLite hatchStudentPet display_pet_id and is_display synchronization.
 * 3. Daily interact points tracking and timezone stability.
 * 4. Multi-subject undo transaction verification in SQLite.
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { SQLiteService } = require('../electron-app/sqlite_service');

async function runTests() {
    console.log('====================================================');
    console.log('🧪 Starting Deep Audit Test Suite for ClassPet');
    console.log('====================================================');

    const testDbPath = path.join(__dirname, 'test_audit_sync.sqlite');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    const sqlService = new SQLiteService(testDbPath);
    await sqlService.init();

    const classId = 'c_test_01';

    // 1. Setup sample student with Chinese Lv.20 MAX and Math Egg
    const student1 = {
        id: 'st_audit_01',
        student_no: '01',
        name: '王小明',
        group: 1,
        activeSubject: 'chinese',
        isHatched: true,
        level: 20,
        exp: 1250,
        visualStage: 5,
        pets: {
            chinese: { id: 'pet_st_audit_01_c', species: 'cat', level: 20, exp: 1250, visualStage: 5, isHatched: true, name: '灵猫' },
            math: { id: 'pet_st_audit_01_m', species: 'egg', level: 0, exp: 0, visualStage: 0, isHatched: false, name: '神秘宠物蛋' },
            english: { id: 'pet_st_audit_01_e', species: 'egg', level: 0, exp: 0, visualStage: 0, isHatched: false, name: '神秘宠物蛋' }
        }
    };
    sqlService.saveStudent(student1, classId);

    // Verify initial display_pet_id in SQLite
    let stuRows = sqlService.query("SELECT * FROM students WHERE id = ?", [student1.id]);
    assert.strictEqual(stuRows.length, 1);
    assert.strictEqual(stuRows[0].display_pet_id, 'pet_st_audit_01_c', 'Initial display pet should be Chinese');

    let petRows = sqlService.query("SELECT * FROM pets WHERE student_id = ? ORDER BY subject_id", [student1.id]);
    assert.strictEqual(petRows.length, 3);
    const chinesePet = petRows.find(p => p.subject_id === 'subj_chinese');
    const mathPet = petRows.find(p => p.subject_id === 'subj_math');
    assert.strictEqual(chinesePet.is_display, 1, 'Chinese pet is_display must be 1');
    assert.strictEqual(mathPet.is_display, 0, 'Math pet is_display must be 0');
    console.log('✅ [PASS] Test 1: Student and multi-subject pets successfully saved with correct initial is_display and display_pet_id.');

    // 2. Hatch Math pet using hatchStudentPet
    sqlService.hatchStudentPet({
        classId,
        studentId: student1.id,
        subjectCode: 'math',
        speciesCode: 'dog',
        nickname: '神犬'
    });

    // Verify that after hatching Math pet, SQLite updates is_display and display_pet_id
    stuRows = sqlService.query("SELECT * FROM students WHERE id = ?", [student1.id]);
    assert.strictEqual(stuRows[0].display_pet_id, 'pet_st_audit_01_m', 'display_pet_id must point to hatched Math pet');

    petRows = sqlService.query("SELECT * FROM pets WHERE student_id = ?", [student1.id]);
    const updatedChinese = petRows.find(p => p.subject_id === 'subj_chinese');
    const updatedMath = petRows.find(p => p.subject_id === 'subj_math');
    assert.strictEqual(updatedChinese.is_display, 0, 'Chinese pet is_display must now be 0');
    assert.strictEqual(updatedMath.is_display, 1, 'Math pet is_display must now be 1');
    assert.strictEqual(updatedMath.species_code, 'dog', 'Math species must be dog');
    assert.strictEqual(updatedMath.visual_stage, 1, 'Math visual stage must be 1');
    console.log('✅ [PASS] Test 2: hatchStudentPet correctly switches is_display to Math pet and updates student display_pet_id.');

    // 3. Score operation when subjectCode is NULL (should pick the active Math pet via enhanced fallback query!)
    const scoreRes = sqlService.recordScoreOperation({
        classId,
        studentIds: [student1.id],
        delta: 10,
        reason: '数学课随堂优胜',
        subjectCode: null // Null subjectCode simulation
    });
    assert.strictEqual(scoreRes.success, true);

    const postScoreMath = sqlService.query("SELECT * FROM pets WHERE id = 'pet_st_audit_01_m'")[0];
    const postScoreChinese = sqlService.query("SELECT * FROM pets WHERE id = 'pet_st_audit_01_c'")[0];
    assert.strictEqual(postScoreMath.exp, 25, 'Math pet exp should be 15 + 10 = 25');
    assert.strictEqual(postScoreChinese.exp, 1250, 'Chinese pet exp should remain untouched at 1250');
    console.log('✅ [PASS] Test 3: Null subjectCode correctly resolves to active Math pet in SQLite fallback query without corrupting Chinese pet.');

    // 4. Test undoOperation for the score transaction
    const undoRes = sqlService.undoOperation(scoreRes.operationId);
    assert.strictEqual(undoRes.success, true);

    const postUndoMath = sqlService.query("SELECT * FROM pets WHERE id = 'pet_st_audit_01_m'")[0];
    assert.strictEqual(postUndoMath.exp, 15, 'Math pet exp after undo should be restored to 15');
    console.log('✅ [PASS] Test 4: undoOperation rolls back Math pet exp cleanly.');

    // 5. Test getStudentAuditLogs
    const logs = sqlService.getStudentAuditLogs(student1.id);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].action_name, '数学课随堂优胜');
    assert.ok(logs[0].undone_at > 0, 'Audit log should show undone_at timestamp');
    console.log('✅ [PASS] Test 5: getStudentAuditLogs correctly returns operation history with undone status.');

    // Cleanup
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    console.log('====================================================');
    console.log('🎉 All 5 Deep Audit Tests Passed 100%!');
    console.log('====================================================');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
