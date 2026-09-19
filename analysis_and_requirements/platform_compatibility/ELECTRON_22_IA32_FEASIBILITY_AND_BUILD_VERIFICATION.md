# V1-Lite Electron 22 / Windows 7 ia32 可行性与构建验证方案

> 审计日期：2026-09-01
> 写入边界：仅本目录。未修改生产源代码、UI、数据库、依赖锁文件或打包配置。
> 验证状态：构建可行性有官方发布物证据；Windows 7 32 位运行兼容性尚未验证。不得写成“已兼容通过”。

## 0. 结论

Electron 22 是官方最后一条声明支持 Windows 7/8/8.1 的主版本；`22.3.27` 仍提供 `win32-ia32` 二进制。因此“Electron 22 + ia32 兼容包 + 现代 x64 包”在发布物层面可行，也符合 V1-Lite 已冻结的双构建决策。

现有工程不能当兼容版基线：

1. 当前桌面运行时是 Electron 33.2.0 x64。官方从 Electron 23 起放弃 Windows 7。
2. `Class Pet Setup 0.2.2 Win7 32-bit.exe` 只证明做过 ia32 NSIS 包装，不能证明 Electron 22，也不能证明 Win7 能启动。
3. 数据层是渲染进程 `localStorage`，没有 SQLite、preload、IPC。
4. 主进程产物是 ESM（`import.meta.url`）。Electron 原生 ESM 从 28 才支持，Electron 22 必须输出 CJS。
5. 当前 UI 含 Tailwind CSS v4，官方最低 Chrome 111；Electron 22 是 Chrome 108。
6. 本机是 Windows 11 Home 25H2 x64，无 VirtualBox/VMware；用户没有 Win7 真机。在 Win7 32 位虚拟机跑通 9 项业务验收之前，只能写“构建验证”，不能写“兼容通过”。

最小可行路线：

```text
同一套业务代码
  -> 兼容版：Electron 22.3.27 + win32-ia32 + 主进程 CJS + Chrome 108
              + sql.js 默认 / better-sqlite3 可选
              + Tailwind v3 或无 @property 的 CSS
              + 离线 NSIS 当前用户安装，无自动更新
  -> 现代版：Electron 43.5.x（或冒烟后的 44.x）+ win32-x64
              + better-sqlite3 N-API 预编译
              + 可保留 Tailwind v4 / 更高动画质量
```

兼容版 Chromium 108 已于 2023-10-10 停止官方安全维护。只适合离线教室，不是可联网安全基线。

## 1. 现状证据

### 1.1 与 V1-Lite 决策的差异

| V1-Lite 冻结项 | 现有工程证据 | 差距 | 验证状态 |
| --- | --- | --- | --- |
| Electron 为主要交付载体 | `electron/main.js` + electron-builder 已能打 NSIS | 壳存在，但是 Electron 33 壳 | 已证实现状 |
| 本地 SQLite | `src/lib/db.ts` 读写 localStorage | 无 SQLite、无 userData 库文件 | 未开始 |
| 渲染进程不直接碰数据库 | 无 preload、无 ipcMain | 必须新建主进程数据层 | 未开始 |
| Electron 22 | package.json / lock / node_modules / 已解包 exe 均为 33.2.0 | 必须换运行时 | 已证实现状 |
| Windows ia32 / Win7 32 位 | builder 未声明 ia32；已解包运行时是 x64 | 现有 64 位包不能当 Win7 证据 | 已证实现状 |
| 双构建 | 只有 `build:exe` -> `electron-builder --win` | 无 flavor、无双 electronVersion | 未开始 |
| 离线、当前用户、不要求管理员 | NSIS 允许改安装目录；未签名 | 改目录通常会提升权限 | 配置未对齐 |
| 兼容版不承诺自动更新 | 未发现 electron-updater | 保持不引入即可 | 现状可接受 |
| 功能一致，Win7 可降动画 | 无 BUILD_FLAVOR | 需要兼容开关 | 未开始 |
| 必须在 Win7 32 位 VM/真机验收 | 用户只有 Win11 笔记本；本机无 VirtualBox/VMware | 验证环境未就绪 | 未验证 |

