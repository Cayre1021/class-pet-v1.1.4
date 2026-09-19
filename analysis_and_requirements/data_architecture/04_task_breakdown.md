# 数据层任务拆解

> 只拆 SQLite / 账号 / IPC / 导入备份 / 成长与互动领域服务。不包含 UI 视觉、宠物绘图、安装包签名。  
> 依赖：Electron 22 工程已能打开窗口并加载 preload。

## 阶段 A — 库与进程骨架（P0）

| ID | 任务 | 完成标准 | 依赖 |
| --- | --- | --- | --- |
| DA-01 | 选定 SQLite 驱动并在 Electron 22 x64 + ia32 各打一次 native/预编译 | 主进程能 `SELECT 1`；ia32 失败则切换 sql.js 并记录 ADR | 工程骨架 |
| DA-02 | userData 路径、`data-location.json`、WAL、foreign_keys、启动迁移 | 删库重启能从 001_init 重建；坏路径阻断 | DA-01 |
| DA-03 | 落地 001_init.sql（01_schema 全文）+ 种子 species | 空库含 8 物种 | DA-02 |
| DA-04 | preload 白名单 invoke + IpcResult + 未知 channel 测试 | 渲染进程碰不到 ipcRenderer | DA-01 |
| DA-05 | bcryptjs 哈希模块；禁止明文列 | 单测：同密码可验证、库内无明文 | DA-03 |

## 阶段 B — 账号与隔离（P0）

| ID | 任务 | 完成标准 | 依赖 |
| --- | --- | --- | --- |
| DA-10 | register/login/restore/logout/switch | 三元组 UNIQUE；日常 restore 免密；logout 后再开要选账号 | DA-05 |
| DA-11 | 注册事务：teacher+class+学科+规则+阈值+互动配置 | 新号立刻可空班上课 | DA-10 |
| DA-12 | SessionGuard：所有业务 channel 绑 class_id | 用另一班 studentId 写入 -> FORBIDDEN | DA-04 DA-10 |
| DA-13 | 改密 / 开发重置码 123456 / install 模式开关 | 正式模式拒绝 123456 | DA-10 |
| DA-14 | 账号列表不含哈希；last_opened_at | listAccounts 快照测试 | DA-10 |

## 阶段 C — 学生与导入（P0）

| ID | 任务 | 完成标准 | 依赖 |
| --- | --- | --- | --- |
| DA-20 | create/update/list/archive/restore | 归档后 list 默认消失；学号不重排；restore 冲突失败 | DA-12 |
| DA-21 | 建学生时第一只蛋（随机物种、语文、Lv0） | pets=1, is_display=1, stage0 confirmed | DA-20 |
| DA-22 | 学号生成 pad 2 | 已有 01、02 则下一个 03；归档 02 仍跳过 02 | DA-20 |
| DA-23 | importPreview 文本 | `01 张三` / 纯名 / GBK 样本 | DA-20 |
| DA-24 | importPreview xlsx 表头别名 | 学号/姓名/分组/备注 | DA-23 |
| DA-25 | importCommit 整批事务 + 文件内重复学号拒绝 | 失败零写入 | DA-23 |
| DA-26 | skipConflicts 可选 | 跳过冲突，导入其余 | DA-25 |

## 阶段 D — 赋分、成长、多宠（P0）

| ID | 任务 | 完成标准 | 依赖 |
| --- | --- | --- | --- |
| DA-30 | growthService：下限 0、不降级、不回退阶段、满级继续累计 extraExp | 单测表驱动 | DA-03 |
| DA-31 | scores.apply 批次+幂等 requestId | 3 人全成或全无；重放不双计 | DA-21 DA-30 |
| DA-32 | 默认打 display pet；单人可指定 petId | 跨学生 petId -> VALIDATION | DA-31 |
| DA-33 | 跨视觉阈值只设 pending，confirmStage 才改 visual_stage | 不点保持旧图 | DA-30 |
| DA-34 | 改 max_level/阈值不影响已确认阶段 | | DA-30 |
| DA-35 | pets.createNext 需已确认 stage5 | 新蛋独立 exp | DA-33 |
| DA-36 | 自定义学科；同学科多宠 | | DA-21 |
| DA-37 | screen.listCards 学号序、一名学生一卡 | | DA-21 |

## 阶段 E — 互动（P0 闭环）

| ID | 任务 | 完成标准 | 依赖 |
| --- | --- | --- | --- |
| DA-40 | 6 动作 CD | 冷却内第二次 INTERACTION_COOLDOWN | DA-21 |
| DA-41 | 随机经验 + 日上限 5 + 不超过教师正向累计 | 无正向赋分则互动经验 0 但仍记日志/CD | DA-31 DA-40 |
| DA-42 | 满级仍可互动经验（受 41 约束） | | DA-41 |
| DA-43 | 20 条正向 bubble_code 常量 | 事件只存 code | DA-40 |

## 阶段 F — 备份恢复（P0）

| ID | 任务 | 完成标准 | 依赖 |
| --- | --- | --- | --- |
| DA-50 | 导出当前账号 gzip JSON，无密码 | 解压可见 format=classpet.backup | DA-31 DA-41 |
| DA-51 | 每日 1 份覆盖 + 与 pre-restore 分目录 | | DA-50 |
| DA-52 | preview + overwriteCurrent 不影响其他账号 | 双账号夹具 | DA-50 |
| DA-53 | 恢复前快照失败则中止 | | DA-52 |
| DA-54 | asNewClass 新密码新 UUID | | DA-52 |

## 阶段 G — 映射与文档同步（P1，不阻塞 Lite 运行）

| ID | 任务 | 完成标准 | 依赖 |
| --- | --- | --- | --- |
| DA-60 | 备份包 fixture 作为 V1 导入契约 | 字段表与 03 文档一致 | DA-50 |
| DA-61 | 可选 legacy localStorage 适配器，默认关 | | DA-11 |
| DA-62 | 驱动/哈希 ADR 短文（可写在本目录 06，若需要） | ia32 结论 | DA-01 |

## 建议实现顺序（同一数据工程师）

```text
DA-01 -> DA-02 -> DA-03 -> DA-05 -> DA-04
  -> DA-10 -> DA-11 -> DA-12
  -> DA-20 -> DA-21 -> DA-22 -> DA-30 -> DA-31
  -> DA-23..26
  -> DA-33..37
  -> DA-40..43
  -> DA-50..54
```

UI 联调起点：DA-12 + DA-21 + DA-31 + DA-37 之后可以用真实 IPC，禁止再接假数组当完成。

## 明确不做

- 云端 API、授权码、PostgreSQL
- Undo 执行（只留 undone_at）
- 博物馆、心情、盲盒特效、classPin
- 渲染进程直连 SQLite
- 改旧仓库 `old-class-pet` 源码
