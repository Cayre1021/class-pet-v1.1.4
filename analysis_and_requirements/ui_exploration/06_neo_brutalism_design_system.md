# Neo-Brutalism 设计系统 - V1-Lite 主推方向

> 文档版本：Draft 1.0  
> 创建日期：2026-09-01  
> 定位：班级成长实验室 / 班级档案室  
> **状态：评审探索，等待用户确认后进入正式UI实现**

---

## 一、设计理念

### 核心气质
**班级成长实验室 / 班级档案室**  
硬朗、有秩序、有张力、可信赖、有记忆点

**不是什么**
- ❌ 营销官网或幼儿园卡通页面
- ❌ SaaS 软件的柔和卡片墙
- ❌ 低对比的现代极简主义

### 设计原则
1. **硬朗结构**：粗黑边框、直角、零模糊投影
2. **高对比度**：黑白为主、单一锚色、克制撞色
3. **档案质感**：印章、贴纸、错位、压线
4. **信息密集**：紧凑栅格、快速扫描、批量操作
5. **有限破格**：3处精心设计的破格强调层级和情绪

---

## 二、色彩系统

### 主色板
```css
/* 基础色 */
--color-cream: #FFFEF9;        /* 奶油纸白（背景） */
--color-warm-gray: #F5F3EF;    /* 浅暖灰（次级背景） */
--color-black: #0A0A0A;         /* 纯黑（结构、文字） */

/* 锚色 */
--color-electric-blue: #0066FF; /* 电光教学蓝（主要操作） */

/* 状态撞色（高饱和，克制使用） */
--color-tomato: #FF3B30;        /* 番茄红（警告、负向） */
--color-sunshine: #FFD60A;      /* 明黄（可进化） */
--color-grass: #34C759;         /* 草绿（成功） */
--color-cyan: #00C7BE;          /* 青色（特殊状态） */
```

### 色彩使用规则
- **80%** 黑白灰
- **15%** 电光蓝
- **5%** 状态撞色

**语义映射**
| 语义 | 颜色 | 使用场景 |
|------|------|---------|
| 主要操作 | 电光蓝 | 按钮、选中态、链接 |
| 成功/正向 | 草绿 | 加分、完成 |
| 警告/负向 | 番茄红 | 扣分、错误 |
| 可进化 | 明黄 | 进化提示 |
| 特殊状态 | 青色 | 满级、成就 |

---

## 三、形状与层次

### 边框规范
```css
--border-thick: 4px solid var(--color-black);     /* 主要容器 */
--border-medium: 3px solid var(--color-black);    /* 次级容器 */
--border-thin: 2px solid var(--color-black);      /* 分隔线 */
--border-accent: 3px solid var(--color-electric-blue); /* 高亮 */
```

### 圆角规范
```css
--radius-none: 0px;              /* 默认：直角 */
--radius-subtle: 2px;            /* 轻微切角 */
--radius-small: 4px;             /* 小组件 */
```

### 投影系统（零模糊硬投影）
```css
/* 标准投影 */
--shadow-default: 4px 4px 0 var(--color-black);

/* 强调投影 */
--shadow-strong: 6px 6px 0 var(--color-black);

/* 彩色投影（状态） */
--shadow-blue: 4px 4px 0 var(--color-electric-blue);
--shadow-yellow: 4px 4px 0 var(--color-sunshine);
--shadow-red: 4px 4px 0 var(--color-tomato);

/* 压印效果 */
--shadow-inset: inset 2px 2px 0 rgba(0,0,0,0.2);
```

---

## 四、字体系统

### 字体栈
```css
--font-base: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
--font-mono: 'SF Mono', 'Consolas', 'Courier New', monospace;
```

### 字阶与用途
| 用途 | 字号 | 字重 | 行高 | 场景 |
|------|------|------|------|------|
| Hero | 48px | 900 | 1.1 | 进化结果、班级进度 |
| Display | 36px | 800 | 1.2 | 页面标题 |
| H1 | 28px | 700 | 1.3 | 区块标题 |
| H2 | 20px | 700 | 1.4 | 学生姓名、宠物等级 |
| Body | 15px | 500 | 1.6 | 正文、标签 |
| Small | 13px | 500 | 1.5 | 辅助信息 |
| Mono | 14px | 600 | 1.4 | 编号、数据 |

