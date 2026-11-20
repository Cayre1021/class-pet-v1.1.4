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
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
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

    playLevelUp() {
        this.playFanfare();
    }

    playHatch() {
        this.playFanfare();
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
// 2.4 V3 统一 ViewModel 的学科/形态/身份常量（批次 2 · 只读适配）
// ==========================================
const V3_SUBJECTS = {
    chinese: { code: 'chinese', subjectId: 'subj_chinese', label: '语文' },
    math: { code: 'math', subjectId: 'subj_math', label: '数学' },
    english: { code: 'english', subjectId: 'subj_english', label: '英语' }
};

function normalizeSubjectCode(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return 'chinese';
    if (V3_SUBJECTS[raw]) return raw;
    const byLabel = Object.keys(V3_SUBJECTS).filter(k => V3_SUBJECTS[k].label === raw)[0];
    if (byLabel) return byLabel;
    if (raw === 'subj_math') return 'math';
    if (raw === 'subj_english') return 'english';
    return 'chinese';
}

// 形态阶梯只认 STAGE_MIN_LEVELS（禁止 ceil(level/2)、level-2 之类的演示公式）
function v3StageForLevel(level, stages) {
    const list = (Array.isArray(stages) && stages.length) ? stages : STAGE_MIN_LEVELS;
    const lv = Math.max(0, Number(level) || 0);
    let picked = list[0];
    for (let i = 0; i < list.length; i++) {
        if (lv >= Number(list[i].minLevel)) picked = list[i];
    }
    return picked;
}

function v3StageName(stage, stages) {
    const list = (Array.isArray(stages) && stages.length) ? stages : STAGE_MIN_LEVELS;
    const hit = list.filter(s => Number(s.stage) === Number(stage))[0];
    return (hit && hit.name) ? hit.name : '初始宠物蛋';
}

// 内置演示名单特征（initData 生成的那批）：只活在本页内存，绝不写进班级库
function isDemoRosterList(list) {
    if (!Array.isArray(list) || list.length !== 42) return false;
    for (let i = 0; i < list.length; i++) {
        if (!list[i] || String(list[i].id) !== 'stu_' + (i + 1)) return false;
    }
    return true;
}

function safeElectronAPI() {
    return (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : null;
}

function safeElectronDB() {
    const api = safeElectronAPI();
    return (api && api.db) ? api.db : null;
}

// ==========================================
// 3. 核心数据管理与跨屏通信 Store
// ==========================================
class ClassPetStore {
    constructor() {
        this.channel = typeof BroadcastChannel !== 'undefined'
            ? new BroadcastChannel('classpet_sync_channel')
            : { postMessage: () => {}, onmessage: null };
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
            if (typeof window !== 'undefined') {
                window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
                window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
            }
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
        if (typeof window !== 'undefined') {
            window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
        }
        if (!safeElectronDB()) {
            localStorage.setItem('classpet_custom_level_thresholds', JSON.stringify(cleanThresholds));
        }

        if (Array.isArray(newStages) && newStages.length === 6) {
            STAGE_MIN_LEVELS = newStages;
            if (typeof window !== 'undefined') {
                window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
            }
            if (!safeElectronDB()) {
                localStorage.setItem('classpet_custom_stage_levels', JSON.stringify(newStages));
            }
        }

        this.recalculateAllStudentsProgress();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.saveThresholds === 'function') {
            db.saveThresholds(cleanThresholds, STAGE_MIN_LEVELS, classId);
        }

        this.broadcast('THRESHOLDS_SYNC', { thresholds: LEVEL_THRESHOLDS, stageLevels: STAGE_MIN_LEVELS, students: this.students });
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('THRESHOLDS_UPDATE', { thresholds: LEVEL_THRESHOLDS, stageLevels: STAGE_MIN_LEVELS, students: this.students });
        return { success: true };
    }

    resetLevelThresholds() {
        LEVEL_THRESHOLDS = [...DEFAULT_LEVEL_THRESHOLDS];
        STAGE_MIN_LEVELS = JSON.parse(JSON.stringify(DEFAULT_STAGE_MIN_LEVELS));
        if (typeof window !== 'undefined') {
            window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
            window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
        }
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
            const curStage = (s.visualStage !== undefined && s.visualStage !== null)
                ? s.visualStage
                : (s.isHatched ? 1 : 0);
            s.visualStage = curStage;
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
                    const targetStage = this.calcVisualStage(s.level, 0);
                    if (s.level >= 20 && curStage >= 5) {
                        s.stamp = 'MAX';
                        curPet.icon = '👑';
                    } else if (targetStage > curStage && curStage < 5) {
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

    /**
     * 官方标准：获取全维度统一的经验成长与升段进度对象
     * 严格遵循“进度条显示的是当前等级升级到下一个等级的进度”的教学规范
     * @param {number} exp 当前总经验值
     * @param {number} level 当前等级 (0~20)
     * @param {boolean} isHatched 是否已破壳
     */
    getExpProgress(exp = 0, level = 0, isHatched = true) {
        const hatchThresh = this.getHatchThreshold ? this.getHatchThreshold() : 15;
        const petExp = Math.max(0, Number(exp) || 0);
        const petLevel = Math.max(0, Number(level) || 0);

        // 1. 蛋形态 (未孵化破壳)
        if (!isHatched || petLevel === 0) {
            const percent = Math.min(100, Math.max(0, Math.round((petExp / hatchThresh) * 100)));
            const needExp = Math.max(0, hatchThresh - petExp);
            const currentProg = Math.min(hatchThresh, petExp);
            return {
                isEgg: true,
                isMax: false,
                level: 0,
                levelLabel: 'Lv.0 (蛋形态)',
                totalExp: petExp,
                levelMinExp: 0,
                levelNextExp: hatchThresh,
                levelSpan: hatchThresh,
                progressInLevel: currentProg,
                needExp: needExp,
                percent: percent,
                rateText: `当前 ${currentProg} / 破壳 ${hatchThresh} EXP (${percent}%)`,
                cardRateText: `${currentProg}/${hatchThresh}`,
                barLabelLeft: `🐣 孵化破壳能量`,
                barLabelRight: `当前 ${currentProg} / 破壳 ${hatchThresh} EXP (${percent}%)`,
                startMilestone: `0 EXP (诞生起点)`,
                targetMilestone: `${hatchThresh} EXP (破壳目标)`,
                detailText: needExp === 0 ? `🐣 破壳能量已积满！可点击下方按钮立即破壳认领！` : `⭐ 当前累计: ${petExp} EXP · 还差 ${needExp} EXP 破壳 (课堂加分可加速)`
            };
        }

        // 2. 满级王者顶峰 (Lv.20 MAX)
        if (petLevel >= 20) {
            const maxThreshold = this.getCurrentLevelMinExp(20);
            return {
                isEgg: false,
                isMax: true,
                level: 20,
                levelLabel: 'Lv.20 👑 MAX',
                totalExp: petExp,
                levelMinExp: maxThreshold,
                levelNextExp: maxThreshold,
                levelSpan: 0,
                progressInLevel: 0,
                needExp: 0,
                percent: 100,
                rateText: `MAX (已达顶峰)`,
                cardRateText: `MAX`,
                barLabelLeft: `👑 王者巅峰 · 最高等级达成`,
                barLabelRight: `100% (${petExp} EXP 👑 已达顶峰)`,
                startMilestone: `${maxThreshold} EXP (Lv.20 起点)`,
                targetMilestone: `👑 MAX 荣耀顶峰`,
                detailText: `⭐ 累计总经验: ${petExp} EXP · 已达成最高满级 (王者)`
            };
        }

        // 3. 正常升级阶梯 (Lv.1 ~ Lv.19)
        // 严格遵循用户诉求：“进度条显示的是当前等级升级到下一个等级的进度”
        const levelMinExp = this.getCurrentLevelMinExp(petLevel);
        const levelNextExp = this.getNextLevelThreshold(petLevel);
        const levelSpan = Math.max(1, levelNextExp - levelMinExp);
        const progressInLevel = Math.min(levelSpan, Math.max(0, petExp - levelMinExp));
        const needExp = Math.max(0, levelNextExp - petExp);
        let percent = Math.min(100, Math.max(0, Math.round((progressInLevel / levelSpan) * 100)));
        if (progressInLevel > 0 && percent < 5) percent = 5;

        return {
            isEgg: false,
            isMax: false,
            level: petLevel,
            levelLabel: `LV.${petLevel}`,
            totalExp: petExp,
            levelMinExp: levelMinExp,
            levelNextExp: levelNextExp,
            levelSpan: levelSpan,
            progressInLevel: progressInLevel,
            needExp: needExp,
            percent: percent,
            rateText: `当前 ${petExp} / 目标 ${levelNextExp} EXP (${percent}%)`,
            cardRateText: `${petExp}/${levelNextExp}`,
            barLabelLeft: `🌟 升级进度 (Lv.${petLevel} ➔ Lv.${petLevel + 1})`,
            barLabelRight: `当前 ${petExp} / 目标 ${levelNextExp} EXP (${percent}%)`,
            startMilestone: `${levelMinExp} EXP (Lv.${petLevel} 起点)`,
            targetMilestone: `${levelNextExp} EXP (Lv.${petLevel + 1} 目标)`,
            detailText: `⭐ 当前累计: ${petExp} EXP · 升至 Lv.${petLevel + 1} 还差 ${needExp} EXP (本级已攒 ${progressInLevel}/${levelSpan} EXP)`
        };
    }

    // 从本地 SQLite 数据库中真实同步全班数据模型 (第14点：真接入本地数据库)
    async loadFromSQLite() {
        const db = safeElectronDB();
        if (!db || typeof db.loadAllState !== 'function') {
            return false;
        }
        try {
            const classId = this.getClassId();
            const state = await db.loadAllState(classId);
            if (state && Array.isArray(state.students) && state.students.length > 0) {
                console.log('[ClassPetStore] 成功从本地 SQLite 数据库载入班级真实状态，学生数:', state.students.length);
                const prevStudentMap = new Map();
                if (Array.isArray(this.students)) {
                    this.students.forEach(s => {
                        prevStudentMap.set(s.id, s);
                    });
                }
                // 用数据库里的阈值与形态配置覆盖本地缓存（修：改完阈值重启失效）
                if (state.thresholds && typeof state.thresholds === 'object') {
                    const nextT = LEVEL_THRESHOLDS.slice();
                    Object.keys(state.thresholds).forEach(k => {
                        const lv = Number(k);
                        if (Number.isFinite(lv) && lv >= 0 && lv < nextT.length) nextT[lv] = Number(state.thresholds[k]);
                    });
                    LEVEL_THRESHOLDS = nextT;
                }
                if (Array.isArray(state.stages) && state.stages.length) {
                    const nextS = STAGE_MIN_LEVELS.map(s => Object.assign({}, s));
                    state.stages.forEach(st => {
                        const idx = Number(st.stage);
                        if (Number.isFinite(idx) && idx >= 0 && idx < nextS.length) {
                            nextS[idx] = { stage: idx, minLevel: Number(st.minLevel), code: st.code || nextS[idx].code, name: nextS[idx].name };
                        }
                    });
                    STAGE_MIN_LEVELS = nextS;
                }
                if (typeof window !== 'undefined') {
                    window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
                    window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
                }
                const spKeys = Object.keys(PET_SPECIES_CATALOG);
                let hadHigherMemoryExp = false;
                const loadedStudents = state.students.map((stRow, idx) => {
                    const existing = prevStudentMap.get(stRow.id);
                    const stPets = (state.petsByStudent && state.petsByStudent[stRow.id]) ? state.petsByStudent[stRow.id] : {};
                    const primaryPetRow = stPets.chinese || Object.values(stPets)[0];
                    const spCode = primaryPetRow ? (primaryPetRow.species_code || 'cat') : (existing?.pets?.chinese?.species || spKeys[idx % spKeys.length]);
                    const spInfo = PET_SPECIES_CATALOG[spCode] || PET_SPECIES_CATALOG.cat;
                    const stage = (primaryPetRow && primaryPetRow.visual_stage !== undefined && primaryPetRow.visual_stage !== null) ? primaryPetRow.visual_stage : 0;
                    const isHatched = stage >= 1;
                    const level = (primaryPetRow && primaryPetRow.level !== undefined && primaryPetRow.level !== null) ? primaryPetRow.level : (isHatched ? 1 : 0);
                    const exp = (primaryPetRow && primaryPetRow.exp !== undefined && primaryPetRow.exp !== null) ? primaryPetRow.exp : (isHatched ? 15 : 0);

                    // 核心单调递增合并 (避免 SQLite 异步载入覆盖刚刚赋分的更高经验或重启前尚未落盘的经验)
                    const existChineseExp = existing?.pets?.chinese?.exp ?? (existing?.activeSubject === 'chinese' ? existing?.exp : 0) ?? 0;
                    const sqliteChineseExp = (stPets.chinese?.exp !== undefined ? stPets.chinese.exp : exp);
                    const finalChineseExp = Math.max(existChineseExp, sqliteChineseExp);
                    if (existChineseExp > sqliteChineseExp) hadHigherMemoryExp = true;
                    const finalChineseLvl = Math.max(existing?.pets?.chinese?.level ?? 0, stPets.chinese?.level ?? level, this.calcLevel(finalChineseExp, 0));
                    const finalChineseStage = Math.max(existing?.pets?.chinese?.visualStage ?? (isHatched ? 1 : 0), stPets.chinese?.visual_stage ?? stage, this.calcVisualStage(finalChineseLvl, 0));

                    const existMathExp = existing?.pets?.math?.exp ?? (existing?.activeSubject === 'math' ? existing?.exp : 0) ?? 0;
                    const sqliteMathExp = (stPets.math?.exp !== undefined ? stPets.math.exp : 0);
                    const finalMathExp = Math.max(existMathExp, sqliteMathExp);
                    if (existMathExp > sqliteMathExp) hadHigherMemoryExp = true;
                    const finalMathLvl = Math.max(existing?.pets?.math?.level ?? 0, stPets.math?.level ?? 0, this.calcLevel(finalMathExp, 0));
                    const finalMathStage = Math.max(existing?.pets?.math?.visualStage ?? 0, stPets.math?.visual_stage ?? 0, this.calcVisualStage(finalMathLvl, 0));
                    const isMathHatched = (finalMathStage >= 1) || !!(existing?.pets?.math?.isHatched);

                    const existEngExp = existing?.pets?.english?.exp ?? (existing?.activeSubject === 'english' ? existing?.exp : 0) ?? 0;
                    const sqliteEngExp = (stPets.english?.exp !== undefined ? stPets.english.exp : 0);
                    const finalEngExp = Math.max(existEngExp, sqliteEngExp);
                    if (existEngExp > sqliteEngExp) hadHigherMemoryExp = true;
                    const finalEngLvl = Math.max(existing?.pets?.english?.level ?? 0, stPets.english?.level ?? 0, this.calcLevel(finalEngExp, 0));
                    const finalEngStage = Math.max(existing?.pets?.english?.visualStage ?? 0, stPets.english?.visual_stage ?? 0, this.calcVisualStage(finalEngLvl, 0));
                    const isEngHatched = (finalEngStage >= 1) || !!(existing?.pets?.english?.isHatched);

                    const activeSubject = existing?.activeSubject || (primaryPetRow?.subject_id === 'subj_math' ? 'math' : (primaryPetRow?.subject_id === 'subj_english' ? 'english' : 'chinese'));

                    // 学生顶层属性与当前 activeSubject 保持绝对同步
                    let activeExp = finalChineseExp;
                    let activeLvl = finalChineseLvl;
                    let activeStage = finalChineseStage;
                    let activeIsHatched = isHatched;
                    if (activeSubject === 'math') {
                        activeExp = finalMathExp;
                        activeLvl = finalMathLvl;
                        activeStage = finalMathStage;
                        activeIsHatched = isMathHatched;
                    } else if (activeSubject === 'english') {
                        activeExp = finalEngExp;
                        activeLvl = finalEngLvl;
                        activeStage = finalEngStage;
                        activeIsHatched = isEngHatched;
                    }

                    const hatchThresh = (this.levelThresholds && this.levelThresholds[1]) ? this.levelThresholds[1] : 15;
                    const targetStage = this.calcVisualStage(activeLvl, 0);
                    let stamp = null;
                    if (!activeIsHatched) {
                        stamp = activeExp >= hatchThresh ? 'HATCH' : null;
                    } else if (activeLvl >= 20 && activeStage >= 5) {
                        stamp = 'MAX';
                    } else if (targetStage > activeStage && activeStage < 5) {
                        stamp = 'EVOLVE';
                    } else {
                        stamp = null;
                    }

                    return {
                        id: stRow.id,
                        no: stRow.student_no || (idx + 1).toString().padStart(2, '0'),
                        name: stRow.name || `学生${idx + 1}`,
                        group: parseInt((stRow.group_name || '1').replace(/\D/g, ''), 10) || ((idx % 4) + 1),
                        level: activeLvl,
                        exp: activeExp,
                        visualStage: activeStage,
                        stamp,
                        isHatched: activeIsHatched,
                        isAbsent: prevStudentMap.get(stRow.id)?.isAbsent || false,
                        isArchived: !!stRow.archived_at,
                        minExpForCurrentLevel: this.getCurrentLevelMinExp(activeLvl),
                        nextLevelExp: this.getNextLevelThreshold(activeLvl),
                        activeSubject: activeSubject,
                        pets: {
                            chinese: {
                                id: stPets.chinese?.id || 'pet_' + stRow.id + '_c',
                                species: isHatched ? (stPets.chinese?.species_code || spCode) : 'egg',
                                subject: '语文',
                                name: isHatched ? (stPets.chinese?.nickname || spInfo.name) : '神秘宠物蛋',
                                icon: isHatched ? spInfo.icon : '🐣',
                                image: getPetImagePath(isHatched ? (stPets.chinese?.species_code || spCode) : 'egg', finalChineseStage),
                                level: finalChineseLvl,
                                exp: finalChineseExp,
                                visualStage: finalChineseStage,
                                isHatched,
                                affection: 70, fullness: 80, energy: 80
                            },
                            math: {
                                id: stPets.math?.id || 'pet_' + stRow.id + '_m',
                                species: isMathHatched ? (stPets.math?.species_code || 'cat') : 'egg',
                                subject: '数学',
                                name: isMathHatched ? (stPets.math?.nickname || '数学萌宠') : '神秘宠物蛋 (待破壳)',
                                icon: isMathHatched ? (PET_SPECIES_CATALOG[stPets.math?.species_code]?.icon || '📐') : '🐣',
                                image: getPetImagePath(isMathHatched ? (stPets.math?.species_code || 'cat') : 'egg', finalMathStage),
                                level: finalMathLvl,
                                exp: finalMathExp,
                                visualStage: finalMathStage,
                                isHatched: isMathHatched,
                                affection: 20, fullness: 50, energy: 50
                            },
                            english: {
                                id: stPets.english?.id || 'pet_' + stRow.id + '_e',
                                species: isEngHatched ? (stPets.english?.species_code || 'cat') : 'egg',
                                subject: '英语',
                                name: isEngHatched ? (stPets.english?.nickname || '英语萌宠') : '神秘宠物蛋 (待破壳)',
                                icon: isEngHatched ? (PET_SPECIES_CATALOG[stPets.english?.species_code]?.icon || '🔤') : '🐣',
                                image: getPetImagePath(isEngHatched ? (stPets.english?.species_code || 'cat') : 'egg', finalEngStage),
                                level: finalEngLvl,
                                exp: finalEngExp,
                                visualStage: finalEngStage,
                                isHatched: isEngHatched,
                                affection: 20, fullness: 50, energy: 50
                            }
                        }
                    };
                });

                // 核心安全合并机制：杜绝 SQLite 刚启动滞后导致内存中新增/导入的学生被覆盖删除
                if (Array.isArray(this.students) && this.students.length > 0 && !this.isDemoRoster) {
                    const loadedIds = new Set(loadedStudents.map(s => s.id));
                    const missingInDb = this.students.filter(s => !loadedIds.has(s.id));
                    if (missingInDb.length > 0) {
                        console.log(`[ClassPetStore] 发现 ${missingInDb.length} 名学生在内存中存在但在 SQLite 暂无，正在补充落盘...`);
                        for (const s of missingInDb) {
                            loadedStudents.push(s);
                            if (db && typeof db.saveStudent === 'function') {
                                db.saveStudent(s, classId);
                            }
                        }
                    }
                }

                // 只以数据库为准：不再把"内存/localStorage 里更高的经验"回写数据库。
                // 旧逻辑会拿 localStorage 镜像去覆盖库（撤销后重启会把旧经验写回，撤销白撤；
                // 序号/并发场景也会让镜像压过库）。现在所有写入口都直接写库（v3Score/v3UndoLast/...），
                // localStorage 只剩给老页面兜底的只读镜像，绝不反向写库。
                if (hadHigherMemoryExp) {
                    console.warn('[ClassPetStore] 检测到 localStorage 镜像经验高于数据库，已忽略（以库为准）');
                }

                this.students = loadedStudents;
                this.save();
                this.broadcast('STATE_SYNC', { students: this.students });
                this.notify('STATE_SYNC', { students: this.students });
                this.notify('SYNC', { students: this.students });
                return true;
            } else if (this.students && this.students.length > 0 && !this.isDemoRoster) {
                // 老版本本机名单（localStorage 镜像）一次性迁进数据库；演示名单除外
                if (db && typeof db.importStudents === 'function') {
                    const migrate = await db.importStudents(this.students, classId);
                    if (migrate && migrate.success === true) {
                        this._v3DropStaleRosterCache();   // 迁完就清镜像，之后以库为准
                        console.log('[ClassPetStore] 已将本机旧名单迁移到数据库，本地镜像已清理:', this.students.length, '人');
                    }
                }
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
            classId: 'c_class02_01',
            school: '实验小学本部',
            className: '三年级二班',
            subject: '语文',
            teacherName: '刘老师',
            isPreset: true
        };
    }

    getClassId() {
        const acc = this.getCurrentAccount ? this.getCurrentAccount() : {};
        if (acc && acc.classId) return acc.classId;
        if (acc && acc.id === 'acc_demo_302') return 'c_class02_01';
        if (acc && acc.id === 'acc_demo_401') return 'c_class04_01';
        if (acc && acc.id) return 'c_' + acc.id;
        return 'c_class02_01';
    }

    getStorageKey() {
        return 'classpet_v2_students_data_' + this.getActiveAccountId();
    }

    getCurrentTeachingSubject() {
        const sub = localStorage.getItem('classpet_current_teaching_subject') || localStorage.getItem('classpet_teacher_subject');
        if (!sub || sub === '综合' || sub === 'general' || sub === '通用' || sub === '班主任') return 'chinese';
        return sub;
    }

    setCurrentTeachingSubject(sub) {
        if (!sub) return;
        localStorage.setItem('classpet_current_teaching_subject', sub);
        localStorage.setItem('classpet_teacher_subject', sub);
        this.broadcast('TEACHING_SUBJECT_SYNC', { subject: sub });
        this.notify('TEACHING_SUBJECT_CHANGE', { subject: sub });
    }

    getCurrentLevelMinExp(level) {
        return LEVEL_THRESHOLDS[Math.min(level, 20)];
    }

    // 账号上下文（D13=A）：classId/teacherId 取账号缓存，姓名不当身份
    getV3Identity() {
        let acc = null;
        let profile = null;
        try {
            const raw = localStorage.getItem('classpet_current_account');
            if (raw) acc = JSON.parse(raw);
        } catch (e) {}
        try {
            const rawP = localStorage.getItem('classpet.teacher.profile.v3');
            if (rawP) profile = JSON.parse(rawP);
        } catch (e) {}
        let activeId = '';
        try { activeId = localStorage.getItem('classpet_active_account_id') || ''; } catch (e) {}
        const classId = (acc && acc.classId) ? String(acc.classId) : this.getClassId();
        const teacherId = (acc && acc.id) ? String(acc.id) : activeId;
        const teacherName = (acc && acc.teacherName) || (profile && profile.name) || '';
        const className = (acc && acc.className) || (profile && profile['class']) || '';
        const school = (acc && acc.school) || '';
        let subjectRaw = '';
        try {
            subjectRaw = localStorage.getItem('classpet_current_teaching_subject') || localStorage.getItem('classpet_teacher_subject') || '';
        } catch (e) {}
        if (!subjectRaw) subjectRaw = (acc && acc.subject) || (profile && profile.subject) || '';
        return {
            classId: classId,
            teacherId: teacherId,
            teacher: { id: teacherId, name: teacherName, className: className, school: school },
            subject: normalizeSubjectCode(subjectRaw)
        };
    }

    // 单只宠物的 ViewModel：等级/经验读库，形态读 STAGE_MIN_LEVELS（只升不降，取已获得形态）
    _v3PetView(petRow, subjectCode, stages) {
        const subj = V3_SUBJECTS[subjectCode] || V3_SUBJECTS.chinese;
        const row = petRow || null;
        const rawSpecies = (row && row.species_code) ? String(row.species_code) : 'egg';
        const speciesCode = PET_SPECIES_CATALOG[rawSpecies] ? rawSpecies : 'egg';
        const exp = row ? Math.max(0, Number(row.exp) || 0) : 0;
        const level = this.calcLevel(exp, 0);
        const derived = v3StageForLevel(level, stages);
        const storedStage = row ? Math.max(0, Math.min(5, Number(row.visual_stage) || 0)) : 0;
        const visualStage = Math.max(Number(derived.stage) || 0, storedStage);
        const isHatched = visualStage >= 1 && speciesCode !== 'egg';
        const shownSpecies = isHatched ? speciesCode : 'egg';
        const progress = this.getExpProgress(exp, level, isHatched);
        const catalog = PET_SPECIES_CATALOG[shownSpecies];
        const stageEntry = v3StageForLevel(visualStage, stages) || derived;
        return {
            petId: row ? String(row.id || '') : '',
            subjectCode: subj.code,
            subjectId: subj.subjectId,
            subjectLabel: subj.label,
            speciesCode: shownSpecies,
            speciesName: catalog ? catalog.name : '神秘宠物蛋',
            isHatched: isHatched,
            isEgg: !isHatched,
            level: level,
            exp: exp,
            maxLevel: Math.max(0, LEVEL_THRESHOLDS.length - 1),
            visualStage: visualStage,
            stageCode: stageEntry ? stageEntry.code : 'egg',
            stageName: v3StageName(visualStage, stages),
            percent: progress.percent,
            needExp: progress.needExp,
            nextLevelExp: progress.levelNextExp,
            levelMinExp: progress.levelMinExp,
            isMax: !!progress.isMax,
            image: getPetImagePath(shownSpecies, visualStage)
        };
    }

    /**
     * V3 统一 ViewModel（批次 2 · 只读适配：只读库，不写库、不写 localStorage）
     * 三页都只消费这一份结构；无 electronAPI 时返回 ok:false / reason:'no-bridge'
     * 空班返回 ok:true 且 students: []（绝不注入演示名单）
     */
    async getV3ViewModel() {
        const identity = this.getV3Identity();
        const thresholds = LEVEL_THRESHOLDS.slice();
        const stages = JSON.parse(JSON.stringify(STAGE_MIN_LEVELS));
        const vm = {
            version: 1,
            ok: false,
            reason: 'no-bridge',
            error: null,
            classId: identity.classId,
            teacherId: identity.teacherId,
            teacher: identity.teacher,
            subject: identity.subject,
            subjectLabel: (V3_SUBJECTS[identity.subject] || V3_SUBJECTS.chinese).label,
            maxLevel: Math.max(0, thresholds.length - 1),
            thresholds: thresholds,
            stages: stages,
            students: []
        };
        const db = safeElectronDB();
        if (!db || typeof db.loadAllState !== 'function') return vm;

        let state = null;
        try {
            state = await db.loadAllState(identity.classId);
        } catch (e) {
            return Object.assign(vm, { reason: 'load-failed', error: String((e && e.message) || e).slice(0, 200) });
        }
        if (!state || !Array.isArray(state.students)) {
            return Object.assign(vm, { reason: 'load-failed', error: 'loadAllState 返回结构不完整' });
        }

        // 阈值与形态以数据库为准：批次 0「改完阈值重启失效」的运行期消费点
        if (state.thresholds && typeof state.thresholds === 'object') {
            Object.keys(state.thresholds).forEach(k => {
                const lv = Number(k);
                const val = Number(state.thresholds[k]);
                if (Number.isFinite(lv) && lv >= 0 && lv < thresholds.length && Number.isFinite(val)) thresholds[lv] = val;
            });
        }
        if (Array.isArray(state.stages) && state.stages.length) {
            state.stages.forEach(st => {
                const idx = Number(st.stage);
                if (Number.isFinite(idx) && idx >= 0 && idx < stages.length) {
                    stages[idx] = {
                        stage: idx,
                        minLevel: Number(st.minLevel),
                        code: st.code || stages[idx].code,
                        name: stages[idx].name
                    };
                }
            });
        }
        LEVEL_THRESHOLDS = thresholds;
        STAGE_MIN_LEVELS = stages;
        if (typeof window !== 'undefined') {
            window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
            window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
        }
        vm.thresholds = thresholds;
        vm.stages = stages;
        vm.maxLevel = Math.max(0, thresholds.length - 1);
        vm.hatchThreshold = Number(thresholds[1]) || 15;

        // 行为规则：以库为准，页面不再写死六条
        const ruleRows = Array.isArray(state.behaviorRules) ? state.behaviorRules : [];
        vm.rules = ruleRows.map(r => ({
            id: String(r.id || ''),
            name: r.name || '',
            points: Number(r.points) || 0,
            type: r.type === 'negative' ? 'negative' : 'positive'
        }));
        if (!vm.rules.length) {
            vm.rules = (this.behaviorRules || []).map(r => ({
                id: String(r.id || ''), name: r.name || '', points: Number(r.points) || 0,
                type: r.type === 'negative' ? 'negative' : 'positive'
            }));
        }

        // 最近一笔可撤销的操作（D11=A：只许撤最后一笔）。同一毫秒内多笔时用 rowid 兜底排序，
        // 必须与 sqlite_service.undoOperation 的判定一致，否则"最后一笔"会认错。
        vm.lastOperation = await this._v3LastOperation(identity.classId, state);


        const petsByStudent = (state.petsByStudent && typeof state.petsByStudent === 'object') ? state.petsByStudent : {};
        const subjectCode = identity.subject;
        vm.students = state.students.filter(row => row && row.id).map(row => {
            const rawPets = (petsByStudent[row.id] && typeof petsByStudent[row.id] === 'object') ? petsByStudent[row.id] : {};
            const petsBySubject = {};
            Object.keys(V3_SUBJECTS).forEach(code => {
                petsBySubject[code] = this._v3PetView(rawPets[code], code, stages);
            });
            Object.keys(V3_SUBJECTS).forEach(code => {
                const u = this._v3UnlockState(petsBySubject, code, vm.maxLevel);
                petsBySubject[code].unlocked = u.allowed;
                petsBySubject[code].lockReason = u.reason;
            });

            // D7=A：卡片显示固定跟随 display_pet_id，切授课科目不批量换宠
            const displayPetId = row.display_pet_id ? String(row.display_pet_id) : null;
            let displayKey = null;
            if (displayPetId) {
                displayKey = Object.keys(petsBySubject).filter(code => petsBySubject[code].petId === displayPetId)[0] || null;
            }
            if (!displayKey) {
                if (rawPets[subjectCode]) displayKey = subjectCode;
                else if (rawPets.chinese) displayKey = 'chinese';
                else if (Object.keys(rawPets).length) displayKey = normalizeSubjectCode(Object.keys(rawPets)[0]);
                else displayKey = subjectCode;
            }
            const studentNo = row.student_no !== undefined && row.student_no !== null ? String(row.student_no) : String(row.no || '');

            return {
                id: String(row.id),
                no: studentNo.length === 1 ? '0' + studentNo : studentNo,
                name: row.name || '',
                group: Number(row.group) || 1,
                isArchived: !!row.archived_at,
                // D9=A：缺勤是当日开关、不落历史，读库时一律为 false
                isAbsent: false,
                displayPetId: displayPetId,
                activePet: petsBySubject[displayKey] || petsBySubject[subjectCode] || petsBySubject.chinese,
                petsBySubject: petsBySubject
            };
        });
        vm.ok = true;
        vm.reason = 'db';
        return vm;
    }

    // 本班最后一笔未撤销的赋分（与 sqlite_service.undoOperation 同一排序规则）
    async _v3LastOperation(classId, state) {
        const db = safeElectronDB();
        if (db && typeof db.query === 'function') {
            try {
                const rows = await db.query(
                    "SELECT id, created_at, points, action_name FROM score_operations WHERE class_id = ? AND undone_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1",
                    [classId]
                );
                if (Array.isArray(rows) && rows.length) {
                    return {
                        id: String(rows[0].id),
                        createdAt: Number(rows[0].created_at) || 0,
                        points: Number(rows[0].points) || 0,
                        actionName: rows[0].action_name || ''
                    };
                }
                return null;
            } catch (e) { /* 退化到 loadAllState 的快照 */ }
        }
        const ops = (state && Array.isArray(state.recentOperations) ? state.recentOperations : [])
            .filter(o => o && !o.undone_at)
            .sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0));
        return ops.length ? {
            id: String(ops[0].id),
            createdAt: Number(ops[0].created_at) || 0,
            points: Number(ops[0].points) || 0,
            actionName: ops[0].action_name || ''
        } : null;
    }

    // 学科解锁判定（用 ViewModel 里的宠物视图，DB 真相）
    _v3UnlockState(pets, subjectCode, maxLevel) {
        const key = normalizeSubjectCode(subjectCode);
        if (key === 'chinese') return { allowed: true, reason: null };
        const cur = pets[key];
        if (cur && cur.isHatched) return { allowed: true, reason: null };
        const cap = Number(maxLevel) || 20;
        const cn = pets.chinese;
        const cnMax = !!(cn && cn.isHatched && Number(cn.level) >= cap);
        if (!cnMax) return { allowed: false, reason: '需【语文】学科宠物升至 Lv.' + cap + ' 满级方可唤醒' };
        const otherKey = key === 'math' ? 'english' : 'math';
        const other = pets[otherKey];
        if (!other || !other.isHatched) return { allowed: true, reason: null };
        if (Number(other.level) >= cap) return { allowed: true, reason: null };
        return { allowed: false, reason: '需【语文】与【' + (otherKey === 'math' ? '数学' : '英语') + '】均升至 Lv.' + cap + ' 满级方可唤醒' };
    }

    // 赋分资格判定（与 canScoreStudentPet 同规则，但读 ViewModel/DB）
    _v3GuardScore(student, subjectCode, isAbsent) {
        const code = normalizeSubjectCode(subjectCode);
        const subj = V3_SUBJECTS[code];
        if (!student) return { allowed: false, reason: 'NOT_FOUND', message: '学生不存在' };
        if (student.isArchived) return { allowed: false, reason: 'ARCHIVED', message: '学生已归档，不可赋分' };
        if (isAbsent) return { allowed: false, reason: 'ABSENT', message: '学生今日请假，不可赋分' };
        const pet = student.petsBySubject ? student.petsBySubject[code] : null;
        if (code !== 'chinese') {
            if (pet && pet.unlocked === false) {
                return { allowed: false, reason: 'LOCKED', message: '【' + subj.label + '】尚未解锁：' + (pet.lockReason || '需前置学科满级') };
            }
            if (!pet || !pet.isHatched) {
                return { allowed: false, reason: 'UNHATCHED', message: '【' + subj.label + '】尚未破壳认领，请先破壳' };
            }
        }
        return { allowed: true, reason: 'OK', message: '', pet: pet };
    }

    // ========== 批次 4：管理能力（新增/编辑学生、台账、整包恢复） ==========

    // 4.3 台账：本堂课 + 今日（D10=A），带学生、学科、撤销状态与真实时间
    async v3Ledger({ fromTs = null, toTs = null } = {}) {
        const db = safeElectronDB();
        if (!db || typeof db.getClassLedger !== 'function') return { ok: false, reason: 'no-bridge', rows: [] };
        const vm = await this.getV3ViewModel();
        let rows;
        try { rows = await db.getClassLedger(vm.classId, fromTs, toTs); }
        catch (e) { return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200), rows: [] }; }
        if (!Array.isArray(rows)) return { ok: false, reason: 'db-failed', error: '台账查询未返回数组', rows: [] };
        const subjectLabel = r => {
            if (r === 'subj_math') return '数学';
            if (r === 'subj_english') return '英语';
            return '语文';
        };
        return {
            ok: true,
            rows: rows.map(r => ({
                operationId: String(r.operation_id || ''),
                createdAt: Number(r.created_at) || 0,
                points: Number(r.points) || 0,
                actionName: r.action_name || '',
                ruleId: r.rule_id || null,
                undone: !!r.undone_at,
                undoneAt: r.undone_at ? Number(r.undone_at) : null,
                studentId: r.student_id ? String(r.student_id) : null,
                studentName: r.student_name || '',
                studentNo: r.student_no || '',
                groupName: r.group_name || '',
                subjectCode: r.pet_subject_id === 'subj_math' ? 'math' : (r.pet_subject_id === 'subj_english' ? 'english' : 'chinese'),
                subjectLabel: subjectLabel(r.pet_subject_id),
                expBefore: r.exp_before === null || r.exp_before === undefined ? null : Number(r.exp_before),
                expAfter: r.exp_after === null || r.exp_after === undefined ? null : Number(r.exp_after),
                levelAfter: r.level_after === null || r.level_after === undefined ? null : Number(r.level_after)
            }))
        };
    }

    // 4.1 新增学生：先校验学号/姓名，再交给 saveStudent（初始为三科蛋）
    async v3CreateStudent({ no, name, group } = {}) {
        const db = safeElectronDB();
        if (!db || typeof db.saveStudent !== 'function') return { ok: false, reason: 'no-bridge' };
        const cleanName = String(name || '').trim();
        if (!cleanName) return { ok: false, reason: 'bad-name', message: '姓名不能为空' };
        const cleanNo = String(no === undefined || no === null || String(no).trim() === '' ? '' : no).replace(/\D/g, '');
        const vm = await this.getV3ViewModel();
        // 同名是正常情况（中文班级常见）：只要学号不同就允许，不做重名拦截
        if (cleanNo && vm.students.some(s => String(s.no) === cleanNo.padStart(2, '0'))) {
            return { ok: false, reason: 'duplicate-no', message: '学号 ' + cleanNo + ' 已被占用' };
        }
        const nextNo = cleanNo || String(Math.max(0, ...vm.students.map(s => Number(s.no) || 0)) + 1);
        const id = 'st_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        let res;
        try {
            res = await db.saveStudent({ id: id, student_no: nextNo.padStart(2, '0'), name: cleanName, group: Number(group) || 1, pets: {} }, vm.classId);
        } catch (e) {
            return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200) };
        }
        if (!res || res.success !== true) return { ok: false, reason: 'db-failed', error: (res && res.error) || '数据库未确认' };
        return { ok: true, studentId: id, no: nextNo.padStart(2, '0'), name: cleanName, group: Number(group) || 1 };
    }

    // 4.1 编辑学生：只改姓名/小组，绝不碰等级、经验、物种
    async v3SaveStudentProfile({ studentId, name, group } = {}) {
        const db = safeElectronDB();
        if (!db || typeof db.updateStudentProfile !== 'function') return { ok: false, reason: 'no-bridge' };
        if (!studentId) return { ok: false, reason: 'bad-student' };
        if (name !== undefined && !String(name).trim()) return { ok: false, reason: 'bad-name', message: '姓名不能为空' };
        const vm = await this.getV3ViewModel();
        const hit = vm.students.filter(s => s.id === String(studentId))[0];
        if (!hit) return { ok: false, reason: 'not-found', message: '学生不存在' };
        // 改成与他人同名同样允许（学号才是身份，姓名可重复）
        const patch = {};
        if (name !== undefined) patch.name = String(name).trim();
        if (group !== undefined) patch.group = group;
        let res;
        try { res = await db.updateStudentProfile(hit.id, patch, vm.classId); }
        catch (e) { return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200) }; }
        if (!res || res.success !== true) return { ok: false, reason: 'db-failed', error: (res && res.error) || '数据库未确认' };
        return { ok: true, studentId: hit.id, name: res.name, group: res.group };
    }

    // 4.5 整包恢复：kind + version 校验、重复 ID 拒绝、一次事务（失败不半套）
    async v3RestoreBackup(payload) {
        const db = safeElectronDB();
        if (!db || typeof db.restoreClassBackup !== 'function') return { ok: false, reason: 'no-bridge' };
        if (!payload || typeof payload !== 'object') return { ok: false, reason: 'bad-payload', message: '备份内容不是对象' };
        if (payload.kind !== 'classpet-class-backup') return { ok: false, reason: 'bad-kind', message: '不是班级备份文件（缺少 kind=classpet-class-backup）' };
        if (Number(payload.version) !== 1) return { ok: false, reason: 'bad-version', message: '备份版本不支持：' + payload.version };
        if (!Array.isArray(payload.students) || payload.students.length === 0) return { ok: false, reason: 'bad-payload', message: '备份里没有学生名单' };
        const ids = new Set(), nos = new Set();
        for (const st of payload.students) {
            const id = st && st.id ? String(st.id) : '';
            if (!id) return { ok: false, reason: 'bad-payload', message: '有学生缺少 id' };
            if (ids.has(id)) return { ok: false, reason: 'duplicate-id', message: '备份里 id 重复：' + id };
            ids.add(id);
            const no = String(st.no !== undefined ? st.no : (st.student_no !== undefined ? st.student_no : ''));
            if (no) {
                if (nos.has(no)) return { ok: false, reason: 'duplicate-no', message: '备份里学号重复：' + no };
                nos.add(no);
            }
        }
        if (payload.thresholds !== undefined) {
            if (!Array.isArray(payload.thresholds) || payload.thresholds.length !== 21) {
                return { ok: false, reason: 'bad-thresholds', message: '备份里的经验阈值不是 21 级' };
            }
            for (let i = 1; i < 21; i++) {
                if (Number(payload.thresholds[i]) < Number(payload.thresholds[i - 1])) {
                    return { ok: false, reason: 'bad-thresholds', message: '备份里的阈值第 ' + i + ' 级小于上一级' };
                }
            }
        }
        if (payload.stages !== undefined && (!Array.isArray(payload.stages) || payload.stages.length !== 6)) {
            return { ok: false, reason: 'bad-stages', message: '备份里的形态阶梯不是 6 段' };
        }
        const vm = await this.getV3ViewModel();
        let res;
        try { res = await db.restoreClassBackup(vm.classId, payload); }
        catch (e) { return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200) }; }
        if (!res || res.success !== true) return { ok: false, reason: 'db-failed', error: (res && res.error) || '数据库未确认' };
        return { ok: true, count: res.count || payload.students.length };
    }

    /**
     * 批次 3.1 赋分：全部等数据库确认（D18=A）。成功只以 recordScore 的 success 为准，不改本地缓存。
     * 返回 { ok, operationId, entries, delta, subjectCode, skipped:[{studentId,reason,message}] }
     */
    async v3Score({ studentIds, delta, reason, ruleId = null, subjectCode = null, absentIds = [] } = {}) {
        const db = safeElectronDB();
        if (!db || typeof db.recordScore !== 'function') return { ok: false, reason: 'no-bridge', skipped: [] };
        const ids = (Array.isArray(studentIds) ? studentIds : []).map(id => String(id)).filter(Boolean);
        if (!ids.length) return { ok: false, reason: 'no-students', skipped: [] };
        const d = Math.round(Number(delta));
        if (!Number.isFinite(d) || d === 0) return { ok: false, reason: 'bad-delta', skipped: [] };

        const vm = await this.getV3ViewModel();
        if (!vm.ok) return { ok: false, reason: vm.reason, error: vm.error, skipped: [] };
        const subject = normalizeSubjectCode(subjectCode || vm.subject);
        const absent = new Set((Array.isArray(absentIds) ? absentIds : []).map(id => String(id)));

        const allowed = [], skipped = [];
        ids.forEach(id => {
            const s = vm.students.filter(x => x.id === id)[0];
            const g = this._v3GuardScore(s, subject, absent.has(id));
            if (g.allowed) allowed.push(id);
            else skipped.push({ studentId: id, name: s ? s.name : '', reason: g.reason, message: g.message });
        });
        if (!allowed.length) return { ok: false, reason: 'no-eligible', skipped: skipped };

        let res;
        try {
            res = await db.recordScore({
                classId: vm.classId,
                teacherId: vm.teacherId || 't_local',
                studentIds: allowed,
                delta: d,
                reason: reason || '',
                ruleId: ruleId,
                subjectCode: subject
            });
        } catch (e) {
            return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200), skipped: skipped };
        }
        if (!res || res.success !== true) {
            return { ok: false, reason: 'db-failed', error: (res && res.error) || '数据库未确认', skipped: skipped };
        }
        return { ok: true, operationId: res.operationId, entries: res.entries || [], delta: d, subjectCode: subject, skipped: skipped };
    }

    // 批次 3.2 撤销：只能撤本堂课最后一笔（D11=A），且以数据库确认结果为准
    async v3UndoLast({ operationId = null } = {}) {
        const db = safeElectronDB();
        if (!db || typeof db.undoScore !== 'function') return { ok: false, reason: 'no-bridge' };
        const vm = await this.getV3ViewModel();
        if (!vm.ok) return { ok: false, reason: vm.reason, error: vm.error };
        const last = vm.lastOperation;
        if (!last) return { ok: false, reason: 'no-operation', message: '本堂课还没有可撤销的赋分' };
        if (operationId && String(operationId) !== String(last.id)) {
            return { ok: false, reason: 'not-last', message: '只能撤销本堂课最后一笔赋分' };
        }
        let res;
        try {
            res = await db.undoScore(last.id);
        } catch (e) {
            return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200) };
        }
        if (!res || res.success !== true) {
            return { ok: false, reason: 'db-failed', error: (res && res.error) || '数据库未确认' };
        }
        // 撤销让经验"变小"，而 loadFromSQLite 有 Math.max(内存,库) 的回写保护逻辑：
        // 若继续留着撤销前的内存缓存，下次开页会把旧经验写回库（撤销白撤）。这里直接丢弃陈旧缓存，
        // 让下次读取以库为准。
        this._v3DropStaleRosterCache();
        return { ok: true, operationId: last.id, revertedCount: res.revertedCount || 0 };
    }

    // 丢弃本账号的学生名单缓存（撤销后必须），避免旧经验经内存合并回写数据库
    _v3DropStaleRosterCache() {
        try { this.students = []; } catch (e) {}
        try {
            if (typeof localStorage === 'undefined') return;
            const key = this.getStorageKey ? this.getStorageKey() : null;
            if (key) localStorage.removeItem(key);
            if (this.getActiveAccountId && this.getActiveAccountId() === 'acc_demo_302') {
                localStorage.removeItem('classpet_v2_students_data');
            }
        } catch (e) {}
    }

    // 批次 3.3 破壳：门槛（学生 / 未破壳 / 经验 / 学科解锁 / 缺勤）全过才写库
    async v3Hatch({ studentId, subjectCode = null, speciesCode = 'cat', nickname = '', isAbsent = false } = {}) {
        const db = safeElectronDB();
        if (!db || typeof db.hatchPet !== 'function') return { ok: false, reason: 'no-bridge' };
        const vm = await this.getV3ViewModel();
        if (!vm.ok) return { ok: false, reason: vm.reason, error: vm.error };
        const s = vm.students.filter(x => x.id === String(studentId))[0];
        if (!s) return { ok: false, reason: 'not-found', message: '学生不存在' };
        if (isAbsent || s.isAbsent) return { ok: false, reason: 'absent', message: '学生今日请假，不可破壳' };
        const subject = normalizeSubjectCode(subjectCode || vm.subject);
        const pet = s.petsBySubject[subject];
        if (pet && pet.isHatched) return { ok: false, reason: 'already-hatched', message: '该学科宠物已经破壳认领' };
        if (pet && pet.unlocked === false) {
            return { ok: false, reason: 'locked', message: pet.lockReason || '该学科尚未解锁' };
        }
        const need = Number(vm.hatchThreshold) || 15;
        const cur = pet ? Number(pet.exp) || 0 : 0;
        if (cur < need) {
            return { ok: false, reason: 'exp-insufficient', message: '破壳需要 ' + need + ' EXP（当前 ' + cur + '）', need: need, current: cur };
        }
        let res;
        try {
            res = await db.hatchPet({ classId: vm.classId, studentId: s.id, subjectCode: subject, speciesCode: speciesCode, nickname: nickname });
        } catch (e) {
            return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200) };
        }
        if (!res || res.success !== true) {
            return { ok: false, reason: 'db-failed', error: (res && res.error) || '数据库未确认' };
        }
        return { ok: true, studentId: s.id, subjectCode: subject, speciesCode: speciesCode };
    }

    // 批次 3.5 阈值保存：21 级 + 6 阶段对象一起写库
    async v3SaveThresholds({ thresholds, stages } = {}) {
        const db = safeElectronDB();
        if (!db || typeof db.saveThresholds !== 'function') return { ok: false, reason: 'no-bridge' };
        if (!Array.isArray(thresholds) || thresholds.length !== 21) return { ok: false, reason: 'bad-thresholds', message: '经验阈值必须是 0~20 级共 21 个数值' };
        const nums = thresholds.map(Number);
        if (nums.some(n => !Number.isFinite(n) || n < 0)) return { ok: false, reason: 'bad-thresholds', message: '经验阈值必须是非负数字' };
        for (let i = 1; i < nums.length; i++) {
            if (nums[i] < nums[i - 1]) return { ok: false, reason: 'bad-thresholds', message: '第 ' + i + ' 级阈值小于上一级，阈值必须单调不减' };
        }
        const stageList = Array.isArray(stages) ? stages : STAGE_MIN_LEVELS;
        if (stageList.length !== 6) return { ok: false, reason: 'bad-stages', message: '形态阶梯必须是 6 段' };
        const vm = await this.getV3ViewModel();
        const classId = vm.classId;
        let res;
        try {
            res = await db.saveThresholds(nums, stageList.map(st => ({ stage: Number(st.stage), minLevel: Number(st.minLevel), code: st.code || ('form' + st.stage) })), classId);
        } catch (e) {
            return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200) };
        }
        if (!res || res.success !== true) return { ok: false, reason: 'db-failed', error: (res && res.error) || '数据库未确认' };
        return { ok: true, classId: classId, thresholds: nums };
    }

    // 批次 3.4 自定义规则保存
    async v3SaveRules({ rules } = {}) {
        const db = safeElectronDB();
        if (!db || typeof db.saveBehaviorRules !== 'function') return { ok: false, reason: 'no-bridge' };
        const list = (Array.isArray(rules) ? rules : [])
            .filter(r => r && String(r.name || '').trim())
            .map((r, i) => ({
                id: r.id || ('rule_' + (i + 1)),
                name: String(r.name).trim(),
                points: Math.round(Number(r.points) || 0),
                type: r.type === 'negative' ? 'negative' : 'positive',
                sortOrder: i + 1
            }));
        if (!list.length) return { ok: false, reason: 'bad-rules', message: '至少需要一条有效规则' };
        const vm = await this.getV3ViewModel();
        let res;
        try {
            res = await db.saveBehaviorRules(list, vm.classId);
        } catch (e) {
            return { ok: false, reason: 'db-failed', error: String((e && e.message) || e).slice(0, 200) };
        }
        if (!res || res.success !== true) return { ok: false, reason: 'db-failed', error: (res && res.error) || '数据库未确认' };
        return { ok: true, rules: list };
    }

    initData() {
        this.isDemoRoster = false;
        const storageKey = this.getStorageKey();
        let cached = localStorage.getItem(storageKey);
        
        // 若为默认演示账号且独立 key 暂无数据，优先从旧的 classpet_v2_students_data 迁移读取
        if (cached === null && this.getActiveAccountId() === 'acc_demo_302') {
            cached = localStorage.getItem('classpet_v2_students_data');
        }

        if (cached !== null) {
            try {
                this.students = JSON.parse(cached);
                this.isDemoRoster = isDemoRosterList(this.students);
                // 兼容性自动回填与迁移字段
                let needResave = false;
                const spKeys = Object.keys(PET_SPECIES_CATALOG);
                this.students.forEach((s, idx) => {
                    if (s.isArchived === undefined) { s.isArchived = false; needResave = true; }
                    if (s.isHatched === undefined) { s.isHatched = (s.level || 0) >= 1; needResave = true; }
                    if (s.level === undefined || s.level === null) { s.level = s.isHatched ? 1 : 0; needResave = true; }
                    const activeSub = s.activeSubject || 'chinese';
                    const curPet = s.pets ? (s.pets[activeSub] || s.pets.chinese) : null;
                    if (s.exp === undefined || s.exp === null) {
                        s.exp = (curPet && curPet.exp !== undefined && curPet.exp !== null) ? Number(curPet.exp) : (s.isHatched ? 15 : 0);
                        needResave = true;
                    }
                    if (curPet && (curPet.exp === undefined || curPet.exp === null)) { curPet.exp = s.exp; needResave = true; }
                    if (curPet && (curPet.level === undefined || curPet.level === null)) { curPet.level = s.level; needResave = true; }

                    if (!s.pets || !s.pets.chinese) return;
                    if (s.pets.chinese.isHatched === undefined) {
                        s.pets.chinese.isHatched = !!(s.isHatched && s.pets.chinese.species !== 'egg');
                        needResave = true;
                    }
                    if (s.pets.math && s.pets.math.isHatched === undefined) {
                        s.pets.math.isHatched = !!(s.pets.math.species && s.pets.math.species !== 'egg' && (s.pets.math.level || 0) >= 1);
                        needResave = true;
                    }
                    if (s.pets.english && s.pets.english.isHatched === undefined) {
                        s.pets.english.isHatched = !!(s.pets.english.species && s.pets.english.species !== 'egg' && (s.pets.english.level || 0) >= 1);
                        needResave = true;
                    }
                    if (!s.pets.chinese.species) {
                        const spCode = spKeys[idx % spKeys.length];
                        s.pets.chinese.species = spCode;
                        s.pets.chinese.name = PET_SPECIES_CATALOG[spCode].name;
                        s.pets.chinese.icon = PET_SPECIES_CATALOG[spCode].icon;
                        needResave = true;
                    }
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
                        isHatched,
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

        this.isDemoRoster = true;
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
        // 有数据库时数据以库为唯一真相，绝不再往 localStorage 写业务镜像
        // （镜像曾经被 loadFromSQLite 反向合并回库，导致"撤销后重启经验复活"）。
        // 浏览器直开（无 electronAPI）仍走老的本地存储，供设计与审计使用。
        if (safeElectronDB()) return;
        const key = this.getStorageKey();
        const dataStr = JSON.stringify(this.students);
        localStorage.setItem(key, dataStr);
        if (this.getActiveAccountId() === 'acc_demo_302') {
            localStorage.setItem('classpet_v2_students_data', dataStr);
        }
    }

    saveRules() {
        if (safeElectronDB()) return;
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
                if (payload.students) {
                    this.students = payload.students;
                    this.save();
                    this.notify('SYNC', payload);
                }
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
                    if (typeof window !== 'undefined') {
                        window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
                    }
                }
                if (payload.stageLevels) {
                    STAGE_MIN_LEVELS = payload.stageLevels;
                    if (typeof window !== 'undefined') {
                        window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
                    }
                }
                if (payload.students) {
                    this.students = payload.students;
                    this.save();
                }
                this.notify('THRESHOLDS_UPDATE', payload);
            } else if (type === 'TEACHING_SUBJECT_SYNC') {
                if (payload && payload.subject) {
                    localStorage.setItem('classpet_current_teaching_subject', payload.subject);
                    this.notify('TEACHING_SUBJECT_CHANGE', payload);
                    this.notify('SYNC', payload);
                }
            }
        };

        this.channel.onmessage = (e) => handleSync(e.data);

        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.onBroadcastSync === 'function') {
            window.electronAPI.onBroadcastSync((data) => handleSync(data));
        }

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('storage', (e) => {
                if (e.key && (e.key === 'classpet_v2_students_data' || e.key.startsWith('classpet_v2_students_data_')) && e.newValue) {
                    try {
                        this.students = JSON.parse(e.newValue);
                        this.notify('STORAGE_UPDATE');
                        this.notify('SYNC', { students: this.students });
                    } catch (err) {}
                }
                if (e.key === 'classpet_current_teaching_subject' && e.newValue) {
                    this.notify('TEACHING_SUBJECT_CHANGE', { subject: e.newValue });
                    this.notify('SYNC', { subject: e.newValue });
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
                        if (typeof window !== 'undefined') {
                            window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
                        }
                        this.recalculateAllStudentsProgress();
                        this.notify('THRESHOLDS_UPDATE');
                    } catch (err) {}
                }
            });
        }
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
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.broadcastSync === 'function') {
            window.electronAPI.broadcastSync({ type, payload });
        }
    }

    /**
     * 校验学生在指定学科下的宠物是否具备加分/赋分资格
     * 🔒 业务铁律：
     * 1. 宠物尚未解锁（需前置学科达成 Lv.20 满级）：绝对不可加分！
     * 2. 宠物尚未孵化破壳（蛋形态/未认领）：绝对不可加分！
     * 必须在对应学科解锁并破壳诞生为活体萌宠后，方可开启课堂赋分成长通道。
     * @param {string} studentId 学生ID
     * @param {string|null} targetSubject 目标学科 (chinese / math / english)
     * @returns {{ allowed: boolean, reason: string, type: 'OK'|'LOCKED'|'UNHATCHED'|'ABSENT'|'ARCHIVED'|'NOT_FOUND' }}
     */
    canScoreStudentPet(studentId, targetSubject = null) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return { allowed: false, reason: '学生不存在', type: 'NOT_FOUND' };
        if (student.isArchived) return { allowed: false, reason: '学生已归档，不可加分', type: 'ARCHIVED' };
        if (student.isAbsent) return { allowed: false, reason: '学生处于请假状态，不可加分', type: 'ABSENT' };

        let subKey = targetSubject || student.activeSubject || (this.getCurrentTeachingSubject ? this.getCurrentTeachingSubject() : 'chinese');
        // 综合科/通用/未指定均严格默认语文
        if (!subKey || subKey === '综合' || subKey === 'general' || subKey === '通用' || subKey === '班主任') subKey = 'chinese';
        const subNameMap = { chinese: '语文', math: '数学', english: '英语' };
        const subName = subNameMap[subKey] || '当前学科';

        // 1. 严格学科链式解锁判定 (是否满足前置学科 Lv.20 满级解锁条件)
        // 语文永远处于初始开放解锁状态；其他科目需语文达成 Lv.20 满级
        const isUnlocked = typeof this.isSubjectUnlocked === 'function' ? this.isSubjectUnlocked(student.id, subKey) : true;
        if (!isUnlocked) {
            const lockPrompt = typeof this.getSubjectLockPrompt === 'function' ? this.getSubjectLockPrompt(student.id, subKey) : '需前置学科达成 Lv.20 满级方可解锁';
            return {
                allowed: false,
                reason: `【${subName}】宠物尚未解锁（${lockPrompt}），不可加分`,
                type: 'LOCKED',
                student,
                subKey,
                subName,
                prompt: lockPrompt
            };
        }

        // 2. 破壳形态与加分资格判定：
        // 🌟 核心铁律：语文是初始主修学科，语文的蛋是可以加分的（通过日常课堂赋分积累经验孵化破壳）；
        // 🌟 其他学科（数学/英语等）必须等到语文达成 Lv.20 满级解锁，且必须破壳认领专属萌宠后方可加分！
        if (subKey === 'chinese') {
            const pet = student.pets?.chinese;
            return { allowed: true, student, pet, subKey: 'chinese', subName: '语文', type: 'OK' };
        }

        // 非语文的其他学科（如数学、英语）：已解锁前提下，检查是否已破壳认领萌宠
        const pet = student.pets?.[subKey];
        const isPetHatched = !!(
            pet &&
            pet.isHatched === true &&
            pet.species &&
            pet.species !== 'egg'
        );
        if (!isPetHatched) {
            return {
                allowed: false,
                reason: `【${subName}】已解锁但尚未破壳认领萌宠，不可加分。请先破壳认领！`,
                type: 'UNHATCHED',
                student,
                subKey,
                subName,
                prompt: `【${subName}】待破壳认领`
            };
        }

        return { allowed: true, student, pet, subKey, subName, type: 'OK' };
    }

    // 赋分核心逻辑 (实现 01_schema.md 成长不变量，全面支持多学科宠物独立记分与破壳)
    scoreStudent(id, delta, reason, isPrivate = false, targetSubject = null) {
        const student = this.students.find(s => s.id === id);
        if (!student) return;

        let subKey = targetSubject || student.activeSubject || (this.getCurrentTeachingSubject ? this.getCurrentTeachingSubject() : 'chinese');
        if (!subKey || subKey === '综合' || subKey === 'general' || subKey === '通用' || subKey === '班主任') subKey = 'chinese';
        const subNameMap = { chinese: '语文', math: '数学', english: '英语' };

        // 🔒 铁律守卫：未解锁或未孵化破壳的宠物坚决禁止加分
        const check = this.canScoreStudentPet(id, subKey);
        if (!check.allowed) {
            console.warn(`[Score Blocked] 拦截对学生 ${id} (${student.name}) 在【${subNameMap[subKey] || subKey}】的赋分操作: ${check.reason}`);
            return {
                success: false,
                blocked: true,
                reason: check.reason,
                type: check.type,
                studentId: id,
                studentName: student.name,
                studentNo: student.no,
                subject: subKey,
                delta,
                students: this.students
            };
        }

        if (!student.pets) student.pets = {};
        if (!student.pets[subKey]) {
            student.pets[subKey] = {
                id: 'pet_' + subKey.charAt(0) + '_' + student.id,
                subject: subNameMap[subKey] || '综合',
                species: 'egg',
                name: '神秘宠物蛋',
                icon: '🐣',
                level: 0,
                exp: 0,
                visualStage: 0,
                isHatched: false
            };
        }

        const currentPet = student.pets[subKey];
        const oldLevel = currentPet.level || 0;
        const oldStage = currentPet.visualStage || 0;

        const expBefore = currentPet.exp || 0;
        const levelBefore = currentPet.level || 0;
        const stageBefore = currentPet.visualStage || 0;
        const stampBefore = student.stamp;

        currentPet.exp = Math.max(0, (currentPet.exp || 0) + delta);

        // 等级只升不降
        const newLevel = this.calcLevel(currentPet.exp, currentPet.level);
        currentPet.level = newLevel;

        const isPetHatched = !!(currentPet.isHatched || (currentPet.species && currentPet.species !== 'egg'));
        const curStage = currentPet.visualStage || (isPetHatched ? 1 : 0);
        const targetStage = this.calcVisualStage(newLevel, 0);
        const hatchThresh = (this.levelThresholds && this.levelThresholds[1]) ? this.levelThresholds[1] : (LEVEL_THRESHOLDS[1] || 15);

        const isActiveSub = subKey === (student.activeSubject || 'chinese');

        if (isActiveSub) {
            student.exp = currentPet.exp;
            student.level = newLevel;
            student.minExpForCurrentLevel = this.getCurrentLevelMinExp(student.level);
            student.nextLevelExp = this.getNextLevelThreshold(student.level);

            if (!student.isHatched) {
                student.stamp = student.exp >= hatchThresh ? 'HATCH' : null;
                currentPet.icon = '🐣';
                currentPet.image = getPetImagePath('egg', 0);
            } else {
                if (student.level >= 20 && curStage >= 5) {
                    student.stamp = 'MAX';
                    currentPet.icon = '👑';
                } else if (targetStage > curStage && curStage < 5) {
                    student.stamp = 'EVOLVE';
                } else {
                    student.stamp = null;
                }
                currentPet.image = getPetImagePath(currentPet.species, student.visualStage);
            }
        } else {
            if (!isPetHatched) {
                currentPet.icon = '🐣';
                currentPet.image = getPetImagePath('egg', 0);
            } else {
                if (newLevel >= 20 && curStage >= 5) {
                    currentPet.icon = '👑';
                }
                currentPet.image = getPetImagePath(currentPet.species, curStage);
            }
        }

        const isLevelUp = newLevel > oldLevel;
        const isMaxLevel = (newLevel >= 20) && (oldLevel < 20);
        const isStageUp = false; // 严格遵循官方基线：形态大阶蜕变必须由师生点击确认后完成

        this.save();

        const beforeStates = [{
            studentId: id,
            subject: subKey,
            expBefore,
            levelBefore,
            stageBefore,
            stampBefore
        }];

        const payload = {
            success: true,
            studentId: id,
            studentName: student.name,
            studentNo: student.no,
            student: student, // 传入精确对象指针，杜绝索引推导导致串人
            subject: subKey,
            subjectName: subNameMap[subKey] || '专属',
            delta,
            reason,
            isPrivate,
            oldLevel,
            newLevel,
            level: newLevel,
            oldStage,
            newStage: currentPet.visualStage,
            isLevelUp,
            isMaxLevel,
            isStageUp,
            stamp: student.stamp,
            currentPetExp: currentPet.exp,
            currentPetSpecies: currentPet.species,
            currentPetName: currentPet.name,
            beforeStates
        };

        if (delta > 0) this.audio.playDing();
        else this.audio.playDeduct();

        // 异步同步到 SQLite
        const db = safeElectronDB();
        if (db && typeof db.recordScore === 'function') {
            db.recordScore({
                classId: this.getClassId(),
                studentIds: [id],
                delta,
                reason,
                ruleId: isPrivate ? null : 'rule_quick',
                subjectCode: subKey
            });
        }

        payload.students = this.students;
        this.broadcast('SCORE_TRIGGERED', payload);
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('SCORE', payload);
        this.notify('SYNC', { students: this.students });
        return payload;
    }

    batchScore(ids, delta, reason, isPrivate = false, targetSubject = null) {
        const leveledUpStudents = [];
        const beforeStates = [];
        const hatchThresh = (this.levelThresholds && this.levelThresholds[1]) ? this.levelThresholds[1] : (LEVEL_THRESHOLDS[1] || 15);
        const subNameMap = { chinese: '语文', math: '数学', english: '英语' };

        // 🔒 铁律守卫：过滤仅具有加分资格的学生（未解锁或未孵化宠物坚决拦截）
        const eligibleIds = [];
        const blockedRecords = [];

        ids.forEach(id => {
            const check = this.canScoreStudentPet(id, targetSubject);
            if (check.allowed) {
                eligibleIds.push(id);
            } else {
                blockedRecords.push({
                    id,
                    name: check.student?.name || id,
                    reason: check.reason,
                    type: check.type,
                    subject: check.subName
                });
            }
        });

        if (eligibleIds.length === 0) {
            console.warn(`[BatchScore Blocked] 批量加分被安全拦截: 选中的 ${ids.length} 名学生宠物均未解锁或未孵化`, blockedRecords);
            return {
                success: false,
                blocked: true,
                blockedRecords,
                eligibleIds: [],
                students: this.students,
                beforeStates: []
            };
        }

        eligibleIds.forEach(id => {
            const student = this.students.find(s => s.id === id);
            if (student && !student.isAbsent) {
                let subKey = targetSubject || student.activeSubject || (this.getCurrentTeachingSubject ? this.getCurrentTeachingSubject() : 'chinese');
                if (!subKey || subKey === '综合' || subKey === 'general' || subKey === '通用' || subKey === '班主任') subKey = 'chinese';
                if (!student.pets) student.pets = {};
                if (!student.pets[subKey]) {
                    student.pets[subKey] = {
                        id: 'pet_' + subKey.charAt(0) + '_' + student.id,
                        subject: subNameMap[subKey] || '综合',
                        species: 'egg',
                        name: '神秘宠物蛋',
                        icon: '🐣',
                        level: 0,
                        exp: 0,
                        visualStage: 0,
                        isHatched: false
                    };
                }

                const currentPet = student.pets[subKey];
                const oldLevel = currentPet.level || 0;
                const oldStage = currentPet.visualStage || 0;

                const expBefore = currentPet.exp || 0;
                const levelBefore = currentPet.level || 0;
                const stageBefore = currentPet.visualStage || 0;
                const stampBefore = student.stamp;
                beforeStates.push({
                    studentId: student.id,
                    subject: subKey,
                    expBefore,
                    levelBefore,
                    stageBefore,
                    stampBefore
                });

                currentPet.exp = Math.max(0, (currentPet.exp || 0) + delta);
                const newLevel = this.calcLevel(currentPet.exp, currentPet.level);
                currentPet.level = newLevel;

                const isPetHatched = !!(currentPet.isHatched || (currentPet.species && currentPet.species !== 'egg'));
                const curStage = currentPet.visualStage || (isPetHatched ? 1 : 0);
                const targetStage = this.calcVisualStage(newLevel, 0);

                const isActiveSub = subKey === (student.activeSubject || 'chinese');

                if (isActiveSub) {
                    student.exp = currentPet.exp;
                    student.level = newLevel;
                    student.minExpForCurrentLevel = this.getCurrentLevelMinExp(student.level);
                    student.nextLevelExp = this.getNextLevelThreshold(student.level);

                    if (!student.isHatched) {
                        student.stamp = student.exp >= hatchThresh ? 'HATCH' : null;
                        currentPet.icon = '🐣';
                        currentPet.image = getPetImagePath('egg', 0);
                    } else {
                        if (student.level >= 20 && curStage >= 5) {
                            student.stamp = 'MAX';
                            currentPet.icon = '👑';
                        } else if (targetStage > curStage && curStage < 5) {
                            student.stamp = 'EVOLVE';
                        } else {
                            student.stamp = null;
                        }
                        currentPet.image = getPetImagePath(currentPet.species, student.visualStage);
                    }
                } else {
                    if (!isPetHatched) {
                        currentPet.icon = '🐣';
                        currentPet.image = getPetImagePath('egg', 0);
                    } else {
                        if (newLevel >= 20 && curStage >= 5) {
                            currentPet.icon = '👑';
                        }
                        currentPet.image = getPetImagePath(currentPet.species, curStage);
                    }
                }

                const isLevelUp = newLevel > oldLevel;
                const isMaxLevel = (newLevel >= 20) && (oldLevel < 20);
                if (isLevelUp) {
                    leveledUpStudents.push({
                        student,
                        studentId: student.id,
                        studentName: student.name,
                        studentNo: student.no,
                        subject: subKey,
                        subjectName: subNameMap[subKey] || '专属',
                        oldLevel,
                        newLevel,
                        level: newLevel,
                        oldStage,
                        newStage: currentPet.visualStage,
                        isLevelUp: true,
                        isMaxLevel,
                        isStageUp: false,
                        stamp: student.stamp,
                        currentPetExp: currentPet.exp,
                        currentPetSpecies: currentPet.species,
                        currentPetName: currentPet.name
                    });
                }
            }
        });

        this.save();
        if (delta > 0) this.audio.playDing();
        else this.audio.playDeduct();

        const singleStudent = eligibleIds.length === 1 ? this.students.find(s => s.id === eligibleIds[0]) : null;
        const singleLeveled = singleStudent ? leveledUpStudents.find(x => x.studentId === singleStudent.id) : null;
        const effectiveSubKey = targetSubject || (singleStudent ? singleStudent.activeSubject : null) || 'chinese';
        const singlePet = singleStudent?.pets?.[effectiveSubKey];

        // 异步同步到 SQLite
        const db = safeElectronDB();
        if (db && typeof db.recordScore === 'function') {
            const subToRecord = targetSubject || (singleStudent ? singleStudent.activeSubject : null);
            db.recordScore({
                classId: this.getClassId(),
                studentIds: eligibleIds,
                delta,
                reason,
                ruleId: isPrivate ? null : 'rule_batch',
                subjectCode: subToRecord
            });
        }
        const payload = {
            success: true,
            ids: eligibleIds,
            eligibleIds,
            blockedRecords,
            studentId: singleStudent ? singleStudent.id : (leveledUpStudents[0]?.studentId || null),
            student: singleStudent || (leveledUpStudents[0]?.student || null),
            subject: targetSubject || (singleStudent ? singleStudent.activeSubject : null) || 'chinese',
            delta,
            reason,
            isPrivate,
            leveledUpStudents,
            isLevelUp: leveledUpStudents.length > 0,
            newLevel: singleLeveled ? singleLeveled.newLevel : (leveledUpStudents[0]?.newLevel ?? (singlePet?.level ?? singleStudent?.level ?? null)),
            level: singleLeveled ? singleLeveled.newLevel : (leveledUpStudents[0]?.newLevel ?? (singlePet?.level ?? singleStudent?.level ?? null)),
            newStage: singleLeveled ? singleLeveled.newStage : (leveledUpStudents[0]?.newStage ?? (singlePet?.visualStage ?? singleStudent?.visualStage ?? null)),
            isStageUp: singleStudent ? (leveledUpStudents.find(x => x.studentId === singleStudent.id)?.isStageUp || false) : (leveledUpStudents.length > 0 && leveledUpStudents.some(x => x.isStageUp)),
            beforeStates
        };
        payload.students = this.students;
        this.broadcast('SCORE_TRIGGERED', payload);
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('SCORE', payload);
        this.notify('SYNC', { students: this.students });
        return payload;
    }

    // 切换学生当前大屏主展示/培养宠物
    setStudentDisplayPet(studentId, subjectKey) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return false;
        if (!student.pets) student.pets = {};
        if (!student.pets[subjectKey]) {
            const subNameMap = { chinese: '语文', math: '数学', english: '英语' };
            student.pets[subjectKey] = {
                id: 'pet_' + subjectKey.charAt(0) + '_' + student.id,
                subject: subNameMap[subjectKey] || '综合',
                species: 'egg',
                name: '神秘宠物蛋',
                icon: '🐣',
                level: 0,
                exp: 0,
                visualStage: 0,
                isHatched: false
            };
        }

        student.activeSubject = subjectKey;
        const pet = student.pets[subjectKey];
        student.level = pet.level !== undefined ? pet.level : 0;
        student.exp = pet.exp !== undefined ? pet.exp : 0;
        student.visualStage = pet.visualStage !== undefined ? pet.visualStage : (pet.isHatched ? 1 : 0);
        student.isHatched = !!(pet.isHatched || (pet.species && pet.species !== 'egg'));
        student.minExpForCurrentLevel = this.getCurrentLevelMinExp(student.level);
        student.nextLevelExp = this.getNextLevelThreshold(student.level);

        const targetStage = this.calcVisualStage(student.level, 0);
        if (!student.isHatched) {
            const hatchThresh = typeof this.getHatchThreshold === 'function' ? this.getHatchThreshold() : 15;
            student.stamp = student.exp >= hatchThresh ? 'HATCH' : null;
        } else if (student.level >= 20 && student.visualStage >= 5) {
            student.stamp = 'MAX';
        } else if (targetStage > student.visualStage && student.visualStage < 5) {
            student.stamp = 'EVOLVE';
        } else {
            student.stamp = null;
        }

        this.save();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.saveStudent === 'function') {
            db.saveStudent(student, classId);
        }

        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('SYNC', { students: this.students });
        return true;
    }

    // 学科解锁机制判定（支持语文满级后【数学】与【英语】二选一自由解锁）：
    // 1. 语文初始默认开放；
    // 2. 任何已破壳/认领的宠物永久解锁，绝不受前置变动影响；
    // 3. 当语文达到 Lv.20 满级后，进入【二选一】阶段：数学与英语均开放解锁供师生自由选择；
    // 4. 当选择并破壳其中一门（第2门学科）后，最后一门学科需语文与第2门学科均达到 Lv.20 满级方可解锁。
    isSubjectUnlocked(studentId, subjectKey) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return false;
        if (subjectKey === 'chinese') return true;

        const curPet = student.pets?.[subjectKey];
        if (curPet && (curPet.isHatched || (curPet.species && curPet.species !== 'egg') || (curPet.visualStage && curPet.visualStage >= 1))) {
            return true; // 已经破壳/认领的学科宠物永久处于解锁状态，绝不受前置变动影响
        }

        const chinesePet = student.pets?.chinese;
        const isChineseHatched = !!(chinesePet && (chinesePet.isHatched || (chinesePet.species && chinesePet.species !== 'egg')));
        const isChineseMax = isChineseHatched && ((chinesePet.level || 0) >= 20 || (student.level || 0) >= 20);

        // 前置基础：必须语文达成 Lv.20 满级方可进入后续学科觉醒
        if (!isChineseMax) return false;

        // 语文已达 20 级，判断数学与英语：
        if (subjectKey === 'math' || subjectKey === 'english') {
            const otherKey = subjectKey === 'math' ? 'english' : 'math';
            const otherPet = student.pets?.[otherKey];
            const isOtherHatched = !!(otherPet && (otherPet.isHatched || (otherPet.species && otherPet.species !== 'egg') || (otherPet.visualStage && otherPet.visualStage >= 1)));

            // 若另一门学科尚未认领/破壳，说明当前处于【二选一】阶段，两门均允许破壳认领！
            if (!isOtherHatched) {
                return true;
            }

            // 若另一门学科已经破壳，则当前学科属于第 3 门最终学科：
            // 必须该学科（即第2门学科）也达成 Lv.20 满级，方可解锁第3门！
            const isOtherMax = (otherPet.level || 0) >= 20;
            return isOtherMax;
        }

        return false;
    }

    // 获取学科未解锁提示信息（用于提示条/Tooltip/模态框状态说明）
    getSubjectLockPrompt(studentId, subjectKey) {
        if (this.isSubjectUnlocked(studentId, subjectKey)) return null;
        const student = this.students.find(s => s.id === studentId);
        if (!student) return '学生不存在';
        const chinesePet = student.pets?.chinese;
        const isChineseHatched = !!(chinesePet && (chinesePet.isHatched || (chinesePet.species && chinesePet.species !== 'egg')));
        const isChineseMax = isChineseHatched && ((chinesePet.level || 0) >= 20 || (student.level || 0) >= 20);
        if (!isChineseMax) {
            return '需【语文】学科宠物升至 Lv.20 满级方可唤醒';
        }
        const otherKey = subjectKey === 'math' ? 'english' : 'math';
        const otherName = otherKey === 'math' ? '数学' : '英语';
        return `需【语文】与【${otherName}】均升至 Lv.20 满级方可唤醒`;
    }

    // 破壳认领中心：支持针对指定学科认领 8 大电子宠物
    hatchStudentPet(studentId, speciesCode, targetSubject = null) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return null;
        const sp = PET_SPECIES_CATALOG[speciesCode] ? speciesCode : 'cat';
        const info = PET_SPECIES_CATALOG[sp];

        const subjectKey = targetSubject || student.activeSubject || 'chinese';

        // 🛡️ 严格链式解锁守卫：前置学科未满 20 级时坚决禁止越级认领孵化下一门学科！
        if (!this.isSubjectUnlocked(student.id, subjectKey)) {
            console.warn(`[Hatch Blocked] 学生 ${student.name} 的前置学科尚未达到 20 级满级，无法越级解锁认领 ${subjectKey}`);
            return null;
        }

        if (!student.pets) student.pets = {};
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
        const hatchDb = safeElectronDB();
        if (hatchDb && typeof hatchDb.hatchPet === 'function') {
            hatchDb.hatchPet({
                classId: this.getClassId(),
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
        const lockedSubjects = [];
        ['chinese', 'math', 'english'].forEach(sub => {
            const p = student?.pets?.[sub];
            if (p && p.species && p.species !== 'egg' && (p.isHatched || (p.visualStage && p.visualStage >= 1))) {
                hatchedSubjects.push(sub);
            } else {
                if (this.isSubjectUnlocked(studentId, sub)) {
                    unhatchedSubjects.push(sub);
                } else {
                    lockedSubjects.push(sub);
                }
            }
        });

        // 规则 1：如果是班主任 / 综合账号：
        if (teacherSubject === '综合' || teacherSubject.includes('班主任')) {
            return {
                mode: 'free',
                teacherSubject,
                allowedSubjects: unhatchedSubjects,
                hatchedSubjects,
                lockedSubjects,
                defaultSubject: unhatchedSubjects[0] || 'chinese',
                reason: unhatchedSubjects.length > 0 ? '班主任权限：可自由选择当前已满足解锁条件的未孵化学科' : '下一学科需前置学科达成 Lv.20 满级方可解锁'
            };
        }

        // 规则 2：如果是单科教师（语文 / 数学 / 英语）：
        const subjectMap = { '语文': 'chinese', '数学': 'math', '英语': 'english' };
        const mySubject = subjectMap[teacherSubject] || 'chinese';

        if (!hatchedSubjects.includes(mySubject)) {
            const isUnlocked = this.isSubjectUnlocked(studentId, mySubject);
            return {
                mode: 'subject_locked',
                teacherSubject,
                allowedSubjects: isUnlocked ? [mySubject] : [],
                hatchedSubjects,
                lockedSubjects,
                defaultSubject: mySubject,
                reason: isUnlocked ? `【${teacherSubject}】任课教师：首次孵化必须认领【${teacherSubject}】专属电子宠物` : `【${teacherSubject}】宠物尚未解锁（需前置学科满级）`
            };
        }

        // 本科已破壳，孵化下一只宠物蛋时，仅在已解锁的未孵化学科中选择
        return {
            mode: 'secondary_choice',
            teacherSubject,
            allowedSubjects: unhatchedSubjects,
            hatchedSubjects,
            lockedSubjects,
            defaultSubject: unhatchedSubjects[0] || (mySubject === 'chinese' ? 'math' : 'chinese'),
            reason: unhatchedSubjects.length > 0 ? `已认领【${teacherSubject}】宠物，现可认领下一门已解锁学科萌宠` : '下一学科需前置学科达成 Lv.20 满级方可解锁'
        };
    }

    // 核心安全撤销流水记录 (严格守卫成长不变量，时光倒流还原，同时兼容 SQLite 与 LocalStorage)
    undoScoreRecord(record) {
        if (!record) return { success: false, error: '无效的撤销记录' };
        const targetIds = record.targetIds || (record.studentId ? [record.studentId] : []);
        if (targetIds.length === 0) return { success: false, error: '无目标学生' };

        const subKey = record.subject || 'chinese';
        const delta = record.delta || 0;
        const hatchThresh = typeof this.getHatchThreshold === 'function' ? this.getHatchThreshold() : (LEVEL_THRESHOLDS[1] || 15);

        targetIds.forEach(sid => {
            const student = this.students.find(s => s.id === sid);
            if (!student) return;

            // 1. 如果存在快照 beforeStates，优先使用快照精确回退时光
            const snap = record.beforeStates?.find(b => b.studentId === sid);
            if (snap) {
                const pet = student.pets?.[snap.subject || subKey];
                if (pet) {
                    pet.exp = Math.max(0, snap.expBefore);
                    pet.level = snap.levelBefore;
                    pet.visualStage = snap.stageBefore;
                    pet.image = getPetImagePath(pet.isHatched ? pet.species : 'egg', pet.visualStage);
                    pet.icon = !pet.isHatched ? '🐣' : (pet.level >= 20 ? '👑' : (PET_SPECIES_CATALOG[pet.species]?.icon || '🐾'));
                }
                if ((snap.subject || subKey) === (student.activeSubject || 'chinese')) {
                    student.exp = Math.max(0, snap.expBefore);
                    student.level = snap.levelBefore;
                    student.visualStage = snap.stageBefore;
                    student.stamp = snap.stampBefore;
                    student.minExpForCurrentLevel = this.getCurrentLevelMinExp(student.level);
                    student.nextLevelExp = this.getNextLevelThreshold(student.level);
                }
            } else {
                // 2. 无快照时进行安全计算回退 (严格遵守成长不变量，已破壳萌宠绝不可逆退化为蛋形态或0级)
                const pet = student.pets?.[subKey] || student.pets?.chinese;
                if (pet) {
                    const isPetHatched = !!(pet.isHatched || (pet.species && pet.species !== 'egg'));
                    pet.exp = Math.max(0, (pet.exp || 0) - delta);
                    let newLvl = this.calcLevel(pet.exp, 0);
                    if (isPetHatched) {
                        newLvl = Math.max(1, newLvl);
                    }
                    pet.level = newLvl;
                    let newStage = this.calcVisualStage(newLvl, 0);
                    if (isPetHatched) {
                        newStage = Math.max(1, newStage);
                    }
                    pet.visualStage = newStage;
                    pet.image = getPetImagePath(isPetHatched ? pet.species : 'egg', pet.visualStage);
                    pet.icon = !isPetHatched ? '🐣' : (pet.level >= 20 ? '👑' : (PET_SPECIES_CATALOG[pet.species]?.icon || '🐾'));

                    if (subKey === (student.activeSubject || 'chinese')) {
                        student.exp = pet.exp;
                        student.level = pet.level;
                        student.visualStage = pet.visualStage;
                        student.minExpForCurrentLevel = this.getCurrentLevelMinExp(student.level);
                        student.nextLevelExp = this.getNextLevelThreshold(student.level);
                        if (!student.isHatched) {
                            student.stamp = student.exp >= hatchThresh ? 'HATCH' : null;
                        } else if (student.level >= 20 && student.visualStage >= 5) {
                            student.stamp = 'MAX';
                        } else {
                            student.stamp = null;
                        }
                    }
                }
            }
        });

        this.save();
        this.audio.playDeduct();

        // 尝试同步通知 SQLite 进行事务撤销
        const db = safeElectronDB();
        if (db && typeof db.undoScore === 'function' && record.id) {
            try {
                db.undoScore(record.id);
            } catch (e) {
                console.error('SQLite undoScore error:', e);
            }
        }

        const payload = {
            ids: targetIds,
            delta: -delta,
            reason: '撤销: ' + (record.label || '操作'),
            isUndo: true
        };
        this.broadcast('SCORE_TRIGGERED', payload);
        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('SCORE', payload);
        this.notify('SYNC', { students: this.students });
        return { success: true };
    }

    // 治愈系互动动作：每日 5 EXP 限制、触发温馨台词 (支持指定学科宠物，本地时间与班级严格隔离)
    doPetInteraction(studentId, actionName, baseExp = 1, targetSubject = null) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return null;

        let subKey = targetSubject || student.activeSubject || (this.getCurrentTeachingSubject ? this.getCurrentTeachingSubject() : 'chinese');
        if (!subKey || subKey === '综合' || subKey === 'general' || subKey === '通用' || subKey === '班主任') subKey = 'chinese';
        const currentPet = student.pets ? (student.pets[subKey] || student.pets.chinese) : null;
        const isThisPetHatched = !!(currentPet && (currentPet.isHatched || (currentPet.species && currentPet.species !== 'egg')));
        const isThisSubUnlocked = typeof this.isSubjectUnlocked === 'function' ? this.isSubjectUnlocked(studentId, subKey) : true;
        const scoreEligibility = this.canScoreStudentPet(studentId, subKey);

        // 核心修复：采用本地时区年月日格式，防止东八区早晨8点前被误判为昨天
        const nowD = new Date();
        const localDateStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
        const todayKey = `classpet_daily_interact_${this.getClassId()}_${localDateStr}`;
        let dailyRecord = {};
        try {
            dailyRecord = JSON.parse(localStorage.getItem(todayKey) || '{}');
        } catch (e) {}

        const currentStudentPoints = dailyRecord[studentId] || 0;
        const MAX_DAILY_EXP = 5;
        let awarded = 0;
        let limitReached = false;

        // 🔒 铁律守卫：未解锁或未孵化破壳的宠物不增加经验收益
        if (!scoreEligibility.allowed) {
            awarded = 0;
            limitReached = false;
        } else if (currentStudentPoints >= MAX_DAILY_EXP) {
            limitReached = true;
            awarded = 0;
        } else {
            awarded = Math.min(baseExp, MAX_DAILY_EXP - currentStudentPoints);
            dailyRecord[studentId] = currentStudentPoints + awarded;
            try {
                localStorage.setItem(todayKey, JSON.stringify(dailyRecord));
            } catch (e) {}
            if (awarded > 0) {
                this.scoreStudent(studentId, awarded, `互动:${actionName}`, false, subKey);
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

        if (!isThisSubUnlocked) {
            const prompt = typeof this.getSubjectLockPrompt === 'function' ? this.getSubjectLockPrompt(studentId, subKey) : '需前置学科达成 Lv.20 满级';
            quote = `🔒 萌宠尚未解锁（${prompt}），暂不可开启互动与加分！`;
        } else if (!isThisPetHatched) {
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

    // 获取特定学生今日已获得的治愈系互动经验总额 (0~5)
    getDailyInteractPoints(studentId) {
        const nowD = new Date();
        const localDateStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
        const todayKey = `classpet_daily_interact_${this.getClassId()}_${localDateStr}`;
        try {
            const dailyRecord = JSON.parse(localStorage.getItem(todayKey) || '{}');
            return dailyRecord[studentId] || 0;
        } catch (e) {
            return 0;
        }
    }

    // 学生日常管理：单个新增 (默认初始为蛋形态，0分0级)
    async addStudent({ name, no = null, group = 1, species = 'egg', initialHatched = false }) {
        const nextIdNum = this.students.length + 1;
        const id = 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const studentNo = no ? String(no).padStart(2, '0') : nextIdNum.toString().padStart(2, '0');
        const isHatched = !!initialHatched;
        const sp = isHatched ? (PET_SPECIES_CATALOG[species] ? species : 'cat') : 'egg';
        const info = PET_SPECIES_CATALOG[sp] || { name: '神秘宠物蛋', icon: '🐣' };

        const level = isHatched ? 1 : 0;
        const exp = isHatched ? 15 : 0;
        const visualStage = isHatched ? 1 : 0;

        const newStudent = {
            id,
            no: studentNo,
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
                    id: 'pet_c_' + id,
                    species: isHatched ? sp : 'egg',
                    subject: '语文',
                    name: isHatched ? info.name : '神秘宠物蛋',
                    icon: !isHatched ? '🐣' : info.icon,
                    image: getPetImagePath(isHatched ? sp : 'egg', visualStage),
                    level,
                    exp,
                    visualStage,
                    isHatched,
                    affection: isHatched ? 60 : 20,
                    fullness: isHatched ? 80 : 50,
                    energy: isHatched ? 90 : 50
                },
                math: {
                    id: 'pet_m_' + id,
                    species: 'egg',
                    subject: '数学',
                    name: '神秘宠物蛋',
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
                    id: 'pet_e_' + id,
                    species: 'egg',
                    subject: '英语',
                    name: '神秘宠物蛋',
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

        this.students.push(newStudent);
        this.save();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.saveStudent === 'function') {
            try {
                const res = await db.saveStudent(newStudent, classId);
                if (res && res.studentNo) {
                    newStudent.no = res.studentNo;
                    this.save();
                }
            } catch (err) {
                console.error('[ClassPetStore] saveStudent SQLite 写入异常:', err);
            }
        }

        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_ADDED', newStudent);
        this.notify('SYNC', { students: this.students });
        return newStudent;
    }

    // 批量导入整班学生花名册并存入 SQLite 与本地存储
    async importStudents(newStudents) {
        if (!Array.isArray(newStudents)) return false;
        this.students = newStudents;
        this.save();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.importStudents === 'function') {
            try {
                await db.importStudents(newStudents, classId);
            } catch (err) {
                console.error('[ClassPetStore] importStudents SQLite 写入异常:', err);
            }
        }

        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STATE_SYNC', { students: this.students });
        this.notify('SYNC', { students: this.students });
        return true;
    }

    // 全量同步全班所有学生最新状态（如大组批量调动等）至 SQLite
    syncStudentsToSQLite() {
        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.saveAllStudents === 'function') {
            return db.saveAllStudents(this.students, classId);
        }
        return Promise.resolve({ success: false });
    }

    // 学生日常管理：编辑资料
    async updateStudent(id, fields) {
        const student = this.students.find(s => s.id === id);
        if (!student) return null;
        if (fields.name !== undefined) student.name = fields.name.trim();
        if (fields.no !== undefined) student.no = fields.no.trim();
        if (fields.group !== undefined) student.group = parseInt(fields.group, 10);
        if (fields.species && PET_SPECIES_CATALOG[fields.species]) {
            const sp = fields.species;
            const info = PET_SPECIES_CATALOG[sp];
            const activeSub = student.activeSubject || 'chinese';
            if (!student.pets) student.pets = {};
            if (!student.pets[activeSub]) {
                student.pets[activeSub] = {
                    id: `pet_${activeSub[0]}_${student.id}`,
                    species: sp,
                    subject: activeSub === 'chinese' ? '语文' : (activeSub === 'math' ? '数学' : '英语'),
                    name: info.name,
                    icon: info.icon,
                    level: student.level || 1,
                    exp: student.exp || 0,
                    visualStage: student.visualStage || 1,
                    isHatched: student.isHatched !== false
                };
            }
            const currentPet = student.pets[activeSub];
            currentPet.species = sp;
            currentPet.name = info.name;
            currentPet.icon = info.icon;
            currentPet.image = getPetImagePath(sp, student.visualStage || currentPet.visualStage || 0);
        }
        this.save();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.saveStudent === 'function') {
            await db.saveStudent(student, classId);
        }

        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_UPDATED', student);
        this.notify('SYNC', { students: this.students });
        return student;
    }

    // 学生日常管理：软归档 (不影响历史总分与行为流水)
    async archiveStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (!student) return false;
        student.isArchived = true;
        this.save();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.archiveStudent === 'function') {
            await db.archiveStudent(id, true, classId);
        }

        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_ARCHIVED', { id });
        this.notify('SYNC', { students: this.students });
        return true;
    }

    // 学生日常管理：还原归档学生
    async restoreStudent(id) {
        const student = this.students.find(s => s.id === id);
        if (!student) return false;
        student.isArchived = false;
        this.save();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.archiveStudent === 'function') {
            await db.archiveStudent(id, false, classId);
        }

        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_RESTORED', { id });
        this.notify('SYNC', { students: this.students });
        return true;
    }

    // 永久删除
    async deleteStudentPermanent(id) {
        this.students = this.students.filter(s => s.id !== id);
        this.save();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.deleteStudent === 'function') {
            await db.deleteStudent(id, classId);
        }

        this.broadcast('STATE_SYNC', { students: this.students });
        this.notify('STUDENT_DELETED', { id });
        this.notify('SYNC', { students: this.students });
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
                if (typeof window !== 'undefined') {
                    window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
                }
            }
            if (Array.isArray(parsed.stageMinLevels) && parsed.stageMinLevels.length === 6) {
                STAGE_MIN_LEVELS = parsed.stageMinLevels;
                localStorage.setItem('classpet_custom_stage_levels', JSON.stringify(STAGE_MIN_LEVELS));
                if (typeof window !== 'undefined') {
                    window.CLASS_STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
                }
            }
            this.recalculateAllStudentsProgress();
            this.save();

            const classId = this.getClassId();
            const db = safeElectronDB();
            if (db) {
                if (typeof db.importStudents === 'function') {
                    db.importStudents(this.students, classId);
                }
                if (typeof db.saveThresholds === 'function') {
                    db.saveThresholds(LEVEL_THRESHOLDS, STAGE_MIN_LEVELS, classId);
                }
                if (typeof db.saveBehaviorRules === 'function') {
                    db.saveBehaviorRules(this.behaviorRules, classId);
                }
            }

            this.audio.playFanfare();
            this.broadcast('STATE_SYNC', { students: this.students });
            this.broadcast('RULES_SYNC', { rules: this.behaviorRules });
            this.broadcast('THRESHOLDS_SYNC', { thresholds: LEVEL_THRESHOLDS, stageLevels: STAGE_MIN_LEVELS, students: this.students });
            this.notify('DATA_RESTORED', { count: this.students.length });
            this.notify('SYNC', { students: this.students });
            return { success: true, count: this.students.length };
        } catch (e) {
            console.error('Import failed:', e);
            return { success: false, error: e.message };
        }
    }

    // 自定义加减分行为项管理
    async addCustomRule(name, points, type) {
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

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.saveBehaviorRules === 'function') {
            await db.saveBehaviorRules(this.behaviorRules, classId);
        }

        this.broadcast('RULES_SYNC', { rules: this.behaviorRules });
        this.notify('RULES_UPDATE', { rules: this.behaviorRules });
        return newRule;
    }

    async deleteCustomRule(id) {
        this.behaviorRules = this.behaviorRules.filter(r => r.id !== id);
        this.saveRules();

        const classId = this.getClassId();
        const db = safeElectronDB();
        if (db && typeof db.saveBehaviorRules === 'function') {
            await db.saveBehaviorRules(this.behaviorRules, classId);
        }

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
            const totalExp = list.reduce((sum, s) => sum + (Number(s.exp) || 0), 0);
            const avgLevel = list.length ? (list.reduce((sum, s) => sum + (Number(s.level) || 0), 0) / list.length).toFixed(1) : '0.0';
            return {
                group: g,
                name: `第 ${g} 大组`,
                memberCount: list.length,
                count: list.length,
                totalExp,
                avgLevel,
                members: list
            };
        });
        groups.sort((a, b) => b.totalExp - a.totalExp);
        return groups;
    }
}

if (typeof window !== 'undefined') {
    window.classPetRuntime = new ClassPetStore();
    window.CLASS_LEVEL_THRESHOLDS = LEVEL_THRESHOLDS;
    window.STAGE_MIN_LEVELS = STAGE_MIN_LEVELS;
    window.PET_SPECIES_CATALOG = PET_SPECIES_CATALOG;
    window.PET_HEALING_QUOTES = PET_HEALING_QUOTES;
    window.getPetImagePath = getPetImagePath;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ClassPetStore,
        LEVEL_THRESHOLDS,
        STAGE_MIN_LEVELS,
        PET_SPECIES_CATALOG,
        PET_HEALING_QUOTES,
        getPetImagePath
    };
}