决策来源：`V1_LITE_FINAL_DECISIONS_BASELINE.md` 第七、八章；`V1_LITE_TO_V2_REQUIREMENTS_CONFIRMATION.md` 3.2 节（用户确认没有真机时不能称兼容通过）。

### 1.2 当前桌面工具链

| 组件 | 声明 | 锁定/安装实测 |
| --- | --- | --- |
| electron | ^33.2.0 | 33.2.0，`node_modules/electron/dist/version` 同 |
| electron-builder | ^26.8.2 | 26.8.2 |
| vite | ^6.2.3 | 6.4.2 |
| vite-plugin-electron | ^0.29.1 | 0.29.1 |
| react / react-dom | ^19.0.1 | 19.2.5 |
| tailwind / @tailwindcss/vite | ^4.1.14 | 4.x |
| framer-motion | ^12.x | 12.x |
| Capacitor | ^8.3.1 | 仅 Android 壳 |
| sqlite / better-sqlite3 / sql.js | 无 | 无原生业务模块 |

`build.win.target` 只有 `nsis`，没有 arch。当前宿主机上会打 x64。`release/builder-debug.yml` 也只有 `x64:` 段。

主进程：`electron/main.js` 与 `dist-electron/main.js` 都是 ESM；`contextIsolation: true`，`nodeIntegration: false`，无 preload；`minWidth: 1080`；路由已用 HashRouter，适合 `file://`。

| 已生成安装包 | PE | 版本资源 | 说明 |
| --- | --- | --- | --- |
| `release/win-unpacked/Class Pet.exe` | x64 | FileVersion 33.2.0 | 当前可运行桌面内核 |
| `Class Pet Setup 0.2.2 64-bit.exe` | NSIS 壳 i386 | 0.2.2 | NSIS 外壳 32 位不能代表内嵌 Electron 架构 |
| `Class Pet Setup 0.2.2 Win7 32-bit.exe` | NSIS 壳 i386 | FileDescription 写 Win7 compatible 32-bit | 命名不能当兼容证据 |

0.1.1 更新日志原文：Windows 7 不支持当前 Electron 33 运行时，因此即使是 32 位安装包，也不能保证可在 Windows 7 上运行。

### 1.3 构建机环境（2026-09-01 实测）

| 项目 | 结果 |
| --- | --- |
| OS | Windows 10 Home China / 25H2 / build 26200（Windows 11 Home 系） |
| 架构 | AMD64 |
| Node | v24.14.0，modules ABI 137 |
| npm | 11.6.2 |
| MSVC | VS 2022 Community 17.11.3，x86 与 x64 cl.exe 均存在 |
| Python | py -0p 无已注册解释器。node-gyp 当前不可用 |
| 7-Zip / VirtualBox / VMware | 未安装 |
| Hyper-V | 查询需提升；Home 版通常无完整 Hyper-V。Win7 VM 宿主未就绪 |

## 2. 官方兼容事实

下列事实用于判断“能不能做包”，不是“已经在 Win7 上跑过”。

| 事实 | 来源 | 含义 |
| --- | --- | --- |
| Electron 22 是最后支持 Win7/8/8.1 的主版本 | https://www.electronjs.org/blog/electron-22-0 | 兼容版必须钉 22.x |
| Electron 23 起不再支持 Win7 | https://www.electronjs.org/blog/electron-23-0 | 当前 33.2.0 不是 Win7 运行时 |
| 22 线 EOL 2023-10-10 | https://www.electronjs.org/docs/tutorial/electron-timelines | 无官方安全补丁 |
| 22.3.27 是 22 线最后一版 | https://releases.electronjs.org/release/v22.3.27 | 钉死 22.3.27，不要 ^22 |
| 栈：Chrome 108.0.5359.215 / Node 16.17.1 / V8 10.8.168.25 | 同上 | 主进程按 Node 16；渲染按 Chrome 108 |
| Electron 22 ABI 110 | node-abi registry | 原生模块必须按 electron/110/win32/ia32 |
| ia32 zip 约 86.95 MB 仍可下载 | https://www.npmmirror.com/mirrors?path=electron/22.3.27/ | 发布物存在 |
| ia32 zip SHA256 | `1119ac7112590cb9c10a8c9b0bb5be65c0e11648a4f1311e6b7a5a00e497c2ce` | 下载后必须校验 |
| 原生 ESM 从 Electron 28 才支持 | https://www.electronjs.org/docs/latest/tutorial/esm | 兼容版必须 CJS |
| 当前受支持线 42/43/44；33 已于 2025-04-29 EOL | https://endoflife.date/electron | 现代版不要继续用 33 |
| Electron 44 起不再发布 Windows ia32 | Electron 44 变更 | ia32 只留给 22 兼容版 |
| Tailwind v4 最低 Chrome 111，依赖 @property / color-mix / oklch | https://tailwindcss.com/docs/browser-support | 兼容版不能直接用 Tailwind 4 |
| better-sqlite3 缺少稳定 win32-ia32 Electron 预编译 | https://github.com/WiseLibs/better-sqlite3/issues/679 | ia32 默认走 WASM 或源码重建 |
| better-sqlite3 v13 N-API 预编译是 win32 x64/arm64 | 上游 v13 说明 | 现代版可用；兼容版 ia32 不能指望 v13 预编译 |

