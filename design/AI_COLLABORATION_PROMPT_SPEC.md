# 智慧教室班级宠物大屏 · 纯前端高保真重构设计与提示词总纲
> 专为 ChatGPT、Gemini、Google AI Studio 等外部网页版 AI 模型定制的高保真演示页面生成指令

---

## 一、 任务核心与交付目标

### 1. 任务性质
- **纯前端演示原型（无需任何后端，无需重新打包 Electron）**。
- 单文件交付（所有 HTML5 + CSS3 + 原生 JavaScript 均内联在单个 `.html` 文件中，或同级目录引入），在任何现代浏览器中双击即可全屏流畅运行（按 `F11` 沉浸式体验）。

### 2. 核心痛点与本次重构目标
- **上级与甲方核心反馈**：旧版页面信息严重过载，学生卡片上堆满了学号（#01）、学科微标（[文][数][英]）、等级（LV.8）、经验数值（280/315）、学习状态标签等，导致卡片像密密麻麻的教务后台表格，**极其拥挤、缺乏呼吸感与空间感**；同时顶部大组横栏厚重压抑，卡片浮动时易出现边框被截断的生硬视觉。
- **重构终极标准**：
  1. **极度纯净的卡片**：卡片表面**彻底消除多余文字**，仅保留萌宠大图（占比 60% 以上）和底部大号学生姓名（20~22px 加粗居中）；
  2. **呼吸感与空间感（Spacious & Tactile）**：加大网格间距（Gap 20~24px），留白充裕，顶部横栏改为轻量悬浮胶囊；
  3. **高频授课的顺手交互**：默认全屏收纳展示“班级宠物森林”；点击卡片时，平滑展开侧拉抽屉（Sheet/Drawer）展示详细三科学阶与一键赋分操作；按 `Esc` 键或点击【✕ 收起】秒关，绝不打断老师授课节奏。

---

## 二、 业态场景与设计心理学（必须告知外部 AI 的背景）

### 1. “3米至10米视距原则”（学生端心理）
- **使用硬件**：教室前方 65~86 寸交互式触控一体机大屏（希沃、鸿合等）。台下学生距离屏幕 3~10 米。
- **视觉逻辑**：大屏的第一要义不是密集读数，而是**远距离的一目了然、认同感与游戏化激励**。学生看大屏时，只关心“我的宠物长成什么样了、有没有在升级、我的名字在哪里”。卡片表面的一切细小标签在远距离下全都是视觉垃圾。

### 2. “3秒授课动线与大靶区原则”（教师端心理）
- **使用场景**：老师站在讲台上高频提问、课堂巡视，手持触控笔或直接用手指点按屏幕。
- **操作动线**：提问 -> 学生回答 -> 老师手指在大屏轻轻一点 -> 展开面板 -> 点击“+10 积极发言” -> 关闭收纳 -> 继续讲课。整个交互必须在 3 秒内完成！
- **触控指标**：所有操作按钮靶区必须在 **50px~64px** 以上，杜绝让老师在大屏前“精密微操”。

---

## 三、 组件库精髓融合（参考 Looseleaf 与 BoardUI）

外部 AI 生成的页面需深度汲取以下两套优秀开源组件库的设计精髓：

1. **汲取自 `Looseleaf`（纸质轻触感、趣味教育温度）**：
   - **微质感卡片（Paper/Card）**：卡片底衬不使用死板的刺眼纯白，采用微温润纸质底色或柔和微渐变，超大倒角（18px~24px）；
   - **印章式点赞动效（Stamp Button）**：教师给学生加分时，带有轻快的印章盖下动效（如 `👍 积极思考`、`🌟 团队协作`），伴随粒子飞升与数字浮动（+10 飘字）；
   - **边缘抽屉（Sheet/Drawer）**：点击卡片后，从左侧平滑滑出，带弹性缓动（Spring timing），遮罩层柔和聚焦，主次分明。
2. **汲取自 `BoardUI`（现代化触屏选框与大屏自适应）**：
   - **全触控选框（Checkbox-Card）**：卡片本身就是大面积触控区域，选中时呈现 4px 贴合圆角的外发光描边（`box-shadow: 0 0 0 2px var(--accent)`），左上角带清晰打勾标识；
   - **大屏 App-Shell**：顶部导航自适应居中，外围预留呼吸内边距，滚动容器顶部留有 12px 缓冲，**卡片向上漂浮（translateY(-4px)）时顶边框永不截断**。

---

## 四、 推荐给外部 AI 的三大探索风格方向

在与 ChatGPT、Gemini、AI Studio 对话时，可分别指定以下不同的风格命题：

