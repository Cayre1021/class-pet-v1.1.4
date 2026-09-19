/**
 * Class Pet V1-Lite: Core Classroom Runtime Engine (Electron Desktop Edition)
 * 严格依据 `analysis_and_requirements/data_architecture/01_schema.md` 规范实现：
 * 1. 20 级官方标准经验值阈值曲线 (class_level_thresholds: 0 -> 1250 EXP)
 * 2. 6 阶段视觉演化阶梯 (Stage 0: 蛋 -> Stage 5: 究极神兽)
 * 3. 负向扣分不降级、不回退视觉形态不变量
 * 4. 教师自定义常用加减分行为项持久化
 * 5. 跨窗口双屏实时通信引擎 (BroadcastChannel + Electron IPC 双中继)
 * 6. Web Audio 原生音效合成引擎
 */

// ==========================================
// 1. Web Audio 原生音效合成引擎
// ==========================================
class ClassroomAudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    getContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    playDing() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {}
    }

    playDeduct() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {}
    }

    playFanfare() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                const startTime = ctx.currentTime + idx * 0.09;
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.28, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.55);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.55);
            });
        } catch (e) {}
    }

    playTick() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } catch (e) {}
    }

    playTimerBell() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            [659.25, 523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const t = ctx.currentTime + idx * 0.2;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.35, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.8);
            });
        } catch (e) {}
    }
}

// ==========================================
// 2. 官方标准 20 级经验阈值与视觉阶梯定义
// ==========================================
// 01_schema.md 5.4 节官方标准默认阈值
const DEFAULT_LEVEL_THRESHOLDS = [
    0,    // Lv.0 (0) - stage0: egg
    15,   // Lv.1 (15) - stage1: form1
    35,   // Lv.2 (35)
    60,   // Lv.3 (60)
    90,   // Lv.4 (90) - stage2: form2
    125,  // Lv.5 (125)
    165,  // Lv.6 (165)
    210,  // Lv.7 (210)
    260,  // Lv.8 (260) - stage3: form3
    315,  // Lv.9 (315)
    375,  // Lv.10 (375)
    440,  // Lv.11 (440)
    510,  // Lv.12 (510)
    585,  // Lv.13 (585) - stage4: form4
    665,  // Lv.14 (665)
    750,  // Lv.15 (750)
    840,  // Lv.16 (840)
    935,  // Lv.17 (935)
    1035, // Lv.18 (1035)
    1140, // Lv.19 (1140)
    1250  // Lv.20 (1250) - stage5: form5 (满级)
];

const DEFAULT_STAGE_MIN_LEVELS = [
    { stage: 0, minLevel: 0, code: 'egg', name: '初始宠物蛋' },
    { stage: 1, minLevel: 1, code: 'form1', name: '幼宠期' },
    { stage: 2, minLevel: 4, code: 'form2', name: '少年期' },
    { stage: 3, minLevel: 8, code: 'form3', name: '进阶形态' },
    { stage: 4, minLevel: 13, code: 'form4', name: '青年进阶' },
    { stage: 5, minLevel: 20, code: 'form5', name: '究极神兽' }
];

let LEVEL_THRESHOLDS = [...DEFAULT_LEVEL_THRESHOLDS];
let STAGE_MIN_LEVELS = JSON.parse(JSON.stringify(DEFAULT_STAGE_MIN_LEVELS));

// 默认 13 项标准行为规则 (01_schema.md 5.3 节)
const DEFAULT_BEHAVIOR_RULES = [
    { id: 'pos_1', name: '帮助打扫卫生', points: 5, type: 'positive', isPreset: true },
    { id: 'pos_2', name: '帮忙擦黑板', points: 3, type: 'positive', isPreset: true },
    { id: 'pos_3', name: '作业优秀', points: 5, type: 'positive', isPreset: true },
    { id: 'pos_4', name: '主动回答问题', points: 3, type: 'positive', isPreset: true },
    { id: 'pos_5', name: '好人好事', points: 5, type: 'positive', isPreset: true },
    { id: 'pos_6', name: '乐于助人', points: 4, type: 'positive', isPreset: true },
    { id: 'pos_7', name: '听课认真', points: 3, type: 'positive', isPreset: true },
    { id: 'pos_8', name: '思维活跃', points: 4, type: 'positive', isPreset: true },
    { id: 'neg_1', name: '迟到/早退', points: -3, type: 'negative', isPreset: true },
    { id: 'neg_2', name: '课上讲话', points: -5, type: 'negative', isPreset: true },
    { id: 'neg_3', name: '逃避值日', points: -5, type: 'negative', isPreset: true },
    { id: 'neg_4', name: '未交作业', points: -5, type: 'negative', isPreset: true },
    { id: 'neg_5', name: '乱扔垃圾', points: -3, type: 'negative', isPreset: true }
];

// 8 大官方标准宠物物种名录 (方案 B 治愈系 Q 版绘本体系)
const PET_SPECIES_CATALOG = {
    cat: { code: 'cat', name: '猫咪', defaultSubject: '语文', icon: '🐱', motto: '灵动专注 · 治愈陪伴' },
    dog: { code: 'dog', name: '柴犬', defaultSubject: '数学', icon: '🐶', motto: '忠诚开朗 · 活力守护' },
    fox: { code: 'fox', name: '赤狐', defaultSubject: '英语', icon: '🦊', motto: '机敏睿智 · 敏锐思维' },
    bunny: { code: 'bunny', name: '月兔', defaultSubject: '科学', icon: '🐰', motto: '纯真温柔 · 甜美陪伴' },
    bird: { code: 'bird', name: '青鸟', defaultSubject: '音乐', icon: '🐦', motto: '灵巧敏捷 · 凌云壮志' },
    deer: { code: 'deer', name: '小鹿', defaultSubject: '美术', icon: '🦌', motto: '优雅高洁 · 静谧知性' },
    hamster: { code: 'hamster', name: '仓鼠', defaultSubject: '体育', icon: '🐹', motto: '勤奋自律 · 积少成多' },
    fish: { code: 'fish', name: '锦鲤', defaultSubject: '德育', icon: '🐟', motto: '福运连绵 · 潜龙出渊' }
};

