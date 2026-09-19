# Class Pet 班级电子宠物系统 · 本地 SQLite 数据架构与数据调用规范说明 (Local Data & IPC Spec)

> **文档性质**：单机离线环境下的本地数据库存储规范与进程间通信 (IPC) 接口契约说明。  
> **适用场景**：项目研发内部规范、上级技术检查与项目交付验收审查。  
> **运行环境**：Windows 11 / 教室一体机 Electron 单机离线模式，零配置开箱即用。

---

## 一、 整体数据架构定位

本项目采用**纯本地单机嵌入式数据库架构**（Embedded SQLite Database）：
1. **数据物理文件**：持久化保存在本地文件 `database/classpet.sqlite` 中。
2. **无需安装外部服务**：区别于网络版系统的 MySQL / Oracle，SQLite 引擎直接内嵌随应用进程运行，不占用系统网络端口，电脑断网也能 100% 正常使用。
3. **数据安全性与私有性**：学生成绩、班级花名册、行为评价流水全部封存在本地计算机，绝不上传任何云端，彻底杜绝数据泄露隐患。

```
┌─────────────────────────────────────────────────────────────┐
│               前端展示层 (Chromium Webview)                  │
│   学生大屏 (Bigscreen) / 教师控制台 (Teacher) / 门户 (Portal) │
└──────────────────────────────┬──────────────────────────────┘
                               │ Electron IPC 本地进程间通信
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Node.js 主进程 (SQLite 服务层)                 │
│         sqlite_service.js (事务管理 / 内存模型 / 落盘同步)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ 本地文件 I/O
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           本地持久化数据库 (database/classpet.sqlite)        │
│       students / pets / score_operations / score_entries    │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、 本地 SQLite 核心数据表结构字典

### 1. 学生基础表 (`students`)
存储班级学生基本信息与归档状态。
| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 学生唯一 ID (如 `stu_1`, `stu_172...`) |
| `class_id` | TEXT | NOT NULL | 所属班级 ID (默认 `c_class02_01`) |
| `student_no` | TEXT | NOT NULL | 班级学号 (两位数字格式，如 `01`) |
| `name` | TEXT | NOT NULL | 学生姓名 (如 `张三`) |
| `group_name`| TEXT | NULL | 所属大组 (如 `1组`) |
| `archived_at`| INTEGER| NULL | 软归档时间戳 (NULL 表示在读激活状态) |
| `created_at`| INTEGER| NOT NULL | 创建时间戳 (毫秒) |
| `updated_at`| INTEGER| NOT NULL | 更新时间戳 (毫秒) |

### 2. 学科电子宠物档案表 (`pets`)
每个学生关联语文、数学、英语多学科专属宠物。
| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 宠物档案唯一 ID |
| `student_id` | TEXT | NOT NULL | 关联学生 ID (外键) |
| `subject_id` | TEXT | NOT NULL | 学科标识 (`subj_chinese` / `subj_math` / `subj_english`) |
| `species_code` | TEXT | NOT NULL | 宠物形态代码 (`cat`, `dog`, `fox`, `bunny` 等 8 大品种) |
| `nickname` | TEXT | NOT NULL | 宠物昵称 |
| `exp` | INTEGER | DEFAULT 0 | 当前累计成长经验值 |
| `level` | INTEGER | DEFAULT 1 | 当前等级 (0~20 级) |
| `visual_stage` | INTEGER | DEFAULT 0 | 视觉演化阶段 (0:蛋, 1:幼崽, 2:少年, 3:进阶, 4:青年, 5:神兽) |
| `updated_at` | INTEGER | NOT NULL | 最近状态更新时间戳 |

### 3. 赋分操作总览表 (`score_operations`)
记录每一次教师加减分的操作批次，支持事务审计与精准撤销。
| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 操作批次唯一 ID (如 `op_1726...`) |
| `class_id` | TEXT | NOT NULL | 班级 ID |
| `teacher_id` | TEXT | NOT NULL | 操作教师 ID |
| `rule_id` | TEXT | NULL | 关联的行为准则 ID |
| `action_name` | TEXT | NOT NULL | 赋分原因 (如 `作业优秀`, `课上讲话`) |
| `points` | INTEGER | NOT NULL | 变动分值 (+5 / -3) |
| `created_at` | INTEGER | NOT NULL | 赋分发生的精确时间戳 |
| `undone_at` | INTEGER | NULL | 撤销时间戳 (非空表示该笔记录已被撤销失效) |

### 4. 赋分穿透明细表 (`score_entries`)
记录操作批次下受影响的具体学生与经验前后对比。
| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 明细条目 ID |
| `operation_id` | TEXT | NOT NULL | 关联 `score_operations.id` |
| `student_id` | TEXT | NOT NULL | 受影响学生 ID |
| `pet_id` | TEXT | NOT NULL | 受影响宠物 ID |
| `points_applied` | INTEGER | NOT NULL | 实际生效变动分值 |
| `exp_before` | INTEGER | NOT NULL | 变更前经验值 |
| `exp_after` | INTEGER | NOT NULL | 变更后经验值 |
| `level_before` | INTEGER | NOT NULL | 变更前等级 |
| `level_after` | INTEGER | NOT NULL | 变更后等级 |

---

## 三、 本地数据调用接口规范 (IPC API Contract)

在前端运行环境中，统一通过 `window.electronAPI.db` 进行异步强类型数据交互：

### 1. 全量状态读取 (`loadAllState`)
- **通道名称**：`db:loadAllState`
- **入参**：`classId: string` (班级 ID)
- **返回**：
  ```json
  {
    "students": [ ... ],
    "petsByStudent": {
      "stu_1": {
        "chinese": { "species_code": "cat", "level": 3, "exp": 75, "visual_stage": 1 },
        "math": { ... }
      }
    },
    "behaviorRules": [ ... ],
    "thresholds": { "1": 15, "2": 35, ... },
    "stages": [ ... ]
  }
  ```

### 2. 教师加减分原子事务 (`recordScore`)
- **通道名称**：`db:recordScore`
- **入参**：
  ```json
  {
    "studentIds": ["stu_1", "stu_2"],
    "delta": 5,
    "reason": "主动回答问题",
    "ruleId": "rule_p4"
  }
  ```
- **事务保证**：在单个 SQLite 事务 (`BEGIN TRANSACTION`) 内同时写入操作流水主表、学生明细表并更新宠物经验，任何一步异常自动触发 `ROLLBACK`，确保数据绝无脏写。
- **返回**：`{ "success": true, "operationId": "op_...", "entries": [ ... ] }`

### 3. 单笔流水撤销回滚 (`undoScore`)
- **通道名称**：`db:undoScore`
- **入参**：`operationId: string`
- **处理逻辑**：自动反查明细表中的 `exp_before`，将对应宠物的经验与等级精确恢复至操作前状态，并将 `undone_at` 打上时间戳。

### 4. 单人历史审计流水穿透 (`getStudentAuditLogs`)
- **通道名称**：`db:getStudentAuditLogs`
- **入参**：`studentId: string`
- **返回**：该学生按倒序排列的全部加减分记录清单，每条含分值、原因、前后状态以及是否已被撤销。

### 5. 宠物破壳认领配置 (`hatchPet`)
- **通道名称**：`db:hatchPet`
- **入参**：
  ```json
  {
    "studentId": "stu_1",
    "subjectCode": "chinese",
    "speciesCode": "cat",
    "nickname": "麦麦"
  }
  ```
- **返回**：`{ "success": true, "studentId": "stu_1", "subjectCode": "chinese" }`

---

## 四、 审查与验收结论

1. **真实落盘**：系统彻底告别浏览器纯内存模式，所有加减分、学生档案均由本地 SQLite 强一致持久化。
2. **审计可追溯**：具备完整的 `score_operations` 与 `score_entries` 双层流水，任意一笔加减分均支持精准穿透与撤销回退。
3. **极简免维护**：完全免除传统数据库的安装、配置、监听和维护工作，极大地保障了教学一体机的开箱可用性。
