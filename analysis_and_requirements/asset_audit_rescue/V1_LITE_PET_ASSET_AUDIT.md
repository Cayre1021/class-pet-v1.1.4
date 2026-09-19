# 班级电子宠物 V1-Lite · 宠物素材审计与接入计划

> 审计日期：2026-09-01
> 审计对象：旧版 `old-class-pet/class pet` 的宠物 PNG、业务类型、阶段规则，对照 V1-Lite 已冻结目标。
> 交付目的：给后续正式开发和 UI 评审一份可复用事实清单，不是最终 UI。
> 约束：本目录只新增审计文档，不改业务或生产 UI 代码。

---

## 0. 给下一位开发者的结论

可以直接用的事实：

1. **物种数量够 8 种。** 旧版素材目录已经有 8 套 PNG：`bird` `bunny` `cat` `deer` `dog` `fish` `fox` `hamster`。不必再发明新物种来凑数。
2. **阶段数量不够 6。** 每种只有 `stage1`–`stage4` 四张静态图，没有宠物蛋图，没有独立最终形态，也没有任何 GIF / 序列帧 / 视频。
3. **当前检出源码没有真正渲染这些 PNG。** 根目录 `src/lib/pets.ts` / `src/lib/db.ts` 仍是 5 种 emoji 宠物。真正 import PNG 的代码在 worktree `0-2-1-rebuild`。
4. **这些 PNG 可以当 V1-Lite 临时静态形象，但不能当最终生产资产。** 全部是 `2048x2048`、8-bit **RGB（无透明通道）**、浅色底烘进画面，单张 2.3–3.8 MB，32 张合计约 **91 MiB**。教室大屏和 Win7 2 GB 机直接原图解码风险很高。
5. **业务 ID 必须和文件路径解耦。** 换图、补阶段、以后换动态素材，都不能改 `pets.id`、`species_code`、学科或成长数据。

建议立刻冻结：

| 项 | 建议 |
| --- | --- |
| 8 个 `species_code` | 直接用素材目录名 |
| 旧枚举 `puppy` | 映射为 `dog` |
| 旧枚举 `dragon` | **待确认**：worktree 映射到 `cat`，数据架构文档映射到 `fox` |
| V1-Lite 6 阶段 | 阶段 0 = 蛋（新建/占位）；阶段 1-4 = 现有 4 张 PNG；阶段 5 = 先复用 stage4 并打占位标记 |
| 动态素材 | 本窗口不阻塞；静态图禁止伪造跑步/睡觉/进食 |

---

## 1. 审计范围与方法

### 1.1 读过的材料

- `V1_LITE_FINAL_DECISIONS_BASELINE.md`
- `V1_LITE_REQUIREMENTS_CONFLICTS_DECISION_LIST.md`（CONFLICT-04 / 06 / 07）
- `analysis_and_requirements/data_architecture/01_schema.md`
- 旧版 `README.md`、`0.2.0版本的更新日志.md`、`REQUIREMENTS.md`
- 旧版 `src/lib/pets.ts`、`src/lib/db.ts`、`src/components/PetCard.tsx`
- worktree `old-class-pet/class pet/.worktrees/0-2-1-rebuild/src/lib/pets.ts`、`db.ts`
- `src/assets/pets/**` 全部 32 张 PNG 的文件名、体积、PNG 头、四角/中心像素
- 甲方反馈与旧版分析中的形态/素材段落
- 旧版截图目录 `analysis_and_requirements/old_version_analysis/screenshots/`

### 1.2 做过的检查

- 列出 `src/assets/pets` 全部文件，确认没有 stage0 / stage5 / egg / gif。
- 解析每张 PNG 的 IHDR：宽高、色深、色彩类型、是否有 `tRNS`。
- 解压 IDAT 后采样四角和中心像素，判断背景是否烘进画面。
- 在当前检出 `src/**/*.ts*` 中搜索 `assets/pets`、`*-stage*.png`：无引用。
- 对照 worktree 中的真实 import 与阶段函数。

### 1.3 未做 / 不能当成已证实

