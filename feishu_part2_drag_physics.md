## 🎮 班级电子宠物重构全案 · 第二部分：宠物拖拽动效与物理引擎方案

这是为你整理的重构第二部分：**可拖拽宠物动画的极简 60fps 原生实现方案**。

---

### 一、 为什么绝对不要引入大型游戏引擎？
千万不要让 Codex 引入 Phaser.js、Pixi.js、Three.js 或 Cocos：
1. **老旧白板易卡死**：教室内老旧希沃/鸿合触摸一体机硬件性能有限，游戏引擎极易掉帧或崩溃。
2. **事件穿透 Bug**：游戏 Canvas 难以与 React/Vue 的 DOM 模态弹窗完美融合，容易引发大量点击穿透。
3. **极耗 Token**：外部 AI 调试游戏循环会烧掉大量中转站额度。

### 二、 最优解：纯前端 Pointer Events + CSS 弹簧物理

#### 动效 4 个瞬间分解：
1. **瞬间 A（待机 Idle）**：上下轻微浮动呼吸，纯 CSS `translateY(0 ~ -6px)` 正弦平滑起伏。
2. **瞬间 B（点击提溜 Grabbed）**：指针按下瞬间，将变形锚点设在头顶 `transform-origin: top center`，身体纵向拉长 `scale(0.92, 1.15)`，模拟被拎起后颈皮，表情切为惊讶/被拎起。
3. **瞬间 C（拖拽移动 Dragging）**：通过指针移动速度 `vx` 动态计算惯性倾角：向左拖向右甩 `rotate(16deg)`，向右拖向左甩 `rotate(-16deg)`。
4. **瞬间 D（释放落地 Dropped/Bounce）**：松开瞬间产生果冻挤压（Squash & Stretch）：先扁平变形 `scale(1.18, 0.82)`，再阻尼回弹为正常 `scale(1, 1)`（耗时 350ms 贝塞尔曲线），切回眨眼开心表情。

---

### 三、 零依赖高性能物理控制器核心代码

可直接交付给前端使用，纯原生 TypeScript：

```typescript
// PetDragPhysics.ts (零外部依赖，极速 60fps)
export type PetVisualState = 'idle' | 'grabbed' | 'dragging' | 'bounce';

export class PetDragPhysics {
  private el: HTMLElement;
  private onStateChange: (state: PetVisualState) => void;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private currentX = 0;
  private currentY = 0;
  private vx = 0;

  constructor(element: HTMLElement, onStateChange: (state: PetVisualState) => void) {
    this.el = element;
    this.onStateChange = onStateChange;
    this.init();
  }

  private init() {
    this.el.style.touchAction = 'none';
    this.el.style.userSelect = 'none';
    this.el.style.cursor = 'grab';

    this.el.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.startX = e.clientX - this.currentX;
      this.startY = e.clientY - this.currentY;
      this.lastX = e.clientX;
      this.el.setPointerCapture(e.pointerId);
      this.el.style.cursor = 'grabbing';
      this.el.style.transformOrigin = 'top center';
      this.el.style.transition = 'transform 0.15s cubic-bezier(0.2, 0.9, 0.3, 1)';
      this.el.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(0.92, 1.15)`;
      this.onStateChange('grabbed');
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      this.currentX = e.clientX - this.startX;
      this.currentY = e.clientY - this.startY;
      this.vx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      const tilt = Math.max(-16, Math.min(16, this.vx * 0.75));
      this.el.style.transition = 'none';
      this.el.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(0.95, 1.08) rotate(${tilt}deg)`;
      this.onStateChange('dragging');
    });

    window.addEventListener('pointerup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.el.style.cursor = 'grab';
      this.onStateChange('bounce');
      this.el.style.transformOrigin = 'bottom center';
      this.el.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      this.el.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(1.18, 0.82) rotate(0deg)`;
      setTimeout(() => {
        this.el.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(1, 1)`;
        this.onStateChange('idle');
      }, 200);
    });
  }
}
```
