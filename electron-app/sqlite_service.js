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
            hatched_at INTEGER,
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
        CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT
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
        CREATE TABLE IF NOT EXISTS class_subject_unlocks (
            class_id TEXT,
            code TEXT,
            unlocked_at INTEGER,
            PRIMARY KEY (class_id, code)
        );
        `;
        this.db.run(ddl);
        this.ensurePetsHatchColumn();
    }

    // 老库补列 + 一次性订正：hatched_at 是"是否已孵化"的显式记录（不再靠 visual_stage 推断）
    ensurePetsHatchColumn() {
        if (this._hatchColChecked) return true;
        try {
            const cols = this.query("PRAGMA table_info(pets)").map(c => c.name);
            if (cols.indexOf('hatched_at') < 0) {
                this.db.run("ALTER TABLE pets ADD COLUMN hatched_at INTEGER");
            }
            this._hatchColChecked = true;
            return true;
        } catch (e) {
            console.warn('[SQLiteService] 补 hatched_at 失败:', e && e.message);
            return false;
        }
    }

    // 规则 v3（2026-11-20）：破壳门槛 = 该班第 1 级阈值（迁移后为 50）；经验不够的一律回到蛋。
    // 必须在“阈值迁移”之后调用；用 app_meta 记标记，只跑一次。
    migrateHatchRuleV3() {
        try {
            const done = this.query("SELECT value FROM app_meta WHERE key = 'hatch_rule_v3'")[0];
            if (!done) {
                const now = Date.now();
                const thresholds = {};
                this.query("SELECT class_id, min_exp FROM class_level_thresholds WHERE level = 1").forEach(r => {
                    thresholds[r.class_id] = Number(r.min_exp) || 50;
                });
                const pets = this.query("SELECT id, class_id, exp, species_code, visual_stage, created_at FROM pets");
                let backToEgg = 0, kept = 0;
                this.db.run('BEGIN TRANSACTION;');
                pets.forEach(p => {
                    const need = thresholds[p.class_id] || 50;
                    const exp = Number(p.exp) || 0;
                    if (exp < need) {
                        /* 经验没到破壳线：无论历史 stage 是多少，都应是蛋，等用户点破壳 */
                        this.db.run("UPDATE pets SET hatched_at = NULL, visual_stage = 0 WHERE id = ?", [p.id]);
                        backToEgg += 1;
                    } else if ((Number(p.visual_stage) || 0) >= 1 && String(p.species_code || 'egg') !== 'egg') {
                        /* 经验已达标且本来就显示成宠物：保留为已孵化 */
                        this.db.run("UPDATE pets SET hatched_at = COALESCE(hatched_at, created_at, ?) WHERE id = ?", [now, p.id]);
                        kept += 1;
                    } else {
                        this.db.run("UPDATE pets SET hatched_at = NULL WHERE id = ?", [p.id]);
                    }
                });
                this.db.run("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('hatch_rule_v3', ?)", [String(now)]);
                this.db.run('COMMIT;');
                this.saveToDiskSync();
                console.log('[SQLiteService] 孵化规则 v3 已应用：' + backToEgg + ' 只经验不足的宠物回到蛋；' + kept + ' 只已达标的宠物标记为已孵化');
            }
            return true;
        } catch (e) {
            try { this.db.run('ROLLBACK;'); } catch (e2) {}
            console.warn('[SQLiteService] 孵化规则 v3 迁移失败:', e && e.message);
            return false;
        }
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
        this.ensurePetsHatchColumn();
        const studentsRows = this.query("SELECT * FROM students WHERE class_id = ? ORDER BY student_no ASC", [classId]);
        const petsRows = this.query("SELECT * FROM pets WHERE class_id = ?", [classId]);
        const rulesRows = this.query("SELECT * FROM behavior_rules WHERE class_id = ? ORDER BY sort_order ASC", [classId]);
        let thresholdRows = this.query("SELECT level, min_exp FROM class_level_thresholds WHERE class_id = ? ORDER BY level ASC", [classId]);
        if (thresholdRows.length === 0) {
            const defaultThresholds = [0, 50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950];
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
            const subCode = this.resolveSubjectCode(p.subject_id) || 'chinese';
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
            recentOperations: recentOps,
            // 班级主科（注册时选的默认学科）
            defaultSubject: this.getClassDefaultSubject(classId),
            // 已解锁学科集合（唯一真相 class_subject_unlocks 的读取结果）
            subjectUnlocks: this.getUnlockedSubjects(classId),
            // 本班学科列表（数据驱动：含自定义科；主科优先、预设在前）
            subjects: this.getClassSubjects(classId)
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
        this.ensurePetsHatchColumn();
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
                /* 学科 code 由调用方给，认不出来才退回"取主展示宠"（老行为）；自定义科同样走 subj_<code> */
                const subCode = this.resolveSubjectCode(subjectCode);
                const subId = subCode ? this.subjectIdForCode(subCode) : null;

                let pet = null;
                if (subId) {
                    const petRows = this.query("SELECT * FROM pets WHERE class_id = ? AND student_id = ? AND subject_id = ?", [classId, sId, subId]);
                    pet = petRows[0];
                } else {
                    const fallbackSubId = this.subjectIdForCode(this.getClassDefaultSubject(classId));
                    const petRows = this.query(`
                        SELECT p.* FROM pets p 
                        LEFT JOIN students s ON s.id = p.student_id AND s.class_id = p.class_id
                        WHERE p.class_id = ? AND p.student_id = ? 
                        ORDER BY (CASE WHEN p.id = s.display_pet_id THEN 3 WHEN p.is_display = 1 THEN 2 WHEN p.subject_id = ? THEN 1 ELSE 0 END) DESC 
                        LIMIT 1
                    `, [classId, sId, fallbackSubId]);
                    pet = petRows[0];
                }

                if (!pet) {
                    // 不再凭空造宠物：目标学科没有宠物时拒绝本次赋分，由上层先孵化/认领
                    throw new Error('NO_PET_FOR_SUBJECT:' + (subId || this.subjectIdForCode(this.getClassDefaultSubject(classId))));
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
                // 注意：蛋（species_code='egg'）在破壳前 stage 必须保持 0 —— 否则"0 经验加 5 分"会被抬成 stage 1，
                // 看起来就像孵化了。破壳是 hatchStudentPet 的唯一职责。
                const isHatchedRow = pet.hatched_at !== null && pet.hatched_at !== undefined;
                let stageAfter = Number(pet.visual_stage) || 0;
                if (isHatchedRow) {   /* 只有已孵化的宠物才进化形态；蛋永远 stage 0，直到老师/学生点破壳 */
                    const stageThresh = this.query("SELECT stage FROM class_visual_stages WHERE class_id = ? AND min_level <= ? ORDER BY stage DESC LIMIT 1", [classId, levelAfter]);
                    if (stageThresh.length > 0 && stageThresh[0].stage > stageAfter) {
                        stageAfter = stageThresh[0].stage;
                    }
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

    // 班级主科（注册时选的默认学科）。classes.default_subject_id 存 'subj_<code>' 这类 id；
    // 预设三科 → 'chinese'/'math'/'english'；自定义科（注册时填的「综合」）→ 'custom1'。
    // 空值/未知值一律按语文，于是老班级（默认语文）行为完全不变。
    getClassDefaultSubject(classId = 'c_class02_01') {
        let raw = '';
        try {
            const row = this.query("SELECT default_subject_id FROM classes WHERE id = ? LIMIT 1", [classId])[0];
            raw = row && row.default_subject_id ? String(row.default_subject_id) : '';
        } catch (e) { raw = ''; }
        return this.resolveSubjectCode(raw) || 'chinese';
    }

    // ============ 学科解锁集合（唯一真相：class_subject_unlocks） ============
    // 负责人 2026-11 指令：开局只有主科，其余学科由老师"逐科选择"解锁，不再有自动顺序链。
    // 可解锁条件：当前已解锁的任一学科里，有学生的该科宠物达到满级（classes.max_level，默认 20）。
    staticSubjectOrder() { return ['chinese', 'math', 'english']; }

    // ============ 学科（数据驱动：subjects 表是唯一真相，预设三科只在没数据时兜底） ============
    presetSubjectNames() { return { chinese: '语文', math: '数学', english: '英语' }; }

    // 'subj_math' / 'math' / 'subj_custom1' → 'math' / 'custom1'；认不出来返回 ''（不猜）
    resolveSubjectCode(code) {
        const s = String(code == null ? '' : code).trim();
        if (!s) return '';
        const bare = s.indexOf('subj_') === 0 ? s.slice(5) : s;
        if (!bare) return '';
        if (this.staticSubjectOrder().indexOf(bare) >= 0) return bare;
        if (/^custom\d+$/.test(bare)) return bare;
        return '';
    }

    subjectIdForCode(code) { return 'subj_' + (this.resolveSubjectCode(code) || 'chinese'); }

    // 学科显示名：以 subjects 表为准，查不到退回预设名，再退回 code 本身
    subjectLabel(code, classId = 'c_class02_01') {
        const key = this.resolveSubjectCode(code);
        if (!key) return String(code == null ? '' : code);
        const row = this._classSubjectRows(classId).filter(s => s.code === key)[0];
        return (row && row.name) || this.presetSubjectNames()[key] || key;
    }

    // 宠物主键：预设三科沿用历史 id（pet_<stu>_c/m/e），自定义科用完整 code 避免与预设撞车
    petIdForSubject(studentId, code) {
        const c = this.resolveSubjectCode(code) || 'chinese';
        return 'pet_' + studentId + '_' + (this.staticSubjectOrder().indexOf(c) >= 0 ? c.charAt(0) : c);
    }

    // subjects 表的读取结果；一行都没有的老班级按预设三科兜底（写死只发生在这里，VM 不再写死）
    _classSubjectRows(classId = 'c_class02_01') {
        let rows = [];
        try { rows = this.query("SELECT code, name, is_preset FROM subjects WHERE class_id = ? ORDER BY rowid ASC", [classId]); }
        catch (e) { rows = []; }
        const list = [];
        (rows || []).forEach(r => {
            const code = this.resolveSubjectCode(r && r.code);
            if (!code || list.some(s => s.code === code)) return;
            list.push({ code: code, name: String((r && r.name) || '') || code, isPreset: Number(r && r.is_preset) === 1 });
        });
        if (!list.length) {
            const names = this.presetSubjectNames();
            this.staticSubjectOrder().forEach(code => list.push({ code: code, name: names[code], isPreset: true }));
        }
        const defaultCode = this.getClassDefaultSubject(classId);
        if (!list.some(s => s.code === defaultCode)) {
            list.push({ code: defaultCode, name: this.presetSubjectNames()[defaultCode] || defaultCode, isPreset: this.staticSubjectOrder().indexOf(defaultCode) >= 0 });
        }
        return list;
    }

    classSubjectOrder(classId = 'c_class02_01') { return this._classSubjectRows(classId).map(s => s.code); }

    // 老师的学科列表：主科优先、预设在前；unlocked 只来自 class_subject_unlocks
    getClassSubjects(classId = 'c_class02_01') {
        const rows = this._classSubjectRows(classId);
        const defaultCode = this.getClassDefaultSubject(classId);
        const unlocked = this.getUnlockedSubjects(classId);
        const decorated = rows.map((s, idx) => ({
            code: s.code, name: s.name, isPreset: !!s.isPreset,
            isPrimary: s.code === defaultCode,
            unlocked: unlocked.indexOf(s.code) >= 0,
            _idx: idx
        }));
        decorated.sort((a, b) =>
            (Number(b.isPrimary) - Number(a.isPrimary)) ||
            (Number(b.isPreset) - Number(a.isPreset)) ||
            (a._idx - b._idx));
        return decorated.map(s => ({ code: s.code, name: s.name, isPreset: s.isPreset, isPrimary: s.isPrimary, unlocked: s.unlocked }));
    }

    _nextCustomSubjectCode(classId = 'c_class02_01') {
        const codes = this.classSubjectOrder(classId);
        let n = 1;
        codes.forEach(code => {
            const m = /^custom(\d+)$/.exec(code);
            if (m) n = Math.max(n, Number(m[1]) + 1);
        });
        while (codes.indexOf('custom' + n) >= 0) n += 1;
        return 'custom' + n;
    }

    // 老师后来追加自定义科（如「科学」）：生成该班内唯一的 customN，插 subjects 行，不解锁
    addClassSubject(classId = 'c_class02_01', name = '') {
        const label = String(name == null ? '' : name).trim();
        if (!label) return { success: false, error: 'MISSING_NAME:学科名称不能为空' };
        if (!this.query("SELECT id FROM classes WHERE id = ? LIMIT 1", [classId]).length) {
            return { success: false, error: 'NO_CLASS:班级不存在' };
        }
        const code = this._nextCustomSubjectCode(classId);
        const subId = this.subjectIdForCode(code);
        try {
            const now = Date.now();
            this.db.run(
                "INSERT OR REPLACE INTO subjects (id, class_id, code, name, is_preset, created_at) VALUES (?, ?, ?, ?, 0, ?)",
                [subId + '_' + classId, classId, code, label, now]
            );
            /* 班里已有学生：给每人补一条蛋态宠物行，否则新学科永远无法赋分/破壳 */
            this.query("SELECT id FROM students WHERE class_id = ?", [classId]).forEach(st => {
                if (this.query("SELECT id FROM pets WHERE student_id = ? AND subject_id = ? LIMIT 1", [st.id, subId]).length) return;
                this.db.run(
                    "INSERT INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, is_display, created_at, updated_at) VALUES (?, ?, ?, 'egg', ?, '神秘宠物蛋', '#FFAA00', 0, 0, 0, 0, ?, ?)",
                    [this.petIdForSubject(st.id, code), classId, st.id, subId, now, now]
                );
            });
            this.scheduleSave();
        } catch (e) {
            return { success: false, error: 'DB_FAILED:' + String((e && e.message) || e) };
        }
        return { success: true, subject: { code: code, name: label, isPreset: false, isPrimary: false, unlocked: false } };
    }

    // 老库补表：initDefaultTables 之外的路径（离线脚本/老库直连）也能安全读写解锁集合
    ensureSubjectUnlockTable() {
        if (this._subjectUnlockTableReady) return true;
        try {
            this.db.run("CREATE TABLE IF NOT EXISTS class_subject_unlocks (class_id TEXT, code TEXT, unlocked_at INTEGER, PRIMARY KEY (class_id, code))");
            this._subjectUnlockTableReady = true;
            return true;
        } catch (e) {
            console.warn('[SQLiteService] 补 class_subject_unlocks 失败:', e && e.message);
            return false;
        }
    }

    // 解锁集合里的 code：认得出就原样保留（含自定义科的 customN），认不出按语文兜底
    normalizeUnlockCode(code) { return this.resolveSubjectCode(code) || 'chinese'; }

    getClassMaxLevel(classId = 'c_class02_01') {
        const row = this.query("SELECT max_level FROM classes WHERE id = ? LIMIT 1", [classId])[0];
        const n = row ? Number(row.max_level) : 0;
        return Number.isFinite(n) && n > 0 ? n : 20;
    }

    // 老班级推断：主科 + 任何"真的用过（有已破壳宠物）"的学科。
    // 注意：不能无条件把语文加进去——数学班如果被硬塞语文解锁，就会出现"数学账号能用语文"的错误。
    _inferUnlockCodes(classId) {
        const cls = this.query("SELECT default_subject_id FROM classes WHERE id = ? LIMIT 1", [classId])[0];
        const rawDefault = cls ? String(cls.default_subject_id || '') : '';
        const codes = [rawDefault ? this.normalizeUnlockCode(rawDefault) : 'chinese'];
        if (!rawDefault) codes.push('chinese');   /* 老班没记主科：保持旧行为，避免把人锁死 */
        const hasCol = this.query("PRAGMA table_info(pets)").some(c => c.name === 'hatched_at');
        const cols = hasCol ? 'subject_id, hatched_at, visual_stage, species_code' : 'subject_id, visual_stage, species_code';
        this.query("SELECT " + cols + " FROM pets WHERE class_id = ?", [classId]).forEach(r => {
            const hatched = hasCol
                ? (r.hatched_at !== null && r.hatched_at !== undefined)
                : (Number(r.visual_stage) >= 1 && String(r.species_code || 'egg') !== 'egg');
            if (hatched) codes.push(this.normalizeUnlockCode(r.subject_id));
        });
        return this.classSubjectOrder(classId).filter(c => codes.indexOf(c) >= 0);
    }

    // 一个班没有任何解锁行时，按推断补齐（老库/种子路径都靠这一步兜底，绝不给出空集合）
    _ensureSubjectUnlockRows(classId) {
        if (!classId) return false;
        this.ensureSubjectUnlockTable();
        const has = this.query("SELECT code FROM class_subject_unlocks WHERE class_id = ?", [classId]);
        if (has.length) return true;
        const now = Date.now();
        /* 不包事务：本方法与调用方（loadAllState / saveStudent）可能已在外层事务里 */
        this._inferUnlockCodes(classId).forEach(code => {
            this.db.run("INSERT OR IGNORE INTO class_subject_unlocks (class_id, code, unlocked_at) VALUES (?, ?, ?)", [classId, code, now]);
        });
        this.scheduleSave();
        return true;
    }

    // 按解锁先后返回（插入顺序）：主科先解锁，老师后选的排在后面
    getUnlockedSubjects(classId = 'c_class02_01') {
        this._migrateSubjectUnlockV1Once();
        this._ensureSubjectUnlockRows(classId);
        const rows = this.query("SELECT code FROM class_subject_unlocks WHERE class_id = ? ORDER BY unlocked_at ASC, rowid ASC", [classId]);
        const codes = rows.map(r => this.normalizeUnlockCode(r.code));
        return codes.filter((code, idx) => codes.indexOf(code) === idx);
    }

    // 可解锁候选：已解锁学科里出现满级宠物 → 剩余未解锁学科全部成为候选（顺序故意不排，由老师选）
    getSubjectUnlockCandidates(classId = 'c_class02_01') {
        const unlocked = this.getUnlockedSubjects(classId);
        const locked = this.classSubjectOrder(classId).filter(c => unlocked.indexOf(c) < 0);
        if (!locked.length) return [];
        const maxLevel = this.getClassMaxLevel(classId);
        const thresh = this.query("SELECT min_exp FROM class_level_thresholds WHERE class_id = ? AND level = ? LIMIT 1", [classId, maxLevel])[0];
        const maxExp = thresh && Number.isFinite(Number(thresh.min_exp)) ? Number(thresh.min_exp) : null;
        const subIds = unlocked.map(c => 'subj_' + c);
        if (!subIds.length) return [];
        const rows = this.query(
            "SELECT subject_id, MAX(level) AS max_level_row, MAX(exp) AS max_exp FROM pets WHERE class_id = ? AND subject_id IN (" + subIds.map(() => '?').join(',') + ") GROUP BY subject_id",
            [classId].concat(subIds)
        );
        const reached = rows.some(r => (Number(r.max_level_row) || 0) >= maxLevel || (maxExp !== null && (Number(r.max_exp) || 0) >= maxExp));
        return reached ? locked : [];
    }

    // 幂等解锁：满足候选条件才允许；重复调用返回当前集合
    unlockSubject(classId = 'c_class02_01', code = '') {
        this.ensureSubjectUnlockTable();
        const key = this.normalizeUnlockCode(code);
        if (!this.query("SELECT id FROM classes WHERE id = ? LIMIT 1", [classId]).length) {
            return { ok: false, reason: 'no-class', unlocked: [] };
        }
        const before = this.getUnlockedSubjects(classId);
        if (before.indexOf(key) >= 0) return { ok: true, unlocked: before, already: true };
        const candidates = this.getSubjectUnlockCandidates(classId);
        if (candidates.indexOf(key) < 0) return { ok: false, reason: 'not-eligible', unlocked: before, candidates: candidates };
        this.db.run("INSERT OR IGNORE INTO class_subject_unlocks (class_id, code, unlocked_at) VALUES (?, ?, ?)", [classId, key, Date.now()]);
        this.scheduleSave();
        return { ok: true, unlocked: this.getUnlockedSubjects(classId), unlockedNow: key };
    }

    // 一次性迁移：把"改动前本来就可用"的推断结果落成行（app_meta 记标记，只跑一次）
    migrateSubjectUnlockV1() {
        try {
            this.ensureSubjectUnlockTable();
            const done = this.query("SELECT value FROM app_meta WHERE key = 'subject_unlock_v1'")[0];
            if (done) { this._subjectUnlockMigrated = true; return { migrated: 0, skipped: true }; }
            const classIds = this.query("SELECT id FROM classes").map(r => String(r.id));
            let rows = 0;
            this.db.run('BEGIN TRANSACTION;');
            classIds.forEach(id => {
                if (this.query("SELECT code FROM class_subject_unlocks WHERE class_id = ? LIMIT 1", [id]).length) return;
                const now = Date.now();
                this._inferUnlockCodes(id).forEach(code => {
                    this.db.run("INSERT OR IGNORE INTO class_subject_unlocks (class_id, code, unlocked_at) VALUES (?, ?, ?)", [id, code, now]);
                    rows += 1;
                });
            });
            this.db.run("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('subject_unlock_v1', ?)", [String(Date.now())]);
            this.db.run('COMMIT;');
            this.saveToDiskSync();
            this._subjectUnlockMigrated = true;
            console.log('[SQLiteService] 学科解锁集合 v1 已迁移：' + classIds.length + ' 个班级、' + rows + ' 行');
            return { migrated: rows, classes: classIds.length, skipped: false };
        } catch (e) {
            try { this.db.run('ROLLBACK;'); } catch (e2) {}
            console.warn('[SQLiteService] 学科解锁集合 v1 迁移失败:', e && e.message);
            return { migrated: 0, error: String((e && e.message) || e) };
        }
    }

    // 首次读解锁时跑一次迁移（此时破壳规则迁移已完成，hatched_at 才是可信的）
    // v2 订正：v1 曾无条件给每个班补语文，导致数学班也能用语文。这里只清理"没被真正用过"的语文行。
    migrateSubjectUnlockV2() {
        try {
            const done = this.query("SELECT value FROM app_meta WHERE key = 'subject_unlock_v2'")[0];
            if (done) return { migrated: 0, skipped: true };
            this.ensureSubjectUnlockTable();
            const hasCol = this.query("PRAGMA table_info(pets)").some(c => c.name === 'hatched_at');
            const classes = this.query("SELECT id, default_subject_id FROM classes");
            let removed = 0;
            classes.forEach(c => {
                const rawDefault = String(c.default_subject_id || '');
                if (!rawDefault) return;                                   /* 老班不动 */
                if (this.normalizeUnlockCode(rawDefault) === 'chinese') return;   /* 主科是语文，正常 */
                const chineseUsed = this.query(
                    "SELECT subject_id, " + (hasCol ? 'hatched_at' : 'visual_stage') + ", species_code FROM pets WHERE class_id = ? AND subject_id = 'subj_chinese'",
                    [c.id]
                ).some(r => hasCol
                    ? (r.hatched_at !== null && r.hatched_at !== undefined)
                    : (Number(r.visual_stage) >= 1 && String(r.species_code || 'egg') !== 'egg'));
                if (chineseUsed) return;                                   /* 真的用过语文：保留 */
                const before = this.query("SELECT code FROM class_subject_unlocks WHERE class_id = ? AND code = 'chinese'", [c.id]);
                if (before.length) {
                    this.db.run("DELETE FROM class_subject_unlocks WHERE class_id = ? AND code = 'chinese'", [c.id]);
                    removed += 1;
                }
            });
            this.db.run("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('subject_unlock_v2', ?)", [String(Date.now())]);
            this.scheduleSave();
            console.log('[SQLiteService] 学科解锁 v2 订正：清理了 ' + removed + ' 个班级里未使用的语文解锁');
            return { migrated: removed, skipped: false };
        } catch (e) {
            console.warn('[SQLiteService] 学科解锁 v2 订正失败:', e && e.message);
            return { migrated: 0, error: e && e.message };
        }
    }

    _migrateSubjectUnlockV1Once() {
        if (this._subjectUnlockMigrated) return true;
        this.migrateSubjectUnlockV1();
        this.migrateSubjectUnlockV2();
        return this._subjectUnlockMigrated === true;
    }

    // 破壳前的学科门禁：只认落库的解锁集合（与 core 同一真相）
    checkSubjectUnlock(studentId, subjectCode, classId = 'c_class02_01') {
        const key = this.normalizeUnlockCode(subjectCode);
        const label = this.subjectLabel(key, classId);
        if (this.getUnlockedSubjects(classId).indexOf(key) >= 0) return { allowed: true, reason: null };
        return { allowed: false, reason: '【' + label + '】尚未解锁：需已解锁学科出现 Lv.' + this.getClassMaxLevel(classId) + ' 满级宠物后由老师选择解锁' };
    }

    // 核心业务：破壳认领或自选学科宠物形态
    hatchStudentPet({ classId = 'c_class02_01', studentId, subjectCode = 'chinese', speciesCode = 'cat', nickname = '' }) {
        this.ensurePetsHatchColumn();
        const now = Date.now();
        const realId = this.normalizeStudentId(studentId);
        const subCode = this.resolveSubjectCode(subjectCode) || 'chinese';
        const subId = this.subjectIdForCode(subCode);
        const petId = this.petIdForSubject(realId, subCode);

        const existing = this.query("SELECT * FROM pets WHERE student_id = ? AND subject_id = ?", [realId, subId]);

        // 批次 3.3 破壳门槛：学生存在 → 未破壳 → 经验达标 → 学科链式解锁
        const stuRows = this.query("SELECT * FROM students WHERE id = ? AND class_id = ? LIMIT 1", [realId, classId]);
        if (stuRows.length === 0) return { success: false, error: 'NO_STUDENT:学生不存在或不属于该班级' };
        if (existing.length > 0) {
            const ex = existing[0];
            // 是否已孵化只看显式标记（老库无该列时退回旧规则）
            const hasCol = Object.prototype.hasOwnProperty.call(ex, 'hatched_at');
            const already = hasCol
                ? (ex.hatched_at !== null && ex.hatched_at !== undefined)
                : ((Number(ex.visual_stage) || 0) >= 1 && String(ex.species_code || 'egg') !== 'egg');
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
                SET species_code = ?, nickname = ?, exp = MAX(15, exp), visual_stage = MAX(1, visual_stage), level = MAX(1, level),
                    hatched_at = COALESCE(hatched_at, ?), updated_at = ?
                WHERE id = ?;
            `, [speciesCode, nickname || '宠物', now, now, targetPetId]);
        } else {
            this.execute(`
                INSERT INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, hatched_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, '#FFAA00', 15, 1, 1, ?, ?, ?);
            `, [petId, classId, realId, speciesCode, subId, nickname || '宠物', now, now, now]);
        }

        // 破壳后自动同步设定为当前大屏主展示宠物
        this.execute("UPDATE pets SET is_display = 0 WHERE class_id = ? AND student_id = ?", [classId, realId]);
        this.execute("UPDATE pets SET is_display = 1 WHERE id = ?", [targetPetId]);
        this.execute("UPDATE students SET display_pet_id = ?, updated_at = ? WHERE id = ? AND class_id = ?", [targetPetId, now, realId, classId]);

        return { success: true, studentId, realId, subjectCode: subCode, speciesCode };
    }


    // ============ 新建班级（V3 门户注册用）：默认阈值/形态/三科/13 条规则，名单为空 ============
    // 之前 V3 门户的"注册"只写 localStorage，不建库，于是新账号会沿用上一个账号的班级数据（严重串号）
    createClassWithDefaults({ classId, className, teacherName, schoolName = '实验小学本部', subjectCode = 'chinese', subjectLabel = '', teacherId = '' } = {}) {
        const now = Date.now();
        try {
            if (!classId) return { success: false, error: 'MISSING_CLASS_ID:缺少班级 id' };
            if (!className) return { success: false, error: 'MISSING_CLASS_NAME:缺少班级名称' };
            /* teacher_id 在 classes 里是 UNIQUE：若给的这个 id 已经绑了别的班，必须换一个新的，
               否则 INSERT OR REPLACE 会把老师原有班级顶掉（学生行变孤儿）。 */
            let tid = teacherId || '';
            const takenBy = tid ? this.query("SELECT id FROM classes WHERE teacher_id = ? AND id <> ?", [tid, classId]) : [];
            if (!tid || (takenBy && takenBy.length)) {
                tid = 't_' + now + '_' + Math.random().toString(36).slice(2, 6);
            }
            /* 主科：预设三科原样用；其余（门户注册选「自定义」填「综合」）在 subjects 里生成 customN */
            const presetCode = this.resolveSubjectCode(subjectCode);
            const isPresetPrimary = this.staticSubjectOrder().indexOf(presetCode) >= 0;
            const primaryCode = isPresetPrimary ? presetCode : this._nextCustomSubjectCode(classId);
            const primaryName = isPresetPrimary
                ? this.presetSubjectNames()[primaryCode]
                : (String(subjectLabel == null ? '' : subjectLabel).trim() || String(subjectCode == null ? '' : subjectCode).trim() || '自定义科目');
            const subjId = this.subjectIdForCode(primaryCode);

            this.ensureSubjectUnlockTable();
            this.db.run('BEGIN TRANSACTION;');
            /* 注意：种子库的 teachers 有 NOT NULL 列（password_hash / password_algo / profile_color），必须给值 */
            this.db.run(
                "INSERT OR REPLACE INTO teachers (id, school_name, teacher_name, class_name, school_norm, class_norm, teacher_norm, password_hash, password_algo, profile_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [tid, schoolName, teacherName || '', className, schoolName, className, teacherName || '', '!', 'bcryptjs', 'purple', now, now]
            );
            this.db.run(
                "INSERT OR REPLACE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 20, ?, ?)",
                [classId, tid, schoolName, className, className, subjId, now, now]
            );
            /* 一个班永远是「3 个预设科 + 自定义科」：预设科的 subjects 行照旧，自定义科只多一行 is_preset=0 */
            const presetNames = this.presetSubjectNames();
            this.staticSubjectOrder().forEach(code => {
                this.db.run("INSERT OR REPLACE INTO subjects (id, class_id, code, name, is_preset, created_at) VALUES (?, ?, ?, ?, 1, ?)", [this.subjectIdForCode(code) + '_' + classId, classId, code, presetNames[code], now]);
            });
            if (!isPresetPrimary) {
                this.db.run("INSERT OR REPLACE INTO subjects (id, class_id, code, name, is_preset, created_at) VALUES (?, ?, ?, ?, 0, ?)", [this.subjectIdForCode(primaryCode) + '_' + classId, classId, primaryCode, primaryName, now]);
            }
            /* 新班级只解锁主科（注册时选的科目），其余学科由老师逐科选择解锁 */
            this.db.run("INSERT OR IGNORE INTO class_subject_unlocks (class_id, code, unlocked_at) VALUES (?, ?, ?)", [classId, primaryCode, now]);
            const NEW = [0, 50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950];
            NEW.forEach((exp, level) => {
                this.db.run("INSERT OR REPLACE INTO class_level_thresholds (class_id, level, min_exp) VALUES (?, ?, ?)", [classId, level, exp]);
            });
            const stages = [[0, 0, 'egg'], [1, 1, 'form1'], [2, 4, 'form2'], [3, 8, 'form3'], [4, 13, 'form4'], [5, 20, 'form5']];
            stages.forEach(([stage, minLevel, code]) => {
                this.db.run("INSERT OR REPLACE INTO class_visual_stages (class_id, stage, min_level, code) VALUES (?, ?, ?, ?)", [classId, stage, minLevel, code]);
            });
            const rules = [
                ['p1', '帮助打扫卫生', 5, 'positive', 1], ['p2', '帮忙擦黑板', 3, 'positive', 2],
                ['p3', '作业优秀', 5, 'positive', 3], ['p4', '主动回答问题', 3, 'positive', 4],
                ['p5', '好人好事', 5, 'positive', 5], ['p6', '乐于助人', 4, 'positive', 6],
                ['p7', '听课认真', 3, 'positive', 7], ['p8', '思维活跃', 4, 'positive', 8],
                ['n1', '迟到/早退', -3, 'negative', 9], ['n2', '课上讲话', -5, 'negative', 10],
                ['n3', '逃避值日', -5, 'negative', 11], ['n4', '未交作业', -5, 'negative', 12],
                ['n5', '乱扔垃圾', -3, 'negative', 13]
            ];
            rules.forEach(([key, name, points, type, order]) => {
                this.db.run(
                    "INSERT OR REPLACE INTO behavior_rules (id, class_id, name, points, type, sort_order, archived_at, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)",
                    [classId + '_rule_' + key, classId, name, points, type, order, now]
                );
            });
            this.db.run('COMMIT;');
            this.saveToDiskSync();
            return { success: true, classId: classId, teacherId: tid, defaultSubject: primaryCode, subjectCode: primaryCode, subjectLabel: primaryName, thresholds: NEW.length, stages: stages.length, rules: rules.length, students: 0 };
        } catch (err) {
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            console.error('[SQLiteService] 建班失败:', err);
            return { success: false, error: String((err && err.message) || err) };
        }
    }

    // 默认阈值升级迁移：把"旧曲线"的班级一次性改成新默认（破壳 50、每级 +100）
    // 旧曲线有两类（都匹配过）：
    //   ① 官方旧默认 0,15,35,60,90,125,…（步长递增）
    //   ② 教师台的「学期平稳档」 0,15,35,55,75,…（15 + 每级 20）← 负责人这个班就是这一类，之前漏了
    // 判定用「第 1 级阈值 < 50」：新规则下破壳门槛最低就是 50，凡低于它的一定是旧曲线
    migrateLegacyDefaultThresholds() {
        const OLD = [0, 15, 35, 60, 90, 125, 165, 210, 260, 315, 375, 440, 510, 585, 665, 750, 840, 935, 1035, 1140, 1250];
        const NEW = [0, 50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950];
        try {
            const classRows = this.query("SELECT DISTINCT class_id FROM class_level_thresholds");
            let migrated = 0;
            classRows.forEach(row => {
                const classId = row.class_id;
                const rows = this.query("SELECT level, min_exp FROM class_level_thresholds WHERE class_id = ? ORDER BY level", [classId]);
                if (rows.length === 0) return;
                // 老版本 saveThresholds 只写 1..20（缺 level 0），所以行数可能是 20 或 21；
                // 缺 level 0 本身就是旧数据，必须重写整表。
                const byLevel = {};
                rows.forEach(r => { byLevel[Number(r.level)] = Number(r.min_exp); });
                const lv1 = byLevel[1];
                const isOldDefault = rows.every(r => OLD[Number(r.level)] === Number(r.min_exp));
                const isLegacyHatch = !Number.isFinite(lv1) || lv1 < 50;   /* 破壳门槛低于 50：一律视为旧曲线 */
                const missingLevel0 = rows.length !== 21;
                if (!isOldDefault && !isLegacyHatch && !missingLevel0) return;
                this.db.run('BEGIN TRANSACTION;');
                this.db.run("DELETE FROM class_level_thresholds WHERE class_id = ?", [classId]);
                for (let l = 0; l <= 20; l++) {
                    this.db.run("INSERT INTO class_level_thresholds (class_id, level, min_exp) VALUES (?, ?, ?)", [classId, l, NEW[l]]);
                }
                this.db.run('COMMIT;');
                migrated += 1;
                console.log('[SQLiteService] 班级 ' + classId + ' 的经验阈值已升级为新默认（破壳 50 / 每级 +100）');
            });
            if (migrated) this.saveToDiskSync();
            return { success: true, migrated: migrated };
        } catch (err) {
            console.error('[SQLiteService] 阈值迁移失败:', err);
            try { this.db.run('ROLLBACK;'); } catch (e) {}
            return { success: false, error: err.message };
        }
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

            const subjects = this._classSubjectRows(classId).map(s => ({
                key: s.code,
                subId: this.subjectIdForCode(s.code),
                defaultName: s.code === 'chinese' ? '神秘宠物蛋' : '神秘宠物蛋 (待破壳)'
            }));
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
                    const pId = p.id || this.petIdForSubject(student.id, sub.key);
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

            const primaryCode = this.getClassDefaultSubject(classId);
            const targetDisplaySub = this.resolveSubjectCode(student.activeSubject) || primaryCode;
            const displayPetId = this.petIdForSubject(student.id, targetDisplaySub);
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

            /* 每个学科一行宠物：学科清单来自 subjects 表（含自定义科），不再写死三科 */
            const presetSpecies = { chinese: 'cat', math: 'dog', english: 'fox' };
            const presetPetNames = { chinese: '语文萌宠', math: '数学萌宠', english: '英语萌宠' };
            const subjects = this._classSubjectRows(classId).map(s => ({
                key: s.code,
                subId: this.subjectIdForCode(s.code),
                isPreset: !!s.isPreset,
                defaultSpecies: presetSpecies[s.code] || 'egg',
                defaultName: presetPetNames[s.code] || (s.name + '萌宠')
            }));

            for (const sub of subjects) {
                const hasPayload = !!(student.pets && Object.prototype.hasOwnProperty.call(student.pets, sub.key));
                const p = (hasPayload ? student.pets[sub.key] : null) || {};
                const pId = p.id || this.petIdForSubject(student.id, sub.key);
                const spCode = p.species || (sub.key === primaryCode ? (student.species || 'egg') : 'egg');
                const pLevel = typeof p.level === 'number' ? p.level : (sub.key === primaryCode ? (student.level || 0) : 0);
                const pExp = typeof p.exp === 'number' ? p.exp : (sub.key === primaryCode ? (student.exp || 0) : 0);
                const pStage = typeof p.visualStage === 'number' ? p.visualStage : (sub.key === primaryCode ? (student.visualStage || 0) : 0);
                const nickname = p.name || (spCode === 'egg' ? '神秘宠物蛋' : sub.defaultName);
                const isDisplay = (student.activeSubject ? this.resolveSubjectCode(student.activeSubject) === sub.key : sub.key === primaryCode) ? 1 : 0;

                const existingPet = this.query("SELECT id, species_code, nickname FROM pets WHERE id = ? OR (student_id = ? AND subject_id = ?) LIMIT 1", [pId, student.id, sub.subId]);
                if (existingPet.length > 0 && !hasPayload && !sub.isPreset) {
                    /* 追加自定义科后，老调用方（不带该科 pets 数据）不得把库里已攒的经验清零 */
                    continue;
                }
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
            const primaryCode = this.getClassDefaultSubject(classId);
            const subjects = this._classSubjectRows(classId).map(s => ({
                key: s.code,
                subId: this.subjectIdForCode(s.code),
                isPreset: !!s.isPreset,
                defaultName: s.code === 'chinese' ? '神秘宠物蛋' : '神秘宠物蛋 (待破壳)'
            }));

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
                    const pId = p.id || this.petIdForSubject(student.id, sub.key);
                    const spCode = p.species || (sub.key === primaryCode ? (student.species || 'egg') : 'egg');
                    const pLevel = typeof p.level === 'number' ? p.level : (sub.key === primaryCode ? (student.level || 0) : 0);
                    const pExp = typeof p.exp === 'number' ? p.exp : (sub.key === primaryCode ? (student.exp || 0) : 0);
                    const pStage = typeof p.visualStage === 'number' ? p.visualStage : (sub.key === primaryCode ? (student.visualStage || 0) : 0);
                    const nickname = p.name || sub.defaultName;
                    const isDisplay = (student.activeSubject ? this.resolveSubjectCode(student.activeSubject) === sub.key : sub.key === primaryCode) ? 1 : 0;

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
