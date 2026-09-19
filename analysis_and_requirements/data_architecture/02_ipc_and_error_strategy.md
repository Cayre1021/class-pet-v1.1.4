# IPC 安全边界、事务与错误策略

> 渲染进程是不可信输入源。所有授权来自主进程会话，不来自 payload 里的 teacherId。

## 1. 进程边界

```text
Renderer (React)
  -> preload contextBridge  window.classpet.invoke(channel, payload)
      -> ipcMain.handle  白名单
          -> SessionGuard
          -> Zod/JSON schema 校验
          -> Domain service
              -> better-sqlite3 transaction
```

主进程 BrowserWindow：

```js
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
}
```

禁止：

- 渲染进程 `require('fs')` / 打开 sqlite
- 暴露整份 `ipcRenderer`
- 动态 channel 名
- 把 `password_hash`、重置码明文、绝对备份路径列表打给渲染进程
- 用 payload.teacherId / accountKey 做授权

preload 仅暴露：

```ts
window.classpet = {
  invoke: (channel: string, payload?: unknown) => Promise<IpcResult>,
  on: (event: 'dataChanged', cb: (e: DataChangedEvent) => void) => () => void,
};
```

`on` 只订阅主进程推送的 `classpet:dataChanged`，用于大屏刷新。不得把任意 ipc 事件转出去。

## 2. 统一结果

```ts
type IpcResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; details?: unknown };
```

`message` 给教师看，短中文。`details` 只放行号、学号、requestId 等可展示字段，不放堆栈、SQL、哈希。

主进程日志可写内部错误，禁止记录密码、重置码、完整备份 JSON。

## 3. 会话

| 动作 | 行为 |
| --- | --- |
| register | 校验唯一三元组；哈希密码；建 teacher+class+种子；写 session；`auto_restore=1` |
| restoreSession | 若 `auto_restore=1` 且 last_teacher_id 有效，免密进入 |
| login | 用于切换账号；必须密码匹配 |
| logout | `revoked_at=now`；`auto_restore=0`；清内存 session |
| switchAccount | logout + login |
| changePassword | 校验当前密码；写新哈希；可保留当前 session |
| resetPassword | 校验重置码；提示先备份（UI）；写新哈希；不恢复旧密码 |

内存：`currentSession: { sessionId, teacherId, classId }`。所有写接口先看这里。

大屏/操作台共用同一会话。无会话时 list 接口返回空数组或 `UNAUTHENTICATED`，**不得回落共享数据**。

密码规则（V1-Lite 假设，对齐以后云端）：最少 8 位；确认密码在渲染进程先查，主进程再查。旧版 3 位规则淘汰。

规范化：`trim` + 内部空白折叠为单空格；比较用 `norm` 列；展示保留用户输入。

## 4. Channel 白名单

未列名的 channel -> `UNKNOWN_CHANNEL`。

### 4.1 auth.*  无需会话：listAccounts / register / login / restoreSession / resetPassword

| channel | payload | 成功 data |
| --- | --- | --- |
| auth.listAccounts | `{}` | `{ accounts: AccountPublic[] }` |
| auth.register | `{ schoolName, className, teacherName, password, confirmPassword }` | `{ account, class: ClassPublic }` |
| auth.login | `{ teacherId, password }` | 同上 |
| auth.restoreSession | `{}` | 同上或 `{ account: null }` |
| auth.logout | `{}` | `{ ok: true }` |
| auth.changePassword | `{ currentPassword, nextPassword, confirmPassword }` | `{ ok: true }` |
| auth.resetPassword | `{ teacherId, resetCode, nextPassword, confirmPassword }` | `{ ok: true }` |
| auth.getCurrent | `{}` | `{ account, class } \| null` |

`AccountPublic`：`id, schoolName, className, teacherName, profileColor, lastOpenedAt`。无哈希。

### 4.2 students.*

| channel | 说明 |
| --- | --- |
| students.list | `{ includeArchived?: boolean }` 默认 false |
| students.get | `{ studentId }` 含宠物 |
| students.create | `{ name, studentNo?, groupName?, note? }` 无学号则生成；事务内建第一只蛋 |
| students.update | `{ studentId, name?, studentNo?, groupName?, note? }` |
| students.archive | `{ studentIds: string[] }` |
| students.restore | `{ studentIds: string[] }` 学号冲突则失败 |
| students.importPreview | `{ source: 'xlsx'\|'txt', bytes: Uint8Array, filename }` |
| students.importCommit | `{ previewId }` 或规范化行数组；整批事务 |

新建学生事务：

1. 生成/校验学号
2. insert student
3. 随机 species（8 选 1）+ 随机 egg_color + default_subject
4. insert pet Lv0 stage0 is_display=1
5. insert pet_stage_unlocks (0, confirmed)
6. 回填 display_pet_id

### 4.3 scores.apply

```ts
{
  requestId: string;          // 幂等键，UI 每次点击生成 UUID
  studentIds: string[];
  petId?: string;             // 省略则各学生 display pet；指定则必须这批学生都拥有？不允许。指定 petId 仅单学生
  ruleId?: string;
  actionName: string;
  points: number;             // 自定义临时分值；有 ruleId 则以库中规则为准
  remark?: string;            // 可选
}
```

事务：

1. 锁班级写（SQLite 单连接序列化即可）
2. 校验所有学生属于当前 class 且未归档
3. 解析目标宠物
4. 插入 `score_operations`
5. 对每个学生更新 pet.exp/level/unlock/pending，写 `score_entries`
6. 正向分累加 `teacher_positive_exp_total`
7. commit 后 emit `dataChanged` `{ type: 'scores', classId, studentIds, operationId }`