禁止使用带 AVX 的非官方 Electron 22 fork。最差设备往往只有 SSE2。

## 3. 建议工具链版本

原则：兼容版钉死旧栈，现代版钉当前仍受支持的新栈。两套运行时，一套业务 schema。

### 3.1 兼容版（Win7 32 位）

| 组件 | 建议钉死 | 理由 |
| --- | --- | --- |
| Electron | 22.3.27 | 22 线最后一版，含 ia32，官方 Win7 终点 |
| 架构 | ia32 only | 32 位 Win7 不能跑 x64 Electron |
| Node 运行时 | 16.17.1 | 主进程禁止 fetch、import.meta.dirname、node:sqlite |
| Chromium | 108.0.5359.215 | 渲染 build.target = chrome108 |
| 主进程格式 | CommonJS `.cjs` | Electron 22 无原生 ESM |
| electron-builder | 24.13.3 | 与 Electron 22 同期；26.x 需空包冒烟，失败则留 24.13.3 |
| 构建机 Node | 20.18.x 或 22.x LTS | 不要用 Electron 自带 Node 跑 Vite |
| Vite | 5.4 或 6.x，target 必须 chrome108 | 只负责打包 |
| React | 先试 19 的 chrome108 产物；失败则 18.3.x | 见第 10 节 |
| CSS | Tailwind 3.4.x 或手写 CSS | 禁止依赖 @property / oklch / color-mix |
| SQLite 默认 | sql.js + 落盘 | 避开 ia32 预编译和本机 Python 缺口 |
| SQLite 可选 | better-sqlite3 重建到 ABI 110 / win32-ia32 | 仅当 Python + VS x86 成功并在 Win7 VM 加载 |
| 安装器 | 离线 NSIS，当前用户，不提升 | 不要求管理员 |
| 签名 | 可暂不签，说明写未知发布者 | 不阻塞 VM 验收 |

### 3.2 现代版（Windows 10/11 x64）

| 组件 | 建议钉死 | 理由 |
| --- | --- | --- |
| Electron | 43.5.0 保守默认 | 截至 2026-09-01 仍支持到 2027-01-05 |
| 备选 | 44.1.x，仅空包 + SQLite 冒烟后升级 | 44 已去掉 ia32 |
| 架构 | x64 only | 不要打 ia32 现代包 |
| electron-builder | 26.8.2（仓库已有） | 给现代包用 |
| CSS / 动画 | 可保留 Tailwind 4 + Framer Motion 12 | 只在现代包启用 |
| SQLite | better-sqlite3 v13 N-API win32-x64 | 校验 app.asar.unpacked；失败再 rebuild |
| 自动更新 | 本窗口不承诺 | 不要打进兼容版 |

不要把 Capacitor 8 打进 Electron asar。

## 4. 双构建矩阵

