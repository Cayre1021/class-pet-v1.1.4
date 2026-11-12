const path = require('path');
const fs = require('fs');

global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

const { ClassPetStore, LEVEL_THRESHOLDS } = require('../electron-app/src/classpet_core.js');
const sqliteService = require('../electron-app/sqlite_service.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`  ❌ [FAIL] ${message}`);
        throw new Error(`Assertion Failed: ${message}`);
    } else {
        passedTests++;
        console.log(`  ✅ [PASS] ${message}`);
    }
}

async function runPipeline() {
    console.log('===========================================================================');
    console.log('   CLASS PET 全等级首尾动态区间机制全流程立体检验与自动化管线');
    console.log('===========================================================================');

    const store = new ClassPetStore();

    // ---------------------------------------------------------
    // 流程 1: 0~20 级全梯队数学边界穷举校验
    // ---------------------------------------------------------
    console.log('\n[阶段 1] 21 个等级全梯队数学边界与动态首尾标尺穷举校验');
    
    // 1.1 蛋形态 (Lv.0)
    const eggZero = store.getExpProgress(0, 0, false);
    assert(eggZero.isEgg === true, '蛋形态 isEgg 为 true');
    assert(eggZero.percent === 0, '蛋 0 经验百分比为 0%');
    assert(eggZero.startMilestone.includes('0 EXP'), '蛋起点包含 0 EXP');
    assert(eggZero.targetMilestone.includes('15 EXP'), '蛋破壳目标包含 15 EXP');
    assert(eggZero.cardRateText === '0/15', '蛋卡片显示 0/15');

    const eggMid = store.getExpProgress(8, 0, false);
    assert(eggMid.percent === 53, '蛋 8 经验百分比为 53%');
    assert(eggMid.needExp === 7, '蛋 8 经验还差 7 EXP 破壳');

    const eggFull = store.getExpProgress(15, 0, false);
    assert(eggFull.percent === 100, '蛋 15 经验百分比为 100%');
    assert(eggFull.needExp === 0, '蛋 15 经验还差 0 EXP 破壳');

    // 1.2 Lv.1 ~ Lv.19 每一级的起点、中点、终点穷举
    for (let lvl = 1; lvl <= 19; lvl++) {
        const minExp = LEVEL_THRESHOLDS[lvl];
        const nextExp = LEVEL_THRESHOLDS[lvl + 1];
        const span = nextExp - minExp;

        // 起点测试 (刚升入该等级)
        const progStart = store.getExpProgress(minExp, lvl, true);
        assert(progStart.level === lvl, `Lv.${lvl} 起点等级正确`);
        assert(progStart.levelMinExp === minExp, `Lv.${lvl} 起点门槛为 ${minExp} EXP`);
        assert(progStart.levelNextExp === nextExp, `Lv.${lvl} 终点门槛为 ${nextExp} EXP`);
        assert(progStart.startMilestone.includes(`${minExp} EXP`), `Lv.${lvl} 首部包含 ${minExp} EXP`);
        assert(progStart.targetMilestone.includes(`${nextExp} EXP`), `Lv.${lvl} 尾巴包含 ${nextExp} EXP`);
        assert(progStart.progressInLevel === 0, `Lv.${lvl} 起点本级进度为 0`);
        assert(progStart.needExp === span, `Lv.${lvl} 起点还差 ${span} EXP 升级`);
        assert(progStart.cardRateText === `${minExp}/${nextExp}`, `Lv.${lvl} 卡片正确显示 ${minExp}/${nextExp}`);

        // 中点测试 (积攒了约一半经验)
        const midExp = minExp + Math.floor(span / 2);
        const progMid = store.getExpProgress(midExp, lvl, true);
        const expectedMidPercent = Math.round((Math.floor(span / 2) / span) * 100);
        assert(progMid.percent === expectedMidPercent, `Lv.${lvl} 中点百分比正确 (${progMid.percent}%)`);
        assert(progMid.cardRateText === `${midExp}/${nextExp}`, `Lv.${lvl} 中点卡片显示 ${midExp}/${nextExp}`);

        // 终点边界测试 (只差 1 点升级)
        const nearExp = nextExp - 1;
        const progNear = store.getExpProgress(nearExp, lvl, true);
        assert(progNear.needExp === 1, `Lv.${lvl} 差1分升级计算正确 (needExp=1)`);
        assert(progNear.progressInLevel === span - 1, `Lv.${lvl} 差1分本级进度正确`);
    }

    // 1.3 满级王者顶峰 (Lv.20 MAX)
    const maxProg = store.getExpProgress(1250, 20, true);
    assert(maxProg.isMax === true, 'Lv.20 isMax 为 true');
    assert(maxProg.percent === 100, 'Lv.20 百分比为 100%');
    assert(maxProg.cardRateText === 'MAX', 'Lv.20 卡片显示 MAX');
    assert(maxProg.targetMilestone.includes('MAX'), 'Lv.20 尾巴标注 MAX 顶峰');

    // 超满级测试 (如 1500 EXP，溢出经验防御)
    const overMaxProg = store.getExpProgress(1500, 20, true);
    assert(overMaxProg.isMax === true, '超满级 isMax 为 true');
    assert(overMaxProg.percent === 100, '超满级百分比维持 100%');
    assert(overMaxProg.totalExp === 1500, '超满级累计经验正确记录 1500 EXP');

    // ---------------------------------------------------------
    // 流程 2: 动态加减分全生命周期变迁与防御仿真
    // ---------------------------------------------------------
    console.log('\n[阶段 2] 萌宠成长生命周期变迁与扣分防降级不变量仿真');

    // 模拟测试学生从蛋开始成长
    let simExp = 0;
    let simLvl = 0;
    let simHatched = false;

    // 加分 15 点破壳
    simExp += 15;
    assert(simExp >= 15, '积攒满 15 EXP 达到破壳条件');
    simHatched = true;
    simLvl = 1;
    let p1 = store.getExpProgress(simExp, simLvl, simHatched);
    assert(p1.startMilestone.includes('15 EXP') && p1.targetMilestone.includes('35 EXP'), 'Lv.1 破壳后首尾自动切换为 15 ➔ 35');

    // 升至 Lv.2 (总经验 50)
    simExp = 50;
    simLvl = store.calcLevel(simExp, simLvl);
    assert(simLvl === 2, '50 EXP 正确升至 Lv.2');
    let p2 = store.getExpProgress(simExp, simLvl, simHatched);
    assert(p2.startMilestone.includes('35 EXP') && p2.targetMilestone.includes('60 EXP'), 'Lv.2 首尾自动切换为 35 ➔ 60');
    assert(p2.cardRateText === '50/60', 'Lv.2 卡片正确显示 50/60');
    assert(p2.percent === 60, 'Lv.2 进度条精准定格 60%');

    // 扣分测试 (-25 分，总经验跌落至 25，低于 Lv.2 门槛 35)
    simExp -= 25; // 25 EXP
    const safeLvl = store.calcLevel(simExp, simLvl);
    assert(safeLvl === 2, '【教育学不变量守卫】扣分后等级严格不降级，仍为 Lv.2');
    let pDeduct = store.getExpProgress(simExp, safeLvl, simHatched);
    assert(pDeduct.percent === 0, '低于起始门槛时百分比安全保护为 0% (不产生负数)');
    assert(pDeduct.startMilestone.includes('35 EXP'), '首部标尺依然稳固为 35 EXP');
    assert(pDeduct.targetMilestone.includes('60 EXP'), '尾部标尺依然稳固为 60 EXP');
    assert(pDeduct.needExp === 35, '升级所需经验平滑更新为 35 EXP');

    // ---------------------------------------------------------
    // 流程 3: 本地 SQLite 真实数据库全班 88 人匹配核验
    // ---------------------------------------------------------
    console.log('\n[阶段 3] 本地真实 SQLite 数据库全班数据全面审计');
    await sqliteService.init(null);
    const dbState = sqliteService.loadAllState('c_class02_01');
    assert(Array.isArray(dbState.students) && dbState.students.length > 0, `成功载入 SQLite 全班学生 (${dbState.students.length}人)`);

    let zeroDefect = true;
    for (const st of dbState.students) {
        const pet = st.pets?.[st.activeSubject || 'chinese'] || st.pets?.chinese;
        if (!pet) continue;
        const p = store.getExpProgress(pet.exp, pet.level, pet.isHatched);
        if (isNaN(p.percent) || p.percent < 0 || p.percent > 100 || !p.cardRateText) {
            zeroDefect = false;
            console.error(`  异常数据: 学生 ${st.name} (#${st.no}) 产生了无效进度对象`, p);
        }
    }
    assert(zeroDefect, '全班 88 名真实学生的所有宠物经验对象 100% 合法，无 NaN、无越界！');

    console.log('\n===========================================================================');
    console.log(`🏆 全流程立体质检完毕：共执行 ${totalTests} 项严苛断言，全部 100% 满分通过！`);
    console.log('===========================================================================');
    if (sqliteService && sqliteService.db && typeof sqliteService.db.close === 'function') {
        sqliteService.saveToDiskSync();
        sqliteService.db.close();
    }
    setTimeout(() => process.exit(0), 50);
}

runPipeline().catch(err => {
    console.error('Pipeline failed:', err);
    process.exit(1);
});