- 未逐张做人工美术评审（姿势、物种辨识度、风格统一）。像素采样只能证明“浅底 RGB 插画”，不能代替看图。
- 未验证这些 PNG 的版权/生成来源。文件日期为 2026-05-18，来源待确认。
- 未把 PNG 真正跑进 V1-Lite 新工程。
- 未在 Win7 真机测量解码内存。下面的内存风险是按 `2048x2048x4` 估算。

---

## 2. V1-Lite 目标对照

来源：`V1_LITE_FINAL_DECISIONS_BASELINE.md`。已冻结，不是本审计的重新决策。

| 目标 | 冻结值 | 旧版现状 | 缺口 |
| --- | --- | --- | --- |
| 宠物种类 | 8 种 | 素材 8 套；当前检出代码 5 种 emoji | 代码与素材不一致 |
| 视觉阶段 | 至少 6：0-5 | 4 张 hatched 图 + CSS/emoji 蛋 | 缺蛋图、缺独立最终形态 |
| 阶段节点 | 0/1/4/8/13/20 级 | worktree：Lv1/3/6/8 | 阈值不同，不要沿用旧 4 段阈值 |
| 动态 | 产品要求；无素材时静态占位 | 无动态文件 | 不阻塞开发 |
| 资源 ID | 统一 ID；换素材不改业务 ID | 无正式资源目录 | 需要新建 |
| 占位 | 必须标记，统一尺寸/透明底/命名 | 现图无透明、无占位标记 | 接入时要包一层 manifest |

默认视觉阶段（业务层，不是文件名）：

| visual_stage | 默认等级 | 含义 | 旧版 PNG |
| ---: | ---: | --- | --- |
| 0 | Lv0 | 宠物蛋 | 无文件 |
| 1 | Lv1 | 初始形态 | `{pet}-stage1.png` |
| 2 | Lv4 | 第一次明显成长 | `{pet}-stage2.png` |
| 3 | Lv8 | 中期成长 | `{pet}-stage3.png` |
| 4 | Lv13 | 高级形态 | `{pet}-stage4.png` |
| 5 | Lv20 | 最终形态 | 无文件；先复用 stage4 |

旧版 4 阶段阈值是 Lv1 / Lv3 / Lv6 / Lv8，只属于 0.2.0 预览实现，不能当作 V1-Lite 成长曲线。

---

## 3. 现有素材清单

根目录：

`D:\Desk\ALL Vibe\new-class-pet\old-class-pet\class pet\src\assets\pets`

共 **8 个目录 / 32 个 PNG / 0 个 GIF / 0 个蛋图 / 0 个互动道具图**。

全部技术特征相同：

- 尺寸：`2048 x 2048`
- 位深：8
- 色彩类型：**RGB（color type 2）**
- 透明：无 alpha、无 `tRNS`
- 物理分辨率块：无 `pHYs`
- 背景：四角像素均为接近白的浅灰/白（约 `235-255`），中心才是主体色。说明浅色底已经烘进 RGB，不是透明 PNG。
- 时间戳：2026-05-18

### 3.1 完整文件表

