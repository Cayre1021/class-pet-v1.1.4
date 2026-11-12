# 宠物大屏规划交付

## V2 当前交付

见 [V2 方案说明](V2-方案说明.md)，图片在 `plans-v2/`。该版本为三张结构规划图，不是可点击页面；下方旧 HTML 与 `plans/` 图片均为已否决的 V1。

> 状态：第一轮 A/B/C 已被用户否决，仅作为历史记录保留。原因是三案沿用同一信息架构，主要差异集中在配色、列数和分页/滚动，不足以支持选型。V2 将采用统一配色，并改为比较三种不同的信息架构；在用户确认范围前不改动下列预览实现。

## 查看
- `pet-layout-preview.html`：独立可点击预览，可切换 A/B/C、点击卡片查看左侧信息、翻页、排序、切换学科。纯 HTML/CSS/JS，无需服务。
- `plans/scheme-a.png`：四列、两行、分页；每页 8 人，88 人共 11 页。建议优先选此方案。
- `plans/scheme-b.png`：四列连续滚动；左侧档案固定，右侧列表单独滚动。少翻页，但投屏时要滚动寻找后排学生。
- `plans/scheme-c.png`：三列、两行、分页；每页 6 人，88 人共 15 页。卡片更宽，班级浏览需要更多翻页。

三套均预留左侧档案：宠物大图、姓名、等级、经验、升级差额、小组、出勤、学科成长。实际字段及是否加入赋分操作，选型后再确认；不新增或改变成长规则。

PNG 为用现有宠物素材绘制的**静态规划图**，不是运行程序截图。它们用于比较布局，不承诺与 HTML 像素完全相同。图中上下深浅色说明带是方案标注，不是拟加入正式大屏的功能说明。

## 已修改与未修改
- 已在 `electron-app/src/portal_auth.html` 删除英文品牌、两个入口的说明/小字、底部状态条，并删除相应失效 DOM 更新。
- 正式 `display_bigscreen_touch_pro.html` 未改，等待用户选定布局。
- 正在运行的 `release/ClassPet-Portable-1.1.4.exe` 是仓库旧构建，不会自动加载源码修改；本轮未重新打包或替换它，未关闭用户窗口。
- 预览使用 88 位模拟学生，仅演示布局，不读取、写入或连接班级数据库。预览切换学科不代表真实解锁、孵化或赋分能力。
- 已复制 `.agents/skills/planning-and-task-breakdown/SKILL.md`，SHA256 与指定会话给出的全局 skill 一致。无额外依赖目录。

## 验证结果
- `node --check design/pet-layout-preview.js`：通过。
- `tests/test_portal_and_preview.cjs`：33 项离线 DOM 检查通过。覆盖登录/退出、浏览器导航路径和 Electron 桥调用、主题、三套卡片数量、选中详情、翻页边界、排序及所测图片存在性。
- 已逐张查看三幅静态 PNG，图像和中文正常显示。
- 浏览器安全策略阻止本地文件访问，未绕过。**浏览器实际渲染、桌面/移动端自适应、全屏及 Electron 原生窗口效果均未验证。** 离线 DOM 检查不包含这些能力，也不验证 SQLite 持久化。
- `git diff --check`：通过；原始数据库和便携程序未改。

## 离线工具复现
工具依赖仅安装在系统临时目录，不修改应用的 package.json/package-lock.json。

```powershell
npm.cmd install --prefix "$env:TEMP\classpet-design-check" --no-audit --no-fund linkedom@0.18.12 sharp@0.34.5
$env:NODE_PATH = "$env:TEMP\classpet-design-check\node_modules"
node tests\test_portal_and_preview.cjs
node design\render-layout-plans.cjs
```

## 下一步
用户选择 A/B/C 或指定组合后，才将选定布局接入正式大屏，复用真实宠物详情逻辑，验证学科守卫、孵化、赋分、排序与翻页/滚动，然后准备新构建用于人工测试。