// 丰富童趣的分类互动台词库 (涵盖6种生理动作与蛋形态)
const PET_ACTION_QUOTES = {
    egg: [
        "咚咚咚~ 蛋壳里传来了好奇的敲击声，好像在说：快拿积分，我想快点破壳见你！🥚",
        "摇晃摇晃~ 宠物蛋在暖洋洋的阳光下滚了一圈，马上就要破壳啦！🐣",
        "咔嚓咔嚓~ 里面的小生命正在积攒力量，达到经验就能自选神宠哦！✨",
        "呼噜噜~ 宠物蛋暖洋洋的，似乎在梦里做着拯救银河系的大梦呢！🌟"
    ],
    greet: [
        "嗷呜~ 扑到你的怀里！今天我们又是活力满满的一天！🐾",
        "嗨嗨！小主人，我刚才在打盹呢，一看到你就精神啦！(=^ω^=)",
        "收到招手！今天你举手发言也要这么积极、声音响亮哦！✋",
        "摇摇尾巴~ 哔哔！检测到全世界最优秀的小主人出现！💖",
        "喵呜~ 早上好！书包放整齐，待会老师提问我们抢第一！🎒",
        "叽叽喳喳~ 飞到你的肩头！今天我们一起冲进小组第一名！🐦"
    ],
    pet: [
        "呼噜呼噜... 挠挠下巴好舒服呀，整只宠都要化成水啦~ 🥰",
        "哎呀呀！好痒好痒，别挠我痒痒肉啦，哈哈哈哈~ 🤣",
        "顺毛顺毛~ 哇，你的小手好暖和，今天的烦恼瞬间被摸光光！✨",
        "蹭蹭你的手心~ 喜欢你摸我的小耳朵，我们是天下第一铁！🤝",
        "被摸得晕乎乎的~ 感觉浑身充满魔力，我能背下一整首古诗啦！📖",
        "耳朵抖一抖~ 嘻嘻，再摸一下我就要变成一颗圆滚滚的毛球了！🏀"
    ],
    play: [
        "看我的飞天扑击！咻—— 没抓到，但我抓到了你的笑声！⚡",
        "旋转、跳跃、后空翻！看我的满分落地，掌声在哪里~ 🤸",
        "丢球丢球！跑得比体育委员还快，看我给你叼回来！🎾",
        "捉迷藏开始啦！你猜我藏在你的铅笔盒后面还是课桌底下？🙈",
        "打滚打滚~ 课间活动动起来，待会上课思路跑得飞快！🏃",
        "蹦蹦跳跳真可爱！今天下课我们一起去操场看看蓝天吧！🌈"
    ],
    water: [
        "吨吨吨吨吨~ 咕嘟！嗝~ 冰冰凉凉的水最解渴啦！💧",
        "多喝水皮肤好，头脑转得像小风车！小主人你也快喝一口水吧！🥤",
        "水花四溅~ 咕噜噜吐了个快乐的小泡泡送给你！🫧",
        "满血复活！干涸的小喉咙瞬间滋润，回答问题声音超洪亮！📢",
        "啊~ 清爽！感觉头顶的小树苗正在咕噜咕噜发芽呢！🌱"
    ],
    feed: [
        "吧唧吧唧~ 哇！今天的小零食也太香了吧！美味极了！😋",
        "一口吞掉！肚子圆溜溜的，吃饱饱才能考出响当当的分数！🍎",
        "嚼嚼嚼~ 满嘴都是幸福的味道！小脑瓜现在充满智慧的能量！🧠",
        "再来一口！嗷呜~ 谢谢小主人投喂，我的成长进度条又狂飙啦！🚀",
        "小肚皮鼓起来啦~ 给你表演一个饱嗝牌小爱心！💕"
    ],
    comfort: [
        "抱抱你~ 不管今天遇到什么难题，我都陪你一起勇敢面对！🤗",
        "拍拍胸脯：不怕不怕，一次没答对没关系，你是最棒的！🌈",
        "把我的小毯子分你一半，靠在我软乎乎的肚皮上充满电吧！🛋️",
        "吸走你的小委屈！呼—— 坏心情全部吹飞，现在变回元气超人！🦸",
        "悄悄咬耳朵：老师跟我说啦，只要你用心，你的进步大家都看得见！🌟",
        "摸摸你的头~ 困难像弹簧，你强它就弱，我们一起加油！💪"
    ]
};

// 20 条治愈系互动萌宠台词库 (备用与综合)
const PET_HEALING_QUOTES = [
    "谢谢你的摸摸，感觉浑身充满了学习的灵感！✨",
    "咕噜咕噜~ 趴在你的课桌前，今天也要一起加油哦！🐱",
    "哇！精神充沛！今天上课我们一起争取再拿一颗星星！⭐",
    "多喝温水，润润嗓子，认真听讲的你闪闪发光！💧",
    "收到能量投喂！饱腹感满满，思维立刻敏捷起来了！🍎",
    "深呼吸~ 放轻松，这道难题我们一定能解开！🌿",
    "击个掌！你是最棒的小伙伴，我们一直在一起！🐾",
    "听到了你的呼唤，我随时准备好为你加油助威！📣",
    "看！你的每一次举手发言，都让我头顶的小光环更亮了！🌟",
    "整理好课桌，端正坐姿，电子宠物的成长守护已为你开启！🛡️",
    "温和微风吹过~ 疲劳通通散去，元气瞬间回满！🍃",
    "今天你专注做笔记的样子，真的超有魅力！📝",
    "遇到困难别气馁，积少成多就是最强大的魔法！🔮",
    "好温暖的陪伴！只要坚持，每天都是进步的一天！☀️",
    "摇摇尾巴~ 看到你自信的笑容，我也跟着开心起来了！💖",
    "悄悄告诉你一个秘密：老师刚才都在为你暗暗点赞呢！🤫",
    "能量共鸣中... 我们的契约默契度又上升啦！✨",
    "休息一下眼睛，眺望远方，马上又是活力满满的下一节课！👀",
    "不管顺境逆境，你的电子宠物伙伴永远坚定地相信你！🏆",
    "叮咚！收到你的善意，今天全班的幸运值都在上涨哦！🍀"
];

// 电子宠物形象资源统一寻址解析器
function getPetImagePath(species, stage = 1) {
    if (stage === 0 || species === 'egg' || !species) {
        return './assets/pets/shared/egg.png';
    }
    const sp = PET_SPECIES_CATALOG[species] ? species : 'cat';
    const st = Math.max(1, Math.min(stage || 1, 5));
    return `./assets/pets/${sp}/${sp}-stage${st}.png`;
}

// ==========================================
// 3. 核心数据管理与跨屏通信 Store
// ==========================================
class ClassPetStore {
    constructor() {
        this.channel = new BroadcastChannel('classpet_sync_channel');
        this.audio = new ClassroomAudioEngine();
        this.listeners = new Set();
        this.initLevelThresholds();
        this.initData();
        this.initCustomRules();
        this.bindEvents();
        this.loadFromSQLite();
    }

    initLevelThresholds() {
        try {
            const cachedT = localStorage.getItem('classpet_custom_level_thresholds');
            if (cachedT) {
                const parsed = JSON.parse(cachedT);
                if (Array.isArray(parsed) && parsed.length === 21) {
                    LEVEL_THRESHOLDS = parsed.map(Number);
                }
            }
            const cachedS = localStorage.getItem('classpet_custom_stage_levels');
            if (cachedS) {
                const parsedS = JSON.parse(cachedS);
                if (Array.isArray(parsedS) && parsedS.length === 6) {
                    STAGE_MIN_LEVELS = parsedS;
                }
            }
            window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
            window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
        } catch (e) {
            console.error('Failed to initLevelThresholds:', e);
        }
    }

    getLevelThresholds() {
        return [...LEVEL_THRESHOLDS];
    }

    getStageMinLevels() {
        return JSON.parse(JSON.stringify(STAGE_MIN_LEVELS));
    }

    getHatchThreshold() {
        return LEVEL_THRESHOLDS[1] || 15;
    }

