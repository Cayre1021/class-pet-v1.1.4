# V1-Lite SQLite Schema

> schema_version = 1  
> 一机一库，库内按 `teacher_id` / `class_id` 隔离。V1-Lite 强制 1 教师 1 班级；V1 只需要放开 `classes.teacher_id` 的 UNIQUE。

## 1. 所有权

```text
app_meta                 安装级（恢复码、库路径、last_teacher）
pet_species              安装级目录（8 种）
teachers                 本地账号
  1 -- 1 classes         V1-Lite 唯一班级
      1 -- N subjects
      1 -- N behavior_rules
      1 -- N students
             1 -- N pets
      1 -- N score_operations
             1 -- N score_entries
      1 -- N interaction_events
```

规则：

- 所有业务行必须带 `class_id`（目录表和 `app_meta` 除外）。
- 主进程用当前会话的 `teacher_id` 推导 `class_id`，**拒绝**渲染进程传入的 teacherId 作为授权依据。
- 注册新账号只预填上一账号的学校/班级**文案**，必须新建 `teachers` + `classes`，不得复用旧 `class_id`。
- 学生删除 = `archived_at = now`。学号唯一性**包含归档行**。宠物和日志不删。
- 经验、等级、阶段、互动 CD 只在主进程计算后写入。

## 2. 文件与连接

| 项 | 规定 |
| --- | --- |
| 默认库 | `%APPDATA%/ClassPet/classpet.sqlite`（`app.getPath('userData')`） |
| 自定义库目录 | `userData/data-location.json` -> `{ "dataDir": "D:/..." }`，库文件名固定 `classpet.sqlite` |
| 驱动 | 首选 `better-sqlite3`；Electron 22 ia32 预编译失败则改 `sql.js`，API 不变 |
| 密码哈希 | `bcryptjs` cost 10（纯 JS，避开 Win7 原生模块） |
| PRAGMA | `journal_mode=WAL`；`foreign_keys=ON`（每次连接）；`busy_timeout=5000`；`synchronous=NORMAL` |
| 迁移 | `schema_migrations(id INTEGER PK, name TEXT UNIQUE, applied_at INTEGER)`；启动时按文件名顺序执行 |
| ID | UUID v4 文本 |
| 时间 | INTEGER 毫秒 UTC；每日互动用本机日历 `YYYY-MM-DD` |
| 加密 | 基线：库文件不加密 |

`data-location.json` 丢失或目录不可写：应用进入阻断错误，提供“重新选择目录 / 使用默认目录创建空库”，禁止静默写到安装目录。

## 3. ER

```text
teachers 1:1 classes
classes 1:N students | pets | subjects | behavior_rules | score_operations | class_level_thresholds | class_visual_stages
students 1:N pets
pets N:1 pet_species
pets N:1 subjects
score_operations 1:N score_entries
score_entries N:1 students
score_entries N:1 pets
```

学生卡片展示数据取**当前展示宠**（`pets.is_display = 1`），不单独存 `students.exp`。

## 4. 建表 SQL（001_init.sql）

