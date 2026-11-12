// End-to-end test for card stamps
const fs = require('fs');
let code = fs.readFileSync('electron-app/src/classpet_core.js', 'utf8');

global.window = {
    addEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    location: { href: '' }
};
global.localStorage = global.window.localStorage;
eval(code);
const store = window.classPetRuntime;

// 模拟大屏卡片印章计算函数
function evaluateCardStamp(student) {
    const pet = (student.pets && (student.pets[student.activeSubject] || student.pets.chinese)) || (student.pets && Object.values(student.pets)[0]);
    const isEgg = !pet.isHatched || pet.species === 'egg' || (pet.visualStage === 0);
    const hatchThresh = store.getHatchThreshold ? store.getHatchThreshold() : 15;
    const petExp = pet.exp !== undefined ? pet.exp : (student.exp || 0);
    const petLvl = pet.level !== undefined ? pet.level : (student.level || 0);

    const hasAnyMaxSubject = (student.level >= 20) || (student.pets && Object.values(student.pets).some(p => (p.level || 0) >= 20));

    const unlockableUnhatchedSubs = [];
    if (student.pets) {
        ['chinese', 'math', 'english'].forEach(k => {
            const p = student.pets[k];
            const pIsEgg = !p || !p.isHatched || p.species === 'egg' || (p.visualStage === 0);
            const isUnlocked = store.isSubjectUnlocked ? store.isSubjectUnlocked(student.id, k) : (k === 'chinese');
            if (pIsEgg && isUnlocked) {
                unlockableUnhatchedSubs.push(k);
            }
        });
    }
    const canAwakenNewPet = hasAnyMaxSubject && unlockableUnhatchedSubs.length > 0;

    let stampHtml = '';
    if (student.isAbsent) {
        stampHtml = 'ABSENT';
    } else if (isEgg && (student.stamp === 'HATCH' || petExp >= hatchThresh || canAwakenNewPet)) {
        const isThisSubUnlocked = store.isSubjectUnlocked ? store.isSubjectUnlocked(student.id, student.activeSubject || 'chinese') : true;
        if (isThisSubUnlocked) {
            stampHtml = canAwakenNewPet ? '👑 王者待破壳' : '★ 可破壳 ★';
        } else {
            stampHtml = '🔒 待解锁';
        }
    } else if (isEgg) {
        stampHtml = '🐣 孵化';
    } else if (canAwakenNewPet) {
        stampHtml = '👑 待认领新宠';
    } else if (student.stamp === 'EVOLVE') {
        stampHtml = '可进化';
    } else if (student.stamp === 'MAX' || petLvl >= 20) {
        stampHtml = 'MAX';
    }
    return { stampHtml, canAwakenNewPet, unlockableUnhatchedSubs };
}

console.log('================ 场景测试 ================');

// 场景 1：赵六（语文20级MAX，数学已破壳Lv.5正在培养，英语未解锁蛋）
const zhaoLiu = {
    id: 'stu_zhaoliu',
    name: '赵六',
    activeSubject: 'chinese',
    level: 20,
    stamp: 'MAX',
    pets: {
        chinese: { subject: '语文', species: 'cat', level: 20, exp: 1250, isHatched: true },
        math: { subject: '数学', species: 'dog', level: 5, exp: 120, isHatched: true },
        english: { subject: '英语', species: 'egg', level: 0, exp: 0, isHatched: false }
    }
};
store.students = [zhaoLiu];
const resZhaoLiu = evaluateCardStamp(zhaoLiu);
console.log('【场景1】赵六卡片印章:', resZhaoLiu.stampHtml);
console.log('【场景1】是否可觉醒新宠:', resZhaoLiu.canAwakenNewPet);
console.log('【场景1】可唤醒学科列表:', resZhaoLiu.unlockableUnhatchedSubs);

if (resZhaoLiu.stampHtml === 'MAX' && resZhaoLiu.canAwakenNewPet === false && resZhaoLiu.unlockableUnhatchedSubs.length === 0) {
    console.log('✅ 测试 1 PASS: 赵六（数学未满级）大屏卡片绝无虚假“待认领新宠”，正确显示 MAX！');
} else {
    console.error('❌ 测试 1 FAIL: 赵六印章判断错误！', resZhaoLiu);
    process.exit(1);
}

// 场景 2：孙七（语文20级MAX，数学尚未破壳蛋，英语未解锁蛋）
const sunQi = {
    id: 'stu_sunqi',
    name: '孙七',
    activeSubject: 'chinese',
    level: 20,
    stamp: 'MAX',
    pets: {
        chinese: { subject: '语文', species: 'fox', level: 20, exp: 1250, isHatched: true },
        math: { subject: '数学', species: 'egg', level: 0, exp: 0, isHatched: false },
        english: { subject: '英语', species: 'egg', level: 0, exp: 0, isHatched: false }
    }
};
store.students = [sunQi];
const resSunQi = evaluateCardStamp(sunQi);
console.log('\n【场景2】孙七卡片印章:', resSunQi.stampHtml);
console.log('【场景2】可唤醒学科列表:', resSunQi.unlockableUnhatchedSubs);

if (resSunQi.stampHtml === '👑 待认领新宠' && resSunQi.canAwakenNewPet === true && resSunQi.unlockableUnhatchedSubs.length === 1 && resSunQi.unlockableUnhatchedSubs[0] === 'math') {
    console.log('✅ 测试 2 PASS: 孙七（语文满级、数学待破壳）卡片准确显示“👑 待认领新宠”，且可认领列表精准为数学！');
} else {
    console.error('❌ 测试 2 FAIL: 孙七印章判断错误！', resSunQi);
    process.exit(1);
}

// 场景 3：钱八（语文20级，数学也升到了20级满级，英语蛋满足解锁条件）
const qianBa = {
    id: 'stu_qianba',
    name: '钱八',
    activeSubject: 'chinese',
    level: 20,
    stamp: 'MAX',
    pets: {
        chinese: { subject: '语文', species: 'fox', level: 20, exp: 1250, isHatched: true },
        math: { subject: '数学', species: 'dog', level: 20, exp: 1250, isHatched: true },
        english: { subject: '英语', species: 'egg', level: 0, exp: 0, isHatched: false }
    }
};
store.students = [qianBa];
const resQianBa = evaluateCardStamp(qianBa);
console.log('\n【场景3】钱八卡片印章:', resQianBa.stampHtml);
console.log('【场景3】可唤醒学科列表:', resQianBa.unlockableUnhatchedSubs);

if (resQianBa.stampHtml === '👑 待认领新宠' && resQianBa.canAwakenNewPet === true && resQianBa.unlockableUnhatchedSubs.length === 1 && resQianBa.unlockableUnhatchedSubs[0] === 'english') {
    console.log('✅ 测试 3 PASS: 钱八（双科满级）英语正式解锁，准确显示“👑 待认领新宠”，精准指向英语！');
} else {
    console.error('❌ 测试 3 FAIL: 钱八印章判断错误！', resQianBa);
    process.exit(1);
}

console.log('\n🎉🎉🎉 全部端到端业务场景测试 100% 通过！');
process.exit(0);
