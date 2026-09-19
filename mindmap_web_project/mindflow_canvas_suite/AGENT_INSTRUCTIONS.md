# 🤖 MindFlow Canvas Suite · AI 智能体 (Agent) 自动化生成与操作规范指南

> **适用对象**：所有接入本工作区的 AI Agent、大模型 Coding Assistant、自动化任务脚本。  
> **核心使命**：当用户要求设计、重组、扩展或生成思维导图/业务架构图时，请严格遵守本规范，通过读写标准化 JSON 数据或直接生成节点图谱。

---

## 📌 1. 项目与目录定位

- **主页门户 (Hub)**：[`mindflow_canvas_suite/index.html`](file:///d:/Desk/ALL%20Vibe/new-class-pet/mindmap_web_project/mindflow_canvas_suite/index.html)
- **画布编辑器 (Editor)**：[`mindflow_canvas_suite/canvas.html`](file:///d:/Desk/ALL%20Vibe/new-class-pet/mindmap_web_project/mindflow_canvas_suite/canvas.html)
- **工程存档库 (Saves)**：[`mindflow_canvas_suite/saves/`](file:///d:/Desk/ALL%20Vibe/new-class-pet/mindmap_web_project/mindflow_canvas_suite/saves/)
- **导出归档库 (Exports)**：[`mindflow_canvas_suite/exports/`](file:///d:/Desk/ALL%20Vibe/new-class-pet/mindmap_web_project/mindflow_canvas_suite/exports/)

---

## 📐 2. 标准工程 JSON 数据模型 (Schema)

AI Agent 生成的工程 JSON 文件必须包含以下核心结构：

```json
{
  "id": "proj-unique-timestamp",
  "projectTitle": "业务架构与思维导图名称",
  "description": "简要概述本图谱的核心脉络与结构",
  "nodes": [
    {
      "id": "node-1",
      "type": "circle",
      "shape": "circle",
      "x": 100,
      "y": 240,
      "width": 220,
      "height": 160,
      "title": "思维原点 / 核心主题",
      "content": "主题的核心说明或描述",
      "color": "cyan",
      "tag": "Root",
      "zIndex": 10
    },
    {
      "id": "node-2",
      "type": "card",
      "shape": "card",
      "x": 420,
      "y": 140,
      "width": 260,
      "height": 130,
      "title": "子分支 01",
      "content": "• 要点一\n• 要点二",
      "color": "purple",
      "tag": "Module",
      "zIndex": 10
    }
  ],
  "wires": [
    {
      "id": "w-1",
      "fromNode": "node-1",
      "fromPort": "right",
      "toNode": "node-2",
      "toPort": "left",
      "label": "派生",
      "style": "bezier",
      "color": "cyan",
      "animated": true
    }
  ]
}
```

---

## 🎨 3. 图形形态 (Shapes) 与色彩语义

| 形状标识 `shape` | 典型语义 | 默认推荐尺寸 (W x H) | 推荐颜色 `color` |
| :--- | :--- | :--- | :--- |
| `circle` | 根主题、核心发起点、思维圆心 | `220 x 170` | `cyan` / `purple` |
| `card` | 标准业务卡片、核心模块、二级论点 | `260 x 140` | `cyan` / `purple` / `emerald` |
| `rect` | 矩形方格、系统组件、执行环节 | `240 x 120` | `emerald` / `slate` |
| `diamond` | 条件判断、决策逻辑分支、质检网关 | `200 x 180` | `amber` / `rose` |
| `sticky` | 随笔便签、备忘提示、灵感要点 | `200 x 160` | `amber` (暖黄) |
| `pill` | 状态标签、关键词、属性胶囊 | `180 x 50` | `rose` / `slate` |
| `frame` | 分组容器、业务边界、系统子域框 | `500 x 360` | `slate` (半透明边框) |
| `ai_prompt` | 创作块、多模态任务单元 | `300 x 180` | `purple` |

---

## 🧮 4. 树状思维导图坐标自动排版算法建议

当 Agent 需要程序化输出一棵思维导图时，推荐遵循以下坐标排列规则：

1. **层级水平间距**：`Delta X = 120px ~ 160px`；
2. **同级垂直间距**：`Delta Y = 30px ~ 50px`；
3. **父节点垂直居中**：父节点的 `Y` 应为其所有直接子节点 `Y` 跨度的中心：
   $$Y_{\text{parent}} = \frac{Y_{\text{child\_first}} + Y_{\text{child\_last}}}{2}$$
4. **连线端口绑定**：
   - 树状右向延伸：`fromPort = "right"`, `toPort = "left"`；
   - 纵向决策流：`fromPort = "bottom"`, `toPort = "top"`。
