# 旧版数据层证据审计与 P0 风险

> 审计对象：`old-class-pet/class pet` 的 `src/lib/db.ts`、`store.ts`、相关页面、`electron/main.js`  
> 对照基线：`V1_LITE_FINAL_DECISIONS_BASELINE.md`  
> 结论：旧版是可运行的单机 `localStorage` MVP，不是 V1-Lite 数据层。正式开发必须新建 SQLite + 主进程仓储 + 安全 IPC。

## 1. 旧版真实架构

| 项 | 证据 | 事实 |
| --- | --- | --- |
| 持久层 | [db.ts](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\lib\db.ts:71>) | 只有 `localStorage`，键前缀 `class_pet_*` |
| 桌面壳 | [main.js](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\electron\main.js:16>) | `contextIsolation: true`，`nodeIntegration: false`，**无 preload、无 IPC、无 SQLite** |
| 同步 | [store.ts](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\lib\store.ts:31>) | Zustand 订阅 `storage` + 自定义 `local-storage-update` |
| 登录态 | [App.tsx](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\App.tsx:19>) | React 内存 `user`；离开 `/admin` 即清空 |
| 账号键 | [db.ts](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\lib\db.ts:89>) | `className::teacherName`，无学校、无稳定 UUID |
| 密码 | [db.ts](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\lib\db.ts:45>) | `TeacherAccount.password` 明文读写 |
| 学生模型 | [db.ts](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\lib\db.ts:4>) | 单宠内嵌在 `Student`：无学号、分组、备注、归档、学科、多宠 |
| 赋分 | [TeacherPanel.tsx](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\pages\TeacherPanel.tsx:438>) | UI 计算等级；`Promise.all` 逐人写入；无操作批次 |
| 删除 | [db.ts](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\lib\db.ts:537>) | 物理删除学生并删除其日志 |
| 导入 | [TeacherPanel.tsx](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\pages\TeacherPanel.tsx:468>) | 仅按换行拆姓名；无 Excel、无学号、无去重 |
| 备份 | 全仓库检索无 backup/export IPC | 无备份、无恢复、无导出包 |
| 互动 | [PetCard.tsx](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\components\PetCard.tsx:63>) | 喂食/抚摸/陪玩只改心情时间戳，不加经验、无 CD、无每日上限 |

存储键：

```text
class_pet_teachers
class_pet_last_teacher
class_pet_students                 # 共享旧路径，仍被 initSharedSync 使用
class_pet_settings
class_pet_logs
class_pet_students:${accountKey}   # 教师隔离新路径
class_pet_settings:${accountKey}
class_pet_logs:${accountKey}
class_pet_auth_user                # 遗留键，启动时清除
```

## 2. 与 V1-Lite 基线的硬缺口

| 基线要求 | 旧版 | V1-Lite 必须新建 |
| --- | --- | --- |
| SQLite 真实业务库 | 无 | 单文件 WAL 库 + 迁移版本 |
| 学校 + 班级 + 教师 + 密码 | 无学校；密码明文；最短 3 位 | 规范化三元组唯一；scrypt/bcryptjs 哈希 |
| 日常免密 / 切换要密码 | 每次进 `/admin` 都要密码；大屏只认 last_teacher | 主进程会话 + `last_teacher_id` |
| 学号两位补零且班内唯一 | 无学号 | `students.student_no` 含归档唯一 |
| 删除即归档 | 物理删除 | `archived_at` |
| 多宠物 + 学科绑定 | `Student.petType` 单值 | `pets` 1:N + `subjects` |
| 20 级 / 6 阶段点击进化 | `floor(exp/50)+1`；Lv2 孵化 | 可配置阈值 + `visual_stage` / `pending_stage` |
| 批量赋分统一批次 | 无 `operationId` | `score_operations` + `score_entries` |
| 6 种互动 CD/随机经验/日上限 | 心情衰减 | `interaction_events` + 状态表 |
| 备份 JSON.gz | 无 | 当前账号包；不含密码/会话 |
| 渲染进程不碰数据库 | 渲染进程直接写 localStorage | 仅 IPC |

旧分析 [05_data_migration_and_phase4_dod.md](<D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\old_version_analysis\05_data_migration_and_phase4_dod.md:8>) 中的 `migrateOldStudentToNewProfile` **作废**：它把旧单宠映射成博物馆 + `综合素质` + Lv10 毕业，与 V1-Lite 基线（无博物馆、语文/数学/英语、Lv0 蛋、满级继续累计经验）冲突。产品已确认当前无真实旧用户，V1-Lite **不把旧 localStorage 迁移当 P0**；仅保留可选适配器供开发机演示。

## 3. 必须先做的 P0 风险