| 相对路径 | 字节 | 建议对应 V1-Lite stage |
| --- | ---: | --- |
| `bird/bird-stage1.png` | 2,952,267 | 1 |
| `bird/bird-stage2.png` | 3,171,847 | 2 |
| `bird/bird-stage3.png` | 2,987,880 | 3 |
| `bird/bird-stage4.png` | 3,157,571 | 4（阶段 5 临时复用） |
| `bunny/bunny-stage1.png` | 2,363,784 | 1 |
| `bunny/bunny-stage2.png` | 2,702,864 | 2 |
| `bunny/bunny-stage3.png` | 2,513,185 | 3 |
| `bunny/bunny-stage4.png` | 3,129,017 | 4（阶段 5 临时复用） |
| `cat/cat-stage1.png` | 2,856,467 | 1 |
| `cat/cat-stage2.png` | 3,595,546 | 2 |
| `cat/cat-stage3.png` | 3,272,720 | 3 |
| `cat/cat-stage4.png` | 3,397,601 | 4（阶段 5 临时复用） |
| `deer/deer-stage1.png` | 3,029,274 | 1 |
| `deer/deer-stage2.png` | 2,365,765 | 2 |
| `deer/deer-stage3.png` | 2,406,653 | 3 |
| `deer/deer-stage4.png` | 2,982,525 | 4（阶段 5 临时复用） |
| `dog/dog-stage1.png` | 2,653,531 | 1 |
| `dog/dog-stage2.png` | 2,716,212 | 2 |
| `dog/dog-stage3.png` | 2,994,386 | 3 |
| `dog/dog-stage4.png` | 3,467,085 | 4（阶段 5 临时复用） |
| `fish/fish-stage1.png` | 2,539,856 | 1 |
| `fish/fish-stage2.png` | 3,186,438 | 2 |
| `fish/fish-stage3.png` | 2,917,680 | 3 |
| `fish/fish-stage4.png` | 3,552,373 | 4（阶段 5 临时复用） |
| `fox/fox-stage1.png` | 2,717,300 | 1 |
| `fox/fox-stage2.png` | 3,025,770 | 2 |
| `fox/fox-stage3.png` | 3,818,100 | 3 |
| `fox/fox-stage4.png` | 3,575,422 | 4（阶段 5 临时复用） |
| `hamster/hamster-stage1.png` | 2,696,832 | 1 |
| `hamster/hamster-stage2.png` | 2,862,700 | 2 |
| `hamster/hamster-stage3.png` | 2,924,338 | 3 |
| `hamster/hamster-stage4.png` | 3,114,402 | 4（阶段 5 临时复用） |

合计 **95,647,391 字节（约 91.2 MiB）**。

中心像素抽样（只用于辨色，不是造型描述）：

| 文件 | 中心 RGB | 粗读 |
| --- | --- | --- |
| `bird-stage1` | 253,243,180 | 黄 |
| `bunny-stage1` | 253,251,238 | 浅白粉 |
| `cat-stage1` | 254,252,239 | 浅暖白 |
| `deer-stage1` | 250,185,129 | 橙褐 |
| `dog-stage1` | 254,248,226 | 浅米 |
| `fish-stage1` | 146,246,236 | 青 |
| `fox-stage1` | 253,173,122 | 橙 |
| `hamster-stage1` | 253,247,223 | 浅米 |

### 3.2 明确不存在的东西

在 `src/assets` 下只发现 `pets/` 这一套栅格图。未发现：

- `egg` / `stage0` / `stage5` / `final`
- `.gif` `.webp` `.mp4` `.webm` 宠物动作
- 互动道具（饲料、水、玩具）独立素材
- 烟花 / C 位特效图（旧版用 `canvas-confetti` 和 emoji）
- 按心情/状态区分的变体（生病、睡觉、饥饿）

旧版蛋是 **CSS 色块 + emoji 蛋**，颜色键为 `red|blue|green|purple|yellow`。这套颜色可以继续当蛋占位，不必等蛋 PNG。

---

## 4. 代码与文档的三套现实

这是本审计最容易踩坑的地方。文档、素材、当前检出代码不是同一套系统。

### 4.1 当前检出（`old-class-pet/class pet/src`）

`src/lib/db.ts`：

```ts
export type PetType = 'bird' | 'bunny' | 'puppy' | 'fish' | 'dragon';
```

`src/lib/pets.ts`：emoji 地图，`HATCH_LEVEL = 2`，破壳后只换 emoji 和背景色，**不读 PNG**。

`src/components/PetCard.tsx`：把 `pet.face` 当文本/emoji 渲染。

结论：当前检出是 **5 宠 + 蛋/可孵化/已孵化 + emoji**。PNG 只是躺在仓库里的未接线资源。

### 4.2 worktree `0-2-1-rebuild`（0.2.0 PNG 实现）

`PET_TYPES = ['bird','bunny','dog','fish','cat','hamster','fox','deer']`

遗留映射：

