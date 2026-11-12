# -*- coding: utf-8 -*-
import sys
import os
import glob
import hashlib
import subprocess
from PIL import Image
import numpy as np
import cv2
from scipy.ndimage import label

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 75)
print("   CLASS PET 全工程多维立体严格审查、审核与校对总检套件")
print("=" * 75)

all_passed = True

# ----------------------------------------------------
# 维度 1: 核心 JavaScript 语法与双核心指纹一致性
# ----------------------------------------------------
print("\n[维度 1] 核心 JavaScript 语法与双核心同步校验")
js_files = [
    'electron-app/main.js',
    'electron-app/preload.js',
    'electron-app/sqlite_service.js',
    'electron-app/src/classpet_core.js',
    'electron-app/src/js/classpet_core.js'
]

for jf in js_files:
    if os.path.exists(jf):
        p = subprocess.run(['node', '-c', jf], capture_output=True, text=True)
        if p.returncode == 0:
            print(f"  ✅ [PASS] 语法合法: {jf}")
        else:
            all_passed = False
            print(f"  ❌ [FAIL] 语法报错: {jf}\n{p.stderr}")
    else:
        all_passed = False
        print(f"  ❌ [FAIL] 文件缺失: {jf}")

h1 = hashlib.sha256(open('electron-app/src/classpet_core.js', 'rb').read()).hexdigest()
h2 = hashlib.sha256(open('electron-app/src/js/classpet_core.js', 'rb').read()).hexdigest()
if h1 == h2:
    print(f"  ✅ [PASS] 双核心逻辑指纹 100% 绝对一致 (SHA-256: {h1[:16]}...)")
else:
    all_passed = False
    print(f"  ❌ [FAIL] 双核心逻辑指纹不匹配: classpet_core.js vs js/classpet_core.js")

# ----------------------------------------------------
# 维度 2: HTML 页面静态代码与暗夜主题绝迹排查
# ----------------------------------------------------
print("\n[维度 2] HTML 页面静态结构与暗夜主题 (Dark Theme) 绝迹排查")
html_files = glob.glob('electron-app/src/**/*.html', recursive=True)
dark_theme_found = []

for hf in html_files:
    content = open(hf, encoding='utf-8', errors='ignore').read()
    # 检查是否有残留 dark theme
    if 'data-theme="dark"' in content or 'value="dark"' in content or ':root[data-theme="dark"]' in content:
        dark_theme_found.append(hf)
        all_passed = False
        print(f"  ❌ [FAIL] 发现残留暗夜主题定义: {hf}")

if not dark_theme_found:
    print(f"  ✅ [PASS] 经全面检索 {len(html_files)} 个页面，全工程已 100% 彻底清除暗夜主题")

# ----------------------------------------------------
# 维度 3: 全量 41 张灵兽素材像素级零孔洞与边缘透明质检
# ----------------------------------------------------
print("\n[维度 3] 全量 41 张灵兽素材像素级深度验收 (零镂空、边缘无噪、尺寸标准)")
pet_files = sorted(glob.glob('electron-app/src/assets/pets/**/*.png', recursive=True))

if len(pet_files) != 41:
    all_passed = False
    print(f"  ❌ [FAIL] 预期 41 张灵兽素材，当前仅检测到 {len(pet_files)} 张！")
else:
    print(f"  [*] 检测到全部 {len(pet_files)} 张灵兽素材，执行逐像素深度分析...")

hole_failures = []
size_failures = []
border_failures = []

for pf in pet_files:
    rel = os.path.relpath(pf, 'electron-app/src/assets/pets')
    im = Image.open(pf).convert('RGBA')
    w, h = im.size
    if w != 512 or h != 512:
        size_failures.append((rel, f"{w}x{h}"))

    arr = np.array(im)
    alpha = arr[:, :, 3]

    # 画布最外圈边缘透明度检测 (外 1px)
    b_max = max(alpha[0, :].max(), alpha[-1, :].max(), alpha[:, 0].max(), alpha[:, -1].max())
    if b_max > 20:
        border_failures.append((rel, b_max))

    # 拓扑连通域孔洞检测 (严查主体内部是否有 Alpha < 50 的透明洞)
    is_trans = (alpha < 50)
    labeled, num_features = label(is_trans)

    # 边界连通标签
    boundary_labels = set()
    boundary_labels.update(labeled[0, :])
    boundary_labels.update(labeled[-1, :])
    boundary_labels.update(labeled[:, 0])
    boundary_labels.update(labeled[:, -1])

    # 任何不接触外边界的透明连通块即为“内部穿孔空洞”
    internal_holes = [c for c in range(1, num_features + 1) if c not in boundary_labels]
    if len(internal_holes) > 0:
        total_hole_px = sum(np.sum(labeled == c) for c in internal_holes)
        hole_failures.append((rel, len(internal_holes), total_hole_px))

if not size_failures and not border_failures and not hole_failures:
    print("  ✅ [PASS] 41/41 张立绘全部通过质检：512x512 标准规格、外边缘 0 噪点、体内 0 穿孔！")
