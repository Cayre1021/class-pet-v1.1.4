# -*- coding: utf-8 -*-
import sys
import os
import glob
import json
import hashlib
import sqlite3
import subprocess
from PIL import Image
import numpy as np
from scipy.ndimage import label

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 80)
print("     🐾 CLASS PET 班级电子宠物系统 · 超大规模全维度系统大审核 (GRAND AUDIT)")
print("=" * 80)

audit_report = {
    "summary": {"total_checks": 0, "passed_checks": 0, "failed_checks": 0},
    "dimensions": {}
}

def record_check(dim_name, check_name, passed, detail=""):
    audit_report["summary"]["total_checks"] += 1
    if dim_name not in audit_report["dimensions"]:
        audit_report["dimensions"][dim_name] = []
    
    if passed:
        audit_report["summary"]["passed_checks"] += 1
        status_icon = "✅ [PASS]"
    else:
        audit_report["summary"]["failed_checks"] += 1
        status_icon = "❌ [FAIL]"
        
    audit_report["dimensions"][dim_name].append({
        "check": check_name,
        "passed": passed,
        "detail": detail
    })
    print(f"  {status_icon} {check_name}" + (f" -> {detail}" if detail else ""))

# =========================================================================
# 维度 1: 核心 JavaScript 语法与双核心代码指纹一致性
# =========================================================================
print("\n[维度 1] 核心 JavaScript 语法解析与双核心指纹校验")
js_targets = [
    'electron-app/main.js',
    'electron-app/preload.js',
    'electron-app/sqlite_service.js',
    'electron-app/src/classpet_core.js',
    'electron-app/src/js/classpet_core.js'
]
for jf in js_targets:
    if os.path.exists(jf):
        res = subprocess.run(['node', '-c', jf], capture_output=True, text=True)
        record_check("核心代码语法", f"语法合法性: {jf}", res.returncode == 0, res.stderr.strip() if res.returncode != 0 else "Node.js AST 解析通过")
    else:
        record_check("核心代码语法", f"文件存在性: {jf}", False, "文件不存在")

h1 = hashlib.sha256(open('electron-app/src/classpet_core.js', 'rb').read()).hexdigest()
h2 = hashlib.sha256(open('electron-app/src/js/classpet_core.js', 'rb').read()).hexdigest()
record_check("核心代码语法", "双核心逻辑指纹一致性", h1 == h2, f"SHA-256 匹配: {h1[:16]}...")

# =========================================================================
# 维度 2: 页面主题合规排查 (杜绝 Dark Theme，验证 4 套护眼主题)
# =========================================================================
print("\n[维度 2] 页面配色合规与主题系统排查")
html_files = glob.glob('electron-app/src/**/*.html', recursive=True)
dark_theme_files = []
for hf in html_files:
    content = open(hf, encoding='utf-8', errors='ignore').read()
    if 'data-theme="dark"' in content or 'value="dark"' in content or ':root[data-theme="dark"]' in content:
        dark_theme_files.append(hf)
record_check("配色系统", "全工程暗夜主题 (Dark Theme) 绝迹排查", len(dark_theme_files) == 0, f"检索 {len(html_files)} 个页面，发现暗夜主题: {len(dark_theme_files)} 处")

# 检查两端主页面的 4 套护眼主题声明
expected_themes = ['classic', 'orange', 'forest', 'ocean']
bs_content = open('electron-app/src/display_bigscreen_touch_pro.html', encoding='utf-8').read()
tp_content = open('electron-app/src/teacher_panel_touch_pro.html', encoding='utf-8').read()

for t in expected_themes:
    in_bs = f':root[data-theme="{t}"]' in bs_content
    in_tp = f':root[data-theme="{t}"]' in tp_content
    record_check("配色系统", f"学生大屏主题定义 [:root[data-theme='{t}']] - display_bigscreen_touch_pro", in_bs)
    record_check("配色系统", f"教师控制台主题定义 [:root[data-theme='{t}']] - teacher_panel_touch_pro", in_tp)

# =========================================================================
# 维度 3: 两端悬浮圆圈菜单架构合规排查
# =========================================================================
print("\n[维度 3] 讲台大屏与操作台悬浮圆球轮盘系统深度合规排查")
# 大屏端一级与二级
record_check("悬浮轮盘大屏端", "大屏悬浮球 DOM 挂载 (#classpetFloatingBall)", 'id="classpetFloatingBall"' in bs_content)
record_check("悬浮轮盘大屏端", "大屏安全边界内推机制 (safeMargin >= 190px)", 'const safeMarginX = 195;' in bs_content)
record_check("悬浮轮盘大屏端", "大屏讲台控制收纳【换风格 disp_theme】", "id: 'disp_theme'" in bs_content and "cycleGlobalTheme()" in bs_content)
record_check("悬浮轮盘大屏端", "大屏快捷管理收纳【换班级 mng_portal】", "id: 'mng_portal'" in bs_content and "goToPortal()" in bs_content)
record_check("悬浮轮盘大屏端", "大屏弹窗实时热重绘 (store.subscribe 联动 refreshModal)", "activeModalStudent = freshStudent;" in bs_content and "refreshModal();" in bs_content)