```ts
const LEGACY_PET_TYPE_MAP = {
  puppy: 'dog',
  dragon: 'cat',
} as const;
```

`getPetStage(level)`：

- `< 3` -> 1
- `>= 3` -> 2
- `>= 6` -> 3
- `>= 8` -> 4

这里 **import 了全部 32 张 PNG**。README / `0.2.0版本的更新日志.md` 描述的是这套实现，不是当前检出。

### 4.3 V1-Lite 数据架构文档

`analysis_and_requirements/data_architecture/01_schema.md` 已建议 8 个 code 与素材目录对齐，并写：`dragon` 不入库；可选适配器 `dragon -> fox` + warning。

**冲突：** 0.2.0 worktree 是 `dragon -> cat`，schema 草案是 `dragon -> fox`。V1-Lite 若要读旧 localStorage，必须先冻结这一条。在冻结前，审计建议：**新数据只用 8 个目录名；旧 `dragon` 的迁移目标标为待确认，不要静默选边。**

### 4.4 文档宣称 vs 可运行事实

| 来源 | 宣称 | 实际 |
| --- | --- | --- |
| README / 0.2.0 日志 | 已切 PNG、去 emoji、8 宠 4 阶段 | 仅 worktree 如此；当前检出仍是 emoji 5 宠 |
| 0.2.0 日志 | 透明底 PNG，已优化混色 | 文件是 RGB 浅色实底，没有透明通道 |
| 甲方 / 产品方向 | 形态太少，要动态生命感 | 素材仍是 4 张静图；无动作文件 |
| CONFLICT-06 | 先盘点再冻结映射 | 本文件给出可冻结方案，剩 `dragon` 一条待确认 |

---

## 5. 建议冻结的物种与昵称

### 5.1 物种（建议直接冻结）

与素材目录、0.2.0 更新日志、schema 草案三者对齐。中文名采用 0.2.0 日志用词，仅把“小猫”写成更中性的“猫咪”（schema 已用此名）。若产品要严格沿用日志，把 `猫咪` 改回 `小猫` 即可，**不要改 code**。

| sort | species_code | display_name | asset_key | 旧代码 | 种子 `is_placeholder` |
| ---: | --- | --- | --- | --- | ---: |
| 1 | `bird` | 小鸟 | `bird` | `bird` | 0 |
| 2 | `bunny` | 兔子 | `bunny` | `bunny` | 0 |
| 3 | `dog` | 小狗 | `dog` | `puppy` | 0 |
| 4 | `fish` | 小鱼 | `fish` | `fish` | 0 |
| 5 | `cat` | 猫咪 | `cat` | 无（或待确认的 dragon） | 0 |
| 6 | `hamster` | 仓鼠 | `hamster` | 无 | 0 |
| 7 | `fox` | 狐狸 | `fox` | 无（或待确认的 dragon） | 0 |
| 8 | `deer` | 小鹿 | `deer` | 无 | 0 |

规则：

- `species_code` = 目录名 = `pet_species.code` = `pets.species_code`。
- `asset_key` 当前等于 `species_code`。以后若换皮肤，只改资源清单里的 `asset_key` / 文件，不改 `species_code`。
- 不要引入 `puppy`、`dragon` 作为 V1-Lite 正式 code。
- 教师设置里不需要隐藏物种（已冻结）。

### 5.2 昵称

schema 默认模板已经可用，建议作为系统默认：

```text
{studentName}的{displayName}
```

例：`小明的小鸟`。

下列是**可选展示名/破壳彩蛋名**，不是业务主键，未向甲方确认，可改：

| species_code | 建议默认昵称候选 |
| --- | --- |
| bird | 叽叽、小羽 |
| bunny | 团子、蹦蹦 |
| dog | 豆豆、毛豆 |
| fish | 泡泡、小鳍 |
| cat | 奶糖、团绒 |
| hamster | 谷谷、囊囊 |
| fox | 小橘、赤赤 |
| deer | 小芽、春春 |

V1-Lite 创建宠物时：昵称可先用模板；学生/教师之后可改。不要把昵称写进资源文件名。