### 特殊排版
**等宽档案编号**
```
CLASS-01  |  LV.08  |  LOG-024  |  SUBJECT: MATH
```

**描边字（进化标题）**
```css
text-shadow: 
  -2px -2px 0 var(--color-black),
   2px -2px 0 var(--color-black),
  -2px  2px 0 var(--color-black),
   2px  2px 0 var(--color-black);
```

---

## 五、组件规范

### 按钮（三种类型）

**主要按钮（加分）**
```css
padding: 12px 24px;
border: 3px solid var(--color-black);
background: var(--color-electric-blue);
color: white;
font-weight: 700;
box-shadow: 4px 4px 0 var(--color-black);
transform: none;

&:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}
```

**负向按钮（扣分）**
```css
border: 3px solid var(--color-black);
background: white;
color: var(--color-tomato);
box-shadow: 4px 4px 0 var(--color-tomato);
```

**印章按钮（进化）**
```css
border: 3px solid var(--color-black);
background: var(--color-sunshine);
color: var(--color-black);
box-shadow: 4px 4px 0 var(--color-black);
transform: rotate(-3deg);
font-weight: 800;
```

### 学生卡片

**标准卡片**
```css
border: 3px solid var(--color-black);
background: white;
padding: 16px;
box-shadow: 4px 4px 0 var(--color-black);
```

**可进化卡片（破格设计）**
```css
border: 4px solid var(--color-sunshine);
background: white;
box-shadow: 6px 6px 0 var(--color-black);
position: relative;

/* 贴纸印章 */
&::after {
  content: "可进化";
  position: absolute;
  top: -12px;
  right: 16px;
  padding: 6px 12px;
  background: var(--color-sunshine);
  border: 3px solid var(--color-black);
  font-weight: 800;
  font-size: 12px;
  transform: rotate(-8deg);
  box-shadow: 3px 3px 0 var(--color-black);
}
```

### 进度条

**硬边进度条**
```css
height: 12px;
border: 2px solid var(--color-black);
background: var(--color-warm-gray);

.fill {
  height: 100%;
  background: var(--color-electric-blue);
  border-right: 2px solid var(--color-black);
  transition: width 0.3s cubic-bezier(0.4, 0, 1, 1);
}
```

---

## 六、破格设计（3处精心设计）

### 破格1：斜贴等级印章
学生卡片右上角等级标签倾斜-5°到-8°，像贴纸压在卡片上。

### 破格2：宠物头像越线
宠物形象顶部超出卡片边框8-12px，打破容器限制。

### 破格3：竖排班级编号
页面左侧边缘竖排显示"CLASS-01"，档案室标签感。

**破格约束**
- 不可遮挡操作按钮
- 不可降低文字可读性
- 只用于强调层级和情绪

---

## 七、克制层 vs 表达层

### 克制层（80%界面）
**教师主控台、学生列表、设置、日志**
- 严格栅格对齐
- 最小装饰
- 最大可读性
- 快速扫描优先

### 表达层（20%界面）
**大屏展示、进化时刻、互动面板**
- 允许破格
- 档案贴纸
- 情绪化排版
- 记忆点设计

---

## 八、关键页面规范

### 教师主控台
- 左侧：320px宽学生列表，3px黑边框分隔
- 右侧：操作面板紧凑栅格，按钮矩阵排列
- 顶部：黑底白字工具栏，档案编号等宽显示

### 学生大屏
- 6-8列网格（1920px宽度）
- 每卡片200px宽，黑边框，硬投影
- 可进化卡片：黄边框+斜贴印章

### 进化时刻
- 全屏暗化80%
- 中心卡片放大2倍，6px黑边框
- 明黄或青色背景色块错位
- 烟花用黑色描边图形，不用柔和粒子

---

**下一步：创建完整高保真HTML原型**