# 教师控制台端一级与二级
record_check("悬浮轮盘教师端", "教师端悬浮球 DOM 挂载 (#classpetFloatingBall)", 'id="classpetFloatingBall"' in tp_content)
record_check("悬浮轮盘教师端", "教师端安全边界内推机制 (safeMargin >= 190px)", 'const safeMarginX = 195;' in tp_content)
record_check("悬浮轮盘教师端", "教师端【批选控制 select】(全选/反选/清空)", "id: 'sel_all'" in tp_content and "id: 'sel_inv'" in tp_content and "id: 'sel_clr'" in tp_content)
record_check("悬浮轮盘教师端", "教师端【学科切换 subject】(语文/数学/英语)", "id: 'sub_cn'" in tp_content and "id: 'sub_ma'" in tp_content and "id: 'sub_en'" in tp_content)
record_check("悬浮轮盘教师端", "教师端【历史操作 history】(撤销/流水)", "id: 'hist_undo'" in tp_content and "id: 'hist_audit'" in tp_content)
record_check("悬浮轮盘教师端", "教师端【班级管理 class】(考勤/新增/导入)", "id: 'cls_att'" in tp_content and "id: 'cls_add'" in tp_content and "id: 'cls_imp'" in tp_content)
record_check("悬浮轮盘教师端", "教师端【教学配置 settings】(经验/备份/风格)", "id: 'set_exp'" in tp_content and "id: 'set_bak'" in tp_content and "id: 'set_thm'" in tp_content)
record_check("悬浮轮盘教师端", "教师端【联动导航 nav】(大屏/换班/回正)", "id: 'nav_scr'" in tp_content and "id: 'nav_cls'" in tp_content and "id: 'nav_rst'" in tp_content)

# =========================================================================
# 维度 4: 0~20 级成长曲线与双轨进度条精确性核验
# =========================================================================
print("\n[维度 4] 0~20 级经验等级机制与双轨进度条精确性核验")
res_curve = subprocess.run(['node', '-e', """
    const storage = {};
    global.localStorage = {
        getItem: (k) => storage[k] || null,
        setItem: (k, v) => { storage[k] = String(v); },
        removeItem: (k) => { delete storage[k]; }
    };
    global.window = global;
    const { ClassPetStore, DEFAULT_LEVEL_THRESHOLDS, DEFAULT_STAGE_LEVELS } = require('./electron-app/src/classpet_core.js');
    const store = new ClassPetStore();
    const thresholds = store.getLevelThresholds();
    const isLen21 = thresholds.length === 21;
    const maxVal = thresholds[20];
    const eggVal = thresholds[1];
    const s8Val = thresholds[8];
    console.log(JSON.stringify({
        len: thresholds.length,
        maxVal,
        eggVal,
        s8Val,
        thresholds
    }));
    process.exit(0);
"""], capture_output=True, text=True, encoding='utf-8')

if res_curve.returncode == 0:
    data_curve = json.loads(res_curve.stdout.strip())
    record_check("成长体系", "等级阈值阶梯长度为 21 (覆盖 Lv.0~Lv.20)", data_curve["len"] == 21, f"实际长度: {data_curve['len']}")
    record_check("成长体系", "Lv.20 MAX 终极经验上限严格为 1250 EXP", data_curve["maxVal"] == 1250, f"终极上限: {data_curve['maxVal']} EXP")
    record_check("成长体系", "Lv.1 破壳初生门槛为 15 EXP", data_curve["eggVal"] == 15, f"破壳门槛: {data_curve['eggVal']} EXP")
    record_check("成长体系", "Lv.8 进阶形态门槛为 260 EXP", data_curve["s8Val"] == 260, f"进阶门槛: {data_curve['s8Val']} EXP")
else:
    record_check("成长体系", "等级阈值阶梯加载", False, res_curve.stderr.strip())

# 检查大屏双轨进度条 DOM 结构
record_check("双轨进度条", "微观升级进度条容器 (#heroProgressBar)", 'id="heroProgressBar"' in bs_content)
record_check("双轨进度条", "微观两端门槛标尺 (#heroMilestonesRow)", 'id="heroMilestonesRow"' in bs_content)
record_check("双轨进度条", "宏观终生 1250 EXP 累计展示 (#heroExpText)", 'id="heroExpText"' in bs_content and '1250 EXP' in bs_content)

# =========================================================================
# 维度 5: 灵兽美术素材深度图像分析 (全量 41 张立绘)
# =========================================================================
print("\n[维度 5] 41 张高精灵兽素材像素级深度验收 (分辨率/边缘透明/内部穿孔)")
pet_files = sorted(glob.glob('electron-app/src/assets/pets/**/*.png', recursive=True))
record_check("美术立绘质检", "全量素材数量严格达标 (41 张)", len(pet_files) == 41, f"实际检测到 {len(pet_files)} 张")

