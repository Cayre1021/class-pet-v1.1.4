// test_teacher__harness.cjs —— 教师日常路径用例的公共夹具（不是用例本身，单独跑不做断言）
// 组成：真 SQLiteService + database/classpet.sqlite 的临时副本 + 真 classpet_core 运行时（window/electronAPI 桩）
// 约束：全程只操作临时副本；收尾断言正式库 mtime 未变。
const path = require('path');
const fs = require('fs');
const os = require('os');

const projectRoot = fs.existsSync(path.join(__dirname, 'electron-app')) ? __dirname : path.join(__dirname, '..');
const initSqlJs = require(path.join(projectRoot, 'electron-app', 'node_modules', 'sql.js'));
const { SQLiteService } = require(path.join(projectRoot, 'electron-app', 'sqlite_service.js'));
const CORE_PATH = path.join(projectRoot, 'electron-app', 'src', 'classpet_core.js');
const SRC_DB = path.join(projectRoot, 'database', 'classpet.sqlite');

const settle = (rounds = 3) => (async () => {
    for (let i = 0; i < rounds; i++) await new Promise(r => setTimeout(r, 0));
})();

function createHarness() {
    const h = {
        passed: 0,
        failed: 0,
        svc: null,
        store: null,
        tmpDb: null,
        srcMtime: 0,
        storage: {},
        SQL: null
    };

    h.assert = (cond, msg, extra) => {
        if (cond) { console.log('  PASS  ' + msg); h.passed++; }
        else {
            console.error('  FAIL  ' + msg + (extra !== undefined ? '  ->  ' + JSON.stringify(extra).slice(0, 500) : ''));
            h.failed++;
        }
    };
    h.warn = (msg) => console.log('  NOTE  ' + msg);

    function installDom() {
        global.localStorage = {
            getItem: k => (h.storage[k] !== undefined ? h.storage[k] : null),
            setItem: (k, v) => { h.storage[k] = String(v); },
            removeItem: k => { delete h.storage[k]; },
            clear: () => { Object.keys(h.storage).forEach(k => delete h.storage[k]); }
        };
        global.BroadcastChannel = class { constructor() {} postMessage() {} close() {} };
        global.Audio = class { constructor() { this.volume = 1; } play() { return Promise.resolve(); } pause() {} };
        global.window = { addEventListener: () => {}, removeEventListener: () => {}, localStorage: global.localStorage };
        // preload.js 的 db:{} 桥（真实 IPC 名 -> 直连服务方法）
        global.window.electronAPI = {
            db: {
                loadAllState: (classId) => h.svc.loadAllState(classId),
                createClass: (payload) => h.svc.createClassWithDefaults(payload),
                recordScore: (payload) => h.svc.recordScoreOperation(payload),
                undoScore: (opId) => h.svc.undoOperation(opId),
                getStudentAuditLogs: (sid) => h.svc.getStudentAuditLogs(sid),
                hatchPet: (payload) => h.svc.hatchStudentPet(payload),
                saveStudent: (student, classId, options) => h.svc.saveStudent(student, classId, options),
                importStudents: (students, classId) => h.svc.importStudents(students, classId),
                saveAllStudents: (students, classId) => h.svc.saveAllStudents(students, classId),
                archiveStudent: (sid, isArchived, classId) => h.svc.archiveStudent(sid, isArchived, classId),
                deleteStudent: (sid, classId) => h.svc.deleteStudent(sid, classId),
                saveThresholds: (thresholds, stages, classId) => h.svc.saveThresholds(thresholds, stages, classId),
                getClassLedger: (classId, fromTs, toTs) => h.svc.getClassLedger(classId, fromTs, toTs),
                updateStudentProfile: (sid, patch, classId) => h.svc.updateStudentProfile(sid, patch, classId),
                restoreClassBackup: (classId, payload) => h.svc.restoreClassBackup(classId, payload),
                saveBehaviorRules: (rules, classId) => h.svc.saveBehaviorRules(rules, classId),
                query: (sql, params) => h.svc.query(sql, params),
                execute: (sql, params) => h.svc.execute(sql, params)
            }
        };
    }

    // 打开临时副本（restart 时也走这里：全新 SQL.Database + 全新 SQLiteService，等同重开应用）
    function openService() {
        if (h.svc) { try { if (h.svc.saveTimer) clearTimeout(h.svc.saveTimer); } catch (e) {} }
        h.SQL = h.SQL || null;
        const svc = new SQLiteService();
        svc.SQL = h.SQL;
        svc.db = new h.SQL.Database(fs.readFileSync(h.tmpDb));
        svc.dbPath = h.tmpDb;
        svc.isInitialized = true;
        svc.migrateLegacyDefaultThresholds();   // 与 main.js 启动流程一致
        h.svc = svc;
        return svc;
    }

    function loadCore() {
        delete require.cache[require.resolve(CORE_PATH)];
        require(CORE_PATH);
        h.store = global.window.classPetRuntime;
    }

    h.boot = async () => {
        h.srcMtime = fs.statSync(SRC_DB).mtimeMs;
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-teach-'));
        h.tmpDb = path.join(tmpDir, 'classpet.sqlite');
        fs.copyFileSync(SRC_DB, h.tmpDb);
        h.SQL = await initSqlJs();
        installDom();
        openService();
        loadCore();
        await settle();
        return h.store;
    };

    // 重启应用：落盘 -> 从文件重开服务 -> 重新加载 core（模块级阈值缓存归零）
    h.restart = async () => {
        h.flush();
        openService();
        loadCore();
        await settle();
        return h.store;
    };

    // 把待写的防抖落盘立刻写掉（等价于应用退出前落盘）
    h.flush = () => {
        if (!h.svc) return;
        try { if (h.svc.saveTimer) { clearTimeout(h.svc.saveTimer); h.svc.saveTimer = null; } } catch (e) {}
        h.svc.saveToDiskSync();
    };

    // 切换当前账号/班级（等价于门户切换账号后进入教师台）
    h.classId = 'c_class02_01';
    h.setAccount = ({ id = 'acc_demo_302', classId = 'c_class02_01', className = '测试班', teacherName = '刘老师', subject = '语文' } = {}) => {
        h.storage['classpet_active_account_id'] = id;
        h.storage['classpet_current_account'] = JSON.stringify({ id, classId, className, teacherName, subject, school: '实验小学本部' });
        h.classId = classId;
    };
    h.setSubject = (sub) => { h.storage['classpet_current_teaching_subject'] = sub; };

    h.rows = (sql, params = []) => h.svc.query(sql, params);
    h.run = (sql, params = []) => h.svc.execute(sql, params);
    h.pet = (studentId, subjectId, classId = h.classId) =>
        h.rows('SELECT * FROM pets WHERE class_id = ? AND student_id = ? AND subject_id = ?', [classId, studentId, subjectId])[0];
    h.student = (id) => h.rows('SELECT * FROM students WHERE id = ?', [id])[0];
    h.opCount = (classId = h.classId) => Number((h.rows('SELECT COUNT(*) AS c FROM score_operations WHERE class_id = ?', [classId])[0] || {}).c) || 0;
    h.entryCount = (operationId) => Number((h.rows('SELECT COUNT(*) AS c FROM score_entries WHERE operation_id = ?', [operationId])[0] || {}).c) || 0;
    h.thresholdsInDb = (classId = h.classId) =>
        h.rows('SELECT level, min_exp FROM class_level_thresholds WHERE class_id = ? ORDER BY level ASC', [classId]).map(r => Number(r.min_exp));
    h.viewModel = () => h.store.getV3ViewModel();

    // 在指定班级用真服务建 30 个干净学生（学号 9xx 段，避开种子库 01~88）
    h.seedClass = (classId, count, { noBase = 900, namePrefix = '测试' } = {}) => {
        const ids = [];
        h.run('INSERT OR IGNORE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 20, ?, ?)',
            [classId, 't_teach', '实验小学本部', classId, classId, 'subj_chinese', Date.now(), Date.now()]);
        for (let i = 0; i < count; i++) {
            const id = 'st_t_' + classId + '_' + String(i + 1).padStart(2, '0');
            const no = String(noBase + i + 1);
            const res = h.svc.saveStudent({ id, student_no: no, name: namePrefix + (i + 1), group: (i % 4) + 1, pets: {} }, classId, { strictStudentNo: true });
            if (!res || res.success !== true) throw new Error('seedClass 建学生失败: ' + JSON.stringify(res));
            ids.push(id);
        }
        return ids;
    };

    h.summary = () => {
        console.log('\n结果: ' + h.passed + ' passed, ' + h.failed + ' failed');
        if (h.failed > 0) process.exitCode = 1;
    };

    h.teardown = () => {
        try { if (h.svc && h.svc.saveTimer) clearTimeout(h.svc.saveTimer); } catch (e) {}
        try { if (h.svc && h.svc.db) h.svc.db.close(); } catch (e) {}
        const dir = h.tmpDb ? path.dirname(h.tmpDb) : null;
        if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
        h.assert(fs.statSync(SRC_DB).mtimeMs === h.srcMtime, 'database/classpet.sqlite 原件未被修改（全程只用临时副本）');
    };

    // 统一入口：捕获异常也算失败，保证末尾一定打印结果行
    h.runMain = async (title, fn) => {
        console.log('== ' + title + ' ==');
        try {
            await fn(h);
        } catch (e) {
            console.error('  用例异常中止:', (e && e.stack) || e);
            h.failed++;
            try { h.teardown(); } catch (e2) {}
            h.summary();
        }
    };

    return h;
}

module.exports = { createHarness, SRC_DB, projectRoot };

if (require.main === module) {
    console.log('test_teacher__harness.cjs 是公共夹具，不单独执行断言；请运行 test_teacher_*.cjs 用例文件。');
}