---

## 6. 资源 ID 与阶段设计

目标：业务数据稳定，素材可整包替换。

### 6.1 三层 ID

```text
pets.id                宠物实例 UUID     永不因换图而变
species_code           物种业务 ID       bird...deer
asset_ref              视觉资源 ID       见下
```

渲染进程 DTO 已有 `assetKey`。建议再细一级，避免“一个物种一张图”不够用。

### 6.2 `asset_ref` 约定

```text
pet.{species}.stage.{n}.{variant}

n        = 0..5
variant  = idle | placeholder | egg
```

V1-Lite 最小集：

| asset_ref | 含义 | 当前文件 |
| --- | --- | --- |
| `pet.shared.stage.0.egg` | 共用蛋 | 无；用 CSS 五色蛋占位 |
| `pet.{species}.stage.1.idle` | 初始 | `{species}-stage1.png` |
| `pet.{species}.stage.2.idle` | 成长 | `{species}-stage2.png` |
| `pet.{species}.stage.3.idle` | 中期 | `{species}-stage3.png` |
| `pet.{species}.stage.4.idle` | 高级 | `{species}-stage4.png` |
| `pet.{species}.stage.5.idle` | 最终 | 无；回退到 stage4 并 `placeholder=true` |

以后动态素材只加 variant 或 media_type，例如 `pet.bird.stage.1.greet`。互动 CD、经验、气泡文案走 `action_code`（`greet|pat|water|feed|play|comfort`），不要把动作名写进 `species_code`。

### 6.3 查找规则

1. 用 `species_code + visual_stage + variant` 查表。
2. 没有动态 variant -> 回退 `idle`。
3. 没有该 stage 文件 -> 回退指定 fallback，且 UI 必须能读到 `placeholder=true`。
4. 禁止用“找不到就空白/抛错”中断大屏。

接入旧文件时允许暂时保留 `bird-stage1.png` 原名，由 manifest 映射。不要让渲染代码拼接 `stage${level}`。

视觉阶段阈值继续用基线：0 / 1 / 4 / 8 / 13 / 20。不要用旧 `getPetStage` 的 3/6/8。资源层只按**已确认的 `visual_stage`** 选图。`pending_stage` 用徽章/按钮，不提前换最终图。

---

## 7. 能否直接用？

| 用途 | 结论 | 条件 |
| --- | --- | --- |
| V1-Lite 开发期大屏/卡片静图 | **可以** | 必须缩小后再用；不要 2048 原图进渲染 |
| 阶段 0 蛋 | **不能直接用 PNG** | 用 CSS/SVG 占位 |
| 阶段 5 最终形态 / C 位满级 | **没有独立图** | 复用 stage4 + 占位标记 + 文案/烟花区分 |
| 当透明精灵叠在彩色卡片上 | **不适合原样** | RGB 浅底会露出白方块 |
| 6 种互动动作 | **没有** | 界面动效 + 气泡；不要给静图加假跑跳 |
| Win7 兼容包原图打包 | **不建议** | 91 MiB 资源 + 全分辨率解码，2 GB 机器不安全 |
| 作为物种辨识的占位形象 | **可用** | 8 个目录名已够用，等待 UI 评审看图确认风格 |

### 7.1 体积与内存

一张 2048 RGB PNG 解码成位图按 RGBA 计约 **16 MiB**。班级大屏若 40 张卡各解一张原图，仅纹理就可能到 **640 MiB**。V1-Lite 还要跑 Electron 22 ia32。

最低处理：

- 显示用图：最长边 **512**（卡片/列表）和 **768**（详情/C 位）两档足够。
- 格式：压缩 PNG；有真正透明后再用 PNG-24+alpha。
- 打包进应用的应是处理后的图，原 2048 只当源文件归档。

甲方已决定：缺阶段图可以拿别的图代替；缺动态不管；风格不统一不管；后续 AI 图允许改外观。所以先缩小复用，再逐步换图，符合已冻结策略。

---

## 8. 下一步素材计划