    saveLevelThresholds(newThresholds, newStages) {
        if (!Array.isArray(newThresholds) || newThresholds.length !== 21) {
            return { success: false, error: '经验阈值必须包含 0~20 级共 21 个数值' };
        }
        const cleanThresholds = newThresholds.map((v, i) => i === 0 ? 0 : Math.max(0, parseInt(v, 10) || 0));
        for (let i = 1; i < cleanThresholds.length; i++) {
            if (cleanThresholds[i] <= cleanThresholds[i - 1]) {
                cleanThresholds[i] = cleanThresholds[i - 1] + 1;
            }
        }
        LEVEL_THRESHOLDS = cleanThresholds;
        window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
        localStorage.setItem('classpet_custom_level_thresholds', JSON.stringify(cleanThresholds));

        if (Array.isArray(newStages) && newStages.length === 6) {
            STAGE_MIN_LEVELS = newStages;
            window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
            localStorage.setItem('classpet_custom_stage_levels', JSON.stringify(newStages));
        }

        this.recalculateAllStudentsProgress();
        this.broadcast('THRESHOLDS_SYNC', { thresholds: LEVEL_THRESHOLDS, stageLevels: STAGE_MIN_LEVELS, students: this.students });
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('THRESHOLDS_UPDATE', { thresholds: LEVEL_THRESHOLDS, stageLevels: STAGE_MIN_LEVELS, students: this.students });
        return { success: true };
    }

    resetLevelThresholds() {
        LEVEL_THRESHOLDS = [...DEFAULT_LEVEL_THRESHOLDS];
        STAGE_MIN_LEVELS = JSON.parse(JSON.stringify(DEFAULT_STAGE_MIN_LEVELS));
        window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
        window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
        localStorage.removeItem('classpet_custom_level_thresholds');
        localStorage.removeItem('classpet_custom_stage_levels');

        this.recalculateAllStudentsProgress();
        this.broadcast('THRESHOLDS_SYNC', { thresholds: LEVEL_THRESHOLDS, stageLevels: STAGE_MIN_LEVELS, students: this.students });
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('THRESHOLDS_UPDATE', { thresholds: LEVEL_THRESHOLDS, stageLevels: STAGE_MIN_LEVELS, students: this.students });
        return { success: true };
    }

    recalculateAllStudentsProgress() {
        const hatchThresh = this.getHatchThreshold();
        this.students.forEach(s => {
            let newLevel = this.calcLevel(s.exp, 0);
            // 🌟 核心生命不变量保护：已破壳认领的学生等级与阶段最低保底为 1 (绝不退化为0级或蛋形态)
            if (s.isHatched) {
                newLevel = Math.max(1, newLevel);
            }
            s.level = newLevel;
            let newStage = this.calcVisualStage(newLevel, 0);
            if (s.isHatched) {
                newStage = Math.max(1, newStage);
            }
            s.visualStage = newStage;
            s.minExpForCurrentLevel = this.getCurrentLevelMinExp(s.level);
            s.nextLevelExp = this.getNextLevelThreshold(s.level);

            const activeSub = s.activeSubject || 'chinese';
            const curPet = s.pets && (s.pets[activeSub] || s.pets.chinese);
            if (curPet) {
                curPet.level = s.level;
                curPet.visualStage = s.visualStage;
                if (!s.isHatched) {
                    s.stamp = s.exp >= hatchThresh ? 'HATCH' : null;
                    curPet.icon = '🐣';
                    curPet.image = getPetImagePath('egg', 0);
                } else {
                    const s2L = STAGE_MIN_LEVELS[2]?.minLevel || 4;
                    const s3L = STAGE_MIN_LEVELS[3]?.minLevel || 8;
                    const s4L = STAGE_MIN_LEVELS[4]?.minLevel || 13;
                    const s5L = STAGE_MIN_LEVELS[5]?.minLevel || 20;
                    if (s.level >= 20 || s.level >= s5L) {
                        s.stamp = 'MAX';
                        curPet.icon = '👑';
                    } else if ([s2L, s3L, s4L].includes(s.level)) {
                        s.stamp = 'EVOLVE';
                    } else {
                        s.stamp = null;
                    }
                    curPet.image = getPetImagePath(curPet.species, s.visualStage);
                }
            }
        });
        this.save();
    }

    // 计算等级与阶段辅助函数
    calcLevel(exp, currentMaxLevel = 0) {
        let level = 0;
        for (let l = LEVEL_THRESHOLDS.length - 1; l >= 0; l--) {
            if (exp >= LEVEL_THRESHOLDS[l]) {
                level = l;
                break;
            }
        }
        // 规则：等级只升不降（即使扣分导致 exp 降到更低阈值）
        return Math.max(level, currentMaxLevel);
    }

    // 兼容别名：防止外部调用 calculateLevel 报错
    calculateLevel(exp, currentMaxLevel = 0) {
        return this.calcLevel(exp, currentMaxLevel);
    }

    calcVisualStage(level, currentMaxStage = 0) {
        let stage = 0;
        for (let i = STAGE_MIN_LEVELS.length - 1; i >= 0; i--) {
            if (level >= STAGE_MIN_LEVELS[i].minLevel) {
                stage = STAGE_MIN_LEVELS[i].stage;
                break;
            }
        }
        // 规则：视觉阶段只升不降
        return Math.max(stage, currentMaxStage);
    }

    // 兼容别名：防止外部调用 getVisualStage 报错
    getVisualStage(level, currentMaxStage = 0) {
        return this.calcVisualStage(level, currentMaxStage);
    }

    getNextLevelThreshold(level) {
        if (level >= 20) return LEVEL_THRESHOLDS[20];
        return LEVEL_THRESHOLDS[level + 1];
    }

