/**
 * 讲台大屏粒子烟花与庆祝礼花引擎 (Fireworks & Confetti Engine)
 * 用于电子宠物破壳诞生、突破演化形态阶段 (Stage 1~5) 时全屏从底部升腾绽放
 */
class ClassroomFireworksEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.rockets = [];
        this.confetti = [];
        this.animationId = null;
        this.isRunning = false;
        this.init();
    }

    init() {
        if (typeof document === 'undefined') return;
        let c = document.getElementById('classpetFireworksCanvas');
        if (!c) {
            c = document.createElement('canvas');
            c.id = 'classpetFireworksCanvas';
            c.style.position = 'fixed';
            c.style.top = '0';
            c.style.left = '0';
            c.style.width = '100vw';
            c.style.height = '100vh';
            c.style.pointerEvents = 'none';
            c.style.zIndex = '99999';
            c.style.display = 'none';
            document.body.appendChild(c);
        }
        this.canvas = c;
        this.ctx = c.getContext('2d');
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // 启动全屏烟花庆典 (持续指定秒数)
    launchCelebration(durationMs = 4500, count = 8) {
        if (!this.canvas) this.init();
        this.resize();
        this.canvas.style.display = 'block';
        this.isRunning = true;
        this.particles = [];
        this.rockets = [];
        this.confetti = [];

        // 立即从底部升起首波火箭
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (!this.isRunning) return;
                this.addRocket();
                this.addConfettiBurst();
            }, i * 350);
        }

        if (!this.animationId) {
            this.loop();
        }

        setTimeout(() => {
            this.stopGradually();
        }, durationMs);
    }

    addRocket() {
        if (!this.canvas) return;
        const x = window.innerWidth * 0.15 + Math.random() * (window.innerWidth * 0.7);
        const y = window.innerHeight;
        const targetY = window.innerHeight * 0.15 + Math.random() * (window.innerHeight * 0.4);
        const hue = Math.floor(Math.random() * 360);
        this.rockets.push({
            x,
            y,
            targetY,
            speed: 12 + Math.random() * 6,
            color: `hsl(${hue}, 100%, 65%)`,
            hue
        });
    }

    explode(x, y, hue) {
        const pCount = 55 + Math.floor(Math.random() * 35);
        for (let i = 0; i < pCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 8.5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1.0,
                decay: 0.015 + Math.random() * 0.02,
                color: `hsl(${hue + (Math.random() * 40 - 20)}, 100%, ${50 + Math.random() * 30}%)`,
                size: 2.5 + Math.random() * 3
            });
        }
    }

    addConfettiBurst() {
        const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'];
        for (let i = 0; i < 25; i++) {
            this.confetti.push({
                x: Math.random() * window.innerWidth,
                y: -10,
                vx: Math.random() * 4 - 2,
                vy: 3 + Math.random() * 5,
                rotation: Math.random() * 360,
                rotSpeed: Math.random() * 10 - 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 6 + Math.random() * 6,
                alpha: 1.0
            });
        }
    }

    loop() {
        if (!this.isRunning && this.particles.length === 0 && this.rockets.length === 0 && this.confetti.length === 0) {
            if (this.canvas) this.canvas.style.display = 'none';
            this.animationId = null;
            return;
        }

        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'lighter';

        // 1. 绘制上升火箭
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const r = this.rockets[i];
            r.y -= r.speed;
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = r.color;
            this.ctx.fill();

            if (r.y <= r.targetY) {
                this.explode(r.x, r.y, r.hue);
                this.rockets.splice(i, 1);
            }
        }

        // 2. 绘制爆炸粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.14; // 重力
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.restore();
        }

        // 3. 绘制庆祝彩屑
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.rotation += c.rotSpeed;
            if (c.y > window.innerHeight + 20) {
                this.confetti.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.rotate((c.rotation * Math.PI) / 180);
            this.ctx.fillStyle = c.color;
            this.ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
            this.ctx.restore();
        }

        this.animationId = requestAnimationFrame(() => this.loop());
    }

    stopGradually() {
        this.isRunning = false;
    }
}

window.classroomFireworks = new ClassroomFireworksEngine();
