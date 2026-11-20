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
