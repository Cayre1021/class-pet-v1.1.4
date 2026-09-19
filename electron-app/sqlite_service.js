const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

class SQLiteService {
    constructor() {
        this.db = null;
        this.dbPath = null;
        this.SQL = null;
        this.isInitialized = false;
        this.saveTimer = null;
    }

    async init(app) {
        if (this.isInitialized) return this.db;
        this.SQL = await initSqlJs();

        // 区分开发环境与打包发布环境：
        if (app && app.isPackaged) {
            this.dbPath = path.join(app.getPath('userData'), 'classpet.sqlite');
            const resourceDb = path.join(process.resourcesPath, 'database', 'classpet.sqlite');
            if (!fs.existsSync(this.dbPath) && fs.existsSync(resourceDb)) {
                try {
                    const dir = path.dirname(this.dbPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.copyFileSync(resourceDb, this.dbPath);
                } catch (e) {
                    console.error('[SQLiteService] 复制打包种子数据库失败:', e);
                }
            }
        } else {
            // 开发模式 / 便携运行优先在项目 database/classpet.sqlite 读取与存储
            const projectDbPath = path.resolve(__dirname, '..', 'database', 'classpet.sqlite');
            const localDbPath = path.resolve(__dirname, 'classpet.sqlite');
            const userDbPath = app ? path.join(app.getPath('userData'), 'classpet.sqlite') : null;

            if (fs.existsSync(projectDbPath)) {
                this.dbPath = projectDbPath;
            } else if (userDbPath && fs.existsSync(userDbPath)) {
                this.dbPath = userDbPath;
            } else if (fs.existsSync(localDbPath)) {
                this.dbPath = localDbPath;
            } else if (userDbPath) {
                this.dbPath = userDbPath;
            } else {
                this.dbPath = projectDbPath;
            }
        }

        console.log('[SQLiteService] 正在连接本地 SQLite 数据库:', this.dbPath);

        let fileBuffer = null;
        if (fs.existsSync(this.dbPath)) {
            try {
                fileBuffer = fs.readFileSync(this.dbPath);
            } catch (err) {
                console.error('[SQLiteService] 读取已有数据库文件失败，将创建新库:', err);
            }
        }

        if (fileBuffer && fileBuffer.length > 0) {
            this.db = new this.SQL.Database(fileBuffer);
            console.log('[SQLiteService] 成功载入既有 SQLite 数据库文件！');
        } else {
            this.db = new this.SQL.Database();
            console.log('[SQLiteService] 初始化全新的内存 SQLite 数据库，准备应用初始结构...');
            this.initDefaultTables();
            this.saveToDiskSync();
        }

        this.isInitialized = true;
        return this.db;
    }

    saveToDiskSync() {
        if (!this.db || !this.dbPath) return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dbPath, buffer);
            console.log('[SQLiteService] 数据已真实落盘至本地 SQLite 文件:', this.dbPath);
        } catch (err) {
            console.error('[SQLiteService] 数据库写入硬盘失败:', err);
        }
    }

    scheduleSave() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.saveToDiskSync();
        }, 120);
    }

    initDefaultTables() {
        const ddl = `
        CREATE TABLE IF NOT EXISTS teachers (
            id TEXT PRIMARY KEY,
            school_name TEXT,
            teacher_name TEXT,
            class_name TEXT,
            school_norm TEXT,
            class_norm TEXT,
            teacher_norm TEXT,
            password_hash TEXT,
            created_at INTEGER,
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS classes (
            id TEXT PRIMARY KEY,
            teacher_id TEXT,
            school_name TEXT,
            class_name TEXT,
            class_norm TEXT,
            default_subject_id TEXT,
            max_level INTEGER DEFAULT 20,
            created_at INTEGER,
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS subjects (
            id TEXT PRIMARY KEY,
            class_id TEXT,
            code TEXT,
            name TEXT,
            is_preset INTEGER DEFAULT 1,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            class_id TEXT,
            student_no TEXT,
            name TEXT,
            group_name TEXT,
            note TEXT,
            display_pet_id TEXT,
            archived_at INTEGER,
            created_at INTEGER,
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS pets (
            id TEXT PRIMARY KEY,
            class_id TEXT,
            student_id TEXT,
            species_code TEXT,
            subject_id TEXT,
            nickname TEXT,
            egg_color TEXT,
            exp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            visual_stage INTEGER DEFAULT 0,
            pending_stage INTEGER,
            is_display INTEGER DEFAULT 1,
            teacher_positive_exp_total INTEGER DEFAULT 0,
            interaction_exp_total INTEGER DEFAULT 0,
            created_at INTEGER,
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS behavior_rules (
            id TEXT PRIMARY KEY,
            class_id TEXT,
            name TEXT,
            points INTEGER,
            type TEXT,
            sort_order INTEGER,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS class_level_thresholds (
            class_id TEXT,
            level INTEGER,
            min_exp INTEGER,
            PRIMARY KEY (class_id, level)
        );
        CREATE TABLE IF NOT EXISTS class_visual_stages (
            class_id TEXT,
            stage INTEGER,
            min_level INTEGER,
            code TEXT,
            PRIMARY KEY (class_id, stage)
        );
        CREATE TABLE IF NOT EXISTS score_operations (
            id TEXT PRIMARY KEY,
            class_id TEXT,
            teacher_id TEXT,
            request_id TEXT,
            rule_id TEXT,
            action_name TEXT,
            points INTEGER,
            remark TEXT,
            created_at INTEGER,
            undone_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS score_entries (
            id TEXT PRIMARY KEY,
            operation_id TEXT,
            class_id TEXT,
            student_id TEXT,
            pet_id TEXT,
            points_applied INTEGER,
            exp_before INTEGER,
            exp_after INTEGER,
            level_before INTEGER,
            level_after INTEGER
        );
        `;
        this.db.run(ddl);
    }

    query(sql, params = []) {
        if (!this.db) return [];
        try {
            const stmt = this.db.prepare(sql);
            if (params && params.length > 0) {
                stmt.bind(params);
            }
            const rows = [];
            while (stmt.step()) {
                rows.push(stmt.getAsObject());
            }
            stmt.free();
            return rows;
        } catch (err) {
            console.error('[SQLiteService] query 执行错误:', sql, err);
            return [];
        }
    }

    execute(sql, params = []) {
        if (!this.db) return false;
        try {
            this.db.run(sql, params);
            this.scheduleSave();
            return true;
        } catch (err) {
            console.error('[SQLiteService] execute 执行错误:', sql, err);
            return false;
        }
    }

    // 核心业务：全量加载状态（兼容前端 runtime 格式）
    loadAllState(classId = 'c_class02_01') {
        const studentsRows = this.query("SELECT * FROM students WHERE class_id = ? ORDER BY student_no ASC", [classId]);
        const petsRows = this.query("SELECT * FROM pets WHERE class_id = ?", [classId]);
        const rulesRows = this.query("SELECT * FROM behavior_rules WHERE class_id = ? ORDER BY sort_order ASC", [classId]);
        const thresholdRows = this.query("SELECT level, min_exp FROM class_level_thresholds WHERE class_id = ? ORDER BY level ASC", [classId]);
        const stagesRows = this.query("SELECT stage, min_level, code FROM class_visual_stages WHERE class_id = ? ORDER BY stage ASC", [classId]);
        const recentOps = this.query("SELECT * FROM score_operations WHERE class_id = ? ORDER BY created_at DESC LIMIT 50", [classId]);

        // 将扁平的 SQLite 数据组装为前端所需的结构化模型
        const petsByStudent = {};
        petsRows.forEach(p => {
            if (!petsByStudent[p.student_id]) petsByStudent[p.student_id] = {};
            const subCode = p.subject_id === 'subj_math' ? 'math' : (p.subject_id === 'subj_english' ? 'english' : 'chinese');
            petsByStudent[p.student_id][subCode] = p;
        });

        const thresholds = {};
        thresholdRows.forEach(r => thresholds[r.level] = r.min_exp);

        const stages = stagesRows.map(r => ({ stage: r.stage, minLevel: r.min_level, code: r.code }));

        return {
            students: studentsRows,
            petsByStudent,
            behaviorRules: rulesRows,
            thresholds,
            stages,
            recentOperations: recentOps
        };
    }

    // 容错处理：兼容外部前端传入的 stu_1 与 SQLite 原生主键 st_01 的双向映射
    normalizeStudentId(sId) {
        if (!sId) return sId;
        const s = String(sId);
        const direct = this.query("SELECT id FROM students WHERE id = ? LIMIT 1", [s]);
        if (direct.length > 0) return direct[0].id;

        let num = null;
        if (s.startsWith('stu_')) {
            num = parseInt(s.replace('stu_', ''), 10);
        } else if (s.startsWith('st_')) {
            num = parseInt(s.replace('st_', ''), 10);
        } else if (/^\d+$/.test(s)) {
            num = parseInt(s, 10);
        }
        if (num !== null && !isNaN(num)) {
            const noStr = num.toString().padStart(2, '0');
            const byNo = this.query("SELECT id FROM students WHERE student_no = ? OR id = ? OR id = ? LIMIT 1", [noStr, 'st_' + noStr, 'stu_' + num]);
            if (byNo.length > 0) return byNo[0].id;
        }
        return s;
    }

    // 核心业务：单人/批量赋分事务并记录真实审计流水
    recordScoreOperation({ classId = 'c_class02_01', teacherId = 't_liu_01', studentIds, delta, reason, ruleId = null }) {
        const opId = 'op_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const now = Date.now();

        try {
            this.db.run('BEGIN TRANSACTION;');

            // 1. 插入操作记录
            this.db.run(`
                INSERT INTO score_operations (id, class_id, teacher_id, request_id, rule_id, action_name, points, remark, created_at, undone_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);
            `, [opId, classId, teacherId, 'req_' + now, ruleId, reason, delta, '教师快速赋分', now]);

            const entries = [];
            for (const rawSId of studentIds) {
                const sId = this.normalizeStudentId(rawSId);
                const petRows = this.query("SELECT * FROM pets WHERE class_id = ? AND student_id = ? AND subject_id = 'subj_chinese'", [classId, sId]);
                let pet = petRows[0];
                if (!pet) {
                    // 若无宠物则初始化一条
                    const pId = 'pet_' + sId + '_c';
                    this.db.run(`
                        INSERT INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, created_at, updated_at)
                        VALUES (?, ?, ?, 'cat', 'subj_chinese', '大橘', '#FFAA00', 15, 1, 1, ?, ?);
                    `, [pId, classId, sId, now, now]);
                    pet = { id: pId, exp: 15, level: 1, visual_stage: 1 };
                }

                const expBefore = pet.exp;
                const expAfter = Math.max(0, expBefore + delta);
                const levelBefore = pet.level;
                // 经验升级计算（以 20 级阈值为准）
                let levelAfter = levelBefore;
                if (delta > 0) {
                    const nextThresh = this.query("SELECT level FROM class_level_thresholds WHERE class_id = ? AND min_exp <= ? ORDER BY level DESC LIMIT 1", [classId, expAfter]);
                    if (nextThresh.length > 0 && nextThresh[0].level > levelBefore) {
                        levelAfter = nextThresh[0].level;
                    }
                }

                // 2. 写入 entry 明细
                const entryId = 'ent_' + now + '_' + sId;
                this.db.run(`
                    INSERT INTO score_entries (id, operation_id, class_id, student_id, pet_id, points_applied, exp_before, exp_after, level_before, level_after)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                `, [entryId, opId, classId, sId, pet.id, delta, expBefore, expAfter, levelBefore, levelAfter]);

                // 3. 更新宠物表
                this.db.run(`
                    UPDATE pets SET exp = ?, level = ?, updated_at = ? WHERE id = ?;
                `, [expAfter, levelAfter, now, pet.id]);

                entries.push({ studentId: rawSId, normalizedStudentId: sId, petId: pet.id, expBefore, expAfter, levelBefore, levelAfter });
            }

            this.db.run('COMMIT;');
            this.scheduleSave();

            return {
                success: true,
                operationId: opId,
                actionName: reason,
                points: delta,
                timestamp: now,
                entries
            };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] 赋分事务失败，已自动回滚:', err);
            return { success: false, error: err.message };
        }
    }

    // 核心业务：撤销某笔特定赋分记录（单人穿透或全局撤销）
    undoOperation(operationId) {
        try {
            const opRows = this.query("SELECT * FROM score_operations WHERE id = ?", [operationId]);
            if (opRows.length === 0) return { success: false, error: '未找到该赋分记录' };
            const op = opRows[0];
            if (op.undone_at) return { success: false, error: '该记录此前已被撤销' };

            const entries = this.query("SELECT * FROM score_entries WHERE operation_id = ?", [operationId]);
            const now = Date.now();

            this.db.run('BEGIN TRANSACTION;');

            for (const ent of entries) {
                // 回滚宠物经验值（负向不破形不降级或恢复原值）
                this.db.run(`
                    UPDATE pets 
                    SET exp = ?, level = ?, updated_at = ?
                    WHERE id = ?;
                `, [ent.exp_before, ent.level_before, now, ent.pet_id]);
            }

            // 标记该笔流水已被撤销
            this.db.run("UPDATE score_operations SET undone_at = ? WHERE id = ?", [now, operationId]);

            this.db.run('COMMIT;');
            this.scheduleSave();

            return { success: true, operationId, undoneAt: now, revertedCount: entries.length };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] 撤销事务失败，已自动回滚:', err);
            return { success: false, error: err.message };
        }
    }

    // 核心业务：获取特定学生的专属历史审计流水（用于单人穿透查看与撤销）
    getStudentAuditLogs(studentId) {
        const realId = this.normalizeStudentId(studentId);
        const sql = `
            SELECT 
                op.id AS operation_id,
                op.action_name,
                op.points,
                op.created_at,
                op.undone_at,
                ent.exp_before,
                ent.exp_after,
                ent.level_before,
                ent.level_after,
                st.name AS student_name,
                st.student_no
            FROM score_entries ent
            JOIN score_operations op ON ent.operation_id = op.id
            JOIN students st ON ent.student_id = st.id
            WHERE ent.student_id = ? OR ent.student_id = ?
            ORDER BY op.created_at DESC
            LIMIT 50;
        `;
        return this.query(sql, [studentId, realId]);
    }

    // 核心业务：破壳认领或自选学科宠物形态
    hatchStudentPet({ classId = 'c_class02_01', studentId, subjectCode = 'chinese', speciesCode = 'cat', nickname = '' }) {
        const now = Date.now();
        const realId = this.normalizeStudentId(studentId);
        const subId = subjectCode === 'math' ? 'subj_math' : (subjectCode === 'english' ? 'subj_english' : 'subj_chinese');
        const petId = 'pet_' + realId + '_' + subjectCode.charAt(0);

        const existing = this.query("SELECT * FROM pets WHERE student_id = ? AND subject_id = ?", [realId, subId]);
        if (existing.length > 0) {
            this.execute(`
                UPDATE pets 
                SET species_code = ?, nickname = ?, visual_stage = 1, level = 1, updated_at = ?
                WHERE id = ?;
            `, [speciesCode, nickname || '宠物', now, existing[0].id]);
        } else {
            this.execute(`
                INSERT INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, '#FFAA00', 15, 1, 1, ?, ?);
            `, [petId, classId, realId, speciesCode, subId, nickname || '宠物', now, now]);
        }

        return { success: true, studentId, realId, subjectCode, speciesCode };
    }
}

module.exports = new SQLiteService();
