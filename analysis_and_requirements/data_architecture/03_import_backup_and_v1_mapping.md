# 导入、备份恢复与 V1 映射

## 1. Excel / 文本导入（学生名单，不是旧版迁移）

入口只在主进程。渲染进程只传 `Uint8Array` + 文件名。

### 1.1 识别

| 源 | 规则 |
| --- | --- |
| `.xlsx` | SheetJS 读第一张表；不支持需要宏的 `.xls` 则提示另存 xlsx |
| `.csv` / `.txt` | 先 UTF-8，失败或大量替换符则 GBK（`iconv-lite`） |
| 文本行 | 空行丢弃；`#` 开头当注释 |

列名别名（去空格、小写后匹配）：

| 字段 | 别名 |
| --- | --- |
| studentNo | 学号, 编号, no, number, studentno, 学生学号 |
| name | 姓名, 名字, 学生, name, 学生姓名 |
| groupName | 分组, 小组, 组, group |
| note | 备注, 说明, note, remark |

无表头时：

- 一行一个 token -> 姓名
- `学号<空白或逗号或tab>姓名`
- 3-4 列按 学号,姓名,分组,备注

姓名为空 -> 该行 error。学号可空。允许同名。

### 1.2 学号生成

对文件内空学号，按**文件顺序**生成，基数是当前班（含归档）已有纯数字学号的最大值：

```text
next = max(existingNumeric, alreadyGeneratedInThisFile) + 1
studentNo = String(next).padStart(2, '0')
```

文件里显式学号保持原样（去首尾空格；纯数字去掉前导空格但保留教师写的 `01`）。

### 1.3 去重与提交策略

预览每行：`ok | error | warning`

| 情况 | 级别 | 默认提交 |
| --- | --- | --- |
| 文件内学号重复 | error | **整批拒绝** |
| 与本班已有学号冲突（含归档） | error | 整批拒绝，除非 UI 选 `skipConflicts` |
| 与本班已有姓名相同、学号不同 | warning | 允许（基线允许同名） |
| 无法解析姓名 | error | 该行不进；若存在任何 error 且未选 skip，整批拒绝 |
| 空文件 | IMPORT_EMPTY | 不写库 |

`skipConflicts=true`：跳过冲突行，提交其余 ok 行；结果返回 `{ created, skipped, errors }`。

默认 `skipConflicts=false`：有 error 就 `STUDENT_NO_CONFLICT` / `VALIDATION`，库不变。这比旧版“来者不拒插一行名字”安全。

导入不更新已有学生。冲突只能跳过或改文件后重来。V1 云端合并是另一条管道。

`importPreview` 把规范化行放主进程内存 Map，TTL 10 分钟，`previewId` 一次性。Commit 时重新校验 UNIQUE，防两窗口抢号。

整批事务：每个新学生走与 `students.create` 相同的建蛋逻辑。中途失败全滚。

不把 Excel 当备份格式。

## 2. 备份包

### 2.1 文件

```text
classpet-backup-v1.json.gz
建议扩展名：.cpbak
Content-Type 无强制；魔数：gzip + JSON
```

JSON 顶层：

```ts
type BackupFile = {
  format: 'classpet.backup';
  formatVersion: 1;
  schemaVersion: 1;
  appVersion: string;
  exportedAt: number;
  scope: 'account';
  installId: string;
  account: {
    teacherId: string;
    classId: string;
    schoolName: string;
    className: string;
    teacherName: string;
    profileColor: string;
  };
  payload: {
    class: ClassRow;
    subjects: SubjectRow[];
    students: StudentRow[];
    pets: PetRow[];
    petStageUnlocks: PetStageUnlockRow[];
    rules: BehaviorRuleRow[];
    levelThresholds: { level: number; minExp: number }[];
    visualStages: { stage: number; minLevel: number; code: string }[];
    interactionConfig: { dailyExpCap: number; actions: ActionDefRow[] };
    scoreOperations: ScoreOperationRow[];
    scoreEntries: ScoreEntryRow[];
    interactionEvents: InteractionEventRow[];
  };
};
```

**必须排除**：`password_hash`、重置码、`local_sessions`、`app_meta` 里的恢复码、其他账号的任何表、WAL/SHM 原文件、AI Key。

手动导出：当前会话账号。  
每日自动：启动时若 `last_daily_backup_date != today`，覆盖 `userData/backups/daily/current.cpbak`（只留 1 份）。自动备份也只含**当前 auto_restore 账号**，避免把别人班级写进同一文件。  
恢复前快照：`userData/backups/pre-restore/current.cpbak`，与 daily 分开，防止覆盖唯一后路。