| 维度 | 兼容版 compat | 现代版 modern | 必须 |
| --- | --- | --- | --- |
| 安装包名 | ClassPet-Setup-ver-win7-ia32.exe | ClassPet-Setup-ver-win-x64.exe | 是 |
| Electron | 22.3.27 | 43.5.0 | 是 |
| arch | ia32 | x64 | 是 |
| 目标 OS | Windows 7 SP1 32 位 | Windows 10 1809+ / Windows 11 x64 | 兼容版必须 VM 验收 |
| 内存承诺 | 2 GB 目标，未测 | 4 GB 建议 | 2 GB 不是已测值 |
| 数据 | 同一 SQLite schema，库在 userData | 同左 | 是 |
| IPC | 同一 preload 契约 | 同左 | 是 |
| UI | 功能相同，动画可降，CSS 必须 Chrome 108 可解析 | 可用 Tailwind 4 | 功能一致是 P0 |
| 安装 | 离线 NSIS，当前用户，不提升 | 可改目录/可选提升 | 兼容版 P0 |
| 自动更新 | 禁止 | 不承诺 | 是 |

建议的 builder 逻辑尚未应用到生产配置：

- 兼容版：electronVersion 22.3.27，arch ia32，asarUnpack 含 `*.node` 与 `*.wasm`，requestedExecutionLevel asInvoker，perMachine false，allowElevation false，publish never，输出 `release/compat`。
- 现代版：electronVersion 43.5.0，arch x64，输出 `release/modern`。
- appId 必须不同：`com.classpet.desktop.compat` vs `com.classpet.desktop`，避免抢卸载键和 userData。

兼容版主进程独立打 CJS：

```text
format: cjs
outFile: dist-electron/main.cjs
target: node16
external: electron, better-sqlite3
```

即使根 package.json 保留 `"type": "module"`，兼容版 main 也必须指向 `.cjs`。

## 5. SQLite 与原生模块

当前安装包几乎不带 `.node`，所以 Electron 33 还能装上就开。引入 SQLite 后必须处理 ABI、arch、asar 解包和 Win7 运行库。

硬约束：

1. 渲染进程禁止加载 better-sqlite3。
2. Electron 22 ABI = 110；本机 Node 24 ABI = 137。不能混用。
3. `.node` 必须出现在 `app.asar.unpacked`。
4. win32-ia32 预编译长期缺失，不能当默认路径。

推荐驱动：

```text
Main process
  -> SqliteDriver
        -> NativeBetterSqlite3    # 现代版默认；兼容版仅重建成功时
        -> SqlJsFileDriver        # 兼容版默认
  -> %APPDATA%\Class Pet Compat\classpet.sqlite
```

兼容版默认 sql.js：它就是 SQLite 的 WASM 编译，满足“本地 SQLite 保存真实业务数据”，不需要 Python / node-gyp。把 `sql-wasm.wasm` 放到 extraResources，写事务后原子落盘。启动日志必须打印 `driver=sqljs|native arch=ia32 electron=22.3.27`。

现代版默认 better-sqlite3 v13 N-API（win32-x64），打包后断言 unpacked `.node` 存在。

兼容版原生重建是 P1，不是 P0。需要 Python 3.11/3.12（本机没有）和已存在的 VS 2022 x86 工具，并在 32 位 Electron 22 里加载，不能用宿主 node 验证。Win7 还需 VC++ x86 运行库。

## 6. 主进程、IPC 与打包风险

| 缺口 | 现状 | 兼容版要求 |
| --- | --- | --- |
| 主进程 ESM | type: module + ESM 产物 | 输出 main.cjs |
| preload | 无 | preload.cjs + contextBridge |
| IPC | 无 | 账号、学生、赋分、备份全部走主进程 |
| 数据库位置 | localStorage | userData，禁止写安装目录 |
| GPU | 未关硬件加速 | 兼容版默认关闭硬件加速 |
| 最小窗口 | 1080x720 | 降至 1024x700 或取消下限 |
| builder 26 vs Electron 22 | 未知是否可直接打包 | 兼容包先用 builder 24.13.3 做空窗口包 |
| 镜像 | lock 已用 npmmirror | Electron 22 也走同一镜像并校验 SHA256 |

## 7. 渲染进程与 Chrome 108

Electron 22 的页面环境是 Chrome 108，不是本机 Edge。

| 栈 | Chrome 108 风险 | 处理 |
| --- | --- | --- |
| React 19 | 低到中 | build.target = chrome108；失败降 React 18.3 |
| Vite 6 默认 browserslist | 高 | 兼容 flavor 显式 target |
| Tailwind v4 | 阻断。官方 Chrome 111，@property 无法可靠降译 | 兼容包用 Tailwind 3.4 或独立 CSS |
| oklch / color-mix | Chrome 111 才有 | 只用 hex/rgb/hsl |
| Framer Motion 12 | 中，CPU/GPU 更危险 | 兼容包默认减动画 |
| 大屏 PNG | 中。0.2.x 安装包已到 150MB+ | 2 GB 下先测 30 人班再测 60 人班 |

