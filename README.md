# 🐾 班级电子宠物 (ClassPet) v1.1.4

> 专为中小学智慧课堂量身打造的交互式激励成长与电子宠物养成桌面软件。
> 本仓库为 **v1.1.4 正式交接纯净仓库**，包含全套核心源码、生产发布安装包以及完整的驱动系列文档。

---

> [!IMPORTANT]
> ### ⚠️ 研发交接特别声明（接手人员必读）：文档不代表代码实际效果
> 本项目在实战研发与实际课堂交付过程中，历经数轮高频功能迭代、多轮用户体验重构与甲方现场需求变更。因此交接成员请务必牢记：
> 1. **代码与自动化测试是系统的唯一最终真理（Source of Truth）**：`docs/` 目录中的系列文档主要用于帮助您理解项目的业务背景、产品演进脉络与技术避坑思路。**文档中记载的早期设计与部分描述绝不代表当前代码的实际运行效果**。
> 2. **一切功能逻辑与业务规则以最新 v1.1.4 源码为准**：当前生产代码（特别是核心状态调度引擎 `classpet_core.js`、教师端 `teacher_panel_touch_pro.html`、大屏端 `display_bigscreen_touch_pro.html` 以及 `tests/` 中的全套自动化测试套件）已全部通过 181 项真机断言与全量机制校对。
> 3. **若文档叙述与代码实现存在任何出入，必须严格以最新代码逻辑及测试用例为最终准绳！**

---

## 🚀 项目概览 (Project Overview)

《班级电子宠物》深度融合教学激励与宠物养成理念，构建双端一体化的智慧课堂：
- 🖥️ **讲台学生大屏端 (`display_bigscreen_touch_pro.html`)**：支持【全班平铺】、【按组排布】、【小组PK榜】三大排布视图；支持屏幕一键下沉 260px 便于低位触控；提供大屏随机点名弹窗与满级全屏多彩粒子烟花盛典。
- 📱 **教师触控控制台 (`teacher_panel_touch_pro.html`)**：极简扁平化排版，常驻醒目加分科目与【🔄 换科】极速入口；悬浮圆盘集成 6 大核心模块；支持 Windows Excel/CSV GBK 编码智能识别与容错补齐导入。
- ⚙️ **核心状态调度引擎 (`classpet_core.js`)**：严密的多学科解锁链（语文主修 ➔ 满级后数学/英语二选一解锁）；严格的未解锁与未破壳加分门禁；成长单调性不变量保护（负分绝不降级/形态不倒退）。
- 💾 **本地离线数据库 (`sqlite_service.js` & `classpet.sqlite`)**：纯本地单机 SQLite 存储，具备重启后的单调递增经验合并逻辑，彻底根治重启后加分假死或回滚问题。

---

## 📂 仓库目录结构 (Directory Structure)