```sql
CREATE TABLE schema_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL
);

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE pet_species (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  default_nickname_template TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_placeholder INTEGER NOT NULL DEFAULT 0 CHECK (is_placeholder IN (0, 1))
);

CREATE TABLE teachers (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  school_norm TEXT NOT NULL,
  class_norm TEXT NOT NULL,
  teacher_norm TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'bcryptjs',
  profile_color TEXT NOT NULL DEFAULT 'purple',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_opened_at INTEGER
);

CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL UNIQUE,
  school_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  class_norm TEXT NOT NULL,
  default_subject_id TEXT,
  max_level INTEGER NOT NULL DEFAULT 20 CHECK (max_level >= 1 AND max_level <= 99),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE UNIQUE INDEX ux_teacher_identity
  ON teachers(school_norm, class_norm, teacher_norm);

CREATE UNIQUE INDEX ux_class_identity
  ON classes(teacher_id, class_norm);

CREATE TABLE local_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_preset INTEGER NOT NULL DEFAULT 0 CHECK (is_preset IN (0, 1)),
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE (class_id, code)
);

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_no TEXT NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT,
  note TEXT,
  display_pet_id TEXT,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE (class_id, student_no)
);

CREATE INDEX ix_students_class_active
  ON students(class_id, archived_at, student_no);

CREATE TABLE pets (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  species_code TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  egg_color TEXT NOT NULL,
  exp INTEGER NOT NULL DEFAULT 0 CHECK (exp >= 0),
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  visual_stage INTEGER NOT NULL DEFAULT 0 CHECK (visual_stage BETWEEN 0 AND 5),
  pending_stage INTEGER CHECK (pending_stage IS NULL OR pending_stage BETWEEN 1 AND 5),
  is_display INTEGER NOT NULL DEFAULT 0 CHECK (is_display IN (0, 1)),
  teacher_positive_exp_total INTEGER NOT NULL DEFAULT 0 CHECK (teacher_positive_exp_total >= 0),
  interaction_exp_total INTEGER NOT NULL DEFAULT 0 CHECK (interaction_exp_total >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (species_code) REFERENCES pet_species(code),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE INDEX ix_pets_student ON pets(student_id, created_at);
CREATE UNIQUE INDEX ux_pets_display
  ON pets(student_id) WHERE is_display = 1;

CREATE TABLE pet_stage_unlocks (
  pet_id TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 0 AND 5),
  unlocked_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  PRIMARY KEY (pet_id, stage),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);

CREATE TABLE class_level_thresholds (
  class_id TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 0),
  min_exp INTEGER NOT NULL CHECK (min_exp >= 0),
  PRIMARY KEY (class_id, level),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE class_visual_stages (
  class_id TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 0 AND 5),
  min_level INTEGER NOT NULL CHECK (min_level >= 0),
  code TEXT NOT NULL,
  PRIMARY KEY (class_id, stage),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE behavior_rules (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  CHECK ((type = 'positive' AND points > 0) OR (type = 'negative' AND points < 0))
);

CREATE TABLE score_operations (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  rule_id TEXT,
  action_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  remark TEXT,
  created_at INTEGER NOT NULL,
  undone_at INTEGER,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (rule_id) REFERENCES behavior_rules(id),
  UNIQUE (class_id, request_id)
);

CREATE TABLE score_entries (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  points_applied INTEGER NOT NULL,
  exp_before INTEGER NOT NULL,
  exp_after INTEGER NOT NULL,
  level_before INTEGER NOT NULL,
  level_after INTEGER NOT NULL,
  FOREIGN KEY (operation_id) REFERENCES score_operations(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);

CREATE INDEX ix_score_entries_student ON score_entries(student_id, operation_id);

CREATE TABLE interaction_events (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  action_code TEXT NOT NULL,
  exp_awarded INTEGER NOT NULL CHECK (exp_awarded >= 0),
  bubble_code TEXT,
  created_at INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);

CREATE INDEX ix_interaction_pet_action
  ON interaction_events(pet_id, action_code, created_at);

CREATE TABLE pet_interaction_state (
  pet_id TEXT NOT NULL,
  action_code TEXT NOT NULL,
  last_used_at INTEGER,
  daily_exp INTEGER NOT NULL DEFAULT 0,
  daily_date TEXT,
  PRIMARY KEY (pet_id, action_code),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);

CREATE TABLE class_interaction_config (
  class_id TEXT PRIMARY KEY,
  daily_exp_cap INTEGER NOT NULL DEFAULT 5,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE interaction_action_defs (
  class_id TEXT NOT NULL,
  action_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  cooldown_ms INTEGER NOT NULL,
  exp_min INTEGER NOT NULL,
  exp_max INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (class_id, action_code),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  CHECK (exp_min >= 0 AND exp_max >= exp_min)
);

CREATE TABLE backup_runs (
  id TEXT PRIMARY KEY,
  class_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('daily', 'manual', 'pre_restore')),
  file_path TEXT,
  format_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
  error_code TEXT
);
```

`students.display_pet_id` 在首只宠物创建后回填，不在建表时加 FK，避免循环；由服务保证一致。

教师身份唯一：与 V1 云端一致，使用规范化三元组 `school_norm + class_norm + teacher_norm`。`teachers` 冗余 `class_name/class_norm`，与唯一班级保持同步；改班级展示名时同事务更新两表。

同校同班同教师再次注册 -> `ACCOUNT_EXISTS`。同校不同班、或不同校同名教师 -> 允许，各自独立 `class_id`。

## 5. 种子数据

### 5.1 物种（素材目录即事实）

| code | display_name | asset_key | 旧枚举映射 |
| --- | --- | --- | --- |
| bird | 小鸟 | bird | bird |
| bunny | 兔子 | bunny | bunny |
| cat | 猫咪 | cat | 新增 |
| deer | 小鹿 | deer | 新增 |
| dog | 小狗 | dog | puppy |
| fish | 小鱼 | fish | fish |
| fox | 狐狸 | fox | 新增 |
| hamster | 仓鼠 | hamster | 新增 |

`dragon` 不入库。可选旧数据适配器若遇到 dragon -> `fox` + 记 warning。

默认昵称模板：`{studentName}的{displayName}`。

### 5.2 学科

新班种子：`chinese/语文`、`math/数学`、`english/英语`，均为 `is_preset=1`。`classes.default_subject_id` 默认语文。教师可新增自定义学科；预设学科允许改名但不删除。

### 5.3 默认规则（旧版原样）

| name | points | type |
| --- | ---: | --- |
| 帮助打扫卫生 | 5 | positive |
| 帮忙擦黑板 | 3 | positive |
| 作业优秀 | 5 | positive |
| 主动回答问题 | 3 | positive |
| 好人好事 | 5 | positive |
| 乐于助人 | 4 | positive |
| 听课认真 | 3 | positive |
| 思维活跃 | 4 | positive |
| 迟到/早退 | -3 | negative |
| 课上讲话 | -5 | negative |
| 逃避值日 | -5 | negative |
| 未交作业 | -5 | negative |
| 乱扔垃圾 | -3 | negative |

### 5.4 默认等级阈值（假设，标为 OPEN-LEVEL-CURVE）

