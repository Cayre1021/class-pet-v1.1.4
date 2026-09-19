# Neo-Brutalism 多配色主题系统

> 文档版本：Draft 1.0  
> 创建日期：2026-09-01  
> 用途：为V1-Lite提供5套可切换的配色方案

---

## 配色方案总览

所有方案保持Neo-Brutalism核心特征：
- 粗黑边框（3-4px）
- 零模糊硬投影
- 高对比度
- 80%基础色 + 15%锚色 + 5%状态色

---

## 方案1：经典档案（默认）

### 基础色
```css
--bg-primary: #FFFEF9;      /* 奶油纸白 */
--bg-secondary: #F5F3EF;    /* 浅暖灰 */
--text-primary: #0A0A0A;    /* 纯黑 */
--border: #0A0A0A;          /* 黑色边框 */
```

### 锚色与状态色
```css
--accent: #0066FF;          /* 电光蓝 */
--success: #34C759;         /* 草绿 */
--warning: #FFD60A;         /* 明黄 */
--error: #FF3B30;           /* 番茄红 */
--special: #00C7BE;         /* 青色 */
```

### 适用场景
全年龄、标准教学、档案室质感

---

## 方案2：暗夜实验室

### 基础色
```css
--bg-primary: #1A1A1A;      /* 深灰背景 */
--bg-secondary: #2A2A2A;    /* 次级深灰 */
--text-primary: #FFFFFF;    /* 纯白文字 */
--border: #FFFFFF;          /* 白色边框 */
```

### 锚色与状态色
```css
--accent: #00D9FF;          /* 荧光青 */
--success: #00FF88;         /* 荧光绿 */
--warning: #FFE500;         /* 荧光黄 */
--error: #FF0055;           /* 荧光粉红 */
--special: #B800FF;         /* 荧光紫 */
```

### 适用场景
科技课堂、编程教学、减少眩光、护眼模式

---

## 方案3：活力橙红

### 基础色
```css
--bg-primary: #FFF9F5;      /* 暖白 */
--bg-secondary: #FFE8DC;    /* 浅橙 */
--text-primary: #1A0A00;    /* 深棕 */
--border: #1A0A00;          /* 深棕边框 */
```

### 锚色与状态色
```css
--accent: #FF5722;          /* 活力橙 */
--success: #4CAF50;         /* 绿色 */
--warning: #FFC107;         /* 琥珀 */
--error: #D32F2F;           /* 深红 */
--special: #9C27B0;         /* 紫色 */
```

### 适用场景
体育班级、活力课堂、低年级

---

## 方案4：森林绿野

### 基础色
```css
--bg-primary: #F5F9F5;      /* 浅绿白 */
--bg-secondary: #E8F5E9;    /* 淡绿 */
--text-primary: #0D3B0D;    /* 深绿 */
--border: #0D3B0D;          /* 深绿边框 */
```

### 锚色与状态色
```css
--accent: #2E7D32;          /* 森林绿 */
--success: #66BB6A;         /* 明绿 */
--warning: #FFA726;         /* 橙色 */
--error: #E53935;           /* 红色 */
--special: #26A69A;         /* 青绿 */
```

### 适用场景
自然教育、生态课堂、护眼长时观看

---

## 方案5：海洋蓝调

### 基础色
```css
--bg-primary: #F5F9FF;      /* 浅蓝白 */
--bg-secondary: #E3F2FD;    /* 淡蓝 */
--text-primary: #0A1A3B;    /* 深蓝 */
--border: #0A1A3B;          /* 深蓝边框 */
```

### 锚色与状态色
```css
--accent: #1976D2;          /* 海洋蓝 */
--success: #43A047;         /* 绿色 */
--warning: #FFB300;         /* 金黄 */
--error: #E53935;           /* 红色 */
--special: #00ACC1;         /* 天青 */
```

### 适用场景
理科班级、冷静思考、专注学习

---

## 配色使用规则

### 比例分配
- **基础色（80%）**：背景、容器、大面积
- **锚色（15%）**：主要操作、选中态、重点强调
- **状态色（5%）**：成功/警告/错误/特殊状态

### 边框规则
所有方案的边框粗细保持一致：
- 主容器：4px solid
- 次容器：3px solid
- 分隔线：2px solid

### 投影规则
所有方案使用相同投影：
- 标准：4px 4px 0 var(--border)
- 强调：6px 6px 0 var(--border)
- 彩色：4px 4px 0 var(--accent/warning/error)

---

## 切换实现建议

### CSS变量方式
```css
/* 定义主题 */
[data-theme="classic"] {
  --bg-primary: #FFFEF9;
  --accent: #0066FF;
  /* ... */
}

[data-theme="dark"] {
  --bg-primary: #1A1A1A;
  --accent: #00D9FF;
  /* ... */
}

/* 应用 */
body {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

### 用户切换入口
- 主页右上角账号菜单中增加"主题切换"
- 提供5个主题预览缩略图
- 点击立即切换并保存偏好到本地存储

---

**下一步：创建配色切换演示原型**