### 方向 A：【现代插画新粗野主义 2.0（Neo-Brutalism Light）】
- **定位**：现有风格的去油腻进化版。
- **特征**：保留黑线轮廓与活泼纯色块的趣味感，但边框细化至 1.5px~2px；硬阴影增加 15% 柔化扩散；卡片倒角增大至 18px，像精致圆润的实体收藏闪卡；顶部为悬浮马卡龙色胶囊。

### 方向 B：【现代温润 Bento 苹果教育风（Modern Bento Glass）】
- **定位**：极简、通透、高空间感，对标 iPadOS / Apple Classroom。
- **特征**：彻底取消黑粗框，采用半透明微磨砂毛玻璃底衬（Glassmorphism + 0.5px 高光内描边）；超大圆角（22px~26px）；萌宠立于立体柔和微光地台上；浅奶油米白/淡青护眼背景；选中时呈现柔光霓虹微光。

### 方向 C：【大屏触控黄金岛流（Touch Dynamic Island）】
- **定位**：专为大屏触控操作优化的极简交互流。
- **特征**：所有老师常用的操作与详情沉淀到底部居中的“悬浮操作岛”（类似 iPhone Dynamic Island / Mac Dock 栏），老师站在屏幕前伸手即可触及，免去左右来回大范围走动。

---

## 五、 标准 Mock 数据集与素材相对路径映射

请让外部 AI 直接内置以下标准数据结构与图片路径，确保原型能够正确载入真实素材：

### 1. 真实素材相对路径映射
```javascript
// 宠物图片根据等级阶段自动映射
function getPetImagePath(kind, level) {
    const stage = level >= 20 ? 5 : level >= 13 ? 3 : level >= 8 ? 2 : 1;
    // 本地工程的相对路径
    return `../electron-app/src/assets/pets/${kind}/${kind}-stage${stage}.png`;
}
```
*注：外部网页独立运行时，若无本地图片，代码应自动回退到内置的 SVG 或 Emoji 占位（如 🐱 🐶 🦊 🐰），避免破图。*

### 2. 标准 32 位学生 Mock 数据结构
```javascript
const MOCK_STUDENTS = [
  { id: 1, name: "张三", group: 1, species: "cat", kindName: "狸花猫", level: 8, exp: 280, maxExp: 315, attendance: "present" },
  { id: 2, name: "李四", group: 1, species: "dog", kindName: "金毛犬", level: 13, exp: 620, maxExp: 665, attendance: "present" },
  { id: 3, name: "王五", group: 2, species: "fox", kindName: "小狐狸", level: 2, exp: 50, maxExp: 60, attendance: "present" },
  { id: 4, name: "赵六", group: 2, species: "bunny", kindName: "白兔", level: 20, exp: 1200, maxExp: 1200, attendance: "present" },
  { id: 5, name: "孙七", group: 3, species: "hamster", kindName: "仓鼠", level: 8, exp: 290, maxExp: 315, attendance: "present" },
  { id: 6, name: "周八", group: 3, species: "deer", kindName: "小鹿", level: 13, exp: 610, maxExp: 665, attendance: "present" },
  { id: 7, name: "吴九", group: 4, species: "bird", kindName: "青鸟", level: 8, exp: 275, maxExp: 315, attendance: "present" },
  { id: 8, name: "郑十", group: 4, species: "fish", kindName: "金鱼", level: 2, exp: 40, maxExp: 60, attendance: "present" },
  // ... 扩展至 32 位同学
];
```

---

## 六、 三大模型开箱即用 Prompt 模板（直接复制粘贴）

---

### 📋 复制模板 1：投喂给 ChatGPT（侧重：Looseleaf 纸质轻触感 + 新粗野主义 2.0）

```text
你是一名专精于教育大屏与微交互的前端设计专家。请为一款中小学【智慧教室·班级电子宠物大屏系统】编写一个单文件纯前端高保真演示页面（HTML5 + CSS3 + 原生 JavaScript）。

【业务场景与核心痛点】
1. 硬件环境：教室前方 65~86 寸触控一体机大屏，学生在 3~10 米外观看，教师在台前触屏互动。
2. 核心痛点：旧版页面信息严重过载，学生卡片堆满了小字（学号、三科学阶微标、等级、经验、状态标签等），导致整个网格密密麻麻像教务数据库表格，缺乏空间感与呼吸感；教师操作不够顺手。
3. 参考设计资产：参考 Looseleaf 组件库的“纸质微质感（Paper）、圆润实体卡牌、印章式点赞动效（Stamp Button）与边缘平滑抽屉（Sheet）”。

【排版、布局与空间感指标】
1. 极简卡片：卡片正面严格去除所有细小指标与标签，只保留：
   - 居中的萌宠主图（占比 60% 以上）；
   - 底部加粗放大的学生姓名（20~22px，居中加粗，远距高清晰度）。
2. 空间节奏：4 列自适应网格，卡片间距（Gap）放大至 20px~24px，外边距留白充裕。顶部大组横栏从厚重的大条块改为轻盈悬浮胶囊标签（Pill Chips）。
3. 容器呼吸缓冲：网格滚动容器顶部必须预留至少 12px 的 padding-top，确保第一排卡片在鼠标悬停向上浮动（translateY(-4px)）时，顶边框与外发光 100% 完整可见，永不被容器截断！

【交互要求】
1. 默认状态：左侧档案收纳，全屏开阔展示“班级宠物森林”；
2. 点击卡片：被选卡片呈现清晰高亮描边与勾选；左侧平滑滑出 Looseleaf 风格的【档案抽屉 Sheet】，展示三科学阶进度、等级、升级差额及赋分操作按钮；
3. 一键赋分动效：点击抽屉内的“👍 认真倾听 (+10)”或“🌟 团队协作 (+20)”时，触发印章盖下动效与卡片上的“+10 🌟”微光飘字反馈；
4. 快速收起：抽屉顶部提供【✕ 收起】按钮，同时支持按键盘 Esc 键或点击外部遮罩秒关。

【交付要求】
请输出一个完整的单文件 index.html，内联所有样式与 JS 脚本，无需任何构建依赖，双击即可在浏览器全屏交互（F11）。包含 32 位学生的 Mock 数据，宠物图片具备 SVG/Emoji 占位防破图机制。
```

