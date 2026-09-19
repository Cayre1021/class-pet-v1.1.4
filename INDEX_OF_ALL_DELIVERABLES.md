# Class Pet V1-Lite: 全部成果总索引与统一导航门户 (Master Index)

本文档是当前工作区内所有高保真原型、一体机交互方案、视觉规范以及历史对话归档的**唯一总索引路径**。

---

## 💻 Windows 11 现代 Electron 桌面可执行程序 (.exe) 交付专区

已使用现代 64 位 Electron 33.2.0 将 **1 的版本 B（学生大屏触控大靶区强化版）**、**2 的版本 B（教师快速赋分控制台触控强化版）**、认证门户、状态规范库及本地核心引擎完整封装为独立桌面应用，完全单机离线可用：

* 🚀 **[免安装绿色便携版 (ClassPet-Portable-1.0.0.exe)](file:///d:/Desk/ALL%20Vibe/new-class-pet/electron-app/release/ClassPet-Portable-1.0.0.exe)**：单文件纯绿色版 (81.7 MB)，直接双击秒开，无需安装权限，含最新学生大屏卡片比例缩放调节与记忆。
* 📦 **[标准安装程序 (ClassPet Setup 1.0.0.exe)](file:///d:/Desk/ALL%20Vibe/new-class-pet/electron-app/release/ClassPet%20Setup%201.0.0.exe)**：向导式安装包 (81.9 MB)，支持自定义路径与桌面快捷方式。
* 📂 **[免打包直接运行目录 (win-unpacked/ClassPet.exe)](file:///d:/Desk/ALL%20Vibe/new-class-pet/electron-app/release/win-unpacked/ClassPet.exe)**：解包后的可执行程序目录。
* 🛠️ **[Electron 客户端源码工程目录](file:///d:/Desk/ALL%20Vibe/new-class-pet/electron-app/)**：包含主进程 `main.js`、预加载 `preload.js`、双窗口管理与离线资源。
* 🔍 **[新增] 学生大屏卡片比例缩放控制器**：在顶部横条与底部操作坞均提供 `[ ➖ 缩小 / 预设档位 / ➕ 放大 ]` 大靶区触控按键，支持 80%~175% 比例调节，解决卡片密集度与远视距清晰度，并自动记忆在本地。

---

## 🌐 浏览器可视化总控制台 (One-Click Master Hub)

你可以直接在浏览器中打开这个总控页面，一站式点击体验所有原型、切换 5 套主题并查阅规范：
👉 **[点击在浏览器打开总导航控制台 (index.html)](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/index.html)**

---

## 📁 核心产出物分类直达清单

### 1. 🚀 5 大高保真交互原型库 (位于 `analysis_and_requirements/ui_exploration/`)

| 原型名称 | 核心交互与特点 | 直接打开链接 |
| :--- | :--- | :--- |
| **🏫 75"/86" 教室一体机 5 大方案实验室** | **针对教师够不着屏幕顶部痛点**：实装【底部操作坞】、【双侧折叠栏】、【就地环形轮盘】、【一键屏幕下沉】与【手机遥控联动】5 种可切换体验方案。 | [打开实验室原型](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/prototype_interactive_whiteboard_solutions.html) |
| **🖥️ 学生大屏展示 (42人满屏全景)** | 7×6 精密满屏黄金比例卡片，C 位聚光升级动效、终极满级烟花暗化特效、学科宠物切换与 6 项互动冷却。 | [打开大屏原型](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/prototype_neo_brutalism_display.html) |
| **⚡ 教师赋分工作台 (42人标准版)** | 42 人列表搜索与多选、正负向快捷批量赋分、3 分钟浮动倒计时撤销、操作审计日志抽屉、花名册导入与备份弹窗。 | [打开教师台原型](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/prototype_neo_brutalism_teacher.html) |
| **🌐 登录认证与主控制台 (Portal)** | 本地教师多账号管理、创建新班级账号、密码重置（应急码 123456）与进入主页双核心导航。 | [打开登录与主页原型](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/prototype_portal_and_auth.html) |
| **📭 系统状态与异常规范库 (States)** | 无学生/无宠物空状态 (Empty)、条纹骨架屏加载 (Loading)、学号冲突与数据库锁定等异常拦截 (Error)。 | [打开状态库原型](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/prototype_states_gallery.html) |

---

### 2. 📚 架构设计与生产规范文档库 (位于 `analysis_and_requirements/ui_exploration/`)

| 文档名称 | 主要用途 | 链接 |
| :--- | :--- | :--- |
| **🐾 宠物 GIF 动态素材规范与生产指引** | 256x256 / 512x512 透明通道 GIF 规格、6 阶段演化 (Lv0-Lv20)、学科属性底板、命名规则与 AI 生产模版。 | [08_pet_gif_assets_specification.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/08_pet_gif_assets_specification.md) |
| **🎨 5 套 Neo-Brutalism 主题配色规范** | 经典档案、暗夜实验室、活力橙红、森林绿野、海洋蓝调及 CSS 变量映射。 | [07_color_themes.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/07_color_themes.md) |
| **📐 新粗野主义设计系统核心规范** | 4px 黑边框、实心硬投影、破格排版与物理按压反馈标准。 | [06_neo_brutalism_design_system.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/06_neo_brutalism_design_system.md) |
| **🔄 教师核心流程与撤销机制设计** | 批量赋分、3分钟 Undo、Excel/文本名单导入逻辑。 | [02_teacher_core_flows.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/02_teacher_core_flows.md) |
| **🎆 大屏展示与 C 位庆祝动效规范** | 普通升级飞升聚光、满级全屏暗化烟花分镜与音频规范。 | [03_display_and_celebration.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/03_display_and_celebration.md) |
| **🏗️ 信息架构与导航层级结构** | 页面层级、学生/宠物/操作状态机与数据传递流。 | [01_information_architecture.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/01_information_architecture.md) |
| **🏷️ 设计令牌 (Design Tokens) 规范** | 色彩、字体栈、字阶、间距、圆角与动效贝塞尔曲线。 | [04_design_tokens.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/04_design_tokens.md) |
| **📋 UI 探索全量交付报告 (Final)** | 交付总结与验收指引。 | [REVIEW_SUMMARY.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/REVIEW_SUMMARY.md) |

---

### 3. 🗄️ Codex 8 大历史会话完整归档总库 (位于 `codex_dialogue_archive/`)

* 📑 **[历史会话总索引 README_MASTER_ARCHIVE_INDEX.md](file:///d:/Desk/ALL%20Vibe/new-class-pet/codex_dialogue_archive/README_MASTER_ARCHIVE_INDEX.md)**
  * 涵盖 PRD 分析、主调度对话、UI 探索、本地数据架构、素材审计、Electron 22 打包评估等所有 8 个会话的完整转录。

---

### 4. 📸 真实 1080P 渲染截图核验库 (位于 `analysis_and_requirements/ui_exploration/screenshots_verified/`)

* 📸 [01_whiteboard_lab_dock.png (一体机5方案实验室截图)](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/screenshots_verified/01_whiteboard_lab_dock.png)
* 📸 [02_student_bigscreen_42cards.png (42人满屏大屏截图)](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/screenshots_verified/02_student_bigscreen_42cards.png)
* 📸 [03_teacher_panel.png (42人教师操作台截图)](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/screenshots_verified/03_teacher_panel.png)
* 📸 [04_portal_and_auth.png (登录主页控制台截图)](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/screenshots_verified/04_portal_and_auth.png)
* 📸 [05_states_gallery.png (系统状态库截图)](file:///d:/Desk/ALL%20Vibe/new-class-pet/analysis_and_requirements/ui_exploration/screenshots_verified/05_states_gallery.png)
