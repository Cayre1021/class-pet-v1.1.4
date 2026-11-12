const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const htmlPath = path.join(__dirname, '../electron-app/src/display_bigscreen_touch_pro.html');
    win.webContents.on('console-message', (e, level, message, line, sourceId) => {
        console.log(`[Renderer Console] ${message} (line: ${line})`);
    });
    await win.loadFile(htmlPath);

    // 等待页面初始加载完毕
    await new Promise(r => setTimeout(r, 1200));

    // 注入极端数据场景：
    // 包含超长姓名、超高经验数值、各种未破壳蛋、已满级神兽
    await win.webContents.executeJavaScript(`
        const extremeStudents = [
            {
                id: 'stu_egg_01',
                no: '01',
                name: '阿布都热依木·买买提',
                group: 1,
                level: 0,
                exp: 0,
                visualStage: 0,
                isHatched: false,
                stamp: null,
                activeSubject: 'chinese',
                pets: {
                    chinese: { id: 'p_e1_c', species: 'egg', subject: '语文', name: '神秘宠物蛋 (待破壳)', icon: '🐣', level: 0, exp: 0, visualStage: 0, isHatched: false },
                    math: { id: 'p_e1_m', species: 'egg', subject: '数学', name: '神秘宠物蛋', icon: '🐣', level: 0, exp: 0, visualStage: 0, isHatched: false },
                    english: { id: 'p_e1_e', species: 'egg', subject: '英语', name: '神秘宠物蛋', icon: '🐣', level: 0, exp: 0, visualStage: 0, isHatched: false }
                }
            },
            {
                id: 'stu_egg_ready',
                no: '02',
                name: '欧阳慕容云海',
                group: 1,
                level: 0,
                exp: 15,
                visualStage: 0,
                isHatched: false,
                stamp: 'HATCH',
                activeSubject: 'chinese',
                pets: {
                    chinese: { id: 'p_e2_c', species: 'egg', subject: '语文', name: '神秘宠物蛋 (待破壳)', icon: '🐣', level: 0, exp: 15, visualStage: 0, isHatched: false },
                    math: { id: 'p_e2_m', species: 'egg', subject: '数学', name: '神秘宠物蛋', icon: '🐣', level: 0, exp: 0, visualStage: 0, isHatched: false },
                    english: { id: 'p_e2_e', species: 'egg', subject: '英语', name: '神秘宠物蛋', icon: '🐣', level: 0, exp: 0, visualStage: 0, isHatched: false }
                }
            },
            {
                id: 'stu_max_king',
                no: '42',
                name: '吕四',
                group: 2,
                level: 20,
                exp: 1250,
                visualStage: 5,
                isHatched: true,
                stamp: 'MAX',
                activeSubject: 'chinese',
                pets: {
                    chinese: { id: 'p_42_c', species: 'cat', subject: '语文', name: '灵动九尾仙猫', icon: '🐱', level: 20, exp: 1250, visualStage: 5, isHatched: true },
                    math: { id: 'p_42_m', species: 'egg', subject: '数学', name: '神秘宠物蛋 (待破壳)', icon: '🐣', level: 0, exp: 5, visualStage: 0, isHatched: false },
                    english: { id: 'p_42_e', species: 'fox', subject: '英语', name: '赤焰神狐', icon: '🦊', level: 1, exp: 15, visualStage: 1, isHatched: true }
                }
            },
            {
                id: 'stu_long_exp',
                no: '88',
                name: '诸葛孔明',
                group: 3,
                level: 19,
                exp: 99999,
                visualStage: 4,
                isHatched: true,
                stamp: 'EVOLVE',
                activeSubject: 'math',
                pets: {
                    chinese: { id: 'p_88_c', species: 'dragon', subject: '语文', name: '青龙', icon: '🐲', level: 18, exp: 8888, visualStage: 4, isHatched: true },
                    math: { id: 'p_88_m', species: 'turtle', subject: '数学', name: '玄武金甲巨龟', icon: '🐢', level: 19, exp: 99999, visualStage: 4, isHatched: true },
                    english: { id: 'p_88_e', species: 'egg', subject: '英语', name: '神秘宠物蛋', icon: '🐣', level: 0, exp: 0, visualStage: 0, isHatched: false }
                }
            }
        ];

        // 填充至 45 名学生以模拟真实班级高密度网格
        for (let i = 5; i <= 45; i++) {
            const isH = i % 2 === 0;
            const subLvl = (i * 3) % 20 + 1;
            extremeStudents.push({
                id: 'stu_' + i,
                no: String(i).padStart(2, '0'),
                name: '学生' + i + '号',
                group: (i % 4) + 1,
                level: isH ? subLvl : 0,
                exp: isH ? subLvl * 60 + 5 : i % 16,
                visualStage: isH ? Math.min(5, Math.floor(subLvl / 4) + 1) : 0,
                isHatched: isH,
                stamp: !isH && (i % 16 >= 15) ? 'HATCH' : (!isH ? null : (subLvl >= 20 ? 'MAX' : null)),
                activeSubject: i % 3 === 0 ? 'math' : (i % 3 === 1 ? 'english' : 'chinese'),
                pets: {
                    chinese: { id: 'p_' + i + '_c', species: isH ? 'cat' : 'egg', subject: '语文', name: isH ? '猫咪' : '宠物蛋', icon: isH ? '🐱' : '🐣', level: isH ? subLvl : 0, exp: isH ? 100 : 5, visualStage: isH ? 1 : 0, isHatched: isH },
                    math: { id: 'p_' + i + '_m', species: isH ? 'dog' : 'egg', subject: '数学', name: isH ? '柴犬' : '宠物蛋', icon: isH ? '🐶' : '🐣', level: isH ? 1 : 0, exp: 20, visualStage: isH ? 1 : 0, isHatched: isH },
                    english: { id: 'p_' + i + '_e', species: 'egg', subject: '英语', name: '神秘宠物蛋', icon: '🐣', level: 0, exp: 0, visualStage: 0, isHatched: false }
                }
            });
        }

        window.classPetRuntime.students = extremeStudents;
        renderAll();
    `);

    await new Promise(r => setTimeout(r, 600));

    // 1. 截图：大屏主网格卡片全景
    let img = await win.capturePage();
    fs.writeFileSync(path.join(screenshotDir, '01_grid_extreme.png'), img.toPNG());
    console.log('✔ 已生成 01_grid_extreme.png');

    // 2. 截图：点击进入第 1 名学生（0经验神秘蛋）的详情弹窗
    const res02 = await win.webContents.executeJavaScript(`
        openStudentDetailsModal('stu_egg_01');
        document.getElementById('modalStudentDetails').style.display;
    `);
    console.log('Modal 02 display state:', res02);
    await new Promise(r => setTimeout(r, 500));
    img = await win.capturePage();
    fs.writeFileSync(path.join(screenshotDir, '02_modal_egg_zero_exp.png'), img.toPNG());
    console.log('✔ 已生成 02_modal_egg_zero_exp.png');

    // 3. 截图：点击进入第 2 名学生（15经验待破壳神秘蛋，带可破壳金色操作条）
    await win.webContents.executeJavaScript(`
        openStudentDetailsModal('stu_egg_ready');
    `);
    await new Promise(r => setTimeout(r, 500));
    img = await win.capturePage();
    fs.writeFileSync(path.join(screenshotDir, '03_modal_egg_ready_hatch.png'), img.toPNG());
    console.log('✔ 已生成 03_modal_egg_ready_hatch.png');

    // 4. 截图：点击进入 42 号吕四（语文满级，切换到数学蛋激活王者觉醒特权操作条）
    await win.webContents.executeJavaScript(`
        openStudentDetailsModal('stu_max_king');
        switchModalSubject('math');
    `);
    await new Promise(r => setTimeout(r, 500));
    img = await win.capturePage();
    fs.writeFileSync(path.join(screenshotDir, '04_modal_egg_king_awaken.png'), img.toPNG());
    console.log('✔ 已生成 04_modal_egg_king_awaken.png');

    // 5. 截图：88号诸葛孔明（超长经验 99999 EXP，高阶突破）
    await win.webContents.executeJavaScript(`
        openStudentDetailsModal('stu_long_exp');
    `);
    await new Promise(r => setTimeout(r, 500));
    img = await win.capturePage();
    fs.writeFileSync(path.join(screenshotDir, '05_modal_extreme_long_exp.png'), img.toPNG());
    console.log('✔ 已生成 05_modal_extreme_long_exp.png');

    // 6. 截图：破壳认领中心 Modal
    await win.webContents.executeJavaScript(`
        closeDetailsModal();
        openHatchModal('stu_max_king', 'math');
    `);
    await new Promise(r => setTimeout(r, 500));
    img = await win.capturePage();
    fs.writeFileSync(path.join(screenshotDir, '06_modal_hatch_center.png'), img.toPNG());
    console.log('✔ 已生成 06_modal_hatch_center.png');

    // 7. 截图：切换至座位表模式 (Seat View)
    const seatState = await win.webContents.executeJavaScript(`
        closeHatchModal();
        closeDetailsModal();
        switchView('seat');
        return {
            hatchDisplay: document.getElementById('modalHatchCenter').style.display,
            detailsDisplay: document.getElementById('modalStudentDetails').style.display,
            seatDisplay: document.getElementById('seatmapView').style.display
        };
    `);
    console.log('Seat view state:', seatState);
    await new Promise(r => setTimeout(r, 600));
    img = await win.capturePage();
    fs.writeFileSync(path.join(screenshotDir, '07_seat_extreme.png'), img.toPNG());
    console.log('✔ 已生成 07_seat_extreme.png');

    console.log('🎉 所有场景截图捕获完毕！');
    app.quit();
});