defect_size = []
defect_border = []
defect_holes = []

for pf in pet_files:
    rel = os.path.relpath(pf, 'electron-app/src/assets/pets')
    im = Image.open(pf).convert('RGBA')
    w, h = im.size
    if w != 512 or h != 512:
        defect_size.append(f"{rel} ({w}x{h})")
    
    arr = np.array(im)
    alpha = arr[:, :, 3]
    b_max = max(alpha[0, :].max(), alpha[-1, :].max(), alpha[:, 0].max(), alpha[:, -1].max())
    if b_max > 20:
        defect_border.append(f"{rel} (max_border_alpha={b_max})")
        
    is_trans = (alpha < 50)
    labeled, num_features = label(is_trans)
    boundary_labels = set()
    boundary_labels.update(labeled[0, :])
    boundary_labels.update(labeled[-1, :])
    boundary_labels.update(labeled[:, 0])
    boundary_labels.update(labeled[:, -1])
    internal_holes = [c for c in range(1, num_features + 1) if c not in boundary_labels]
    if len(internal_holes) > 0:
        defect_holes.append(f"{rel} ({len(internal_holes)} holes)")

record_check("美术立绘质检", "512x512 标准尺寸规格", len(defect_size) == 0, f"异常数: {len(defect_size)}")
record_check("美术立绘质检", "外边界 1px 零溢出与透明边缘", len(defect_border) == 0, f"溢出数: {len(defect_border)}")
record_check("美术立绘质检", "主体内部无穿孔/无透明死区", len(defect_holes) == 0, f"穿孔数: {len(defect_holes)}")

# =========================================================================
# 维度 6: 本地 SQLite 数据库与数据表完整性
# =========================================================================
print("\n[维度 6] 本地 SQLite 数据库结构与表记录审计")
db_file = 'database/classpet.sqlite'
if os.path.exists(db_file):
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    core_tables = ['students', 'pets', 'classes', 'behavior_rules', 'score_operations', 'interaction_events']
    for ct in core_tables:
        exists = ct in tables
        cnt = cur.execute(f"SELECT COUNT(*) FROM {ct}").fetchone()[0] if exists else 0
        record_check("数据库审计", f"数据表 [{ct}] 完整性", exists, f"当前记录数: {cnt}")
    conn.close()
else:
    record_check("数据库审计", "SQLite 数据库文件存在性", False, "database/classpet.sqlite 缺失")

# =========================================================================
# 维度 7: 生产编译发布包完整性核查 (v1.1.2)
# =========================================================================
print("\n[维度 7] 生产环境编译安装包与便携版完整性校验 (v1.1.2)")
setup_112 = 'electron-app/release/ClassPet Setup 1.1.2.exe'
port_112 = 'electron-app/release/ClassPet-Portable-1.1.2.exe'

pkg_json = json.load(open('electron-app/package.json', encoding='utf-8'))
record_check("发布构建", "package.json 版本号严格对齐 1.1.2", pkg_json.get('version') == '1.1.2', f"当前版本: {pkg_json.get('version')}")

if os.path.exists(setup_112):
    sz_setup = os.path.getsize(setup_112)
    record_check("发布构建", f"Windows 安装包已就绪 ({os.path.basename(setup_112)})", sz_setup > 100 * 1024 * 1024, f"大小: {sz_setup / (1024*1024):.2f} MB")
else:
    record_check("发布构建", f"Windows 安装包已就绪 ({os.path.basename(setup_112)})", False, "文件不存在")

if os.path.exists(port_112):
    sz_port = os.path.getsize(port_112)
    record_check("发布构建", f"Windows 便携版已就绪 ({os.path.basename(port_112)})", sz_port > 100 * 1024 * 1024, f"大小: {sz_port / (1024*1024):.2f} MB")
else:
    record_check("发布构建", f"Windows 便携版已就绪 ({os.path.basename(port_112)})", False, "文件不存在")

# =========================================================================
# 统计汇总
# =========================================================================
print("\n" + "=" * 80)
total = audit_report["summary"]["total_checks"]
passed = audit_report["summary"]["passed_checks"]
failed = audit_report["summary"]["failed_checks"]
rate = (passed / total) * 100 if total > 0 else 0

print(f"📊 大审核最终汇总指标：共执行检查点 {total} 项 | 成功通过 {passed} 项 | 失败异常 {failed} 项")
print(f"🎯 合规率 (Compliance Rate)：{rate:.2f}%")
if failed == 0:
    print("🏆 恭喜！CLASS PET 全工程 7 大维度系统大审核 100% 满分通过！代码、美术、交互、逻辑无懈可击！")
else:
    print(f"⚠️ 警告！存在 {failed} 项未通过检查，请立即排查上述异常点！")
print("=" * 80)