---

### 📋 复制模板 2：投喂给 Gemini（侧重：现代温润 Bento 苹果教育风）

```text
请充当 Google 教育生态的资深 UI/UX 架构师。请为【智慧教室大屏宠物成长系统】构建一个达到 Apple Classroom 水平的纯前端高保真演示页面（单文件 HTML5 + CSS3 + 原生 JavaScript）。

【设计哲学与风格】
- 风格基调：现代温润 Bento 毛玻璃风格（Modern Bento Glassmorphism）。
- 告别笨重粗黑边框，采用超大圆角（20px~24px）、浅奶油米白/淡青护眼背景、微渐变半透明玻璃态底衬和柔和环境光。
- 参考设计规范：BoardUI 触控选框（Checkbox-Card），大面积触控，交互反馈极佳。

【关键功能与交互实现】
1. 极致纯净卡片：每张卡片只允许出现萌宠大图与大字号学生姓名，消除一切细碎文字。
2. 触控大靶区：卡片悬浮 hover 向上微浮 3px，触控 active 缩放到 0.98，外发光柔和，完全避免边框遮挡或切断。
3. 智能侧边抽屉：
   - 点击学生卡片时，平滑展开 iPadOS 风格的毛玻璃详情抽屉；
   - 抽屉内包含：宠物近景大图、三科学阶、以及大靶区（高度 52px）的一键奖励按钮；
   - 支持按 Esc 键或点击收起按钮平滑收纳。
4. 顶部动态小组切换：支持一键切换“全班 / 1组 / 2组 / 3组 / 4组”，切换时卡片具备平滑的 CSS 重排渐变。

【交付要求】
单个完整 HTML 文件，内联全部 CSS 与 JS，自带 32 人逼真 Mock 数据，无外部 npm 依赖，开箱即用。
```

---

### 📋 复制模板 3：投喂给 Google AI Studio（aistudio.google.com/apps）（侧重：全屏触屏白板动态交互）

```text
You are designing a standalone interactive smart whiteboard web application for K-12 classrooms: "Class Pet Big Screen".
The application will be evaluated on high-resolution interactive displays (65-86 inches).

Core UX Objective:
Fix the severe information-overload in previous iterations. Transform the crowded "database table cards" into a spacious, delightful, tactile pet world with high spatial breathing room.

Key Components to incorporate (inspired by Looseleaf and BoardUI design systems):
1. Card Component:
   - Ultra-minimalist: Only the high-res pet character (60% height) + Student Name (22px bold). Absolutely no small progress bars, badges, or tiny texts on the card face.
   - Spatial rhythm: 4-column layout, 22px gap, 28px outer margins. Rounded corners (18px) with subtle tactile border.
   - Hover & Touch: Smooth translateY(-4px) with custom floating shadow. Top border must never clip against container boundaries (ensure sufficient padding-top).
2. Sliding Detail Drawer (Sheet Component):
   - Off-canvas drawer sliding in smoothly from the left when any pet card is clicked.
   - Displays student academic mastery, pet evolution stage, and large touch-friendly reward buttons (+10 / +20) with instant visual feedback.
   - Dismissible via close button, outside click, or Escape key.
3. Top Navigation & Group Filters:
   - Floating pill chips for Groups 1 to 4 with clean count badges, replacing heavy banners.

Deliverable:
A single, production-ready, beautiful HTML file (HTML5 + CSS3 + Vanilla JavaScript) that runs natively in any modern browser without build steps. Include realistic mock data for 32 students and integrate smooth micro-interactions.
```