    // 从本地 SQLite 数据库中真实同步全班数据模型 (第14点：真接入本地数据库)
    async loadFromSQLite() {
        if (!window.electronAPI || !window.electronAPI.db || typeof window.electronAPI.db.loadAllState !== 'function') {
            return false;
        }
        try {
            const acc = this.getCurrentAccount ? this.getCurrentAccount() : {};
            const classId = acc.classId || 'c_class02_01';
            const state = await window.electronAPI.db.loadAllState(classId);
            if (state && Array.isArray(state.students) && state.students.length > 0) {
                console.log('[ClassPetStore] 成功从本地 SQLite 数据库载入班级真实状态，学生数:', state.students.length);
                const spKeys = Object.keys(PET_SPECIES_CATALOG);
                const loadedStudents = state.students.map((stRow, idx) => {
                    const stPets = (state.petsByStudent && state.petsByStudent[stRow.id]) ? state.petsByStudent[stRow.id] : {};
                    const primaryPetRow = stPets.chinese || Object.values(stPets)[0];
                    const spCode = primaryPetRow ? (primaryPetRow.species_code || 'cat') : spKeys[idx % spKeys.length];
                    const spInfo = PET_SPECIES_CATALOG[spCode] || PET_SPECIES_CATALOG.cat;
                    const level = primaryPetRow ? (primaryPetRow.level || 1) : 1;
                    const exp = primaryPetRow ? (primaryPetRow.exp || 15) : 15;
                    const stage = primaryPetRow ? (primaryPetRow.visual_stage || 1) : 1;
                    const isHatched = stage >= 1;

                    return {
                        id: stRow.id,
                        no: stRow.student_no || (idx + 1).toString().padStart(2, '0'),
                        name: stRow.name || `学生${idx + 1}`,
                        group: parseInt((stRow.group_name || '1').replace(/\D/g, ''), 10) || ((idx % 4) + 1),
                        level,
                        exp,
                        visualStage: stage,
                        stamp: isHatched ? (level >= 20 ? 'MAX' : null) : 'HATCH',
                        isHatched,
                        isAbsent: false,
                        isArchived: !!stRow.archived_at,
                        minExpForCurrentLevel: this.getCurrentLevelMinExp(level),
                        nextLevelExp: this.getNextLevelThreshold(level),
                        activeSubject: 'chinese',
                        pets: {
                            chinese: {
                                id: stPets.chinese?.id || 'pet_' + stRow.id + '_c',
                                species: isHatched ? (stPets.chinese?.species_code || spCode) : 'egg',
                                subject: '语文',
                                name: isHatched ? (stPets.chinese?.nickname || spInfo.name) : '神秘宠物蛋',
                                icon: isHatched ? spInfo.icon : '🐣',
                                image: getPetImagePath(isHatched ? (stPets.chinese?.species_code || spCode) : 'egg', stage),
                                level: stPets.chinese?.level || level,
                                exp: stPets.chinese?.exp || exp,
                                visualStage: stPets.chinese?.visual_stage || stage,
                                isHatched,
                                affection: 70, fullness: 80, energy: 80
                            },
                            math: {
                                id: stPets.math?.id || 'pet_' + stRow.id + '_m',
                                species: (stPets.math && stPets.math.visual_stage >= 1) ? stPets.math.species_code : 'egg',
                                subject: '数学',
                                name: (stPets.math && stPets.math.visual_stage >= 1) ? (stPets.math.nickname || '数学萌宠') : '神秘宠物蛋 (待破壳)',
                                icon: (stPets.math && stPets.math.visual_stage >= 1) ? (PET_SPECIES_CATALOG[stPets.math.species_code]?.icon || '📐') : '🐣',
                                image: getPetImagePath((stPets.math && stPets.math.visual_stage >= 1) ? stPets.math.species_code : 'egg', stPets.math?.visual_stage || 0),
                                level: stPets.math?.level || 0,
                                exp: stPets.math?.exp || 0,
                                visualStage: stPets.math?.visual_stage || 0,
                                isHatched: !!(stPets.math && stPets.math.visual_stage >= 1),
                                affection: 20, fullness: 50, energy: 50
                            },
                            english: {
                                id: stPets.english?.id || 'pet_' + stRow.id + '_e',
                                species: (stPets.english && stPets.english.visual_stage >= 1) ? stPets.english.species_code : 'egg',
                                subject: '英语',
                                name: (stPets.english && stPets.english.visual_stage >= 1) ? (stPets.english.nickname || '英语萌宠') : '神秘宠物蛋 (待破壳)',
                                icon: (stPets.english && stPets.english.visual_stage >= 1) ? (PET_SPECIES_CATALOG[stPets.english.species_code]?.icon || '🔤') : '🐣',
                                image: getPetImagePath((stPets.english && stPets.english.visual_stage >= 1) ? stPets.english.species_code : 'egg', stPets.english?.visual_stage || 0),
                                level: stPets.english?.level || 0,
                                exp: stPets.english?.exp || 0,
                                visualStage: stPets.english?.visual_stage || 0,
                                isHatched: !!(stPets.english && stPets.english.visual_stage >= 1),
                                affection: 20, fullness: 50, energy: 50
                            }
                        }
                    };
                });

                this.students = loadedStudents;
                this.save();
                this.notify('STATE_SYNC', { students: this.students });
                return true;
            }
        } catch (e) {
            console.error('[ClassPetStore] 载入 SQLite 数据库失败:', e);
        }
        return false;
    }

    getActiveAccountId() {
        return localStorage.getItem('classpet_active_account_id') || 'acc_demo_302';
    }