Antigravity 可以按 Tailwind 4 做现代版。兼容版必须另有 Chrome 108 CSS 管道。

## 8. Windows 7 支持界限

按 V1-Lite 最低环境去验证，不是宣布已经通过：Windows 7 SP1 32 位、SSE2 双核约 1 GHz、2 GB 内存、1 GB 磁盘、当前用户、离线安装、允许软件渲染。

Win7 RTM（无 SP1）不在范围内。缺 KB2533623 时 Chromium/Electron 常见直接起不来。这是启动失败第一嫌疑，不是“Electron 22 不支持 ia32”。

明确不承诺：真机通过、所有最差电脑都能跑、安全补丁、自动更新、打印/触摸/高 DPI 完美布局、XP/Vista、把现有 `*Win7 32-bit.exe` 当已验证产物。

允许降动画、粒子、PNG 分辨率、GPU。不允许缺：安装启动、SQLite 建库、本地账号、学生导入、单人/批量赋分、大屏、备份恢复、重启后数据仍在。

## 9. 代码签名与依赖风险

| 风险 | 级别 | 处理 |
| --- | --- | --- |
| Chromium 108 无安全维护 | P0 披露 | 发行说明写清；不加载远程页面；无 nodeIntegration |
| 未签名 exe | P1 | 不阻塞 VM 验收；正式分发再签 |
| Electron 22 下载被劫持 | P0 | 校验 SHA256 `1119ac7112590cb9c10a8c9b0bb5be65c0e11648a4f1311e6b7a5a00e497c2ce` |
| 第三方 Electron 22 fork | P0 禁止 | 只用官方/npmmirror 上游包 |
| Node 24 编出错误 ABI | P0 | 禁止用宿主 node 验证 `.node` |
| asar 未解包原生模块 | P0 | 打包后文件存在性断言 |
| Python 缺失 | P0，仅原生 sqlite | 兼容版默认 sql.js |
| Capacitor/AI/express 误打进桌面包 | P2 | files 白名单只要 dist + dist-electron + 驱动 |
| 两版抢 userData | P1 | 不同 appId |
| Home 版无 Hyper-V | P0 验证环境 | 先装 VirtualBox |

## 10. 降级策略

| 触发 | 先做 | 再降 | 禁止 |
| --- | --- | --- | --- |
| Win7 上 exe 瞬间退出 | 查 SP1、KB2533623、事件查看器、--disable-gpu | 软件渲染 + 关闭硬件加速 | 立刻改 Electron 21/20 |
| 仍起不来 | 官方 electron.exe 22.3.27 ia32 空壳 | 空壳也挂才考虑 21.4.4 | 换非官方 fork |
| 空壳可开、业务包不开 | 拆 preload/SQL/CSS | 先拿掉 Tailwind 4 和动画 | 改业务规则 |
| better-sqlite3 dlopen 失败 | 记录 ABI/arch | 切 sql.js | 在 Win7 上现场 node-gyp |
| sql.js OOM | 减图片、关烟花 | 分页展示 | 改回 localStorage |
| React 19 白屏 | 看控制台 | React 18.3 + Tailwind 3.4 | 升级 Electron 到 23+ |
| builder 26 打 22 失败 | npx electron-builder@24.13.3 | 26 只给现代包 | 改 electron 迁就 builder |
| Node 24 装不了 electron 22 | nvm-windows 切 Node 20.18 |  |  |
| 2 GB 大屏卡死 | 降动画、30 人样本 | 改写实测内存下限 | 假装 2 GB 已通过 |
| 无管理员无法安装 | asInvoker + %LOCALAPPDATA% | 免安装 zip | 要求管理员密码 |

Electron 21/20 只作为“22 空壳在该 VM 无法启动”的最后手段。它们同样 EOL，不是为了功能去降。

## 11. P0 / P1 处理顺序

P0（没有这些，Win7 验收无法开始）：

