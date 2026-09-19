# 未决项与依据

原则：基线已写死的不再问。下列项产品没给数字或有冲突，本蓝图已给默认，编码按默认走。

| ID | 未决点 | 依据 | 默认 |
| --- | --- | --- | --- |
| OPEN-LEVEL-CURVE | 20 级每级经验 | 基线只冻视觉节点 Lv0/1/4/8/13/20；旧版是 `exp/50` | [01_schema.md](./01_schema.md) 5.4 表，教师可改 |
| OPEN-FIRST-SUBJECT | 新建学生首宠学科 | 基线：宠物必须绑学科；预设语数英 | 班级 `default_subject_id` = 语文 |
| OPEN-SCORE-TARGET | 多宠时分打在哪 | 基线未写；旧版打在学生单宠 | 默认展示宠；单人可传 `petId` |
| OPEN-PASSWORD-MIN | 本地密码最短 | 旧版 3 位；V1 清单 8 位 | 8 位，bcryptjs |
| OPEN-RESET-PROD | 正式恢复码形态 | 基线：开发 123456；正式本机专属 | `reset_code_mode=dev\|install` |
| OPEN-AS-NEW-PASSWORD | 恢复为新班如何设密 | 备份不含密码 | 必须新设密码 |
| OPEN-DAILY-SCOPE | 多账号每日备份 | 基线：手动导出当前账号；每日 1 份 | 只备份当前 auto_restore 账号 |
| OPEN-XLS | 二进制 .xls | 需求写 xlsx | 拒绝并提示另存 xlsx |
| OPEN-LEGACY-LS | 旧 localStorage | 确认文档：无真实用户、不必迁 | 默认不做；适配器可选 |
| OPEN-SQLITE-DRIVER | ia32 native | Win7 32 位硬性 | better-sqlite3，失败降 sql.js，IPC 不变 |
| OPEN-TEACHER-UNIQUE | 同校同名不同班 | V1 是学校+班级+教师 | 三元组唯一（已写入 schema） |
| OPEN-BATCH-CAP | 单次最多选多少人 | 确认表未填 | 不设产品上限；>80 仅 UI 警告 |
| OPEN-UNDO | 是否做撤销 | 旧 PRD 有；V1-Lite 基线未列入必须 | 只留 `undone_at`，本窗口不做 |
| OPEN-MOOD | 心情 | 旧版有；基线互动改为 CD/经验 | 不入库 |
| OPEN-EGG-SUBJECT-CHANGE | 已有宠改学科 | 未写 | 允许 update subject_id，不改 exp |

冲突已按基线收口：

- “经验不能超过最高等级” vs “满级继续累计” -> 等级显示封顶，经验继续累计。
- “备份是否含密码”表格填确认 vs “按你说的不导出明文” -> **不含密码**。
- 旧 `className::teacherName` vs 学校字段 -> 三元组 + UUID。
- Phase 4 博物馆迁移伪代码 -> 作废。
