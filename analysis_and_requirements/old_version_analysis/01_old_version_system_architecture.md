# 班级电子宠物平台 (老版本 v0.2.0) · 系统架构与技术实现分析报告

## 一、 系统基本信息
- **系统名称**：班级电子宠物平台 (Classroom Virtual Pets)
- **最新版本**：`0.2.0` (构建于 2026年5月)
- **交付形态**：
  - Web 网页端 (`React 18` + `Vite` + `Tailwind CSS`)
  - Windows 64位桌面端 (`Electron` 打包，支持离线运行)
  - Android 调试端 (`Capacitor` 壳封装)

---

## 二、 核心技术栈与底层架构

### 1. 前端技术栈
- **核心框架**：React 18 + TypeScript + Vite
- **路由方案**：`react-router-dom` (使用 `HashRouter` 保证在 Electron 本地文件协议和静态部署下的稳定性)
- **样式与设计系统**：Tailwind CSS (定制多邻国 Duolingo 糖果色调板与立体的 `box-shadow` 实用类)
- **动画与交互**：`framer-motion` (弹簧物理力学 Spring Physics) + `canvas-confetti` (粒子爆炸特效)
- **图标体系**：`lucide-react`
- **AI 对话集成**：直接在前端调用兼容 OpenAI 规范、DeepSeek 或 Google Gemini 的端点

### 2. 数据持久化与状态管理架构
- **存储方案**：**纯客户端本地存储 (LocalStorage)**，未连接任何远程后端数据库。
- **存储键划分 (LocalStorage Namespacing)**：
  - `class_pet_teachers`：已注册的教师账户信息字典。
  - `class_pet_last_teacher`：最后一次登录的教师标识。
  - `class_pet_students:${accountKey}`：每个教师（班级）独立的学籍宠物列表。
  - `class_pet_settings:${accountKey}`：每个教师（班级）独立的积分行为规则与加分项。
  - `class_pet_logs:${accountKey}`：每个教师（班级）独立的行为奖惩操作流水日志。
- **多端与跨标签页同步机制**：
  - 依赖浏览器原生的 `window.addEventListener('storage', ...)` 事件。
  - 辅以应用内部触发的自定义事件 `local-storage-update`，实现同设备下打开多个窗口（如一边开教师工作台，一边开大屏展示）时的准实时响应。

---

## 三、 核心数据模型 (Data Entities)

### 1. 学生与宠物实体 (`Student`)
```typescript
export interface Student {
  id: string;                  // 唯一标识 (UUID / 时间戳生成)
  name: string;                // 学生真实姓名 (如 "张三")
  nickname: string;            // 宠物自定义昵称 (如 "皮卡丘")
  eggColor: string;            // 初始蛋颜色 ('red' | 'blue' | 'green' | 'purple' | 'yellow')
  exp: number;                 // 累计积分 / 经验值
  level: number;               // 当前等级 (初始为 1)
  effects: string[];           // 获得的盲盒外观特效 (如 'Crown', 'Wings', 'Star', 'Aura', 'Glasses')
  petType: PetType;            // 随机抽取的宠物种类 ('bird' | 'bunny' | 'puppy' | 'fish' | 'dragon' / 0.2.0扩展)
  hatchState: HatchState;      // 孵化状态: 'egg'(蛋) | 'ready'(可孵化) | 'hatched'(已破壳)
  mood: number;                // 心情值 (0~100)
  lastInteractionTime: number; // 最后一次抚摸/喂食/对话的时间戳 (用于惰性推算心情衰减)
  createdAt: number;           // 创建时间戳
}
```

### 2. 行为规则实体 (`BehaviorRule`)
```typescript
export interface BehaviorRule {
  id: string;
  name: string;                // 行为名称 (如 "回答问题积极", "未带作业")
  points: number;              // 分值 (如 +3, -5)
  type: 'positive' | 'negative';
}
```

### 3. 操作流水日志实体 (`BehaviorLog`)
```typescript
export interface BehaviorLog {
  id: string;
  studentId: string;           // 对应学生 ID
  actionName: string;          // 触发的行为名
  points: number;              // 变动的分值
  timestamp: number;           // 操作时间
  teacherId: string;           // 绑定的教师账号 Key
}
```

---

## 四、 核心业务逻辑与机制评估

| 机制模块 | 实现方式 | 优势 | 现存技术与架构瓶颈 |
| :--- | :--- | :--- | :--- |
| **孵化机制** | 达到 Level 2 且 `hatchState === 'ready'` 时允许点击孵化 | 门槛明确，有破壳成就感 | 破壳后的后续阶段仅有等级数字变化，缺乏视觉冲击力的连贯成长反馈 |
| **降级保护** | 扣分扣除当前经验值，但等级 `level` 绝不下降 | 保护学生自尊心，符合教育心理学 | 当经验值扣到 0 时，界面仅有静态颜色变暗，缺乏更细致的情绪状态机 |
| **心情衰减** | 惰性计算：$Mood = \max(10, \min(100, Mood_0 - \Delta Hours \times 5))$ | 无需后台跑定时 Cron，纯前端渲染时动态差值推算，零计算开销 | 心情除了改变进度条颜色外，与核心宠物行为无深度联动，沦为装饰性指标 |
| **多账号隔离** | 通过 `className::teacherName` 拼接 StorageKey 实现多班级隔离 | 纯单机模式下支持多老师切换 | **无法跨设备共享**，老师在自己电脑录入的数据无法实时同步到教室大屏电脑，且容易因浏览器清理缓存丢失全部数据 |
| **多宠物机制** | 当前数据结构中，每个 `Student` 对象严格绑定单个 `petType` | 逻辑简单直接 | **不支持一人拥有多个宠物**，学生满级后成长路径直接锁死 |