基线冻结了 20 级和视觉节点，但**没有冻结每级经验**。在产品另给表之前，实现必须使用下表，并允许教师改 `class_level_thresholds`。

| level | min_exp | 视觉 |
| ---: | ---: | --- |
| 0 | 0 | stage0 egg |
| 1 | 15 | stage1 |
| 2 | 35 | |
| 3 | 60 | |
| 4 | 90 | stage2 |
| 5 | 125 | |
| 6 | 165 | |
| 7 | 210 | |
| 8 | 260 | stage3 |
| 9 | 315 | |
| 10 | 375 | |
| 11 | 440 | |
| 12 | 510 | |
| 13 | 585 | stage4 |
| 14 | 665 | |
| 15 | 750 | |
| 16 | 840 | |
| 17 | 935 | |
| 18 | 1035 | |
| 19 | 1140 | |
| 20 | 1250 | stage5 |

`class_visual_stages` 默认：

| stage | min_level | code |
| ---: | ---: | --- |
| 0 | 0 | egg |
| 1 | 1 | form1 |
| 2 | 4 | form2 |
| 3 | 8 | form3 |
| 4 | 13 | form4 |
| 5 | 20 | form5 |

### 5.5 互动

| action_code | display_name | cooldown_ms | exp_min | exp_max |
| --- | --- | ---: | ---: | ---: |
| greet | 打招呼 | 600000 | 0 | 1 |
| pat | 抚摸 | 1800000 | 0 | 1 |
| water | 喂水 | 14400000 | 1 | 2 |
| feed | 喂食 | 21600000 | 1 | 2 |
| play | 玩耍 | 7200000 | 1 | 2 |
| comfort | 安抚 | 10800000 | 1 | 2 |

`daily_exp_cap = 5`。气泡文案 20 条作为代码常量，不进业务库；事件只存 `bubble_code`。

## 6. 成长与赋分不变量

1. `display_level = min(highest L where exp >= min_exp(L), max_level)`。
2. `extra_exp = max(0, exp - min_exp(max_level))`，只读计算。
3. 扣分：`exp = max(0, exp + points)`；`level` 只升不降；`visual_stage` 不回退；`pet_stage_unlocks` 不删。
4. 等级跨过某 `min_level` 时：写入 unlock，`pending_stage = max(pending, 该 stage)`，**不改 visual_stage**，直到 `pets.confirmStage`。
5. 教师改阈值：已确认阶段不动；只影响尚未解锁阶段。
6. 赋分默认打 `is_display=1` 的宠物；IPC 可传 `petId`，必须属于该学生且同班。
7. 批量赋分：同一 `score_operations.id`，事务内全成或全败。
8. 互动经验：随机 `[exp_min, exp_max]`，再截断到 `daily_cap - today` 与 `teacher_positive_exp_total - interaction_exp_total`；任一为 0 则经验为 0，但仍记事件（exp_awarded=0）并进入 CD。
9. 满级后仍可加经验（含互动），level 显示封顶。
10. 任意宠物 `visual_stage = 5` 且已确认后，可 `pets.createNext` 生成新蛋；学科必填。

学号：

- 展示两位补零；超过 99 允许 3 位及以上纯数字，不重排。
- 生成：取本班（含归档）所有纯数字学号的 max+1，`padStart(2,'0')`。
- 自定义非纯数字学号允许，但仍参与 UNIQUE。

## 7. app_meta 键

| key | 含义 |
| --- | --- |
| schema_version | `1` |
| install_id | 安装 UUID |
| last_teacher_id | 上次账号 |
| auto_restore | `1` 日常免密恢复；退出后 `0` |
| reset_code_mode | `dev` 或 `install` |
| reset_code_hash | 正式包本机恢复码哈希；dev 模式可空 |
| last_daily_backup_date | `YYYY-MM-DD` |
| data_dir | 冗余记录，权威仍在 data-location.json |

开发期重置码明文 `123456` 只存在代码常量 `DEV_RESET_CODE`，**不得写入库或备份**。正式包必须 `reset_code_mode=install`。

## 8. 渲染进程 DTO（可给 UI 的形状）

UI 不得依赖旧 `Student` 接口。主进程返回：

```ts
type StudentCard = {
  id: string;
  studentNo: string; // "01"
  name: string;
  groupName: string | null;
  note: string | null;
  petCount: number;
  displayPet: PetSummary;
};

type PetSummary = {
  id: string;
  speciesCode: string;
  subjectId: string;
  subjectName: string;
  nickname: string;
  exp: number;
  level: number;
  extraExp: number;
  visualStage: 0|1|2|3|4|5;
  pendingStage: number | null;
  assetKey: string; // 与物种+阶段绑定，换素材不改 pet.id
};
```

密码哈希、会话表、备份路径对渲染进程不可见。
| 驱动 | 首选 `better-sqlite3`；Electron 22 ia32 预编译失败则改 `sql.js`，API 不变 |
| 驱动 | 首选 `better-sqlite3`；Electron 22 ia32 预编译失败则改 `sql.js`，仓储 API 不变。sql.js 无 WAL：每次事务后原子写回同一文件 |
