# MindFlow Canvas · 智绘导图

纯前端、零构建、可双击运行的无限节点思维导图与工作流画布。适合人类创作者手绘脉络，也适合 AI Agent 按 JSON Schema 程序化生成。

## 打开方式

- 项目中心：双击 `index.html`
- 画布编辑器：双击 `canvas.html`，或从项目中心进入
- 无需安装 Node / 打包器。首次打开需能访问 CDN（Tailwind、Lucide、html2canvas、Google Fonts）

## 目录

```text
mindflow_canvas_suite_gpt5/
├── index.html              # 工作区主页与项目管理中心
├── canvas.html             # 无限节点画布编辑器
├── AGENT_INSTRUCTIONS.md   # Agent 自动化规范
├── README.md               # 本说明
├── saves/                  # 官方模板 JSON
├── exports/                # 导出归档建议目录
└── docs/canvas_schema.json # 工程 JSON Schema
```

## 跨目录移动

同目录下打开时，系统用当前地址把 `index.html` 替换为 `canvas.html`，不会写死相对层级。

若只把 `index.html` 拷到桌面：打开右上角「偏好设置」，填入 `canvas.html` 的绝对路径（例如 `file:///D:/Desk/ALL Vibe/new-class-pet/mindmap_web_project/mindflow_canvas_suite_gpt5/canvas.html`）。

## 画布操作

| 动作 | 效果 |
| --- | --- |
| 滚轮 | 以鼠标位置为中心缩放 15%–300% |
| 空格 + 左键拖拽 / 抓手工具 | 平移视野 |
| 空白处按住左键拖出选框 | 框选多个节点 |
| 空白处右键 | 新建 8 种节点 |
| 节点右键 | 变换形状、换色、置顶、复制、删除 |
| 连线右键 / 双击文字胶囊 | 改关系文字、线型、流光、删除 |
| 从端口拖出连线，松手到另一端口 | 完成连接 |
| 单击已有子分支的交汇点 | 收起 / 展开该侧全部子层级 |
| 从端口拖到空白 | 自动生成子节点并连接 |
| 右下角小地图 | 节点总数 + 当前视口，可点击跳转 |

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| Tab | 向右新建子分支并连线 |
| Enter | 向下新建同级节点 |
| Ctrl+S | 立即保存 |
| Ctrl+Z / Ctrl+Y | 撤销 / 重做 |
| Ctrl+D | 克隆选中节点 |
| Delete / Backspace | 删除选中节点或连线 |
| V / H | 选择工具 / 抓手工具 |

顶部「一键整理」会按树状层次自动排版。

## 自动保存

任何移动、编辑、连线都会防抖写入 `localStorage`，并同步项目中心注册表。状态栏显示 `已自动保存 14:20:35`。点「保存」或「项目中心」会立即落盘，返回主页即可看到最新工程。

## 节点与颜色

八种图形：主题卡片、椭圆泡泡、矩形模块、菱形决策、便签、胶囊、分组框架、创作节点。

六种主题色：青蓝 / 电光紫 / 翡翠绿 / 琥珀金 / 赤霞红 / 深空灰。

## 导出

画布右上角「导出图片 / 存档」：

- PNG：1x / 2x / 3x，暗色、纯白、透明背景
- SVG：纯矢量，可进 Figma / Illustrator
- JSON：完整拓扑，可在项目中心导入恢复

## 存储键

本套件使用独立命名空间，不会覆盖其他模型子文件夹的工程：

- `mindflow_gpt5_registry`
- `mindflow_gpt5_settings`
- `mindflow_gpt5_project_<id>`
