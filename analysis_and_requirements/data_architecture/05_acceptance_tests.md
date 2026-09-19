# 数据层验收测试

分层：Node 单测（domain + sqlite 临时文件）必须全绿；IPC 集成测覆盖鉴权；Win7 虚拟机只做冒烟。禁止用 UI 截图代替仓储断言。

夹具：两个教师 A/B，不同 school 或 class。库文件用 temp。

## T0 启动与库

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T0-01 | 空 userData 启动 | 创建 sqlite；schema_migrations 含 001；8 条 pet_species |
| T0-02 | 再启动 | 不重复种子；user_version/migrations 幂等 |
| T0-03 | 人为关掉 foreign_keys 后跑服务 | 连接打开后 PRAGMA 仍为 ON |
| T0-04 | data-location 指向不存在盘 | 阻断错误 DATA_DIR_MISSING，不写安装目录 |
| T0-05 | 注入未知 IPC | UNKNOWN_CHANNEL |

## T1 账号隔离

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T1-01 | 同校同班同教师注册两次 | 第二次 ACCOUNT_EXISTS |
| T1-02 | 同教师名不同学校 | 允许 |
| T1-03 | 库内 teachers 行无明文密码 | `password_hash` 以 `$2` 开头；JSON.stringify 备份无 hash |
| T1-04 | 密码 < 8 | VALIDATION |
| T1-05 | 注册后 restoreSession | 免密回到 A |
| T1-06 | logout 后 restoreSession | account=null |
| T1-07 | 切到 B 需 B 的密码；A 的密码失败 | AUTH_FAILED 文案不区分字段 |
| T1-08 | A 建学生后用 B 的 session 带 A 的 studentId 赋分 | FORBIDDEN；A 的 exp 不变 |
| T1-09 | 开发模式 123456 重置 B | 旧密码失效；新密码可登录 |
| T1-10 | install 模式 123456 | RESET_CODE_INVALID |

## T2 学生与学号

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T2-01 | 无名创建 | STUDENT_NAME_REQUIRED |
| T2-02 | 连续 3 个无名学号 | 01 02 03；各 1 蛋 visual_stage=0 |
| T2-03 | 指定学号 05 再自动 | 下一个 06 |
| T2-04 | 再插入 05 | STUDENT_NO_CONFLICT |
| T2-05 | 归档 02；自动号 | 不复用 02；list 默认无 02 |
| T2-06 | restore 02 | 重新出现；日志仍在 |
| T2-07 | 改学号到已存在号 | 冲突；原行不变 |
| T2-08 | 同名不同学号 | 允许 |

## T3 导入

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T3-01 | 文本 `张三\n李四` | 预览两行 ok，提交得 01张三 02李四 |
| T3-02 | `01 王五\n01 赵六` | 预览 error；commit 默认零写入 |
| T3-03 | 文件 01 与库中 01 冲突，skipConflicts=false | 零写入 |
| T3-04 | 同上 true | 跳过冲突行，导入其余 |
| T3-05 | xlsx 表头 学生姓名/编号 | 映射到 name/studentNo |
| T3-06 | GBK txt 中文名 | 姓名不乱码 |
| T3-07 | 空文件 | IMPORT_EMPTY |
| T3-08 | commit 过期 previewId | IMPORT_PREVIEW_STALE |
| T3-09 | 导入中途制造 FK 失败（测试替身） | 全滚；学生数不变 |

## T4 赋分与成长

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T4-01 | 规则 +5 打 3 人 | 1 个 operation、3 条 entry；三人 +5 |
| T4-02 | 同一 requestId 再发 | exp 不加倍；返回原 operation |
| T4-03 | 其中 1 个 studentId 外班 | 全滚 |
| T4-04 | 扣到 0 以下 | exp=0；level 不降 |
| T4-05 | 加分跨过 Lv1 阈值 | pending_stage=1；visual_stage 仍 0 |
| T4-06 | confirmStage | visual_stage=1；unlock.confirmed_at 非空 |
| T4-07 | 再扣分 | visual_stage 仍 1 |
| T4-08 | 自定义 +7 无 ruleId | actionName 保留；remark 可选空 |
| T4-09 | 指定 petId 打第二只宠 | 仅该宠 exp 变 |
| T4-10 | 到 max_level 后继续加 | level 显示封顶；extraExp>0 |
| T4-11 | 改阈值降低未解锁阶段 | 已确认 stage 不变 |

## T5 多宠学科

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T5-01 | 未满级 createNext | NEXT_PET_NOT_ALLOWED |
| T5-02 | 确认 stage5 后 createNext 数学 | 第二只蛋；display 仍第一只除非 setDisplay |
| T5-03 | 同学科再开一只 | 允许 |
| T5-04 | 无 subjectId | SUBJECT_REQUIRED |
| T5-05 | setDisplay 第二只；screen.listCards | 卡上是第二只；petCount=2；排序仍按学号 |
| T5-06 | 归档学生 | 卡片消失；get 含 archived 仍能看到宠和日志 |

## T6 互动

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T6-01 | 无教师正向分就 feed | expAwarded=0；仍有 CD |
| T6-02 | 正向 +10 后再互动 | 0..cap 之间；interaction_exp_total 累加 |
| T6-03 | 同动作立即第二次 | INTERACTION_COOLDOWN |
| T6-04 | 不同动作 | 独立 CD |
| T6-05 | 模拟同日本宠互动经验已 5 | 再给 0 |
| T6-06 | 满级互动 | 可加 extraExp，仍受 5 与正向上限 |
| T6-07 | 事件含 bubble_code | 无负面文案码 |

## T7 备份恢复

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T7-01 | A 有学生和日志；export | gzip JSON；无 password_hash/session |
| T7-02 | B 数据存在；A overwrite 自己的备份 | B 学生数不变 |
| T7-03 | 恢复前把 daily 文件删掉仍先写 pre-restore | 有快照文件 |
| T7-04 | 损坏 gzip | BACKUP_INVALID；业务表不变 |
| T7-05 | asNewClass | 新 teacher UNIQUE 不撞；新密码登录看到导入学生 |
| T7-06 | 启动两次同一天 | daily 仍 1 个文件 |
| T7-07 | 改密码后旧备份仍可 overwrite 业务 | 当前哈希不被备份覆盖 |

## T8 重启持久化

| ID | 步骤 | 期望 |
| --- | --- | --- |
| T8-01 | 注册、导入、赋分、关进程、开进程、restore | 学生/exp/日志一致 |
| T8-02 | WAL 存在时正常打开 | 无损坏 |

## T9 Win7 冒烟（虚拟机，非本目录实现任务但验收要跑）

1. 安装 2. 启动 3. 建库 4. 建号/切换 5. 添加与导入 6. 单人+批量赋分 7. 大屏 IPC listCards 8. 备份恢复 9. 重启数据还在

ia32 若用 sql.js，上述断言不变。

## 自动化建议

```text
tests/domain/growthService.test.ts
tests/domain/studentNo.test.ts
tests/repo/accountIsolation.test.ts
tests/repo/scoreTransaction.test.ts
tests/repo/importCommit.test.ts
tests/repo/backupRestore.test.ts
tests/ipc/guard.test.ts
```

覆盖率不设虚线，但 T1-08、T4-02、T4-03、T7-02 失败则禁止宣称数据层完成。