`requestId` 已存在且同班：返回第一次结果，不重复加分。

负向 `actionName` 可存完整原因；大屏 DTO 对 negative 隐藏 remark/actionName，只显示“积分变动”。

V1-Lite 不做 Undo；`undone_at` 留空给 V1。

### 4.4 pets.* / subjects.* / rules.* / settings.*

| channel | 说明 |
| --- | --- |
| pets.listByStudent | 详情页，按学科分组由 UI 做，后端按 created_at 返回 |
| pets.setDisplay | 只能把本学生的某宠设为展示 |
| pets.rename | 昵称 |
| pets.confirmStage | 确认 pending_stage；谁点都生效 |
| pets.createNext | 任意宠 visual_stage=5 已确认；payload `{ studentId, subjectId, speciesCode? }` |
| subjects.list/create/update | 自定义学科；code 由主进程 slug |
| rules.list/create | 新规则；不删历史，只 archive |
| settings.getClass / updateLevelConfig | 改阈值不回写历史 exp，不回退 visual_stage |

### 4.5 interactions.perform

```ts
{ studentId: string; petId: string; actionCode: string }
```

校验 CD、日上限、正向赋分上限后写事件 + 更新 pet exp（与赋分同一套成长函数）。返回 `{ expAwarded, nextAvailableAt, bubbleCode, pet }`。

CD 未到 -> `INTERACTION_COOLDOWN`，details `{ nextAvailableAt }`。

### 4.6 screen.* / logs.*

| channel | 说明 |
| --- | --- |
| screen.listCards | 未归档学生，学号升序；每卡一只展示宠 |
| screen.search | 姓名或学号包含 |
| logs.listByStudent | 赋分+互动；扣分原因对非教师角色可打码。V1-Lite 单机只有教师会话，学生查询页仍不要把负向原因做大屏高亮 |
| logs.listOperations | 操作台最近批次 |

### 4.7 backup.*

| channel | 说明 |
| --- | --- |
| backup.getStatus | 最近 daily / 数据目录是否可用 |
| backup.chooseDataDir | 主进程 `dialog.showOpenDialog` |
| backup.export | `dialog.showSaveDialog`；只导出当前账号 |
| backup.preview | 选文件后解析清单，不写入 |
| backup.restore | `{ mode: 'overwriteCurrent' \| 'asNewClass', fileBytes }` 先写 pre_restore 快照 |

文件对话框必须在主进程。渲染进程只收 `{ canceled, fileName }`，不收任意路径遍历。

## 5. 事务与并发

- 进程内 **一条** SQLite 连接；所有 IPC handler 同步排队（better-sqlite3 本身同步）。
- 多步写必须 `db.transaction(fn)()`。
- 失败：整事务 rollback；返回业务码；不留半成品学生/半成品积分。
- 导入、赋分、恢复、建号都是单事务。
- 恢复前快照失败 -> 禁止 restore。
- WAL checkpoint 在成功 backup.export 之后 `PRAGMA wal_checkpoint(TRUNCATE)` 的宽松版：至少 `PASSIVE`。

成长计算伪代码（唯一实现点 `growthService.applyExpDelta`）：

```ts
exp = max(0, pet.exp + delta)
level = min(maxLevel, highestThreshold(exp))
if (delta > 0) maybeUnlockStages(pet, level) // 只加 unlock/pending
// 永不降低 pet.level、visual_stage
```

UI 再算一遍等级视为 bug。

## 6. 错误码

| code | 何时 |
| --- | --- |
| UNKNOWN_CHANNEL | 不在白名单 |
| VALIDATION | schema 失败 |
| UNAUTHENTICATED | 无会话 |
| FORBIDDEN | 资源不属于当前 class |
| ACCOUNT_EXISTS | 同校同班同教师 |
| AUTH_FAILED | 登录/改密失败（不区分是哪个字段） |
| RESET_CODE_INVALID | 重置码错误 |
| STUDENT_NO_CONFLICT | 学号冲突 |
| STUDENT_NAME_REQUIRED | 空姓名 |
| IMPORT_PARSE_FAILED | 无法解码或无有效列 |
| IMPORT_EMPTY | 无有效行 |
| IMPORT_PREVIEW_STALE | previewId 过期 |
| RULE_INVALID | 分值为 0 或符号与 type 不符 |
| PET_NOT_FOUND | |
| STAGE_NOT_PENDING | 无待确认阶段 |
| NEXT_PET_NOT_ALLOWED | 没有最终形态确认宠 |
| SUBJECT_REQUIRED | 宠物无学科 |
| INTERACTION_COOLDOWN | |
| INTERACTION_UNKNOWN | |
| IDEMPOTENT_REPLAY | 可选；或直接返回旧 operation |
| BACKUP_INVALID | 格式/版本不支持 |
| BACKUP_SCOPE_MISMATCH | 恢复目标不允许 |
| SNAPSHOT_FAILED | 恢复前快照失败 |
| DATA_DIR_MISSING | 自定义目录丢失 |
| DB_MIGRATION_FAILED | 启动失败，阻断 |
| INTERNAL | 未分类；给通用“保存失败，请重试” |

## 7. dataChanged 事件

```ts
type DataChangedEvent = {
  classId: string;
  types: Array<'students'|'scores'|'pets'|'settings'|'interactions'>;
  at: number;
};
```

同一事务只发一次。渲染进程收到后重拉 list，不把事件当数据源。

## 8. 测试替身

主进程 domain 层不依赖 Electron，可在 Node 测。IPC 层测：伪造 session、跨 class 注入 studentId、错误 channel、幂等 requestId。