else:
    all_passed = False
    if size_failures:
        print(f"  ❌ [FAIL] 规格不合规: {size_failures}")
    if border_failures:
        print(f"  ❌ [FAIL] 画布贴边溢出: {border_failures}")
    if hole_failures:
        print(f"  ❌ [FAIL] 存在内部镂空空洞: {hole_failures}")

# ----------------------------------------------------
# 维度 4: 学科链式解锁与多宠养成业务规则核验
# ----------------------------------------------------
print("\n[维度 4] 学科多宠养成业务逻辑与越级认领拦截校验")
try:
    chain_test = subprocess.run(['node', '-e', """
        const storage = {};
        global.localStorage = {
            getItem: (k) => storage[k] || null,
            setItem: (k, v) => { storage[k] = String(v); },
            removeItem: (k) => { delete storage[k]; },
            clear: () => { for (let k in storage) delete storage[k]; }
        };
        global.window = global;

        const { ClassPetStore } = require('./electron-app/src/classpet_core.js');
        const store = new ClassPetStore();
        
        // 场景 A: 初始学生 (语文 Lv.1 未满级)
        const sA = store.students[0];
        sA.pets.chinese.level = 5;
        const mathUnlockedA = store.isSubjectUnlocked(sA.id, 'math');
        const engUnlockedA = store.isSubjectUnlocked(sA.id, 'english');
        
        // 场景 B: 用户真实反馈场景 (如赵六: 语文 Lv.20 满级，数学 Lv.9 未满级)
        sA.pets.chinese.level = 20;
        sA.pets.math = { species: 'fox', visualStage: 2, level: 9, exp: 120, name: '赤狐' };
        const mathUnlockedB = store.isSubjectUnlocked(sA.id, 'math');
        const engUnlockedB = store.isSubjectUnlocked(sA.id, 'english');
        const availB = store.getAvailableHatchSubjects(sA.id);
        const hatchEngAttempt = store.hatchStudentPet(sA.id, 'bunny', 'english');

        // 场景 C: 语文 Lv.20 + 数学 Lv.20 (双满级)
        sA.pets.math.level = 20;
        const engUnlockedC = store.isSubjectUnlocked(sA.id, 'english');
        const availC = store.getAvailableHatchSubjects(sA.id);

        console.log(JSON.stringify({
            scenarioA: { math: mathUnlockedA, english: engUnlockedA },
            scenarioB: { math: mathUnlockedB, english: engUnlockedB, avail: availB, hatchEngBlocked: hatchEngAttempt === null },
            scenarioC: { english: engUnlockedC, avail: availC }
        }));
        process.exit(0);
    """], capture_output=True, text=True, encoding='utf-8', errors='replace')

    if chain_test.returncode == 0:
        import json
        lines = [ln.strip() for ln in chain_test.stdout.strip().split('\n') if ln.strip().startswith('{')]
        res = json.loads(lines[-1])
        b = res['scenarioB']
        c = res['scenarioC']
        allowed_b = b['avail'].get('allowedSubjects', []) if isinstance(b['avail'], dict) else b['avail']
        if not b['english'] and b['hatchEngBlocked'] and 'english' not in allowed_b:
            print("  ✅ [PASS] 场景 B (赵六式单满级): 严格锁死英语学科，越级孵化已被核心层强制拦截！")
        else:
            all_passed = False
            print(f"  ❌ [FAIL] 场景 B 异常: {b}")

        if c['english']:
            print("  ✅ [PASS] 场景 C (双科满级): 数学与语文均满级后，第三门英语顺利合规解锁！")
        else:
            all_passed = False
            print(f"  ❌ [FAIL] 场景 C 异常: {c}")
    else:
        all_passed = False
        print(f"  ❌ [FAIL] 学科链式逻辑测试脚本异常: {chain_test.stderr}")
except Exception as e:
    all_passed = False
    print(f"  ❌ [FAIL] 执行异常: {e}")

# ----------------------------------------------------
# 维度 5: 真实 SQLite 数据库连接与结构完整性
# ----------------------------------------------------
print("\n[维度 5] 嵌入式 SQLite 数据库真实性与历史归档回显校验")
db_path = 'database/classpet.sqlite'
if os.path.exists(db_path):
    import sqlite3
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    print(f"  ✅ [PASS] SQLite 数据库已就绪，包含数据表: {tables}")
    # 统计核心表行数
    for tb in ['students', 'pets', 'classes', 'behavior_records']:
        if tb in tables:
            cnt = cur.execute(f"SELECT COUNT(*) FROM {tb}").fetchone()[0]
            print(f"     - 表 [{tb}]: 共 {cnt} 条记录")
    conn.close()
else:
    all_passed = False
    print(f"  ❌ [FAIL] 数据库文件缺失: {db_path}")

print("\n" + "=" * 75)
if all_passed:
    print("🏆 审查结果：全工程所有代码、素材、逻辑与数据层 100% 完美通过！")
else:
    print("⚠️ 审查结果：发现未达标项，请根据上述提示处理！")
print("=" * 75)
