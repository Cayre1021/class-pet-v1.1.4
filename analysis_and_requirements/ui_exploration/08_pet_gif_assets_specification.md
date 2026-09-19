# Class Pet V1-Lite: 宠物 GIF 动态素材规范与生产指引

> 文档版本：V1.0 (Ready for AI / Artist Production)  
> 创建日期：2026-09-01  
> 目标读者：素材设计 AI、插画师、前端开发工程师  
> 适用阶段：V1-Lite 动态资产替换与 V2 长期养成  

---

## 一、 核心设计定位与视觉风格

班级电子宠物的动态资产需要契合 **Neo-Brutalism（新粗野主义）/ 班级档案室** 的整体气质：
1. **趣味与生命力**：宠物具有生动的呼吸、眨眼、晃动、进食、开心反馈等短周期微动效。
2. **清晰辨识度**：轮廓分明，线条干净，色彩饱满，在高密度网格（如 40+ 学生大屏）下依然具有强辨识度。
3. **学科归属性**：根据不同学科（语文、数学、英语等）提供鲜明的特征配色底板或配饰。

---

## 二、 基础技术参数规范

| 参数项 | 规范标准 | 说明 |
| :--- | :--- | :--- |
| **文件格式** | `.gif`（主选） / `.png` 序列帧（备选） | 必须保留透明通道（Alpha / Transparent Background） |
| **画布基准尺寸** | `256 x 256 px` (标准卡片使用) <br> `512 x 512 px` (详情大图/C位进化使用) | 正方形比例 1:1，中心对齐 |
| **有效像素安全区** | 留白约 8%~12% | 宠物本体边缘离画布四周保留 16~24px 呼吸缓冲，防止投影或溢出破格裁切异常 |
| **帧率 (FPS)** | `12 ~ 16 FPS` | 保持短促轻快的定格动画/像素复古风，兼顾体积与流畅度 |
| **总帧数 / 时长** | 常态待机：`16 ~ 24 帧 (1.2s ~ 1.8s)` <br> 动作反馈：`12 ~ 20 帧 (0.8s ~ 1.2s)` | 必须首尾无缝循环（Seamless Loop） |
| **体积限制** | 单张 GIF `< 500 KB` (最佳 `< 250 KB`) | 40 人大屏同时渲染时保障低内存占用与流畅度 |
| **色彩模式** | 256 色调色板优化，无色边噪点（Matte: None） | 避免黑色/白色锯齿边框 |

---

## 三、 成长演化阶段（6 大节点）映射表

系统设定 20 级成长体系，对应 6 个视觉形态节点：

```
[Lv.0 蛋形态] 
   └──> [Lv.1 幼年破壳] 
          └──> [Lv.4 初级萌宠] 
                 └──> [Lv.8 中级成长期] 
                        └──> [Lv.13 高级进阶期] 
                               └──> [Lv.20 终极满级大师]
```

### 1. 阶段形态定义

| 阶段代码 | 对应等级 | 形态名称 | 视觉特征描述 | 动画表现要点 |
| :--- | :--- | :--- | :--- | :--- |
| `stage_0` | **Lv.0** | 宠物蛋 (Egg) | 带有学科花纹的神秘蛋，轻微光斑 | 左右微晃、偶尔弹跳、顶部裂缝微光 |
| `stage_1` | **Lv.1** | 幼年体 (Baby) | 刚破壳的小巧形态，头大身小，好奇眼神 | 轻轻呼吸、频繁眨眼、头顶问号/呆毛晃动 |
| `stage_2` | **Lv.4** | 初级体 (Child) | 长出清晰手脚/翅膀，活泼好动 | 蹦跳、摇尾巴、伸懒腰 |
| `stage_3` | **Lv.8** | 中级体 (Teen) | 体型增大，特征鲜明（如小角、小披风） | 自信站立、环顾四周、小幅度招手 |
| `stage_4` | **Lv.13** | 高级体 (Adult) | 威风凛凛或华丽形态，伴随专属微光/道具 | 悬浮、施展微小光效、帅气蓄力 |
| `stage_5` | **Lv.20** | 终极体 (Master) | 满级终极形态，带有光环、皇冠或专属神兽气场 | 金色流光环绕、威严或霸气特写、持续发光 |