    getCurrentAccount() {
        try {
            const raw = localStorage.getItem('classpet_current_account');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return {
            id: 'acc_demo_302',
            school: '实验小学本部',
            className: '三年级二班',
            subject: '语文',
            teacherName: '刘老师',
            isPreset: true
        };
    }

    getStorageKey() {
        return 'classpet_v2_students_data_' + this.getActiveAccountId();
    }

    getCurrentLevelMinExp(level) {
        return LEVEL_THRESHOLDS[Math.min(level, 20)];
    }

    initData() {
        const storageKey = this.getStorageKey();
        let cached = localStorage.getItem(storageKey);
        
        // 若为默认演示账号且独立 key 暂无数据，优先从旧的 classpet_v2_students_data 迁移读取
        if (cached === null && this.getActiveAccountId() === 'acc_demo_302') {
            cached = localStorage.getItem('classpet_v2_students_data');
        }

        if (cached !== null) {
            try {
                this.students = JSON.parse(cached);
                // 兼容性自动回填与迁移字段
                let needResave = false;
                const spKeys = Object.keys(PET_SPECIES_CATALOG);
                this.students.forEach((s, idx) => {
                    if (s.isArchived === undefined) { s.isArchived = false; needResave = true; }
                    if (s.isHatched === undefined) { s.isHatched = s.level >= 1; needResave = true; }
                    if (!s.pets || !s.pets.chinese) return;
                    if (!s.pets.chinese.species) {
                        const spCode = spKeys[idx % spKeys.length];
                        s.pets.chinese.species = spCode;
                        s.pets.chinese.name = PET_SPECIES_CATALOG[spCode].name;
                        s.pets.chinese.icon = PET_SPECIES_CATALOG[spCode].icon;
                        needResave = true;
                    }
                    const activeSub = s.activeSubject || 'chinese';
                    const curPet = s.pets[activeSub] || s.pets.chinese;
                    const targetImg = s.isHatched
                        ? getPetImagePath(curPet.species, s.visualStage)
                        : getPetImagePath('egg', 0);
                    if (curPet.image !== targetImg) {
                        curPet.image = targetImg;
                        needResave = true;
                    }
                });
                if (needResave) this.save();
                return;
            } catch (e) {}
        }

        // 若为新创建的教师独立账号，初始化为全新的独立空班级，供老师录入花名册
        if (this.getActiveAccountId() !== 'acc_demo_302') {
            this.students = [];
            this.save();
            return;
        }

        const speciesKeys = ['cat', 'dog', 'fox', 'bunny', 'bird', 'deer', 'hamster', 'fish'];
        const names = [
            '张三', '李四', '王五', '赵六', '孙七', '周八', '吴九',
            '郑十', '陈一', '林二', '黄三', '何四', '郭五', '马六',
            '朱七', '罗八', '梁九', '宋十', '谢一', '唐二', '许三',
            '韩四', '冯五', '邓六', '曹七', '彭八', '曾九', '肖十',
            '田一', '董二', '袁三', '潘四', '于五', '蒋六', '蔡七',
            '余八', '杜九', '叶十', '程一', '苏二', '魏三', '吕四'
        ];

        this.students = names.map((name, i) => {
            const no = (i + 1).toString().padStart(2, '0');
            const spCode = speciesKeys[i % speciesKeys.length];
            const spInfo = PET_SPECIES_CATALOG[spCode];
            const group = (i % 4) + 1; // 4 大组分配

            let level = 1;
            let exp = 18;
            let visualStage = 1;
            let stamp = null;
            let isHatched = true;

            if (i === 40) { // 魏三：初始 Stage 0 未孵化蛋 (10/15 EXP)
                level = 0;
                exp = 10;
                visualStage = 0;
                isHatched = false;
                stamp = null;
            } else if (i === 41) { // 吕四：初始达到 15 EXP 待破壳认领状态！
                level = 1;
                exp = 15;
                visualStage = 0;
                isHatched = false;
                stamp = 'HATCH';
            } else if (i === 4) { // 孙七：Lv.20 满级大师
                level = 20;
                exp = 1250;
                visualStage = 5;
                stamp = 'MAX';
            } else if (i === 1) { // 李四：Lv.8 进阶
                level = 8;
                exp = 265;
                visualStage = 3;
                stamp = 'EVOLVE';
            } else if (i === 8) { // 陈一：Lv.13 青年期
                level = 13;
                exp = 590;
                visualStage = 4;
                stamp = 'EVOLVE';
            } else {
                level = 1 + (i % 6);
                exp = LEVEL_THRESHOLDS[level] + (i * 3) % 20;
                visualStage = this.calcVisualStage(level, 1);
            }

            return {
                id: 'stu_' + (i + 1),
                no,
                name,
                group,
                level,
                exp,
                visualStage,
                stamp,
                isHatched,
                isAbsent: false,
                isArchived: false,
                minExpForCurrentLevel: this.getCurrentLevelMinExp(level),
                nextLevelExp: this.getNextLevelThreshold(level),
                activeSubject: 'chinese',
                pets: {
                    chinese: {
                        id: 'pet_c_' + (i + 1),
                        species: isHatched ? spCode : 'egg',
                        subject: '语文',
                        name: isHatched ? spInfo.name : '神秘宠物蛋',
                        icon: !isHatched ? '🐣' : (stamp === 'MAX' ? '👑' : spInfo.icon),
                        image: getPetImagePath(isHatched ? spCode : 'egg', visualStage),
                        level,
                        exp,
                        visualStage,
                        affection: isHatched ? 72 : 20,
                        fullness: 80,
                        energy: 90
                    },
                    math: {
                        id: 'pet_m_' + (i + 1),
                        species: 'egg',
                        subject: '数学',
                        name: '神秘宠物蛋 (待破壳)',
                        icon: '🐣',
                        image: getPetImagePath('egg', 0),
                        level: 0,
                        exp: 0,
                        visualStage: 0,
                        isHatched: false,
                        affection: 20,
                        fullness: 50,
                        energy: 50
                    },
                    english: {
                        id: 'pet_e_' + (i + 1),
                        species: 'egg',
                        subject: '英语',
                        name: '神秘宠物蛋 (待破壳)',
                        icon: '🐣',
                        image: getPetImagePath('egg', 0),
                        level: 0,
                        exp: 0,
                        visualStage: 0,
                        isHatched: false,
                        affection: 20,
                        fullness: 50,
                        energy: 50
                    }
                }
            };
        });

        this.save();
    }

    initCustomRules() {
        const cached = localStorage.getItem('classpet_custom_behavior_rules');
        if (cached) {
            try {
                this.behaviorRules = JSON.parse(cached);
                return;
            } catch (e) {}
        }
        this.behaviorRules = [...DEFAULT_BEHAVIOR_RULES];
        this.saveRules();
    }

    save() {
        const key = this.getStorageKey();
        const dataStr = JSON.stringify(this.students);
        localStorage.setItem(key, dataStr);
        if (this.getActiveAccountId() === 'acc_demo_302') {
            localStorage.setItem('classpet_v2_students_data', dataStr);
        }
    }

    saveRules() {
        localStorage.setItem('classpet_custom_behavior_rules', JSON.stringify(this.behaviorRules));
    }

    bindEvents() {
        const handleSync = (data) => {
            if (!data) return;
            const { type, payload } = data;
            if (type === 'STATE_SYNC') {
                this.students = payload.students;
                this.save();
                this.notify('SYNC', payload);
            } else if (type === 'SCORE_TRIGGERED') {
                if (payload.delta > 0) this.audio.playDing();
                else this.audio.playDeduct();
                this.notify('SCORE', payload);
            } else if (type === 'RULES_SYNC') {
                this.behaviorRules = payload.rules;
                this.saveRules();
                this.notify('RULES_UPDATE', payload);
            } else if (type === 'RANDOM_PICK_TRIGGERED') {
                this.notify('RANDOM_PICK', payload);
            } else if (type === 'THRESHOLDS_SYNC') {
                if (payload.thresholds) {
                    LEVEL_THRESHOLDS = payload.thresholds;
                    window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
                }
                if (payload.stageLevels) {
                    STAGE_MIN_LEVELS = payload.stageLevels;
                    window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
                }
                if (payload.students) {
                    this.students = payload.students;
                    this.save();
                }
                this.notify('THRESHOLDS_UPDATE', payload);
            }
        };

        this.channel.onmessage = (e) => handleSync(e.data);

        if (window.electronAPI && typeof window.electronAPI.onBroadcastSync === 'function') {
            window.electronAPI.onBroadcastSync((data) => handleSync(data));
        }

        window.addEventListener('storage', (e) => {
            if (e.key === 'classpet_v2_students_data' && e.newValue) {
                try {
                    this.students = JSON.parse(e.newValue);
                    this.notify('STORAGE_UPDATE');
                } catch (err) {}
            }
            if (e.key === 'classpet_custom_behavior_rules' && e.newValue) {
                try {
                    this.behaviorRules = JSON.parse(e.newValue);
                    this.notify('RULES_UPDATE');
                } catch (err) {}
            }
            if (e.key === 'classpet_custom_level_thresholds') {
                try {
                    LEVEL_THRESHOLDS = e.newValue ? JSON.parse(e.newValue) : [...DEFAULT_LEVEL_THRESHOLDS];
                    window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
                    this.recalculateAllStudentsProgress();
                    this.notify('THRESHOLDS_UPDATE');
                } catch (err) {}
            }
        });
    }

    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    notify(event, data) {
        this.listeners.forEach(fn => fn(event, data));
    }

    broadcast(type, payload) {
        this.channel.postMessage({ type, payload });
        if (window.electronAPI && typeof window.electronAPI.broadcastSync === 'function') {
            window.electronAPI.broadcastSync({ type, payload });
        }
    }

    // 赋分核心逻辑 (实现 01_schema.md 成长不变量)
    scoreStudent(id, delta, reason, isPrivate = false) {
        const student = this.students.find(s => s.id === id);
        if (!student) return;

        const currentPet = student.pets[student.activeSubject];
        const oldLevel = student.level || 0;
        const oldStage = student.visualStage || 0;

        student.exp = Math.max(0, student.exp + delta);
        currentPet.exp = student.exp;

        // 等级只升不降
        const newLevel = this.calcLevel(student.exp, student.level);
        student.level = newLevel;
        currentPet.level = newLevel;

        const newStage = this.calcVisualStage(newLevel, student.visualStage);
        student.visualStage = newStage;
        currentPet.visualStage = newStage;

        student.minExpForCurrentLevel = this.getCurrentLevelMinExp(student.level);
        student.nextLevelExp = this.getNextLevelThreshold(student.level);

        const isLevelUp = newLevel > oldLevel;
        const isStageUp = newStage > oldStage;

        if (!student.isHatched) {
            const hatchThresh = (this.levelThresholds && this.levelThresholds[1]) ? this.levelThresholds[1] : (LEVEL_THRESHOLDS[1] || 15);
            student.stamp = student.exp >= hatchThresh ? 'HATCH' : null;
            currentPet.icon = '🐣';
            currentPet.image = getPetImagePath('egg', 0);
        } else {
            const s2L = STAGE_MIN_LEVELS[2]?.minLevel || 4;
            const s3L = STAGE_MIN_LEVELS[3]?.minLevel || 8;
            const s4L = STAGE_MIN_LEVELS[4]?.minLevel || 13;
            const s5L = STAGE_MIN_LEVELS[5]?.minLevel || 20;
            if (student.level >= 20 || student.level >= s5L) {
                student.stamp = 'MAX';
                currentPet.icon = '👑';
            } else if ([s2L, s3L, s4L].includes(student.level)) {
                student.stamp = 'EVOLVE';
            } else {
                student.stamp = null;
            }
            currentPet.image = getPetImagePath(currentPet.species, student.visualStage);
        }

        this.save();

        const payload = {
            studentId: id,
            studentName: student.name,
            studentNo: student.no,
            student: student, // 传入精确对象指针，杜绝索引推导导致串人
            delta,
            reason,
            isPrivate,
            oldLevel,
            newLevel,
            oldStage,
            newStage,
            isLevelUp,
            isStageUp,
            stamp: student.stamp
        };

        if (delta > 0) this.audio.playDing();
        else this.audio.playDeduct();

        // 异步同步到 SQLite
        if (window.electronAPI && window.electronAPI.db && typeof window.electronAPI.db.recordScore === 'function') {
            window.electronAPI.db.recordScore({
                studentIds: [id],
                delta,
                reason,
                ruleId: isPrivate ? null : 'rule_quick'
            });
        }

        this.broadcast('SCORE_TRIGGERED', payload);
        this.notify('SCORE', payload);
        return payload;
    }

    batchScore(ids, delta, reason, isPrivate = false) {
        const leveledUpStudents = [];
        ids.forEach(id => {
            const student = this.students.find(s => s.id === id);
            if (student && !student.isAbsent) {
                const currentPet = student.pets[student.activeSubject];
                const oldLevel = student.level || 0;
                const oldStage = student.visualStage || 0;

                student.exp = Math.max(0, student.exp + delta);
                currentPet.exp = student.exp;

                const newLevel = this.calcLevel(student.exp, student.level);
                student.level = newLevel;
                currentPet.level = newLevel;

                const newStage = this.calcVisualStage(newLevel, student.visualStage);
                student.visualStage = newStage;
                currentPet.visualStage = newStage;

                student.minExpForCurrentLevel = this.getCurrentLevelMinExp(student.level);
                student.nextLevelExp = this.getNextLevelThreshold(student.level);

                const isLevelUp = newLevel > oldLevel;
                const isStageUp = newStage > oldStage;

                if (!student.isHatched) {
                    const hatchThresh = (this.levelThresholds && this.levelThresholds[1]) ? this.levelThresholds[1] : (LEVEL_THRESHOLDS[1] || 15);
                    student.stamp = student.exp >= hatchThresh ? 'HATCH' : null;
                    currentPet.icon = '🐣';
                    currentPet.image = getPetImagePath('egg', 0);
                } else {
                    const s2L = STAGE_MIN_LEVELS[2]?.minLevel || 4;
                    const s3L = STAGE_MIN_LEVELS[3]?.minLevel || 8;
                    const s4L = STAGE_MIN_LEVELS[4]?.minLevel || 13;
                    const s5L = STAGE_MIN_LEVELS[5]?.minLevel || 20;
                    if (student.level >= 20 || student.level >= s5L) {
                        student.stamp = 'MAX';
                        currentPet.icon = '👑';
                    } else if ([s2L, s3L, s4L].includes(student.level)) {
                        student.stamp = 'EVOLVE';
                    } else {
                        student.stamp = null;
                    }
                    currentPet.image = getPetImagePath(currentPet.species, student.visualStage);
                }

                if (isLevelUp) {
                    leveledUpStudents.push({
                        student,
                        studentId: student.id,
                        studentName: student.name,
                        studentNo: student.no,
                        oldLevel,
                        newLevel,
                        oldStage,
                        newStage,
                        isStageUp,
                        stamp: student.stamp
                    });
                }
            }
        });

        this.save();
        if (delta > 0) this.audio.playDing();
        else this.audio.playDeduct();

        // 异步同步到 SQLite
        if (window.electronAPI && window.electronAPI.db && typeof window.electronAPI.db.recordScore === 'function') {
            window.electronAPI.db.recordScore({
                studentIds: ids,
                delta,
                reason,
                ruleId: isPrivate ? null : 'rule_batch'
            });
        }

        const singleStudent = ids.length === 1 ? this.students.find(s => s.id === ids[0]) : null;
        const payload = {
            ids,
            studentId: singleStudent ? singleStudent.id : (leveledUpStudents[0]?.studentId || null),
            student: singleStudent || (leveledUpStudents[0]?.student || null),
            delta,
            reason,
            isPrivate,
            leveledUpStudents,
            isLevelUp: leveledUpStudents.length > 0,
            newLevel: singleStudent ? singleStudent.level : (leveledUpStudents[0]?.newLevel || null),
            newStage: singleStudent ? singleStudent.visualStage : (leveledUpStudents[0]?.newStage || null),
            isStageUp: singleStudent ? (leveledUpStudents.find(x => x.studentId === singleStudent.id)?.isStageUp || false) : (leveledUpStudents.length > 0 && leveledUpStudents.some(x => x.isStageUp))
        };
        this.broadcast('SCORE_TRIGGERED', payload);
        this.notify('SCORE', payload);
    }

    // 破壳认领中心：支持针对指定学科认领 8 大电子宠物
    hatchStudentPet(studentId, speciesCode, targetSubject = null) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return null;
        const sp = PET_SPECIES_CATALOG[speciesCode] ? speciesCode : 'cat';
        const info = PET_SPECIES_CATALOG[sp];

        const subjectKey = targetSubject || student.activeSubject || 'chinese';
        if (!student.pets[subjectKey]) {
            const subNameMap = { chinese: '语文', math: '数学', english: '英语' };
            student.pets[subjectKey] = {
                id: 'pet_' + subjectKey.charAt(0) + '_' + student.id,
                subject: subNameMap[subjectKey] || '综合',
                species: 'egg',
                name: '神秘宠物蛋',
                icon: '🐣',
                level: 1,
                exp: 15,
                visualStage: 0
            };
        }

        const currentPet = student.pets[subjectKey];
        currentPet.species = sp;
        currentPet.name = info.name;
        currentPet.icon = info.icon;
        currentPet.visualStage = 1;
        currentPet.image = getPetImagePath(sp, 1);
        currentPet.level = Math.max(1, currentPet.level || 1);
        const hatchThresh = typeof this.getHatchThreshold === 'function' ? this.getHatchThreshold() : 15;
        currentPet.exp = Math.max(hatchThresh, currentPet.exp || hatchThresh);
        currentPet.isHatched = true;

        student.isHatched = true;
        student.activeSubject = subjectKey;
        student.stamp = null;
        student.level = currentPet.level;
        student.exp = currentPet.exp;
        student.visualStage = currentPet.visualStage;

        student.minExpForCurrentLevel = this.getCurrentLevelMinExp(student.level);
        student.nextLevelExp = this.getNextLevelThreshold(student.level);

        this.save();
        this.audio.playFanfare();

        // 异步同步到 SQLite
        if (window.electronAPI && window.electronAPI.db && typeof window.electronAPI.db.hatchPet === 'function') {
            window.electronAPI.db.hatchPet({
                studentId: student.id,
                subjectCode: subjectKey,
                speciesCode: sp,
                nickname: info.name
            });
        }

        const payload = {
            studentId: student.id,
            studentName: student.name,
            studentNo: student.no,
            student: student,
            subject: subjectKey,
            species: sp,
            speciesName: info.name,
            icon: info.icon,
            image: currentPet.image
        };

        this.broadcast('HATCH_TRIGGERED', payload);
        this.notify('HATCH', payload);
        return student;
    }