### P0 · 本窗口就能开发

1. 冻结 8 个 `species_code`（上表）。只把 `dragon` 迁移目标留待确认。
2. 落地 manifest：32 张旧图 -> stage 1-4；stage 0 / 5 走占位。
3. 蛋占位：复用旧版五色 CSS 蛋（`red/blue/green/purple/yellow`），或一张共享 SVG。
4. 阶段 5 占位：同一物种复用 stage4，`placeholder=true`。C 位满级用文案、居中、烟花区分。
5. 接入时降采样：渲染路径只用 512/768 副本。原 2048 不要直接 `import`。

### P1 · UI 评审前最好有

1. 真正的透明底。现图浅底会在彩色卡片上露白。
2. 独立蛋图（可 1 张共用，5 色染色）。
3. 8 张真正的 stage5。甲方原话是升级后外形变化不显著；若 stage4 与 stage5 相同，满级高光会偏弱。
4. 统一构图：主体居中、脚下留白一致、不要烘焙背景、不要水印/文字。

### P2 · 不阻塞 V1-Lite

1. 6 个互动的匹配动作（GIF/序列帧/视频）。
2. 闲置生命感。无素材时只允许卡片级轻微位移，禁止伪装成宠物骨骼动作。
3. 互动道具图标（非 emoji）。
4. C 位烟花/光效独立素材。

### 不建议做

- 不要为了凑 6 阶段把同一张图改 6 个文件名冒充 6 个形态（占位最多两处：蛋、满级）。
- 不要把 `puppy`/`dragon` 继续写进新库。
- 不要让视觉阶段跟 20 级一一对应。
- 不要等 8x6 张最终动态图才开始写宠物组件。

---

## 9. 视觉规范（给评审和后续出图）

面向教室大屏 30-50 人网格，不是独立立绘海报。

| 项 | 规范 |
| --- | --- |
| 画幅 | 正方形 |
| 安全区 | 主体放在中心 70% 内，四边不要贴边 |
| 背景 | 透明；禁止浅灰实底、禁止场景透视背景 |
| 风格 | 课堂友好、可读、Q 版或清晰卡通 |
| 进化可读性 | 相邻阶段必须能在 96-128 px 卡片上看出差异 |
| 文字 | 图内不要写等级、名字、物种名 |
| 色彩 | 8 个物种主色要可区分 |
| 动态 | 有真实素材才播；静图只做界面层反馈 |

| 场景 | 显示 | 资源 |
| --- | --- | --- |
| 教师名单缩略图 | 48-64 | 512 图缩小 |
| 大屏卡片 | 96-160 | 512 |
| 详情/互动窗 | 240-320 | 768 |
| C 位 | 320-480 | 768 |

---

## 10. 生成素材提示词（未出图，仅备用）

后续 AI 出图允许改变外观（已冻结）。下面是可复用模板，不是已经生成的资产。

通用前缀：

```text
Classroom virtual pet mascot, one character only, square 1:1, centered,
full body, cute readable cartoon, friendly for ages 8-14,
plain transparent background, no text, no watermark, no photo background,
consistent character design across growth stages, soft studio lighting.
```

按阶段追加：

| stage | 追加 |
| --- | --- |
| 0 | 一枚完整宠物蛋，闭合，微光，物种色点缀，未见肢体 |
| 1 | 刚破壳幼体，头身比大，简单特征，能立刻认出物种 |
| 2 | 明显长大，物种特征清晰，仍幼态 |
| 3 | 青少年体态，花纹/饰物增加，姿态更稳 |
| 4 | 接近成体，细节丰富，但仍是班级吉祥物而非写实动物 |
| 5 | 最终形态，典礼感（小冠、光纹、翅膀等选一），不要变成完全另一个物种 |

按物种追加（与目录一致）：bird 黄色小鸟；bunny 浅色兔子；dog 圆脸小狗；fish 青色小鱼；cat 三角耳猫咪；hamster 圆身仓鼠；fox 橙色大尾狐狸；deer 小鹿短角，不要写实攻击姿态。