### 2.2 恢复

| mode | 行为 |
| --- | --- |
| overwriteCurrent | 事务内删除当前 `class_id` 的学生/宠物/日志/规则/学科/阈值，再插入备份 payload；**teacher_id 不变**；不改密码 |
| asNewClass | 视为注册新账号：要求 UI 提供新班级名或新教师名以避免 UNIQUE；密码走当前用户新设或沿用当前登录教师？**规定：asNewClass 必须在已登录下创建“新教师账号+新班”，并要求输入新密码**，避免无密码账号 |

`asNewClass` 详细步骤：

1. 预览展示备份里的学校/班级/教师/学生数
2. 用户确认新身份（默认可编辑班级名）
3. 设新密码
4. 事务插入新 teacher/class 和新 ID 映射（见下）或保留原 UUID（同机恢复可能撞 ID）

**ID 策略**：overwriteCurrent 保留备份内 student/pet UUID，便于以后同一包导到 V1。asNewClass 生成新 UUID，并在预览中说明。

版本：`formatVersion > 1` 且当前不认识 -> `BACKUP_INVALID`。`schemaVersion` 小于当前：先把 payload 跑轻量适配函数再导入。大于当前：拒绝。

校验：gzip 能解、`format` 匹配、必填数组存在、学号在包内唯一、每宠有学科、exp>=0。失败不写业务表。

跨账号 overwrite：备份 `teacherId` 与当前不同时，仍允许覆盖**当前班级业务数据**（教师确认文案必须写清“将替换本班学生与日志，不会改其他账号”）。不修改其他 `class_id`。

## 3. 旧 localStorage 适配器（非 P0）

产品确认无真实旧用户。实现可放 `legacyLocalStorageAdapter.ts`，默认关闭。

若开发机要导：

| 旧 | 新 |
| --- | --- |
| teachers[accountKey] | 新 teacher；school_name=`未填写学校`；密码不可明文搬，要求重设 |
| students[] | student_no 按顺序生成；name 保留 |
| petType puppy | dog |
| petType dragon | fox |
| 单宠 | 第一只 pet，学科=语文，is_display=1 |
| exp/level | 写入 pet.exp；level 用新阈值重算，但 visual_stage 按旧 hatch：egg->0，ready->pending 1，hatched->1 |
| effects/mood | 丢弃 |
| logs | score_operations 每人一条（无批次则每 log 一 operation） |
| 共享键 class_pet_students | 忽略，除非教师隔离键为空 |

不做静默覆盖。

## 4. V1 云端映射

V1 = NestJS + PostgreSQL。V1-Lite 导出仍用同一 `classpet.backup` formatVersion=1。云端导入工具认这个格式，不认 raw sqlite。

| V1-Lite | V1 PostgreSQL | 备注 |
| --- | --- | --- |
| teachers.id | users.id | 保留 UUID |
| school_name | schools.name + school_id | 按规范化名找或建 |
| classes | classes | teacher 作为 owner member |
| password_hash | 不迁移 | 用户重设云端密码 |
| students | students | 含 archived_at |
| pets | pet_instances | species_code 作稳定业务键 |
| subjects | class_subjects | |
| class_level_thresholds | class_level_thresholds | |
| class_visual_stages | class_visual_stages | |
| behavior_rules | behavior_rules | |
| score_operations/entries | 同名 | request_id 继续幂等 |
| interaction_events | interaction_events | |
| pet_interaction_state | **不迁** | 过期 CD 不进云 |
| local_sessions / reset_code / backup_runs | **不迁** | |
| 备份文件本身 | **不迁** | |

云端导入默认 **新建云班级**。合并已有班必须预览：

1. 学号匹配
2. 无学号才按姓名列出人工确认
3. 失败不覆盖云端（云端事务）

资源：`asset_key` + stage 只映射素材，不改 `pets.id`。

## 5. 未决项（有默认，不阻塞编码）

| ID | 问题 | 本蓝图默认 |
| --- | --- | --- |
| OPEN-LEVEL-CURVE | 每级经验未冻结 | 01_schema 5.4 表 |
| OPEN-FIRST-SUBJECT | 首宠学科 | 语文 |
| OPEN-AS-NEW-PASSWORD | 恢复为新班的密码 | 强制新设 |
| OPEN-XLS | 老 .xls | 提示另存 xlsx |
| OPEN-MULTI-ACCOUNT-DAILY | 多账号是否各做 daily | 只备份当前账号 |
| OPEN-PASSWORD-MIN | 本地密码长度 | 8 |
| OPEN-LEGACY-IMPORT | 旧 localStorage | 默认不做 |
