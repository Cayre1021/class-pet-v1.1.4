# V1-Lite 本地数据架构实施方案

> 状态：可执行蓝图，不是已实现代码
> 日期：2026-09-01
> 范围：Electron 22 + React + TypeScript + SQLite 单机多本地教师账号
> 写入边界：仅本目录。不改 UI、旧项目源码、构建配置、根目录文档。

正式开发以本目录为数据层唯一依据，并服从根目录 `V1_LITE_FINAL_DECISIONS_BASELINE.md`。旧版 `localStorage` 只能当证据和可复用规则来源，不能当生产存储。

| 文件 | 内容 |
| --- | --- |
| [00_legacy_audit_and_p0_risks.md](./00_legacy_audit_and_p0_risks.md) | 旧版证据审计、P0 风险、可复用/必须淘汰 |
| [01_schema.md](./01_schema.md) | SQLite 表结构、约束、所有权、实体关系 |
| [02_ipc_and_error_strategy.md](./02_ipc_and_error_strategy.md) | Electron IPC 安全边界、事务、错误码 |
| [03_import_backup_and_v1_mapping.md](./03_import_backup_and_v1_mapping.md) | Excel/文本导入、备份恢复、V1 云端映射 |
| [04_task_breakdown.md](./04_task_breakdown.md) | 数据层任务拆解与依赖 |
| [05_acceptance_tests.md](./05_acceptance_tests.md) | 验收测试清单 |

冻结结构：

```text
一台电脑
  -> 多个本地教师账号
      -> 每个账号默认一个独立班级
          -> 班级内学生 / 宠物 / 日志 / 规则
```

- 渲染进程不得直接打开 SQLite，也不得把 `localStorage` 当业务源。
- 账号之间不得读写或覆盖对方班级。
- 删除学生默认归档，不物理删除。
- 密码、备份、会话均不明文落库或导出。
- V1-Lite 不建设云端后端；本目录只定义以后导入 V1 的稳定 ID 与字段映射。
| [05_acceptance_tests.md](./05_acceptance_tests.md) | 验收测试清单 |
| [05_acceptance_tests.md](./05_acceptance_tests.md) | 验收测试清单 |
| [06_open_items.md](./06_open_items.md) | 未决项、默认值和依据 |
