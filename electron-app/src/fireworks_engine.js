/**
 * 讲台大屏粒子烟花与庆祝礼花引擎 (Fireworks & Confetti Engine) - Pro 绚丽升级版
 * 用于电子宠物破壳诞生、突破演化形态阶段 (Stage 1~5)、满级庆祝等全屏盛典
 * 特色：
 * 1. 🌈 绚丽多主题色彩系统：幻彩霓虹、荣耀帝王金、赛博星云、炽焰红火、碧海晶莹、梦幻马卡龙；单次爆炸支持多彩彩虹爆、双色同心光环、金辉闪烁细雨等形态。
 * 2. 🎆 炸开位置全域随机：横向 5%~95% 全屏覆盖，纵向高/中/低三层随机落差，自然弧线微弹道与升空尾焰。
 * 3. 🎊 3D 旋转多形态彩屑：金属烫金、珠光炫彩，多波段立体翻滚飘落。
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

        // 6 大庆典专属色彩主题库
        this.themes = [
            {
                name: 'rainbow',
                title: '幻彩霓虹',
                palette: ['#FF1744', '#FF5252', '#FF9100', '#FFEA00', '#00E676', '#00E5FF', '#2979FF', '#7C4DFF', '#D500F9', '#FF4081']
            },
            {
                name: 'royal_gold',
                title: '荣耀帝王金',
                palette: ['#FFD700', '#FFE57F', '#FFC107', '#FFA000', '#FFF8E1', '#FFFFFF', '#FFB300', '#F59E0B', '#FBBF24']
            },
            {
                name: 'galaxy_neon',
                title: '赛博星云',
                palette: ['#7928CA', '#9D4EDD', '#C77DFF', '#00F0FF', '#48CAE4', '#FF007F', '#F72585', '#7209B7', '#4CC9F0']
            },
            {
                name: 'festival_crimson',
                title: '炽焰红火',
                palette: ['#FF1E56', '#FF0055', '#FF5722', '#FF9800', '#FFEB3B', '#FF3366', '#FF6B6B', '#FFAA00', '#FFD166']
            },
            {
                name: 'ocean_emerald',
                title: '碧海晶莹',
                palette: ['#00B4D8', '#0077B6', '#90E0EF', '#06D6A0', '#1B9AAA', '#2EC4B6', '#38EF7D', '#11998E', '#A0EADE']
            },
            {
                name: 'macaron_candy',
                title: '梦幻马卡龙',
                palette: ['#FF70A6', '#FF9770', '#FFD670', '#E9FF70', '#70D6FF', '#B388FF', '#FF80AB', '#FF4081', '#C5A3FF']
            }
        ];

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

    // 启动全屏烟花庆典 (持续指定毫秒数，发射 count 波花雨)
    launchCelebration(durationMs = 4500, count = 8) {
        if (!this.canvas) this.init();
        this.resize();
        this.canvas.style.display = 'block';
        this.isRunning = true;
        this.particles = [];
        this.rockets = [];
        this.confetti = [];

        // 本次庆典随机选取主打基调或全混彩模式
        const batchTheme = this.themes[Math.floor(Math.random() * this.themes.length)];

        // 随机节奏发射火箭与彩屑（非机械均匀，带来自然起伏波澜）
        let accumulatedDelay = 0;
        for (let i = 0; i < count; i++) {
            const delayDelta = (i === 0) ? 0 : (200 + Math.random() * 260);
            accumulatedDelay += delayDelta;

            setTimeout(() => {
                if (!this.isRunning) return;
                // 每次发射有 85% 概率为主火箭，15% 概率空中奇袭快闪爆
                this.addRocket(batchTheme);
                this.addConfettiBurst();

                // 偶数轮次额外增补一颗对角偏转副火箭，营造双姝竞绽盛况
                if (i % 2 === 1 && Math.random() < 0.65) {
                    setTimeout(() => {
                        if (this.isRunning) this.addRocket(null);
                    }, 120 + Math.random() * 150);
                }
            }, accumulatedDelay);
        }

        if (!this.animationId) {
            this.loop();
        }

        setTimeout(() => {
            this.stopGradually();
        }, durationMs);
    }

    // 发射一颗升空火箭，全域随机坐标与弧线微弹道
    addRocket(selectedTheme = null) {
        if (!this.canvas) return;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // 1. 横向位置全屏覆盖 (5% ~ 95%)，告别狭窄居中
        const launchX = w * (0.06 + Math.random() * 0.88);
        const targetX = Math.max(w * 0.05, Math.min(w * 0.95, launchX + (Math.random() - 0.5) * (w * 0.28)));

        // 2. 纵向高度全域层次随机 (落差三层：高空绽放、中天展翅、低空连环)
        const heightTier = Math.random();
        let targetY;
        if (heightTier < 0.35) {
            // 高空顶峰 12% ~ 26%
            targetY = h * (0.12 + Math.random() * 0.14);
        } else if (heightTier < 0.75) {
            // 中高空主力 26% ~ 44%
            targetY = h * (0.26 + Math.random() * 0.18);
        } else {
            // 中低空层次 44% ~ 62%
            targetY = h * (0.44 + Math.random() * 0.18);
        }

        // 3. 颜色风格与爆炸类型随机搭配
        const theme = selectedTheme || this.themes[Math.floor(Math.random() * this.themes.length)];
        const palette = theme.palette;
        const headColor = palette[Math.floor(Math.random() * palette.length)];

        // 爆炸类型随机：多彩彩虹爆 / 双色同心环 / 主题调色盘 / 金辉细雨
        const burstTypes = ['rainbow', 'two_tone', 'theme_palette', 'willow_gold'];
        const burstType = burstTypes[Math.floor(Math.random() * burstTypes.length)];

        const speed = 12 + Math.random() * 6;
        const totalDistanceY = h - targetY;
        const flightTicks = Math.max(18, totalDistanceY / speed);
        const vx = (targetX - launchX) / flightTicks;

        this.rockets.push({
            x: launchX,
            y: h,
            vx: vx,
            vy: -speed,
            targetY: targetY,
            headColor: headColor,
            theme: theme,
            burstType: burstType,
            trail: []
        });
    }

    // 绚烂爆炸核心算法：多色融合、金辉闪烁、微物理散开
    explode(x, y, rocket) {
        const theme = rocket.theme || this.themes[0];
        const palette = theme.palette;
        const burstType = rocket.burstType || 'rainbow';

        // 粒子数量充实饱满 (65 ~ 105 颗粒子)
        const pCount = 65 + Math.floor(Math.random() * 40);

        // 为“双色同心环”准备两种高对比反差色彩
        const colorCore = '#FFFFFF';
        const colorRing = palette[Math.floor(Math.random() * palette.length)];

        for (let i = 0; i < pCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.8 + Math.random() * 8.8;
            let particleColor;
            let isSparkle = false;
            let size = 2.4 + Math.random() * 2.6;
            let decay = 0.012 + Math.random() * 0.016;

            if (burstType === 'rainbow') {
                // 多彩彩虹爆：每一颗粒子拥有明亮各异的鲜活色彩，盛世斑斓
                particleColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, ${58 + Math.random() * 26}%)`;
                if (Math.random() < 0.25) isSparkle = true;
            } else if (burstType === 'two_tone') {
                // 双色同心环：内圈极亮钻石白/金，外圈扩散绚丽霓虹
                particleColor = (speed < 4.2) ? colorCore : colorRing;
            } else if (burstType === 'willow_gold') {
                // 金辉流光细雨：金色微闪粒子，重力微调，滞空悠长
                const goldTones = ['#FFD700', '#FFE57F', '#FFA000', '#FFFFFF', '#FFF8DC', '#FBBF24'];
                particleColor = goldTones[Math.floor(Math.random() * goldTones.length)];
                isSparkle = true;
                decay = 0.008 + Math.random() * 0.012; // 留存更持久
                size = 2.0 + Math.random() * 2.2;
            } else {
                // 主题调色盘：从当前主题调色板中汲取高饱和度对比色
                particleColor = palette[Math.floor(Math.random() * palette.length)];
                if (Math.random() < 0.3) isSparkle = true;
            }

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1.0,
                decay: decay,
                color: particleColor,
                size: size,
                sparkle: isSparkle,
                sparklePhase: Math.random() * Math.PI * 2,
                gravity: (burstType === 'willow_gold') ? 0.08 : 0.13
            });
        }
    }

    // 庆祝彩屑爆散：支持 3D 翻滚与多彩闪耀
    addConfettiBurst() {
        const w = window.innerWidth;
        // 覆盖全屏高反差烫金与彩带调色盘
        const colors = [
            '#FFD700', '#FF3B30', '#FF9500', '#34C759', '#007AFF', 
            '#AF52DE', '#FF2D55', '#5856D6', '#00F0FF', '#FFFFFF', 
            '#F59E0B', '#10B981', '#EC4899', '#8B5CF6'
        ];

        const burstCount = 26 + Math.floor(Math.random() * 10);
        for (let i = 0; i < burstCount; i++) {
            this.confetti.push({
                x: Math.random() * w,
                y: -15 - Math.random() * 20,
                vx: (Math.random() - 0.5) * 4.2,
                vy: 2.8 + Math.random() * 4.6,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 12,
                tiltAngle: Math.random() * Math.PI * 2,
                tiltSpeed: 0.08 + Math.random() * 0.12,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 7 + Math.random() * 6,
                aspectRatio: (Math.random() < 0.4) ? 2.4 : 1.0, // 40% 为长条飘带，60% 为晶片
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

        // 柔和暗影拖尾残影
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绚丽高光混合叠加
        this.ctx.globalCompositeOperation = 'lighter';

        // 1. 绘制升空火箭与微尾焰
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const r = this.rockets[i];
            r.x += r.vx;
            r.y += r.vy;

            // 记录尾迹
            r.trail.push({ x: r.x, y: r.y, alpha: 1.0 });
            if (r.trail.length > 5) r.trail.shift();

            // 绘制尾迹残影
            for (let t = 0; t < r.trail.length; t++) {
                const pt = r.trail[t];
                const trailRatio = (t + 1) / r.trail.length;
                this.ctx.save();
                this.ctx.globalAlpha = trailRatio * 0.65;
                this.ctx.beginPath();
                this.ctx.arc(pt.x, pt.y, 2.0 * trailRatio, 0, Math.PI * 2);
                this.ctx.fillStyle = r.headColor;
                this.ctx.fill();
                this.ctx.restore();
            }

            // 火箭弹头
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, 3.4, 0, Math.PI * 2);
            this.ctx.fillStyle = r.headColor;
            this.ctx.fill();

            // 到达指定爆炸高度即绽放
            if (r.y <= r.targetY) {
                this.explode(r.x, r.y, r);
                this.rockets.splice(i, 1);
            }
        }

        // 2. 绘制爆炸绚丽粒子
        const now = Date.now();
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.965; // 空气阻力
            p.vy *= 0.965;
            p.vy += p.gravity; // 重力沉降
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            // 闪烁粒子呼吸波动
            let renderAlpha = p.alpha;
            if (p.sparkle) {
                renderAlpha = Math.max(0.05, Math.min(1.0, p.alpha * (0.65 + 0.35 * Math.sin(now * 0.02 + p.sparklePhase))));
            }

            this.ctx.save();
            this.ctx.globalAlpha = renderAlpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();

            // 高亮粒子微光晕
            if (p.sparkle && renderAlpha > 0.4) {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = renderAlpha * 0.22;
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // 3. 绘制 3D 旋转彩屑
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.rotation += c.rotSpeed;
            c.tiltAngle += c.tiltSpeed;

            if (c.y > window.innerHeight + 25) {
                this.confetti.splice(i, 1);
                continue;
            }

            // 模拟三维翻滚视效 (X 轴缩放 + 角度旋转)
            const scaleX = Math.cos(c.tiltAngle);

            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.rotate((c.rotation * Math.PI) / 180);
            this.ctx.scale(scaleX, 1);
            this.ctx.fillStyle = c.color;
            const w = c.size * (c.aspectRatio || 1);
            const h = c.size;
            this.ctx.fillRect(-w / 2, -h / 2, w, h);
            this.ctx.restore();
        }

        this.animationId = requestAnimationFrame(() => this.loop());
    }

    stopGradually() {
        this.isRunning = false;
    }
}

// 讲台大屏与教师端全局唯一样例
window.classroomFireworks = new ClassroomFireworksEngine();
