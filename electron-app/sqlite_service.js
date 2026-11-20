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

    async init(app, customDbPath = null) {
        if (this.isInitialized) return this.db;
        this.SQL = await initSqlJs();

        if (customDbPath) {
            this.dbPath = customDbPath;
        } else if (app && app.isPackaged) {
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
            this.initDefaultTables();
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
        let thresholdRows = this.query("SELECT level, min_exp FROM class_level_thresholds WHERE class_id = ? ORDER BY level ASC", [classId]);
        if (thresholdRows.length === 0) {
            const defaultThresholds = [
                0, 15, 35, 60, 90, 125, 165, 210, 260, 315,
                375, 440, 510, 585, 665, 750, 840, 935, 1035, 1140, 1250
            ];
            for (let l = 0; l <= 20; l++) {
                this.execute("INSERT OR IGNORE INTO class_level_thresholds (class_id, level, min_exp) VALUES (?, ?, ?)", [classId, l, defaultThresholds[l]]);
            }
            thresholdRows = this.query("SELECT level, min_exp FROM class_level_thresholds WHERE class_id = ? ORDER BY level ASC", [classId]);
        }

        let stagesRows = this.query("SELECT stage, min_level, code FROM class_visual_stages WHERE class_id = ? ORDER BY stage ASC", [classId]);
        if (stagesRows.length === 0) {
            const defaultStages = [
                { stage: 0, min_level: 0, code: 'egg' },
                { stage: 1, min_level: 1, code: 'form1' },
                { stage: 2, min_level: 4, code: 'form2' },
                { stage: 3, min_level: 8, code: 'form3' },
                { stage: 4, min_level: 13, code: 'form4' },
                { stage: 5, min_level: 20, code: 'form5' }
            ];
            for (const st of defaultStages) {
                this.execute("INSERT OR IGNORE INTO class_visual_stages (class_id, stage, min_level, code) VALUES (?, ?, ?, ?)", [classId, st.stage, st.min_level, st.code]);
            }
            stagesRows = this.query("SELECT stage, min_level, code FROM class_visual_stages WHERE class_id = ? ORDER BY stage ASC", [classId]);
        }
        const recentOps = this.query("SELECT * FROM score_operations WHERE class_id = ? ORDER BY created_at DESC LIMIT 50", [classId]);

        // 将扁平的 SQLite 数据组装为前端所需的结构化模型
        studentsRows.forEach(r => {
            r.no = r.student_no;
            r.group = parseInt(String(r.group_name || '1').replace(/\D/g, ''), 10) || 1;
            r.isArchived = !!r.archived_at;
        });

        const petsByStudent = {};
        petsRows.forEach(p => {
            if (!petsByStudent[p.student_id]) petsByStudent[p.student_id] = {};
            const subCode = p.subject_id === 'subj_math' ? 'math' : (p.subject_id === 'subj_english' ? 'english' : 'chinese');
            const existing = petsByStudent[p.student_id][subCode];
            // 优先选取设为大屏展示宠(is_display)或等级更高的真实有效记录，杜绝低级历史脏记录覆盖
            if (!existing || (p.is_display && !existing.is_display) || ((p.level || 0) > (existing.level || 0))) {
                petsByStudent[p.student_id][subCode] = p;
            }
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

    // 核心业务：单人/批量赋分事务并记录真实审计流水 (全面支持多学科宠物独立记分)
    recordScoreOperation({ classId = 'c_class02_01', teacherId = 't_liu_01', studentIds, delta, reason, ruleId = null, subjectCode = null }) {
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
                const subId = subjectCode === 'math' ? 'subj_math' : (subjectCode === 'english' ? 'subj_english' : (subjectCode === 'chinese' ? 'subj_chinese' : null));

                let pet = null;
                if (subId) {
                    const petRows = this.query("SELECT * FROM pets WHERE class_id = ? AND student_id = ? AND subject_id = ?", [classId, sId, subId]);
                    pet = petRows[0];
                } else {
                    const petRows = this.query(`
                        SELECT p.* FROM pets p 
                        LEFT JOIN students s ON s.id = p.student_id AND s.class_id = p.class_id
                        WHERE p.class_id = ? AND p.student_id = ? 
                        ORDER BY (CASE WHEN p.id = s.display_pet_id THEN 3 WHEN p.is_display = 1 THEN 2 WHEN p.subject_id = 'subj_chinese' THEN 1 ELSE 0 END) DESC 
                        LIMIT 1
                    `, [classId, sId]);
                    pet = petRows[0];
                }

                if (!pet) {
                    // 不再凭空造宠物：目标学科没有宠物时拒绝本次赋分，由上层先孵化/认领
                    throw new Error('NO_PET_FOR_SUBJECT:' + (subId || 'subj_chinese'));
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

                // 视觉形态阶段进阶计算 (只升不降)
                let stageAfter = pet.visual_stage || 1;
                const stageThresh = this.query("SELECT stage FROM class_visual_stages WHERE class_id = ? AND min_level <= ? ORDER BY stage DESC LIMIT 1", [classId, levelAfter]);
                if (stageThresh.length > 0 && stageThresh[0].stage > stageAfter) {
                    stageAfter = stageThresh[0].stage;
                }

                // 2. 写入 entry 明细
                const entryId = 'ent_' + now + '_' + sId;
                this.db.run(`
                    INSERT INTO score_entries (id, operation_id, class_id, student_id, pet_id, points_applied, exp_before, exp_after, level_before, level_after)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                `, [entryId, opId, classId, sId, pet.id, delta, expBefore, expAfter, levelBefore, levelAfter]);

                // 3. 更新宠物表 (经验、等级、视觉阶段与更新时间)
                this.db.run(`
                    UPDATE pets SET exp = ?, level = ?, visual_stage = ?, updated_at = ? WHERE id = ?;
                `, [expAfter, levelAfter, stageAfter, now, pet.id]);

                entries.push({ studentId: rawSId, normalizedStudentId: sId, petId: pet.id, expBefore, expAfter, levelBefore, levelAfter, visualStage: stageAfter });
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

            // D11=A：只允许撤销本班最后一笔未撤销的操作，避免覆盖后续流水
            const opClassId = op.class_id || (this.query("SELECT class_id FROM score_entries WHERE operation_id = ? LIMIT 1", [operationId])[0] || {}).class_id || null;
            if (opClassId) {
                const latestRows = this.query(
                    "SELECT id FROM score_operations WHERE class_id = ? AND undone_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1",
                    [opClassId]
                );
                if (!latestRows.length) return { success: false, error: 'NO_UNDOABLE:本班没有可撤销的赋分记录' };
                if (String(latestRows[0].id) !== String(operationId)) {
                    return { success: false, error: 'NOT_LAST:只能撤销本堂课最后一笔赋分' };
                }
            }

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

    // 学科链式解锁（与 classpet_core.isSubjectUnlocked 同一规则，用库里的宠物行判定）
    checkSubjectUnlock(studentId, subjectCode, classId = 'c_class02_01') {
        const key = subjectCode === 'math' ? 'math' : (subjectCode === 'english' ? 'english' : 'chinese');
        const rows = this.query("SELECT * FROM pets WHERE class_id = ? AND student_id = ?", [classId, studentId]);
        const byKey = {};
        rows.forEach(r => {
            const k = r.subject_id === 'subj_math' ? 'math' : (r.subject_id === 'subj_english' ? 'english' : 'chinese');
            const prev = byKey[k];
            if (!prev || (Number(r.exp) || 0) > (Number(prev.exp) || 0)) byKey[k] = r;
        });
        const hatched = r => !!(r && Number(r.visual_stage) >= 1 && String(r.species_code || 'egg') !== 'egg');
        if (key === 'chinese') return { allowed: true, reason: null };
        if (hatched(byKey[key])) return { allowed: true, reason: null };
        const maxLevel = Number((this.query("SELECT max_level FROM classes WHERE id = ? LIMIT 1", [classId])[0] || {}).max_level) || 20;
        const cn = byKey.chinese;
        const cnMax = hatched(cn) && (Number(cn.level) || 0) >= maxLevel;
        if (!cnMax) return { allowed: false, reason: '需【语文】学科宠物升至 Lv.' + maxLevel + ' 满级方可唤醒' };
        const otherKey = key === 'math' ? 'english' : 'math';
        if (!hatched(byKey[otherKey])) return { allowed: true, reason: null };
        const otherMax = (Number(byKey[otherKey].level) || 0) >= maxLevel;
        if (otherMax) return { allowed: true, reason: null };
        return { allowed: false, reason: '需【语文】与【' + (otherKey === 'math' ? '数学' : '英语') + '】均升至 Lv.' + maxLevel + ' 满级方可唤醒' };
    }

    // 核心业务：破壳认领或自选学科宠物形态
    hatchStudentPet({ classId = 'c_class02_01', studentId, subjectCode = 'chinese', speciesCode = 'cat', nickname = '' }) {
        const now = Date.now();
        const realId = this.normalizeStudentId(studentId);
        const subId = subjectCode === 'math' ? 'subj_math' : (subjectCode === 'english' ? 'subj_english' : 'subj_chinese');
        const petId = 'pet_' + realId + '_' + subjectCode.charAt(0);

        const existing = this.query("SELECT * FROM pets WHERE student_id = ? AND subject_id = ?", [realId, subId]);

        // 批次 3.3 破壳门槛：学生存在 → 未破壳 → 经验达标 → 学科链式解锁
        const stuRows = this.query("SELECT * FROM students WHERE id = ? AND class_id = ? LIMIT 1", [realId, classId]);
        if (stuRows.length === 0) return { success: false, error: 'NO_STUDENT:学生不存在或不属于该班级' };
        if (existing.length > 0) {
            const ex = existing[0];
            const already = (Number(ex.visual_stage) || 0) >= 1 && String(ex.species_code || 'egg') !== 'egg';
            if (already) return { success: false, error: 'ALREADY_HATCHED:该学科宠物已经破壳认领' };
        }
        const threshRow = this.query("SELECT min_exp FROM class_level_thresholds WHERE class_id = ? AND level = 1", [classId])[0];
        const hatchNeed = threshRow ? Number(threshRow.min_exp) : 15;
        const currentExp = existing.length > 0 ? (Number(existing[0].exp) || 0) : 0;
        if (currentExp < hatchNeed) {
            return { success: false, error: 'EXP_NOT_ENOUGH:破壳需要 ' + hatchNeed + ' EXP，当前 ' + currentExp };
        }
        const unlock = this.checkSubjectUnlock(realId, subjectCode, classId);
        if (!unlock.allowed) return { success: false, error: 'SUBJECT_LOCKED:' + unlock.reason };

        let targetPetId = petId;
        if (existing.length > 0) {
            targetPetId = existing[0].id;
            this.execute(`
                UPDATE pets 
                SET species_code = ?, nickname = ?, exp = MAX(15, exp), visual_stage = MAX(1, visual_stage), level = MAX(1, level), updated_at = ?
                WHERE id = ?;
            `, [speciesCode, nickname || '宠物', now, targetPetId]);
        } else {
            this.execute(`
                INSERT INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, '#FFAA00', 15, 1, 1, ?, ?);
            `, [petId, classId, realId, speciesCode, subId, nickname || '宠物', now, now]);
        }

        // 破壳后自动同步设定为当前大屏主展示宠物
        this.execute("UPDATE pets SET is_display = 0 WHERE class_id = ? AND student_id = ?", [classId, realId]);
        this.execute("UPDATE pets SET is_display = 1 WHERE id = ?", [targetPetId]);
        this.execute("UPDATE students SET display_pet_id = ?, updated_at = ? WHERE id = ? AND class_id = ?", [targetPetId, now, realId, classId]);

        return { success: true, studentId, realId, subjectCode, speciesCode };
    }

    // 批次 4.3 本堂课 + 今日台账：一条操作一笔流水，带学生、学科、撤销状态、真实时间
    getClassLedger(classId = 'c_class02_01', fromTs = null, toTs = null) {
        const where = ["op.class_id = ?"];
        const params = [classId];
        if (fromTs !== null && fromTs !== undefined) { where.push("op.created_at >= ?"); params.push(Number(fromTs)); }
        if (toTs !== null && toTs !== undefined) { where.push("op.created_at < ?"); params.push(Number(toTs)); }
        const sql = `SELECT op.id AS operation_id, op.created_at, op.points, op.action_name, op.rule_id, op.undone_at,
                            ent.student_id, ent.pet_id, ent.exp_before, ent.exp_after, ent.level_before, ent.level_after,
                            st.name AS student_name, st.student_no, st.group_name,
                            p.subject_id AS pet_subject_id
                     FROM score_operations op
                     LEFT JOIN score_entries ent ON ent.operation_id = op.id
                     LEFT JOIN students st ON st.id = ent.student_id
                     LEFT JOIN pets p ON p.id = ent.pet_id
                     WHERE ${where.join(' AND ')}
                     ORDER BY op.created_at DESC, op.rowid DESC`;
        return this.query(sql, params);
    }

    // 批次 4.1 只改姓名/小组（绝不碰等级、经验、物种）
    updateStudentProfile(studentId, { name, group } = {}, classId = 'c_class02_01') {
        const realId = this.normalizeStudentId(studentId);
        const rows = this.query("SELECT * FROM students WHERE id = ? AND class_id = ? LIMIT 1", [realId, classId]);
        if (rows.length === 0) return { success: false, error: 'NO_STUDENT:学生不存在或不属于该班级' };
        const cur = rows[0];
        const nextName = (name !== undefined && String(name).trim()) ? String(name).trim() : cur.name;
        let groupNum = Number(String(cur.group_name || '1').replace(/\D/g, '')) || 1;
        if (group !== undefined && group !== null && String(group).trim() !== '') {
            groupNum = parseInt(String(group).replace(/\D/g, ''), 10) || 1;
        }
        const now = Date.now();
        try {
            this.db.run('BEGIN TRANSACTION;');
            this.db.run("UPDATE students SET name = ?, group_name = ?, updated_at = ? WHERE id = ? AND class_id = ?",
                [nextName, '第' + groupNum + '组', now, realId, classId]);
            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true, studentId: realId, name: nextName, group: groupNum };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] updateStudentProfile 失败:', err);
            return { success: false, error: err.message };
        }
    }

    // 批次 4.5 整包恢复：学生/宠物/阈值/形态/规则在同一个事务里，失败不半套
    restoreClassBackup(classId, payload) {
        if (!payload || !Array.isArray(payload.students)) return { success: false, error: 'BAD_PAYLOAD:缺少学生名单' };
        const now = Date.now();
        try {
            this.db.run('BEGIN TRANSACTION;');

            this.db.run("DELETE FROM pets WHERE class_id = ?;", [classId]);
            this.db.run("DELETE FROM students WHERE class_id = ?;", [classId]);

            const subjects = [
                { key: 'chinese', subId: 'subj_chinese', defaultName: '神秘宠物蛋' },
                { key: 'math', subId: 'subj_math', defaultName: '神秘宠物蛋 (待破壳)' },
                { key: 'english', subId: 'subj_english', defaultName: '神秘宠物蛋 (待破壳)' }
            ];
            for (let idx = 0; idx < payload.students.length; idx++) {
                const student = payload.students[idx] || {};
                if (!student.id) throw new Error('BAD_STUDENT:第 ' + (idx + 1) + ' 条缺少 id');
                const no = String(student.no !== undefined ? student.no : (student.student_no !== undefined ? student.student_no : idx + 1)).padStart(2, '0');
                const groupNum = typeof student.group === 'number' ? student.group : (parseInt(String(student.group || student.group_name || 1).replace(/\D/g, ''), 10) || 1);
                this.db.run(`INSERT INTO students (id, class_id, student_no, name, group_name, note, display_pet_id, archived_at, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?);`,
                    [student.id, classId, no, student.name || '未命名', '第' + groupNum + '组', student.displayPetId || null, student.isArchived ? now : null, now, now]);

                for (const sub of subjects) {
                    const p = (student.pets && student.pets[sub.key]) || {};
                    const pId = p.id || ('pet_' + student.id + '_' + sub.key.charAt(0));
                    const spCode = p.species || p.speciesCode || 'egg';
                    const nickname = p.name || (spCode === 'egg' ? sub.defaultName : sub.defaultName);
                    this.db.run(`INSERT INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, is_display, created_at, updated_at)
                                 VALUES (?, ?, ?, ?, ?, ?, '#FFAA00', ?, ?, ?, ?, ?, ?);`,
                        [pId, classId, student.id, spCode, sub.subId, nickname, Number(p.exp) || 0, Number(p.level) || 0, Number(p.visualStage) || 0, p.isDisplay ? 1 : 0, now, now]);
                }
            }

            if (Array.isArray(payload.thresholds) && payload.thresholds.length === 21) {
                this.db.run("DELETE FROM class_level_thresholds WHERE class_id = ?", [classId]);
                for (let l = 0; l <= 20; l++) {
                    this.db.run("INSERT INTO class_level_thresholds (class_id, level, min_exp) VALUES (?, ?, ?)", [classId, l, Number(payload.thresholds[l]) || 0]);
                }
            }
            if (Array.isArray(payload.stages) && payload.stages.length === 6) {
                this.db.run("DELETE FROM class_visual_stages WHERE class_id = ?", [classId]);
                payload.stages.forEach(st => {
                    this.db.run("INSERT INTO class_visual_stages (class_id, stage, min_level, code) VALUES (?, ?, ?, ?)",
                        [classId, Number(st.stage), Number(st.minLevel), st.code || ('form' + st.stage)]);
                });
            }
            if (Array.isArray(payload.rules)) {
                this.db.run("DELETE FROM behavior_rules WHERE class_id = ?", [classId]);
                payload.rules.forEach((r, i) => {
                    this.db.run("INSERT INTO behavior_rules (id, class_id, name, points, type, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [r.id || ('rule_' + (i + 1)), classId, r.name, Number(r.points) || 0, r.type === 'negative' ? 'negative' : 'positive', i + 1, now]);
                });
            }

            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true, count: payload.students.length };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] restoreClassBackup 失败，已回滚:', err);
            return { success: false, error: err.message };
        }
    }

    // 核心业务：保存/更新单个学生及其 3 科萌宠档案
    saveStudent(student, classId = 'c_class02_01', options) {
        if (!student || !student.id) return { success: false, error: '无效的学生对象' };
        const strictNo = options?.strictStudentNo === true;
        const now = Date.now();
        const rawNo = student.student_no !== undefined ? student.student_no : (student.no !== undefined ? student.no : (strictNo ? '' : '01'));
        const requestedNo = strictNo ? String(rawNo ?? '').trim() : String(rawNo);
        if (strictNo && requestedNo && !/^\d+$/.test(requestedNo)) {
            return { success: false, reason: 'bad-no', error: '学号必须为数字' };
        }
        const no = (strictNo ? requestedNo.replace(/^0+(?=\d)/, '') : requestedNo).padStart(2, '0');
        const name = student.name || '未命名';
        const rawGroup = student.group !== undefined ? student.group : (student.group_name !== undefined ? student.group_name : 1);
        const groupNum = typeof rawGroup === 'number' ? rawGroup : (parseInt(String(rawGroup).replace(/\D/g, ''), 10) || 1);
        const groupName = `第${groupNum}组`;
        const archivedAt = student.isArchived !== undefined ? (student.isArchived ? (student.archivedAt || now) : null) : (student.archived_at || null);
        const note = student.note || '';

        try {
            this.db.run('BEGIN TRANSACTION;');

            // 1. 确保 classes 记录存在，防止外键或跨班级写入报错
            this.db.run(`
                INSERT OR IGNORE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at)
                VALUES (?, 't_teacher', '实验小学', '教学班级', '教学班级', 'subj_chinese', 20, ?, ?);
            `, [classId, now, now]);

            // V3 显式学号冲突直接拒绝，留空才分配新号；旧调用保留自动顺延。
            let safeNo = no;
            const existing = this.query("SELECT id, class_id, student_no FROM students WHERE id = ? LIMIT 1", [student.id]);
            if (strictNo && existing.length && existing[0].class_id !== classId) {
                this.db.run('ROLLBACK;');
                return { success: false, error: '学生不属于当前班级' };
            }
            const conflict = strictNo
                ? (requestedNo && this.query(
                    "SELECT id FROM students WHERE class_id = ? AND id != ? AND trim(student_no) <> '' AND trim(student_no) NOT GLOB '*[^0-9]*' AND ltrim(trim(student_no), '0') = ? LIMIT 1",
                    [classId, student.id, no.replace(/^0+/, '')]
                ).length > 0)
                : this.query("SELECT id FROM students WHERE class_id = ? AND student_no = ? AND id != ? LIMIT 1", [classId, safeNo, student.id]).length > 0;
            if (strictNo && conflict) {
                this.db.run('ROLLBACK;');
                return { success: false, reason: 'duplicate-no', error: '学号 ' + requestedNo + ' 已被占用' };
            }
            if (strictNo && requestedNo && existing.length && /^\d+$/.test(String(existing[0].student_no).trim()) &&
                String(existing[0].student_no).trim().replace(/^0+/, '') === no.replace(/^0+/, '')) {
                safeNo = existing[0].student_no;
            }
            if (conflict || (strictNo && !requestedNo)) {
                const maxRow = this.query("SELECT MAX(CAST(student_no AS INTEGER)) as max_no FROM students WHERE class_id = ?", [classId]);
                const maxVal = (maxRow && maxRow[0] && maxRow[0].max_no) ? parseInt(maxRow[0].max_no, 10) : 0;
                safeNo = (maxVal + 1).toString().padStart(2, '0');
                student.student_no = safeNo;
                student.no = safeNo;
            }

            const targetDisplaySub = student.activeSubject || 'chinese';
            const displayPetId = 'pet_' + student.id + '_' + targetDisplaySub.charAt(0);
            if (existing.length > 0) {
                this.db.run(`
                    UPDATE students 
                    SET student_no = ?, name = ?, group_name = ?, note = ?, display_pet_id = ?, archived_at = ?, updated_at = ?
                    WHERE id = ?;
                `, [safeNo, name, groupName, note, displayPetId, archivedAt, now, student.id]);
            } else {
                this.db.run(`
                    INSERT INTO students (id, class_id, student_no, name, group_name, note, display_pet_id, archived_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                `, [student.id, classId, safeNo, name, groupName, note, displayPetId, archivedAt, now, now]);
            }

            const subjects = [
                { key: 'chinese', subId: 'subj_chinese', defaultSpecies: 'cat', defaultName: '语文萌宠' },
                { key: 'math', subId: 'subj_math', defaultSpecies: 'dog', defaultName: '数学萌宠' },
                { key: 'english', subId: 'subj_english', defaultSpecies: 'fox', defaultName: '英语萌宠' }
            ];

            for (const sub of subjects) {
                const p = (student.pets && student.pets[sub.key]) || {};
                const pId = p.id || `pet_${student.id}_${sub.key.charAt(0)}`;
                const spCode = p.species || (sub.key === 'chinese' ? (student.species || 'egg') : 'egg');
                const pLevel = typeof p.level === 'number' ? p.level : (sub.key === 'chinese' ? (student.level || 0) : 0);
                const pExp = typeof p.exp === 'number' ? p.exp : (sub.key === 'chinese' ? (student.exp || 0) : 0);
                const pStage = typeof p.visualStage === 'number' ? p.visualStage : (sub.key === 'chinese' ? (student.visualStage || 0) : 0);
                const nickname = p.name || (spCode === 'egg' ? '神秘宠物蛋' : sub.defaultName);
                const isDisplay = (student.activeSubject ? student.activeSubject === sub.key : sub.key === 'chinese') ? 1 : 0;

                const existingPet = this.query("SELECT id, species_code, nickname FROM pets WHERE id = ? OR (student_id = ? AND subject_id = ?) LIMIT 1", [pId, student.id, sub.subId]);
                if (existingPet.length > 0) {
                    const savedNickname = strictNo && !p.name && existingPet[0].species_code === spCode ? existingPet[0].nickname : nickname;
                    this.db.run(`
                        UPDATE pets
                        SET species_code = ?, nickname = ?, exp = ?, level = ?, visual_stage = ?, is_display = ?, updated_at = ?
                        WHERE id = ?;
                    `, [spCode, savedNickname, pExp, pLevel, pStage, isDisplay, now, existingPet[0].id]);
                } else {
                    this.db.run(`
                        INSERT INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, is_display, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, '#FFAA00', ?, ?, ?, ?, ?, ?);
                    `, [pId, classId, student.id, spCode, sub.subId, nickname, pExp, pLevel, pStage, isDisplay, now, now]);
                }
            }

            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true, studentId: student.id, studentNo: safeNo };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] saveStudent 失败:', err);
            return { success: false, error: err.message };
        }
    }

    // 核心业务：批量导入整班学生花名册 (全量替换该班级名单并存盘)
    importStudents(students, classId = 'c_class02_01') {
        if (!Array.isArray(students)) return { success: false, error: 'students必须为数组' };
        const now = Date.now();
        try {
            this.db.run('BEGIN TRANSACTION;');

            // 确保 classes 记录存在
            this.db.run(`
                INSERT OR IGNORE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at)
                VALUES (?, 't_teacher', '实验小学', '教学班级', '教学班级', 'subj_chinese', 20, ?, ?);
            `, [classId, now, now]);

            // 1. 清空当前班级的既有宠物与学生 (操作流水审计予以保留)
            this.db.run("DELETE FROM pets WHERE class_id = ?;", [classId]);
            this.db.run("DELETE FROM students WHERE class_id = ?;", [classId]);

            // 2. 批量写入新导入的学生与初始宠物蛋
            const subjects = [
                { key: 'chinese', subId: 'subj_chinese', defaultSpecies: 'cat', defaultName: '神秘宠物蛋' },
                { key: 'math', subId: 'subj_math', defaultSpecies: 'egg', defaultName: '神秘宠物蛋 (待破壳)' },
                { key: 'english', subId: 'subj_english', defaultSpecies: 'egg', defaultName: '神秘宠物蛋 (待破壳)' }
            ];

            const usedNos = new Set();
            for (let idx = 0; idx < students.length; idx++) {
                const student = students[idx];
                const rawNo = student.student_no !== undefined ? student.student_no : (student.no !== undefined ? student.no : (idx + 1));
                let no = String(rawNo).padStart(2, '0');
                if (usedNos.has(no)) {
                    no = (idx + 1).toString().padStart(2, '0');
                }
                usedNos.add(no);
                student.student_no = no;
                student.no = no;
                const name = student.name || '未命名';
                const rawGroup = student.group !== undefined ? student.group : (student.group_name !== undefined ? student.group_name : 1);
                const groupNum = typeof rawGroup === 'number' ? rawGroup : (parseInt(String(rawGroup).replace(/\D/g, ''), 10) || 1);
                const groupName = `第${groupNum}组`;
                const archivedAt = student.isArchived !== undefined ? (student.isArchived ? now : null) : (student.archived_at || null);

                this.db.run(`
                    INSERT INTO students (id, class_id, student_no, name, group_name, note, display_pet_id, archived_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?);
                `, [student.id, classId, no, name, groupName, 'pet_' + student.id + '_c', archivedAt, now, now]);

                for (const sub of subjects) {
                    const p = (student.pets && student.pets[sub.key]) || {};
                    const pId = p.id || `pet_${student.id}_${sub.key.charAt(0)}`;
                    const spCode = p.species || (sub.key === 'chinese' ? (student.species || 'egg') : 'egg');
                    const pLevel = typeof p.level === 'number' ? p.level : (sub.key === 'chinese' ? (student.level || 0) : 0);
                    const pExp = typeof p.exp === 'number' ? p.exp : (sub.key === 'chinese' ? (student.exp || 0) : 0);
                    const pStage = typeof p.visualStage === 'number' ? p.visualStage : (sub.key === 'chinese' ? (student.visualStage || 0) : 0);
                    const nickname = p.name || sub.defaultName;
                    const isDisplay = (student.activeSubject ? student.activeSubject === sub.key : sub.key === 'chinese') ? 1 : 0;

                    this.db.run(`
                        INSERT INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, is_display, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, '#FFAA00', ?, ?, ?, ?, ?, ?);
                    `, [pId, classId, student.id, spCode, sub.subId, nickname, pExp, pLevel, pStage, isDisplay, now, now]);
                }
            }

            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true, count: students.length };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] importStudents 失败:', err);
            return { success: false, error: err.message };
        }
    }

    // 核心业务：批量同步全班所有学生最新状态（如大组批量调动等）
    saveAllStudents(students, classId = 'c_class02_01') {
        if (!Array.isArray(students)) return { success: false, error: 'students必须为数组' };
        const now = Date.now();
        try {
            this.db.run('BEGIN TRANSACTION;');

            // 确保 classes 记录存在
            this.db.run(`
                INSERT OR IGNORE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at)
                VALUES (?, 't_teacher', '实验小学', '教学班级', '教学班级', 'subj_chinese', 20, ?, ?);
            `, [classId, now, now]);

            for (const s of students) {
                const rawNo = s.student_no !== undefined ? s.student_no : (s.no !== undefined ? s.no : '01');
                const no = String(rawNo).padStart(2, '0');
                const name = s.name || '未命名';
                const rawGroup = s.group !== undefined ? s.group : (s.group_name !== undefined ? s.group_name : 1);
                const groupNum = typeof rawGroup === 'number' ? rawGroup : (parseInt(String(rawGroup).replace(/\D/g, ''), 10) || 1);
                const groupName = `第${groupNum}组`;
                const archivedAt = s.isArchived !== undefined ? (s.isArchived ? now : null) : (s.archived_at || null);

                const existing = this.query("SELECT id FROM students WHERE id = ? LIMIT 1", [s.id]);
                if (existing.length > 0) {
                    this.db.run(`
                        UPDATE students 
                        SET student_no = ?, name = ?, group_name = ?, archived_at = ?, updated_at = ?
                        WHERE id = ?;
                    `, [no, name, groupName, archivedAt, now, s.id]);
                } else {
                    this.db.run(`
                        INSERT INTO students (id, class_id, student_no, name, group_name, note, display_pet_id, archived_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?);
                    `, [s.id, classId, no, name, groupName, 'pet_' + s.id + '_c', archivedAt, now, now]);
                }
            }
            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true, count: students.length };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] saveAllStudents 失败:', err);
            return { success: false, error: err.message };
        }
    }

    // 核心业务：学生归档与还原
    archiveStudent(studentId, isArchived = true) {
        const realId = this.normalizeStudentId(studentId);
        const now = Date.now();
        const archivedAt = isArchived ? now : null;
        const res = this.execute("UPDATE students SET archived_at = ?, updated_at = ? WHERE id = ? OR id = ?", [archivedAt, now, studentId, realId]);
        this.saveToDiskSync();
        return { success: res };
    }

    // 核心业务：永久删除单个学生及其关联宠物
    deleteStudent(studentId) {
        const realId = this.normalizeStudentId(studentId);
        try {
            this.db.run('BEGIN TRANSACTION;');
            this.db.run("DELETE FROM pets WHERE student_id = ? OR student_id = ?", [studentId, realId]);
            this.db.run("DELETE FROM score_entries WHERE student_id = ? OR student_id = ?", [studentId, realId]);
            this.db.run("DELETE FROM students WHERE id = ? OR id = ?", [studentId, realId]);
            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] deleteStudent 失败:', err);
            return { success: false, error: err.message };
        }
    }

    // 核心业务：保存升级经验阈值与阶段进阶
    saveThresholds(thresholds, stages, classId = 'c_class02_01') {
        try {
            this.db.run('BEGIN TRANSACTION;');
            this.db.run("DELETE FROM class_level_thresholds WHERE class_id = ?", [classId]);
            for (let l = 0; l <= 20; l++) {
                const fallback = (l === 0 ? 0 : l * 20);
                const exp = (Array.isArray(thresholds) && thresholds[l] !== undefined) ? Number(thresholds[l]) : fallback;
                this.db.run("INSERT INTO class_level_thresholds (class_id, level, min_exp) VALUES (?, ?, ?)", [classId, l, exp]);
            }
            if (Array.isArray(stages)) {
                this.db.run("DELETE FROM class_visual_stages WHERE class_id = ?", [classId]);
                stages.forEach(st => {
                    this.db.run("INSERT INTO class_visual_stages (class_id, stage, min_level, code) VALUES (?, ?, ?, ?)", [classId, st.stage, st.minLevel, st.code || ('form' + st.stage)]);
                });
            }
            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] saveThresholds 失败:', err);
            return { success: false, error: err.message };
        }
    }

    // 核心业务：保存行为规则库
    saveBehaviorRules(rules, classId = 'c_class02_01') {
        try {
            this.db.run('BEGIN TRANSACTION;');
            this.db.run("DELETE FROM behavior_rules WHERE class_id = ?", [classId]);
            const now = Date.now();
            rules.forEach((r, idx) => {
                this.db.run("INSERT INTO behavior_rules (id, class_id, name, points, type, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [r.id || ('rule_' + idx), classId, r.name, r.points, r.type, idx + 1, now]);
            });
            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] saveBehaviorRules 失败:', err);
            return { success: false, error: err.message };
        }
    }
}

const sqliteServiceInstance = new SQLiteService();
sqliteServiceInstance.SQLiteService = SQLiteService;
module.exports = sqliteServiceInstance;