```text
class-pet-v1.1.4-handover/
├── docs/                        # 📚 核心驱动系列文档 (接手必读)
│   ├── 00_交接总览与文档阅读指南.md # 🌟 交接总索引与推荐阅读顺序
│   ├── 01_PRD_全功能模块需求与产品逻辑提炼文档(交接基线).md
│   ├── 02_BUG红线_历史踩坑与必须严格规避的Bug清单.md
│   ├── 03_技术架构_执行路线图与核心代码动效逻辑指南.md
│   ├── 04_设计规范_儿童绘本风格UI重构全景设计指南.md
│   ├── 05_决策全景_系统全会话记录与决策全过程整理文档.md
│   ├── 06_AI协作_重构任务交付提示词(Codex与AI专用).md
│   ├── 07_历史审查_代码与资产全文件夹审查报告.md
│   ├── 08_原始需求_甲方意见/     # 甲方客户最初的需求与会议录音
│   └── 09_全局测试与机制校对报告_v1.1.4.md
├── electron-app/                # 💻 桌面主工程源代码
│   ├── main.js                  # Electron 主进程入口与跨窗口调度
│   ├── preload.js               # 上下文隔离与安全 IPC 桥接
│   ├── sqlite_service.js        # 本地 SQLite 数据服务
│   ├── package.json             # 依赖与打包配置 (v1.1.4)
│   ├── package-lock.json
│   ├── scripts/                 # 辅助脚本
│   └── src/                     # 前端多端渲染源码与静态资源
│       ├── classpet_core.js     # 核心业务逻辑与状态机 Store
│       ├── fireworks_engine.js  # 讲台全屏多彩烟花粒子引擎
│       ├── portal_auth.html     # 教师登录与学科门户
│       ├── teacher_panel_touch_pro.html # 教师触控端主面板
│       ├── display_bigscreen_touch_pro.html # 学生展示大屏
│       ├── index.html           # 启动分流中转页
│       ├── js/                  # 浏览器环境同步模块
│       └── assets/              # 图标、绘本插画与第三方依赖库
│           ├── icons/           # 软件 Logo 与多尺寸图标
│           ├── pets/            # 8 大治愈系神兽 Stage 1~5 完整资源
│           └── vendor/          # xlsx 等第三方本地依赖
├── database/                    # 🗄️ 数据库文件
│   └── classpet.sqlite          # SQLite 本地全量表结构与初始种子数据
├── tests/                       # 🧪 自动化测试套件
│   ├── test_global_master_verification.js # 10 维度全局机制校对大师测试
│   ├── test_v114_verification.js          # 88 项全场景 E2E 回归测试
│   ├── test_subject_switch_locked_hatch.js # 多学科门禁与解锁专项测试
│   ├── test_restart_scoring_freeze.js     # 重启与动态阈值防假死测试
│   └── test_csv_template_import.js        # GBK 花名册容错导入测试
├── release/                     # 📦 v1.1.4 生产发布安装文件
│   ├── ClassPet Setup 1.1.4.exe           # Windows 标准安装向导包 (103.6 MB)
│   ├── ClassPet-Portable-1.1.4.exe        # Windows 免安装便携版 (103.4 MB)
│   └── ClassPet Setup 1.1.4.exe.blockmap
├── .gitignore                   # Git 忽略配置
├── .gitattributes              # Git LFS 大文件追踪配置
└── README.md                    # 本交接总览文件
```

---

## 📦 发布版本 (Release)

最新 **v1.1.4** 生产包位于 `release/` 目录：
1. **安装版**：`release/ClassPet Setup 1.1.4.exe`（支持安装到指定目录，自动创建桌面快捷方式与卸载项）
2. **便携版**：`release/ClassPet-Portable-1.1.4.exe`（双击直接启动，无需安装，随 U 盘即插即用）

---

## 🛠️ 本地开发与环境搭建 (Quick Start)

### 1. 前置环境要求
- **Node.js**：v18.0.0+ (建议 v20+)
- **npm**：v9.0.0+
- **操作系统**：Windows 10 / 11 64位

### 2. 安装与运行
```bash
# 1. 进入主工程目录
cd electron-app

# 2. 安装工程依赖
npm install

# 3. 启动开发调试窗口 (自动拉起教师端与学生大屏)
npm start
```

### 3. 构建 Windows 生产安装包
```bash
cd electron-app
npm run dist:win
```
构建生成的文件会自动存放在 `release/` 目录。

---

## 🧪 自动化测试验证 (Verification)

本仓库附带了经过严格验证的全量自动化测试套件（总计 181 项断言 100% 通过）：

```bash
# 运行 10 大维度全局机制校对终极测试：
cd electron-app
npx electron ../tests/test_global_master_verification.js

# 运行 88 项 UI 视图与核心交互测试：
npx electron ../tests/test_v114_verification.js

# 运行学科解锁与破壳拦截门禁测试：
node ../tests/test_subject_switch_locked_hatch.js

# 运行防加分假死与动态阈值测试：
node ../tests/test_restart_scoring_freeze.js
```

---

## 📌 接手人员快速须知

1. **核心逻辑千万不要双头改**：`electron-app/src/classpet_core.js` 与 `electron-app/src/js/classpet_core.js` 为双端代码，改动核心状态逻辑时必须保持两者 SHA-256 绝对一致。
2. **严防覆盖 SQLite 进度**：更新状态时请遵循 `Math.max(existExp, sqliteExp)` 经验单调递增合并原则，防止异步载入覆盖内存中刚刚加的分。
3. **加分门禁原则**：
   - 语文主修：新学生作为“蛋形态”允许加分，达到 15 分自动破壳；
   - 进阶学科：语文未满 20 级坚决锁死不可加分；即便解锁，若未破壳认领具体萌宠前同样不可加分。
4. **详尽指南请进入 [`docs/00_交接总览与文档阅读指南.md`](docs/00_交接总览与文档阅读指南.md) 查阅。**