动作素材以后再补时：每个动作单独一张序列/GIF，透明底，循环 1-2 秒，不要场景摄像机运动。

---

## 11. 验收建议

### 11.1 开发接入验收（有占位也算过）

1. 8 个 `species_code` 能创建、保存、再打开仍在。
2. 每只宠物 `visual_stage` 只在 0-5。
3. 换 PNG / 改 manifest 不改 `pets.id`、经验、学科。
4. 缺 stage5 文件时显示 fallback，且能识别占位。
5. 大屏 40 张卡使用缩小图，不加载 2048 原图。
6. 静图宠物没有跑/吃/睡的假动画。
7. 旧 `puppy` 读入变为 `dog`。`dragon` 在未确认前要么拒绝并记日志，要么走明确的适配开关，不要两个文档各映射一次。

### 11.2 UI 评审验收（看图，不是看代码）

1. 8 个物种在 128 px 下能互相区分。
2. 同一物种 stage1 与 stage4 有明显成长。
3. 若卡片是彩色，白底方块视为不通过生产标准（开发期可过）。
4. 蛋与破壳后第一形态有明确前后关系。
5. 满级 C 位即使复用 stage4，也要有与普通升级不同的界面待遇。

### 11.3 素材补齐验收（P1）

每种宠物 6 个视觉文件（蛋可共用）+ 透明底 + 512/768 两档 + manifest 无物种级 `placeholder`（蛋若共用可不算物种缺口）。

---

## 12. 待确认

写进开发前只需确认这些。其余本文件可当默认。

1. 旧 `dragon` 映射到 `cat` 还是 `fox`？两份现存文档不一致。
2. 中文名用“小猫”还是“猫咪”？不影响 code。
3. 蛋是 8 个物种各一枚，还是 1 枚造型 + 5 色染色？旧版是后者。
4. stage5 在正式课上是否允许与 stage4 同图？开发期可以；给甲方演示满级时建议至少有 8 张独立终态。
5. 2048 原图版权/生成来源是否允许继续商用和 AI 替换。
6. 是否把 2048 原图继续放进 git。91 MiB 对仓库和安装包都重；更适合归档，安装包只带缩小图。

---

## 13. 推荐给实现的最小映射

仅作说明，不是要提交的业务代码。

```ts
const SPECIES = ['bird','bunny','dog','fish','cat','hamster','fox','deer'] as const;
const LEGACY = { puppy: 'dog' } as const; // dragon: 待确认

function assetRef(species: string, stage: 0|1|2|3|4|5) {
  if (stage === 0) return 'pet.shared.stage.0.egg';
  if (stage === 5) return `pet.${species}.stage.5.idle`; // manifest 可指向 stage4 文件
  return `pet.${species}.stage.${stage}.idle`;
}
```

---

## 14. 一页差距账

目标：8 物种 x 6 阶段 = 48 个视觉槽（蛋若共用则为 1 + 8x5 = 41）。

| 槽位 | 已有独立文件 | 占位策略 |
| --- | ---: | --- |
| 物种 | 8 / 8 | 直接用目录 |
| stage0 蛋 | 0 | CSS/SVG 共用蛋 |
| stage1 | 8 / 8 | 旧 stage1 |
| stage2 | 8 / 8 | 旧 stage2 |
| stage3 | 8 / 8 | 旧 stage3 |
| stage4 | 8 / 8 | 旧 stage4 |
| stage5 终态 | 0 / 8 | 复用 stage4 + placeholder |
| 动态动作 8x6 | 0 | 不做假动作 |
| 透明精灵版 | 0 / 32 | P1 重出或抠图 |

**静态闭环已经能做。** 真正缺的是：接线、缩小、蛋、满级差异、透明底，以及一份不随换图而改的资源 ID 表。

---

## 15. 本目录文件

| 文件 | 用途 |
| --- | --- |
| `V1_LITE_PET_ASSET_AUDIT.md` | 本报告，主交付 |
| `ASSET_MANIFEST_DRAFT.json` | 可被实现直接抄的资源表草稿 |
