## 🎨 班级电子宠物重构全案 · 第三部分：AI素材生图实战手册与提示词库

这是为你整理的重构第三部分：**宠物素材动作一致性生成方案与多学科提示词库**。

---

### 一、 解决画风崩坏的秘密：Sprite Sheet（同图四格动作图）
**千万不要单张单独生成动作！** 单独生成会导致同一只宠物的脸型、身体色彩在不同动作之间严重变形。必须强制 AI 在**单张 16:9 画布上画出该宠物的 4 态精灵合辑**。

---

### 二、 通用生图 Prompt 模板（中英双语）

#### 复制此英文 Prompt 到生图工具（Midjourney / SD / 即梦 / 豆包）：
```text
Game character sprite sheet, cute fantasy mascot [替换主体描述，如：chubby baby dragon with small soft horns], showing 4 different action poses on a pure clean white background:
1. [Idle: front view, floating gently, sweet happy smiling face, closed mouth, peaceful eyes]
2. [Picked-up: lifted by scruff of neck, suspended in mid-air, elongated stretchy body, cute surprised open eyes, tiny dangling feet]
3. [Dragged: tilted back against wind, energetic funny face, dynamic stretch]
4. [Bounce impact: squished flat like soft mochi dumpling on ground, squashed round body, sparkling joyful eyes, blushing cheeks]
Flat cartoon vector art style, thick clean bold outlines, simple soft cel-shading, vibrant cheerful colors, 2D mobile game asset sheet, pure white background, no shadow, ultra high resolution --ar 16:9 --v 6.0
```

---

### 三、 六大学科专属宠物生图词（直接替换主体描述）：

| 学科 | 推荐宠物形象 | 核心特征关键词 | 替换提示词中的主体描述 |
| :--- | :--- | :--- | :--- |
| **语文** | **墨水灵** (Ink Droplet) | 中国风水滴、学士帽、卷轴 | `a magical Chinese ink droplet creature wearing a tiny ancient scholar cap` |
| **数学** | **几何小怪** (Geometry Slime) | 晶体方块、三角尺发卡、科技符文 | `a cute geometric crystal slime creature with glowing mathematical symbols` |
| **英语** | **字母鹦鹉** (Letter Parrot) | 胖乎乎羽毛、英伦领结、叼着字母A | `a chubby colorful baby parrot wearing a tiny bowtie and holding an alphabet letter` |
| **科学** | **齿轮发条兽** (Gear Bot) | 蒸汽发条机器人、灯泡触角、呆萌齿轮 | `a friendly tiny steam-powered robot creature with a glowing lightbulb antenna` |
| **美术** | **调色盘猫咪** (Palette Kitty) | 彩墨肉垫、画笔尾巴、斑斓色块 | `a fluffy white kitten with a paint-brush tail and colorful paint splatter spots` |
| **体育** | **闪电飞鼠** (Thunder Squirrel)| 红色运动头带、金牌、蓬松大尾巴 | `an energetic flying squirrel wearing a tiny red sports headband` |

---

### 四、 素材落地极速四步法：
1. **生成**：在 AI 绘画工具中输入上述提示词生成 16:9 大图；
2. **一键抠图**：利用免费工具（remove.bg 或即时设计抠图插件）一秒移除纯白背景；
3. **切图存储**：将 4 个状态裁切为 4 张独立透明 PNG 存入新工程：
   - `assets/pets/[学科]/idle.png`
   - `assets/pets/[学科]/grabbed.png`
   - `assets/pets/[学科]/dragging.png`
   - `assets/pets/[学科]/bounce.png`
4. **绑定**：物理控制器状态回调自动切换图片，无需任何复杂动画配置！