---

## 四、 宠物物种与学科分支规划

V1-Lite 默认预置 3 大基础学科物种：

| 学科 (Subject) | 推荐物种代码 | 象征物种 | 主题色底板 | 专属特征元素 |
| :--- | :--- | :--- | :--- | :--- |
| **语文 (Chinese)** | `cat_scholar` | 灵巧猫咪 / 墨韵灵猫 | 典雅朱红 / 暖橙 | 卷轴、书卷领结、毛笔尾巴 |
| **数学 (Math)** | `dog_explorer` | 机械柴犬 / 算力侦探 | 电光深蓝 / 智慧青 | 几何眼镜、尺规徽章、齿轮背包 |
| **英语 (English)** | `fox_voyager` | 逐光灵狐 / 环球飞狐 | 活力草绿 / 亮黄 | 飞行员风镜、风向羽毛、世界地图斗篷 |

---

## 五、 互动与状态动画库（每只宠物 4 类动效）

为满足学生端 6 大互动（打招呼、抚摸、喂水、喂食、玩耍、安抚）与进化需求，每只宠物设计 4 个动效状态：

1. **`idle`（常态待机，必选）**：全天在大屏及卡片上播放的呼吸循环动画。
2. **`interact_happy`（互动愉悦，必选）**：触发打招呼/抚摸/玩耍时播放，双眼变成笑眼弯弯、周围冒出小心心或音符。
3. **`interact_feed`（进食饱腹，必选）**：触发喂食/喂水时播放，大快朵颐、嚼嚼嚼、满足地摸摸肚子。
4. **`evolve_burst`（进化蜕变，终极节点专用）**：点击进化确认或升到满级时播放的闪光爆发特写。

---

## 六、 资源文件命名与目录结构规范

### 1. 目录层级标准
```
public/assets/pets/
├── [subject_code]/
│   ├── stage_0_egg/
│   │   └── idle.gif
│   ├── stage_1_baby/
│   │   ├── idle.gif
│   │   ├── interact_happy.gif
│   │   └── interact_feed.gif
│   ├── stage_2_child/
│   │   ├── idle.gif
│   │   ├── interact_happy.gif
│   │   └── interact_feed.gif
│   ├── stage_3_teen/
│   │   ├── idle.gif
│   │   └── ...
│   ├── stage_4_adult/
│   │   └── ...
│   └── stage_5_master/
│       ├── idle.gif
│       └── evolve_burst.gif
```

### 2. 标准命名公式
`pet_[物种]_[学科]_[阶段编号]_[动效状态].gif`

**示例清单**：
* `pet_cat_chinese_stage0_idle.gif`（语文猫 - Lv0 蛋待机）
* `pet_cat_chinese_stage1_idle.gif`（语文猫 - Lv1 幼年待机）
* `pet_cat_chinese_stage1_happy.gif`（语文猫 - Lv1 幼年开心）
* `pet_cat_chinese_stage5_master.gif`（语文猫 - Lv20 满级终极形态）
* `pet_dog_math_stage3_idle.gif`（数学犬 - Lv8 中级待机）

---

## 七、 提示词模版（Prompt Template for Image/Video Generation AI）

若使用 AI（如 Midjourney、SDXL、Luma、Runway、Pika 等）批量生成素材，可直接使用以下模版：

```text
[Prompt Template]
2D game pet sprite animation, [SPECIES_NAME], [STAGE_DESCRIPTION], [THEME_ACCESSORIES],
Neo-brutalism clean outlines, retro pop game art style, bold smooth lines, vibrant solid colors, 
isolated on transparent background, 256x256 pixel scale, cute pixel-perfect character design, 
[ACTION_TYPE: e.g. cute idle breathing animation loop, bouncing gently], 
no shadow, no background artifacts, game ready asset --v 6.0
```