    // 获取当前登录教师账号配置及学科角色信息 (第4点：联动教师学科属性)
    getCurrentAccount() {
        try {
            const raw = localStorage.getItem('classpet_current_account');
            if (raw) {
                const acc = JSON.parse(raw);
                if (acc && typeof acc === 'object') return acc;
            }
            const activeId = localStorage.getItem('classpet_active_account_id');
            const listRaw = localStorage.getItem('classpet_accounts_list');
            if (listRaw && activeId) {
                const list = JSON.parse(listRaw);
                if (Array.isArray(list)) {
                    const found = list.find(a => a.id === activeId);
                    if (found) return found;
                }
            }
        } catch (e) {}
        return {
            id: 'acc_demo_302',
            school: '实验小学本部',
            className: '三年级二班',
            teacherName: '刘老师',
            subject: '语文',
            isPreset: true
        };
    }

    // 获取当前学生在当前教师角色下允许破壳认领的学科列表
    getAvailableHatchSubjects(studentId) {
        const student = this.students.find(s => s.id === studentId);
        const curAcc = this.getCurrentAccount ? this.getCurrentAccount() : {};
        const teacherSubject = curAcc.subject || '综合';

        const hatchedSubjects = [];
        const unhatchedSubjects = [];
        ['chinese', 'math', 'english'].forEach(sub => {
            const p = student?.pets?.[sub];
            if (p && p.species && p.species !== 'egg' && (p.isHatched || (p.visualStage && p.visualStage >= 1))) {
                hatchedSubjects.push(sub);
            } else {
                unhatchedSubjects.push(sub);
            }
        });

        // 规则 1：如果是班主任 / 综合账号：
        // 允许从第 1 只宠物蛋开始自主选择任意学科
        if (teacherSubject === '综合' || teacherSubject.includes('班主任')) {
            return {
                mode: 'free',
                teacherSubject,
                allowedSubjects: unhatchedSubjects.length > 0 ? unhatchedSubjects : ['chinese'],
                hatchedSubjects,
                defaultSubject: unhatchedSubjects[0] || 'chinese',
                reason: '班主任权限：可自由选择任意未孵化宠物蛋的学科'
            };
        }

        // 规则 2：如果是单科教师（语文 / 数学 / 英语）：
        const subjectMap = { '语文': 'chinese', '数学': 'math', '英语': 'english' };
        const mySubject = subjectMap[teacherSubject] || 'chinese';

        if (!hatchedSubjects.includes(mySubject)) {
            return {
                mode: 'subject_locked',
                teacherSubject,
                allowedSubjects: [mySubject],
                hatchedSubjects,
                defaultSubject: mySubject,
                reason: `【${teacherSubject}】任课教师：首次孵化必须认领【${teacherSubject}】专属电子宠物`
            };
        }

        // 本科已破壳，孵化下一只宠物蛋时，在另外两个学科中选择其一
        return {
            mode: 'secondary_choice',
            teacherSubject,
            allowedSubjects: unhatchedSubjects,
            hatchedSubjects,
            defaultSubject: unhatchedSubjects[0] || (mySubject === 'chinese' ? 'math' : 'chinese'),
            reason: `已认领【${teacherSubject}】宠物，现可从其余未孵化学科中选择其一`
        };
    }