1. 准备 Win7 SP1 32 位 VM。Home 版优先 VirtualBox。安装 SP1 + KB2533623。没有 VM 就没有兼容结论。
2. 隔离目录下载并校验 `electron-v22.3.27-win32-ia32.zip`。空窗口先 Win11，再 Win7 VM。
3. 兼容版主进程改为 CJS；加上 preload/IPC 骨架。
4. 渲染 target chrome108；CSS 离开 Tailwind 4。
5. SQLite 驱动接口，兼容版默认 sql.js 落盘到 userData。
6. NSIS 离线当前用户安装，artifact 名称带 win7-ia32。
7. Win7 VM 先跑启动/建库，再跑完整 9 项。

P1：

1. 账号/学生/赋分/大屏/备份走真实 IPC + SQLite。
2. 现代版 Electron 43.5.x x64 + better-sqlite3 N-API。
3. 两版 schema 一致、备份 JSON 可互换。
4. 兼容版动画降级开关。
5. 原生 better-sqlite3 ia32 重建实验。
6. 代码签名与 SmartScreen。

P2：自动更新、Capacitor、AI Key、打印、Win7 真机、安装包体积优化。

## 12. 验证分层

| 层级 | 含义 | 当前 |
| --- | --- | --- |
| L0 发布物存在 | ia32 zip 能下载且 SHA256 匹配 | 镜像有文件；本机尚未下载校验 |
| L1 构建成功 | 本机打出 ia32 NSIS | 未做。本任务不改打包配置 |
| L2 本机安装启动 | Win11 x64 上 ia32 包能装能开 | 未做 |
| L3 Win7 VM 空壳 | 官方 electron ia32 在 Win7 SP1 32 位能开窗口 | 未做 |
| L4 Win7 VM 业务包 | 安装器 + SQLite + 9 项业务 | 未做 |
| L5 真机 | 教室真实 Win7 32 位 | 无设备，本窗口不承诺 |

只有 L4 全部通过，才能写“Win7 32 位虚拟机兼容通过”。L1/L2 绝不能写成 L4。命令与记录表见 `BUILD_AND_VM_COMMAND_MATRIX.md`。

## 13. 通过标准

兼容版必须在 Win7 SP1 32 位 VM 上全部满足：

1. 离线、当前用户安装成功，不要求管理员。
2. 60 秒内出现主窗口，无立即崩溃。
3. userData 出现 SQLite 库文件，日志写明驱动。
4. 创建或切换本地账号。
5. 添加、导入学生。
6. 单个和批量赋分，重启后积分仍在。
7. 学生大屏至少 20 人可见。
8. 备份和恢复；恢复前有快照；不影响其他账号。
9. 退出再打开，数据仍在。

环境标签至少记录：OS 精确版本、是否 SP1、内存、磁盘、是否软件渲染、有无 KB2533623、有无 VC++ x86、安装是否管理员。任一条失败都只能写失败原因，不能用“安装包已生成”代替。

现代版在本机 Win11 重复上述 9 项，且主程序版本资源是 43.x/44.x 而不是 33.2.0。若启用原生 `.node`，必须在 app.asar.unpacked 且 ABI 匹配。

构建门禁还不是兼容通过：ia32 SHA256 有记录；兼容版主程序 PE 为 i386；main 为 CJS；兼容包无 updater。

## 14. 明确未验证 / 未执行

- 未下载、未校验 ia32 zip 到本机
- 未用 Electron 22 打过新安装包
- 未创建 Windows 7 32 位虚拟机
- 未在 Win7 上启动任何 Class Pet 或官方 Electron 22 空壳
- 未重建 better-sqlite3
- 未截图验证 Tailwind 4 在 Chrome 108 的实际渲染（依据官方支持声明）
- 未测试 2 GB 内存大屏
- 未做代码签名

## 15. 对后续实现的约束

1. 兼容版 Electron 只允许 22.3.27。
2. 未完成 L4 之前，文档、安装包说明、更新日志禁止出现“已支持 Windows 7”。
3. 现有 `Class Pet Setup 0.2.2 Win7 32-bit.exe` 只能标为历史 ia32 尝试，并引用 0.1.1 日志中的 Electron 33 限制。
4. SQLite 先接口后驱动；兼容版默认 sql.js。
5. 现代版不要为了省事降到 Electron 22。
6. Capacitor/Android 不进入本双构建验收。
