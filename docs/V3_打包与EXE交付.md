# V3 打包与 EXE 交付

> 最终交付形态：**Electron 打包的 Windows 安装包 / 便携版 EXE**。
> 工具链：`electron-builder ^26.8.2` + `electron ^33.2.0`，命令来自 `electron-app/package.json`。

## 一、现在的打包链路（已在仓库里）

```bash
cd electron-app
npm run dist:win          # electron-builder --win --x64
# 产物落在 electron-app/release/
```

| 配置项 | 值 | 说明 |
|---|---|---|
| `appId` | `com.classpet.classroom` | 升级识别用，**不能改**，改了等于换应用 |
| `productName` | `ClassPet` | 影响安装目录与产物名 |
| `main` | `main.js` | 主进程入口 |
| `files` | `main.js / preload.js / sqlite_service.js / src/**/*`（排除 `pets_raw`） | **`design/` 不在包内**，所以 V3 必须放进 `src/`（批次 1 已完成） |
| `extraResources` | `../database/classpet.sqlite` → `resources/database/classpet.sqlite` | 只作**初始种子库** |
| `win.target` | `nsis` + `portable`，x64 | 安装版 + 绿色便携版 |
| `nsis` | 非一键、可选安装目录、快捷方式「班级电子宠物管理系统」 | |
| `portable.artifactName` | `ClassPet-Portable-${version}.exe` | |
| `signAndEditExecutable` | `false` | **未签名**，首次运行会触发 SmartScreen 提示 |

`release/` 里已有 1.0.0 → 1.1.x 的历史产物，V3 发布时应新建版本号（建议 `1.2.0`），不要覆盖旧包。

## 二、数据落在哪（决定升级会不会丢数据）

`sqlite_service.js` 的解析顺序：

1. `app.getPath('userData')/classpet.sqlite` —— **运行时读写这里**（`%APPDATA%/ClassPet/...`）
2. `process.resourcesPath/database/classpet.sqlite` —— 打包时塞进去的种子库
3. 开发模式：`electron-app/../database/classpet.sqlite`

结论：**升级/重装不会覆盖用户数据**（用户库在 userData），只有首次运行才会从种子库复制。这也是为什么测试要区分"种子库"和"用户库"。

## 三、V3 进 EXE 的前置条件（5 条，缺一条就黑屏/白屏/404）

1. **页面在 `src/` 下**（`design/` 不打包）—— 批次 1 已完成；
2. **资源路径相对于页面**：`assets/...`，不是 `../electron-app/src/assets/...` —— 批次 1 已完成；
3. **三页必须由 `main.js` 用 `loadFile` 加载**：只有走主进程才有 `preload.js` 注入的 `window.electronAPI`；浏览器双击打开时它是 `undefined`（这也是原型能用模拟数据、正式版不能的原因）；
4. **路由**：`main.js` 的 `open-display-window / open-teacher-window / open-portal-window` 要指向 `v3_*.html`——**排在批次 3 末做**（现在切会让应用退回模拟数据）；
5. **版本号**：`package.json version` 升到 `1.2.0`，产物名与变更日志同步。

## 四、打包与验收步骤

```bash
# 1. 数据先备份（正式库与种子库都备份）
copy database\classpet.sqlite database\classpet.sqlite.bak

# 2. 版本号 + 构建
cd electron-app
npm run dist:win

# 3. 先跑未打包目录，确认不是安装包问题
release\win-unpacked\ClassPet.exe

# 4. 再跑安装包 / 便携版
release\ClassPet Setup 1.2.0.exe
release\ClassPet-Portable-1.2.0.exe
```

**验收清单（每条都要真跑）**
- [ ] `win-unpacked` 里能看到 `resources/database/classpet.sqlite`；
- [ ] 启动后进入 V3 门户（未登录 → 注册 → 进入选择入口）；
- [ ] 三页图片全部加载，控制台 0 报错（F12 看）；
- [ ] 赋分后重启应用，数据仍在（说明写进了 userData 而不是包内）；
- [ ] 拔网线可用（零外链）；
- [ ] F11 全屏、扩展屏投大屏、触屏点击与拖动；
- [ ] 卸载重装后用户数据仍在。

## 五、已知风险