    // 治愈系互动动作：每日 5 EXP 限制、触发温馨台词
    doPetInteraction(studentId, actionName, baseExp = 1) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return null;

        const todayKey = 'classpet_daily_interact_' + new Date().toISOString().slice(0, 10);
        let dailyRecord = {};
        try {
            dailyRecord = JSON.parse(localStorage.getItem(todayKey) || '{}');
        } catch (e) {}

        const currentStudentPoints = dailyRecord[studentId] || 0;
        const MAX_DAILY_EXP = 5;
        let awarded = 0;
        let limitReached = false;

        if (currentStudentPoints >= MAX_DAILY_EXP) {
            limitReached = true;
            awarded = 0;
        } else {
            awarded = Math.min(baseExp, MAX_DAILY_EXP - currentStudentPoints);
            dailyRecord[studentId] = currentStudentPoints + awarded;
            try {
                localStorage.setItem(todayKey, JSON.stringify(dailyRecord));
            } catch (e) {}
            if (awarded > 0) {
                this.scoreStudent(studentId, awarded, `互动:${actionName}`);
            }
        }

        let quote = "";
        const actionKeyMap = {
            '打招呼': 'greet',
            '抚摸': 'pet',
            '玩耍': 'play',
            '喂水': 'water',
            '喂食': 'feed',
            '安抚': 'comfort'
        };
        const resolvedKey = actionKeyMap[actionName] || actionName;

        if (!student.isHatched) {
            const eggQuotes = PET_ACTION_QUOTES.egg;
            quote = eggQuotes[Math.floor(Math.random() * eggQuotes.length)];
        } else if (PET_ACTION_QUOTES[resolvedKey] && PET_ACTION_QUOTES[resolvedKey].length > 0) {
            const actList = PET_ACTION_QUOTES[resolvedKey];
            quote = actList[Math.floor(Math.random() * actList.length)];
        } else {
            quote = PET_HEALING_QUOTES[Math.floor(Math.random() * PET_HEALING_QUOTES.length)];
        }
        this.audio.playDing();

        const result = {
            studentId,
            studentName: student.name,
            actionName,
            quote,
            awarded,
            limitReached,
            todayTotal: dailyRecord[studentId] || currentStudentPoints
        };

