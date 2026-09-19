# MindFlow Canvas · Agent Instructions

Read this file before generating or mutating a mindmap. Emit JSON that validates against `docs/canvas_schema.json`, then either:

1. Write a `.json` file into `saves/` and ask the user to import it from the hub, or
2. Instruct the user to paste it via 项目中心 → 导入 JSON.

Do not mention third-party product brands in node titles.

## Storage

- Registry: `localStorage["mindflow_gpt5_registry"]` — array of `{ id, title, description, nodeCount, wireCount, updatedAt }`
- Project payload: `localStorage["mindflow_gpt5_project_" + id]`
- Settings: `localStorage["mindflow_gpt5_settings"]` — `{ canvasPath, savesPath, exportsPath }`

When creating a project programmatically, write both the payload and a registry entry. Hub thumbnails read the payload and draw the real topology.

## Payload skeleton

```json
{
  "id": "proj-unique-id",
  "projectTitle": "图谱标题",
  "description": "一句话脉络",
  "updatedAt": "2026-08-28T10:00:00.000Z",
  "nodes": [],
  "wires": []
}
```

Every node needs `id`, `shape`, `x`, `y`, `width`, `height`, `title`. Set `type` equal to `shape`. Every wire needs `id`, `fromNode`, `fromPort`, `toNode`, `toPort`.

## Shapes

| shape | meaning | default size | color |
| --- | --- | --- | --- |
| circle | root / origin | 220 x 170 | cyan |
| card | argument / module | 260 x 140 | cyan / purple / emerald |
| rect | system unit | 240 x 120 | emerald / slate |
| diamond | decision | 200 x 180 | amber / rose |
| sticky | note | 200 x 160 | amber |
| pill | keyword / KPI | 180 x 50 | rose / slate |
| frame | group boundary | 500 x 360 | slate |
| ai_prompt | prompt / params | 300 x 180 | purple |

Colors: `cyan`, `purple`, `emerald`, `amber`, `rose`, `slate`.

## Wire language

- Tree growing right: `fromPort="right"`, `toPort="left"`, `style="bezier"`
- Decision flow: `fromPort="bottom"` or `"top"`, `toPort="top"` or `"left"`, `style="orthogonal"`
- Direct relation: `style="straight"`
- Labels: 输入 / 派生 / 依赖 / 通过 / 是 / 否
- `animated: true` draws flowing dashes

## Tree layout formula

Use this when an Agent must invent coordinates instead of leaving nodes stacked.

- Horizontal gap between levels: ΔX = 140px (allowed 120–160)
- Vertical gap between siblings: ΔY = 40px (allowed 30–50)
- Parent vertically centered on its children:

```text
Y_parent = (Y_child_first + Y_child_last) / 2
```

Height-aware version used by the canvas Auto Layout button:

```text
parentCenterY = (firstChild.y + firstChild.height/2 + lastChild.y + lastChild.height/2) / 2
parent.y = parentCenterY - parent.height / 2
parent.x = originX + level * (columnWidth + ΔX)
```

JavaScript reference:

```javascript
const DX = 140;      // 120–160
const DY = 40;       // 30–50
const COL = 260;

function layout(node, level, startY, nodes, childrenOf) {
  const kids = childrenOf.get(node.id) || [];
  if (!kids.length) {
    node.x = 100 + level * (COL + DX);
    node.y = startY;
    return { height: node.height + DY, center: node.y + node.height / 2 };
  }
  let y = startY, first = 0, last = 0;
  kids.forEach((child, i) => {
    const r = layout(child, level + 1, y, nodes, childrenOf);
    if (i === 0) first = r.center;
    last = r.center;
    y += r.height;
  });
  node.x = 100 + level * (COL + DX);
  node.y = (first + last) / 2 - node.height / 2;
  return { height: y - startY, center: node.y + node.height / 2 };
}
```

Roots are nodes with no incoming wires. Place multiple roots as stacked trees with 80px extra gap.

## IDs

- Project: `proj-<timestamp>`
- Node: `node-<timestamp>-<n>`
- Wire: `w-<timestamp>-<n>`

Never reuse IDs inside one payload.

## Hub contract

Creating a canvas from the hub always assigns a unique id **before** navigation. Returning via 「项目中心」 flushes a save first. Thumbnails are live SVG of `nodes` + `wires`, not static illustrations. Empty graphs render a dotted empty-canvas hint.

## Official templates

- `saves/template_creative.json`
- `saves/template_mindmap.json`
- `saves/template_decision.json`

Clone them (new `id`) rather than overwriting.