| ID | 风险 | 为何阻塞 | 数据层对策 |
| --- | --- | --- | --- |
| P0-01 | 明文密码 | `validateTeacherCredentials` 直接比较明文 | 只存 `password_hash`；IPC 永不回传哈希 |
| P0-02 | 渲染进程直写存储 | 无 IPC 边界，无法做权限/事务 | 主进程仓储 + channel 白名单 |
| P0-03 | 共享/教师双轨 | `getSharedStudents` 与 `getTeacherStudents` 并存；无账号时大屏读共享数据 | 删除共享路径；无会话则空列表 |
| P0-04 | 账号键不稳定 | `一班::张老师` 改名即丢数据 | 不可变 UUID；展示名可改 |
| P0-05 | 无事务 | 批量赋分 `Promise.all`；日志与学生分两次 `setItem` | 所有写走 SQLite 事务 |
| P0-06 | ID 碰撞 | `std_${Date.now()}`；批量导入 `std_${Date.now()}_${random%1000}` | UUID v4 |
| P0-07 | 物理删除 | 日志被一起删掉，无法恢复 | 归档；日志/宠物保留 |
| P0-08 | 等级在 UI 计算 | 扣分不降级只在 TeacherPanel；db 层接受外部 `newLevel` | 等级公式只在主进程 |
| P0-09 | 无学号/导入去重 | 同名可无限插入 | 预览 + 班内学号唯一（含归档） |
| P0-10 | Win7 ia32 原生模块 | `better-sqlite3` / argon2 可能编不过 Electron 22 ia32 | 密码用纯 JS `bcryptjs`；SQLite 先打 ia32 预编译 spike |
| P0-11 | 固定重置码 `123456` | 基线允许开发期使用，禁止进正式包 | `app_meta.reset_code_mode=dev\|install` |
| P0-12 | 赋分打到哪只宠物未写死 | 多宠后若打到学生总分会和学科宠分叉 | 默认打当前展示宠；可选 `petId` |
| P0-13 | 中文 Excel/TXT 编码 | 教室电脑常见 GBK | 主进程 UTF-8 失败则 GBK |
| P0-14 | 自定义库路径丢失 | 基线允许教师选数据位置 | `userData/data-location.json` 指针；缺失时阻断并引导 |

## 4. 可复用，不要原样搬

| 旧代码 | 复用方式 |
| --- | --- |
| `createDefaultRules()` 13 条正负向规则 | **原样作为班级种子规则**，ID 换成 UUID |
| `normalizeAccountPart` | 学校/班级/教师名规范化 |
| 教师隔离测试意图 [TeacherPanel.test.tsx](<D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\pages\TeacherPanel.test.tsx:41>) | 改写成 SQLite 集成测试，不要测 localStorage 键 |
| 经验下限 0、扣分不降级、已解锁不回收 | 迁入主进程成长服务 |
| 点击才孵化 | 扩展为每个视觉阶段都要点击确认 |
| 素材目录 8 种：bird/bunny/cat/deer/dog/fish/fox/hamster | 作为 `pet_species.code`；业务层 5 种枚举作废 |
| last_teacher 只记非敏感身份 | 改为 `app_meta.last_teacher_id` |
| 默认蛋色 `red/blue/green/purple/yellow` | `pets.egg_color`，仅装饰 |

## 5. 必须淘汰

- 整份渲染进程 `db.ts` 存储实现，以及 `initSharedSync` / `getShared*` / `updateShared*`
- `TeacherAccount.password` 明文、最短 3 位、`className::teacherName` 主键
- `Settings.classPin`（本地 PIN 不能当授权）
- `Student.petType/hatchState/mood/effects/lastInteractionTime` 作为核心模型
- `EVOLUTION_POOL` 盲盒特效、`floor(exp/50)+1`、`HATCH_LEVEL = 2`
- 业务宠物枚举里的 `puppy`/`dragon`（素材是 `dog`；无 dragon 图）
- `Promise.all` 非事务批量写、`Date.now()` / `Math.random()` ID
- 物理删除学生与级联删日志
- 把 `localStorage` 当跨窗口实时总线
- Phase 4 博物馆迁移伪代码、Firebase/Cloud Run 语境、前端直存 AI Key 作为数据层方案
- Capacitor / Android 作为 V1-Lite 交付（本次只做 Electron 桌面数据层）

## 6. 明确不迁入 V1-Lite 数据模型的旧能力

| 旧能力 | 处理 |
| --- | --- |
| 心情衰减 | 不做表字段；互动改为 CD + 经验规则 |
| 班级 PIN | 删除 |
| AI 对话配置 | 不进业务库；若以后做，单独安全存储且不进备份 |
| 邮箱注册 / Firebase 用户 | 文档遗留，代码已不用 |
| 共享班级数据 | 禁止 |