        this.notify('INTERACTION', result);
        return result;
    }

    // 学生日常管理：单个新增 (默认初始为蛋形态，0分0级)
    addStudent({ name, group = 1, species = 'egg', initialHatched = false }) {
        const nextIdNum = this.students.length + 1;
        const id = 'stu_' + Date.now();
        const no = nextIdNum.toString().padStart(2, '0');
        const isHatched = !!initialHatched;
        const sp = isHatched ? (PET_SPECIES_CATALOG[species] ? species : 'cat') : 'egg';
        const info = PET_SPECIES_CATALOG[sp] || { name: '神秘宠物蛋', icon: '🐣' };

        const level = isHatched ? 1 : 0;
        const exp = isHatched ? 15 : 0;
        const visualStage = isHatched ? 1 : 0;

        const newStudent = {
            id,
            no,
            name: name || `新同学${nextIdNum}`,
            group: parseInt(group, 10) || 1,
            level,
            exp,
            visualStage,
            stamp: null,
            isHatched,
            isAbsent: false,
            isArchived: false,
            minExpForCurrentLevel: this.getCurrentLevelMinExp(level),
            nextLevelExp: this.getNextLevelThreshold(level),
            activeSubject: 'chinese',
            pets: {
                chinese: {
                    id: 'pet_c_' + Date.now(),
                    species: isHatched ? sp : 'egg',
                    subject: '语文',
                    name: isHatched ? info.name : '神秘宠物蛋',
                    icon: !isHatched ? '🐣' : info.icon,
                    image: getPetImagePath(isHatched ? sp : 'egg', visualStage),
                    level,
                    exp,
                    visualStage,
                    affection: 60,
                    fullness: 80,
                    energy: 90
                },
                math: {
                    id: 'pet_m_' + Date.now(),
                    species: 'dog',
                    subject: '数学',
                    name: '柴犬',
                    icon: '🐶',
                    image: getPetImagePath('dog', 1),
                    level: 1,
                    exp: 15,
                    visualStage: 1,
                    affection: 60,
                    fullness: 70,
                    energy: 65
                },
                english: {
                    id: 'pet_e_' + Date.now(),
                    species: 'fox',
                    subject: '英语',
                    name: '赤狐',
                    icon: '🦊',
                    image: getPetImagePath('fox', 1),
                    level: 1,
                    exp: 15,
                    visualStage: 1,
                    affection: 55,
                    fullness: 60,
                    energy: 85
                }
            }
        };

        this.students.push(newStudent);
        this.save();
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_ADDED', newStudent);
        return newStudent;
    }

    // 学生日常管理：编辑资料
    updateStudent(id, fields) {
        const student = this.students.find(s => s.id === id);
        if (!student) return null;
        if (fields.name !== undefined) student.name = fields.name.trim();
        if (fields.no !== undefined) student.no = fields.no.trim();
        if (fields.group !== undefined) student.group = parseInt(fields.group, 10);
        if (fields.species && PET_SPECIES_CATALOG[fields.species]) {
            const sp = fields.species;
            const info = PET_SPECIES_CATALOG[sp];
            const currentPet = student.pets[student.activeSubject];
            currentPet.species = sp;
            currentPet.name = info.name;
            currentPet.icon = info.icon;
            currentPet.image = getPetImagePath(sp, student.visualStage);
        }
        this.save();
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_UPDATED', student);
        return student;
    }

    // 学生日常管理：软归档 (不影响历史总分与行为流水)
    archiveStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (!student) return false;
        student.isArchived = true;
        this.save();
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_ARCHIVED', { id });
        return true;
    }

    // 学生日常管理：还原归档学生
    restoreStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (!student) return false;
        student.isArchived = false;
        this.save();
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_RESTORED', { id });
        return true;
    }

    // 永久删除
    deleteStudentPermanent(id) {
        this.students = this.students.filter(s => s.id !== id);
        this.save();
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_DELETED', { id });
        return true;
    }

    // 班级数据一键备份导出 (.json)
    exportClassData() {
        const backupData = {
            appVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            classroom: '三年级二班',
            totalStudents: this.students.length,
            levelThresholds: LEVEL_THRESHOLDS,
            stageMinLevels: STAGE_MIN_LEVELS,
            students: this.students,
            behaviorRules: this.behaviorRules
        };
        return JSON.stringify(backupData, null, 2);
    }

    // 班级数据还原导入 (.json)
    importClassData(jsonContent) {
        try {
            const parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
            if (!parsed || !Array.isArray(parsed.students)) {
                throw new Error('无效的班级备份文件结构 (缺少 students 数组)');
            }
            this.students = parsed.students;
            if (Array.isArray(parsed.behaviorRules)) {
                this.behaviorRules = parsed.behaviorRules;
                this.saveRules();
            }
            if (Array.isArray(parsed.levelThresholds) && parsed.levelThresholds.length === 21) {
                LEVEL_THRESHOLDS = parsed.levelThresholds;
                localStorage.setItem('classpet_custom_level_thresholds', JSON.stringify(LEVEL_THRESHOLDS));
                window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
            }
            if (Array.isArray(parsed.stageMinLevels) && parsed.stageMinLevels.length === 6) {
                STAGE_MIN_LEVELS = parsed.stageMinLevels;
                localStorage.setItem('classpet_custom_stage_levels', JSON.stringify(STAGE_MIN_LEVELS));
                window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
            }
            this.recalculateAllStudentsProgress();
            this.audio.playFanfare();
            this.broadcast('STATE_SYNC', { students: this.students });
            this.broadcast('RULES_SYNC', { rules: this.behaviorRules });
            this.broadcast('THRESHOLDS_SYNC', { thresholds: LEVEL_THRESHOLDS, stageLevels: STAGE_MIN_LEVELS, students: this.students });
            this.notify('DATA_RESTORED', { count: this.students.length });
            return { success: true, count: this.students.length };
        } catch (e) {
            console.error('Import failed:', e);
            return { success: false, error: e.message };
        }
    }

    // 自定义加减分行为项管理
    addCustomRule(name, points, type) {
        const id = 'custom_' + Date.now();
        const newRule = {
            id,
            name,
            points: type === 'negative' ? -Math.abs(points) : Math.abs(points),
            type,
            isPreset: false
        };
        this.behaviorRules.push(newRule);
        this.saveRules();
        this.broadcast('RULES_SYNC', { rules: this.behaviorRules });
        this.notify('RULES_UPDATE', { rules: this.behaviorRules });
        return newRule;
    }

    deleteCustomRule(id) {
        this.behaviorRules = this.behaviorRules.filter(r => r.id !== id);
        this.saveRules();
        this.broadcast('RULES_SYNC', { rules: this.behaviorRules });
        this.notify('RULES_UPDATE', { rules: this.behaviorRules });
    }

    // 考勤切换
    toggleAttendance(id) {
        const s = this.students.find(x => x.id === id);
        if (s) {
            s.isAbsent = !s.isAbsent;
            this.save();
            this.broadcast('STATE_SYNC', { students: this.students });
            this.notify('ATTENDANCE', { id, isAbsent: s.isAbsent });
        }
    }

    // 随机抽选
    startRandomPick() {
        const presentStudents = this.students.filter(s => !s.isAbsent && !s.isArchived);
        if (presentStudents.length === 0) return null;
        const chosen = presentStudents[Math.floor(Math.random() * presentStudents.length)];
        this.broadcast('RANDOM_PICK_TRIGGERED', { chosenId: chosen.id });
        this.notify('RANDOM_PICK', { chosenId: chosen.id });
        return chosen;
    }

    getGroupStats() {
        const activeList = this.students.filter(s => !s.isArchived);
        const groups = [1, 2, 3, 4].map(g => {
            const list = activeList.filter(s => s.group === g);
            const totalExp = list.reduce((sum, s) => sum + s.exp, 0);
            const avgLevel = list.length ? (list.reduce((sum, s) => sum + s.level, 0) / list.length).toFixed(1) : 0;
            return {
                group: g,
                name: `第 ${g} 大组`,
                memberCount: list.length,
                totalExp,
                avgLevel,
                members: list
            };
        });
        groups.sort((a, b) => b.totalExp - a.totalExp);
        return groups;
    }
}

window.classPetRuntime = new ClassPetStore();
window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
window.STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
window.PET_SPECIES_CATALOG = PET_SPECIES_CATALOG;
window.PET_HEALING_QUOTES = PET_HEALING_QUOTES;
window.getPetImagePath = getPetImagePath;