| 风险 | 说明 | 处理 |
|---|---|---|
| 未签名 | `signAndEditExecutable:false`，SmartScreen 会拦一次 | 交付时附一句说明，或后续买证书 |
| portable 与 nsis 数据不共享 | 便携版同样写 `%APPDATA%/ClassPet`，若两者混用会共用同一份数据 | 交付只推一种，或明确说明 |
| `src/js/classpet_core.js` 是重复死文件 | 与 `src/classpet_core.js` 内容相同但无人引用，却会被打进包 | 已删除，减小体积并避免"改了一份没生效" |
| 种子库被写脏 | 开发时误用 `database/classpet.sqlite` 试写，会把脏数据打包进去 | 打包前用 `git status database/` 确认种子库干净 |
| `design/` 与 `src/` 两份 | 改了原型忘记同步 | 每批结束跑一次同步 + `probe_src_copy` 校验（0 破图 0 报错） |

## 六、回滚

- 代码：revert 对应提交（路由切换是单独一个提交，回滚只影响入口）；
- 数据：打包前备份的 `classpet.sqlite.bak` 覆盖 userData 里的库；
- 发布包：`release/` 里的旧版本产物保留，不覆盖。
## 七、2026-11-19 实际打包记录（V3 · 1.2.0）

> 本机网络到 GitHub / Electron 下载源不通，本次为**离线打包**，结果与验收如下。

### 打包命令（离线变体）

```bash
cd electron-app
# 版本号 1.1.4 → 1.2.0（已提交）
env -u ELECTRON_RUN_AS_NODE npx.cmd electron-builder --win --x64 \
    --config.electronDist=node_modules/electron/dist
```

- `--config.electronDist` 是本机必需的：默认流程会去下载 `electron-v33.4.11-win32-x64.zip`，本机 TLS 不通会直接失败（`Client network socket disconnected before secure TLS connection was established`）。指到已有的 `node_modules/electron/dist` 即可离线打包。
- **不要**用 bash 的 `timeout`（Windows 上是 `TIMEOUT.EXE`），也不要在继承 `ELECTRON_RUN_AS_NODE=1` 的环境里启动打包产物（会被当普通 node 跑，报 `bad option` 退出 9）。

### 产物（`electron-app/release/`，已被 .gitignore 忽略，未入库）

| 产物 | 大小 |
|---|---|
| `ClassPet Setup 1.2.0.exe`（NSIS 安装版，含 blockmap） | 103.8 MB |
| `ClassPet-Portable-1.2.0.exe`（便携版） | 103.6 MB |
| `win-unpacked/ClassPet.exe`（免安装目录） | 180 MB |
| `win-unpacked/resources/database/classpet.sqlite`（种子库） | 248 KB |

旧版本产物（1.0.0 / 1.1.0 / 1.1.1）**未覆盖**。

### 验收结果（2026-11-19 真跑）

- [x] `win-unpacked` 内存在 `resources/database/classpet.sqlite`（248 KB）
- [x] `app.asar` 内含 `main.js` / `preload.js` / `sqlite_service.js` / `src/classpet_core.js` / `src/v3_portal.html` / `src/v3_teacher_desk.html` / `src/v3_looseleaf_paper.html`
- [x] 包内 `main.js` 路由已是 V3：`open-*-window` 指向 `v3_*`，默认启动页 `v3_portal.html`
- [x] **真实启动成功**（临时 userData，未碰用户数据）：窗口标题 = `班级电子宠物 · 教师登录 / 注册`（V3 门户），日志 `[SQLiteService] 成功载入既有 SQLite 数据库文件` + `[Main] SQLite 服务初始化就绪`，无报错
- [ ] 未验：安装版/便携版双击安装与卸载重装、卸载后用户数据保留、SmartScreen 提示、扩展屏投屏、触屏与 F11、音效听感、画面观感
- [ ] 未验：拔网线可用（静态检查无外链、三页资源均在包内，但未做断网实测）

### 本机环境限制（影响发布动作，不影响产物）

- 到 `github.com` 的 HTTPS：`TLS connect error: unexpected eof`（curl 同样失败，无系统代理）；
- `ssh.github.com:443`：`Connection closed by 198.18.0.21 port 443`；
- `gh` 的 keyring token 已失效（`gh auth refresh -h github.com` 可修）。
→ **推送需先恢复网络与凭据**；代码与产物已就绪，命令：`git push origin feature/v3-hifi-prototypes`。
