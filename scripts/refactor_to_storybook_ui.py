import re
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

print("Starting Storybook UI Transformation...")

# 1. Paths
bigscreen_path = r"d:\Desk\ALL Vibe\new-class-pet\electron-app\src\display_bigscreen_touch_pro.html"
teacher_path = r"d:\Desk\ALL Vibe\new-class-pet\electron-app\src\teacher_panel_touch_pro.html"

# ==========================================
# 1. Transform Big Screen (display_bigscreen_touch_pro.html)
# ==========================================
with open(bigscreen_path, 'r', encoding='utf-8') as f:
    bigscreen_content = f.read()

# Replace Theme Palette
old_theme_regex = r':root\[data-theme="classic"\]\s*\{[^}]*\}\s*:root\[data-theme="orange"\]\s*\{[^}]*\}\s*:root\[data-theme="forest"\]\s*\{[^}]*\}\s*:root\[data-theme="ocean"\]\s*\{[^}]*\}'
new_theme_css = '''/* 📚 儿童绘本温润护眼主题体系 (彻底消除新野兽派黑边黑硬阴影) */
        :root[data-theme="classic"], :root[data-theme="storybook"] {
            --bg-primary: #FAF6EE;        /* 奶油纸面柔和底色，防眩光护眼 */
            --bg-secondary: #F4ECE1;      /* 米麦柔暖色次级容器 */
            --text-primary: #3A3027;      /* 浓郁咖啡深褐墨字，告别死黑 */
            --text-secondary: #7A6959;    /* 温暖浅褐次要文字 */
            --border: #DECDB9;            /* 手揉绘本纸温润边框 */
            --border-hover: #CDB79E;
            --accent: #FF8F3D;            /* 阳光温暖金橙 */
            --accent-hover: #F27C24;
            --accent-text: #FFFFFF;
            --card-bg: #FFFDF8;           /* 绘本画纸白，温暖透气 */
            --success: #4EAA78;           /* 草木柔绿 */
            --warning: #F5B041;           /* 暖麦金黄 */
            --error: #E76F6F;             /* 草莓柔红 */
            --tag-bg: #F7EFE4;
            --shadow-color: rgba(140, 110, 80, 0.08); /* 柔和纸面微阴影，彻底消除生硬黑色块 */
            --card-radius: 20px;          /* 大圆角 */
            --btn-radius: 14px;
        }

        :root[data-theme="orange"] {
            --bg-primary: #FAF4EE;
            --bg-secondary: #F5EAE0;
            --text-primary: #3B2A20;
            --text-secondary: #7A6252;
            --border: #E5D2C2;
            --border-hover: #D6BDAB;
            --accent: #FA7938;
            --accent-hover: #E36423;
            --accent-text: #FFFFFF;
            --card-bg: #FFFAF5;
            --success: #4EAA78;
            --warning: #F5B041;
            --error: #E76F6F;
            --tag-bg: #FAEFE5;
            --shadow-color: rgba(150, 100, 70, 0.08);
            --card-radius: 20px;
            --btn-radius: 14px;
        }

        :root[data-theme="forest"] {
            --bg-primary: #F4F7F3;
            --bg-secondary: #E8EFE6;
            --text-primary: #26382B;
            --text-secondary: #586F5E;
            --border: #C8D8C7;
            --border-hover: #AFC4AE;
            --accent: #4E9A68;
            --accent-hover: #3E8255;
            --accent-text: #FFFFFF;
            --card-bg: #FCFDFB;
            --success: #52B77B;
            --warning: #E8A838;
            --error: #E76F6F;
            --tag-bg: #EAF2E9;
            --shadow-color: rgba(60, 100, 70, 0.08);
            --card-radius: 20px;
            --btn-radius: 14px;
        }

        :root[data-theme="ocean"] {
            --bg-primary: #F3F7FA;
            --bg-secondary: #E5EEF5;
            --text-primary: #223447;
            --text-secondary: #556D85;
            --border: #C7D7E6;
            --border-hover: #ADC3D6;
            --accent: #488EC7;
            --accent-hover: #3576AD;
            --accent-text: #FFFFFF;
            --card-bg: #FBFCFE;
            --success: #4EAA78;
            --warning: #F5B041;
            --error: #E76F6F;
            --tag-bg: #E8F0F7;
            --shadow-color: rgba(60, 90, 120, 0.08);
            --card-radius: 20px;
            --btn-radius: 14px;
        }'''

bigscreen_content = re.sub(old_theme_regex, new_theme_css, bigscreen_content, flags=re.DOTALL)

# Update font-family
bigscreen_content = bigscreen_content.replace(
    "font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;",
    "font-family: 'YouYuan', 'HarmonyOS Sans SC Rounded', 'PingFang SC', 'Microsoft YaHei', sans-serif;"
)

# Replace Stage Header Pro
old_header_css = r'''\.stage-header-pro\s*\{[^}]*\}'''
new_header_css = '''.stage-header-pro {
            background: var(--card-bg);
            border-bottom: 2px solid var(--border);
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 58px;
            min-height: 58px;
            z-index: 100;
            box-shadow: 0 4px 16px rgba(120, 95, 70, 0.05);
            overflow: visible;
            box-sizing: border-box;
        }'''
bigscreen_content = re.sub(old_header_css, new_header_css, bigscreen_content)

# Replace Button Header Touch
old_btn_header_css = r'''\.btn-header-touch\s*\{[^}]*\}\s*\.btn-header-touch:active\s*\{[^}]*\}'''
new_btn_header_css = '''.btn-header-touch {
            height: 42px;
            padding: 0 16px;
            border: 1.5px solid var(--border);
            background: var(--card-bg);
            color: var(--text-primary);
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(120, 95, 70, 0.06);
            transition: all 0.15s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            flex-shrink: 0;
            box-sizing: border-box;
            border-radius: var(--btn-radius, 14px);
        }
        .btn-header-touch:hover {
            transform: translateY(-2px);
            border-color: var(--accent);
            box-shadow: 0 6px 14px rgba(120, 95, 70, 0.1);
        }
        .btn-header-touch:active {
            transform: scale(0.96);
            box-shadow: 0 1px 4px rgba(120, 95, 70, 0.04);
        }'''
bigscreen_content = re.sub(old_btn_header_css, new_btn_header_css, bigscreen_content)

# Replace Tabs
old_tabs_css = r'''\.view-mode-tabs-pro\s*\{[^}]*\}\s*\.btn-view-tab-pro\s*\{[^}]*\}\s*\.btn-view-tab-pro\.active\s*\{[^}]*\}'''
new_tabs_css = '''.view-mode-tabs-pro {
            display: flex;
            gap: 4px;
            background: var(--bg-secondary);
            padding: 4px;
            border: 1.5px solid var(--border);
            height: 42px;
            align-items: center;
            flex-shrink: 0;
            white-space: nowrap;
            box-sizing: border-box;
            border-radius: var(--btn-radius, 14px);
        }
        .btn-view-tab-pro {
            height: 32px;
            padding: 0 12px;
            border: 1.5px solid transparent;
            background: transparent;
            font-size: 13px;
            font-weight: 700;
            color: var(--text-secondary);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            white-space: nowrap;
            border-radius: 10px;
            transition: all 0.15s ease;
        }
        .btn-view-tab-pro:hover {
            color: var(--text-primary);
        }
        .btn-view-tab-pro.active {
            background: var(--card-bg);
            border-color: var(--border);
            box-shadow: 0 2px 6px rgba(120, 95, 70, 0.08);
            color: var(--accent);
        }'''
bigscreen_content = re.sub(old_tabs_css, new_tabs_css, bigscreen_content)

# Replace Pet Card
old_pet_card_css = r'''\.pet-card\s*\{[^}]*\}\s*\.pet-card:hover\s*\{[^}]*\}'''
new_pet_card_css = '''.pet-card {
            background: var(--card-bg);
            border: 2px solid var(--border);
            border-radius: var(--card-radius, 20px);
            box-shadow: 0 4px 14px rgba(120, 95, 70, 0.06);
            padding: var(--card-pad, 10px 8px 8px);
            position: relative;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease, border-color 0.18s ease;
            height: var(--card-h, 172px);
            box-sizing: border-box;
            overflow: hidden;
        }
        .pet-card:hover {
            transform: translateY(-4px) scale(1.02);
            border-color: var(--accent);
            box-shadow: 0 10px 24px rgba(255, 143, 61, 0.16), 0 4px 12px rgba(120, 95, 70, 0.08);
        }'''
bigscreen_content = re.sub(old_pet_card_css, new_pet_card_css, bigscreen_content)

# Replace Pet Visual Box
old_pet_box_css = r'''\.pet-visual-box\s*\{[^}]*\}'''
new_pet_box_css = '''.pet-visual-box {
            width: var(--pet-box-size, 66px);
            height: var(--pet-box-size, 66px);
            border: 1.5px solid var(--border);
            border-radius: 16px;
            background: linear-gradient(180deg, #FFFDF8 0%, #F5ECE0 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--pet-icon-fs, 34px);
            box-shadow: inset 0 2px 5px rgba(160, 130, 100, 0.08);
            position: relative;
            margin-bottom: var(--pet-margin-b, 6px);
            flex-shrink: 0;
            transition: width 0.15s, height 0.15s, font-size 0.15s;
        }'''
bigscreen_content = re.sub(old_pet_box_css, new_pet_box_css, bigscreen_content)

# Replace Pet Subject Tag
old_tag_css = r'''\.pet-subject-tag\s*\{[^}]*\}'''
new_tag_css = '''.pet-subject-tag {
            position: absolute;
            bottom: -5px;
            background: var(--accent);
            color: #FFFFFF;
            font-size: var(--tag-fs, 9px);
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 6px;
            border: none;
            box-shadow: 0 2px 4px rgba(255, 143, 61, 0.25);
            font-family: inherit;
        }'''
bigscreen_content = re.sub(old_tag_css, new_tag_css, bigscreen_content)

# Replace Card Stamp
old_stamp_css = r'''\.card-stamp\s*\{[^}]*\}'''
new_stamp_css = '''.card-stamp {
            position: absolute;
            top: 5px;
            right: 5px;
            padding: 2px 6px;
            font-size: var(--stamp-fs, 9px);
            font-weight: 700;
            font-family: inherit;
            border: none;
            border-radius: 8px;
            transform: rotate(-3deg);
            z-index: 5;
            box-shadow: 0 2px 5px rgba(120, 95, 70, 0.08);
            white-space: nowrap;
        }'''
bigscreen_content = re.sub(old_stamp_css, new_stamp_css, bigscreen_content)

# Replace Details Modal Box
old_modal_box_css = r'''\.details-modal-box\s*\{[^}]*\}'''
new_modal_box_css = '''.details-modal-box {
            background: var(--card-bg);
            border: 2.5px solid var(--border);
            border-radius: 28px;
            box-shadow: 0 24px 60px rgba(90, 70, 50, 0.18);
            width: 100%;
            max-width: 720px;
            max-height: 92vh;
            overflow-y: auto;
            padding: 24px 28px;
            position: relative;
            box-sizing: border-box;
        }'''
bigscreen_content = re.sub(old_modal_box_css, new_modal_box_css, bigscreen_content)

# Replace Bottom Touch Dock Pro
old_dock_css = r'''\.bottom-touch-dock-pro\s*\{[^}]*\}'''
new_dock_css = '''.bottom-touch-dock-pro {
            position: fixed;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--card-bg);
            border: 2px solid var(--border);
            border-radius: 24px;
            box-shadow: 0 8px 30px rgba(120, 95, 70, 0.12);
            padding: 7px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            height: 62px;
            z-index: 500;
            max-width: 96vw;
            overflow-x: auto;
        }'''
bigscreen_content = re.sub(old_dock_css, new_dock_css, bigscreen_content)

# Replace Reachability Trigger Button
old_reach_css = r'''\.btn-reachability-trigger-pro\s*\{[^}]*\}\s*\.btn-reachability-trigger-pro:active\s*\{[^}]*\}'''
new_reach_css = '''.btn-reachability-trigger-pro {
            position: fixed;
            bottom: 12px;
            right: 20px;
            background: var(--warning);
            color: #3A3027;
            border: 2px solid var(--border);
            border-radius: 20px;
            box-shadow: 0 6px 18px rgba(245, 176, 65, 0.28);
            padding: 0 22px;
            font-weight: 800;
            font-size: 14px;
            height: 60px;
            cursor: pointer;
            z-index: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.15s ease;
        }
        .btn-reachability-trigger-pro:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(245, 176, 65, 0.35);
        }
        .btn-reachability-trigger-pro:active {
            transform: scale(0.96);
        }'''
bigscreen_content = re.sub(old_reach_css, new_reach_css, bigscreen_content)

# Clean up any leftover hard shadow references in bigscreen
bigscreen_content = bigscreen_content.replace('box-shadow: 2.5px 2.5px 0 var(--shadow-color);', 'box-shadow: 0 3px 8px rgba(120, 95, 70, 0.06);')
bigscreen_content = bigscreen_content.replace('box-shadow: 3px 3px 0 var(--shadow-color);', 'box-shadow: 0 4px 10px rgba(120, 95, 70, 0.08);')
bigscreen_content = bigscreen_content.replace('box-shadow: 4px 4px 0 var(--shadow-color);', 'box-shadow: 0 6px 16px rgba(120, 95, 70, 0.09);')
bigscreen_content = bigscreen_content.replace('box-shadow: 5px 5px 0 var(--shadow-color);', 'box-shadow: 0 6px 18px rgba(120, 95, 70, 0.10);')
bigscreen_content = bigscreen_content.replace('box-shadow: 6px 6px 0 var(--shadow-color);', 'box-shadow: 0 8px 20px rgba(120, 95, 70, 0.10);')
bigscreen_content = bigscreen_content.replace('box-shadow: 8px 8px 0 var(--shadow-color);', 'box-shadow: 0 12px 28px rgba(120, 95, 70, 0.12);')
bigscreen_content = bigscreen_content.replace('box-shadow: 12px 12px 0 var(--shadow-color);', 'box-shadow: 0 20px 48px rgba(120, 95, 70, 0.14);')

with open(bigscreen_path, 'w', encoding='utf-8') as f:
    f.write(bigscreen_content)
print("[OK] Big Screen Refactored Successfully!")


# ==========================================
# 2. Transform Teacher Panel (teacher_panel_touch_pro.html)
# ==========================================
with open(teacher_path, 'r', encoding='utf-8') as f:
    teacher_content = f.read()

# Replace Theme Palette in Teacher Panel
teacher_content = re.sub(old_theme_regex, new_theme_css, teacher_content, flags=re.DOTALL)

# Update font-family
teacher_content = teacher_content.replace(
    "font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;",
    "font-family: 'YouYuan', 'HarmonyOS Sans SC Rounded', 'PingFang SC', 'Microsoft YaHei', sans-serif;"
)

# Replace top navbar
old_t_navbar = r'''\.top-navbar-pro\s*\{[^}]*\}'''
new_t_navbar = '''.top-navbar-pro {
            background: var(--card-bg);
            border-bottom: 2px solid var(--border);
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 58px;
            min-height: 58px;
            z-index: 100;
            box-shadow: 0 4px 16px rgba(120, 95, 70, 0.05);
            box-sizing: border-box;
        }'''
teacher_content = re.sub(old_t_navbar, new_t_navbar, teacher_content)

# Replace Section Box (.nb-section-box)
old_sec_box = r'''\.nb-section-box\s*\{[^}]*\}'''
new_sec_box = '''.nb-section-box {
            background: var(--card-bg);
            border: 2px solid var(--border);
            border-radius: 22px;
            box-shadow: 0 4px 16px rgba(120, 95, 70, 0.06);
            padding: 18px 20px;
            margin-bottom: 16px;
        }'''
teacher_content = re.sub(old_sec_box, new_sec_box, teacher_content)

# Replace Student Row Card (.student-row-card-pro)
old_row_card = r'''\.student-row-card-pro\s*\{[^}]*\}\s*\.student-row-card-pro:hover\s*\{[^}]*\}\s*\.student-row-card-pro\.selected\s*\{[^}]*\}'''
new_row_card = '''.student-row-card-pro {
            background: var(--card-bg);
            border: 1.5px solid var(--border);
            border-radius: 16px;
            box-shadow: 0 2px 8px rgba(120, 95, 70, 0.05);
            transition: all 0.15s ease;
            box-sizing: border-box;
        }
        .student-row-card-pro:hover {
            transform: translateY(-2px);
            border-color: var(--accent);
            box-shadow: 0 6px 16px rgba(120, 95, 70, 0.1);
        }
        .student-row-card-pro.selected {
            border-color: var(--accent);
            background: #FFF7EE;
            box-shadow: 0 4px 14px rgba(255, 143, 61, 0.18);
        }'''
teacher_content = re.sub(old_row_card, new_row_card, teacher_content)

# Replace Score Card Pro (.btn-score-card-pro)
old_score_card = r'''\.btn-score-card-pro\s*\{[^}]*\}\s*\.btn-score-card-pro:hover\s*\{[^}]*\}\s*\.btn-score-card-pro:active\s*\{[^}]*\}'''
new_score_card = '''.btn-score-card-pro {
            border-radius: 16px;
            font-weight: 700;
            border-width: 1.5px;
            transition: all 0.15s ease;
            box-shadow: 0 3px 8px rgba(120, 95, 70, 0.06);
        }
        .btn-score-card-pro:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(120, 95, 70, 0.12);
        }
        .btn-score-card-pro:active {
            transform: scale(0.97);
            box-shadow: 0 1px 4px rgba(120, 95, 70, 0.04);
        }'''
teacher_content = re.sub(old_score_card, new_score_card, teacher_content)

# Replace Modal Box in Teacher Panel
old_t_modal = r'''\.modal-box\s*\{[^}]*\}'''
new_t_modal = '''.modal-box {
            background: var(--card-bg);
            border: 2.5px solid var(--border);
            border-radius: 26px;
            box-shadow: 0 20px 50px rgba(90, 70, 50, 0.18);
            box-sizing: border-box;
        }'''
teacher_content = re.sub(old_t_modal, new_t_modal, teacher_content)

# Replace Selected Banner Bar
old_banner = r'''\.selected-banner-bar-pro\s*\{[^}]*\}'''
new_banner = '''.selected-banner-bar-pro {
            background: var(--bg-secondary);
            border: 2px solid var(--border);
            border-radius: 18px;
            box-shadow: 0 4px 14px rgba(120, 95, 70, 0.06);
            box-sizing: border-box;
        }'''
teacher_content = re.sub(old_banner, new_banner, teacher_content)

# Clean up any leftover hard shadow references in teacher panel
teacher_content = teacher_content.replace('box-shadow: 2px 2px 0 var(--shadow-color);', 'box-shadow: 0 2px 6px rgba(120, 95, 70, 0.06);')
teacher_content = teacher_content.replace('box-shadow: 2.5px 2.5px 0 var(--shadow-color);', 'box-shadow: 0 3px 8px rgba(120, 95, 70, 0.06);')
teacher_content = teacher_content.replace('box-shadow: 3px 3px 0 var(--shadow-color);', 'box-shadow: 0 4px 10px rgba(120, 95, 70, 0.08);')
teacher_content = teacher_content.replace('box-shadow: 4px 4px 0 var(--shadow-color);', 'box-shadow: 0 6px 16px rgba(120, 95, 70, 0.09);')
teacher_content = teacher_content.replace('box-shadow: 5px 5px 0 var(--shadow-color);', 'box-shadow: 0 6px 18px rgba(120, 95, 70, 0.10);')
teacher_content = teacher_content.replace('box-shadow: 8px 8px 0 var(--shadow-color);', 'box-shadow: 0 16px 40px rgba(120, 95, 70, 0.14);')

with open(teacher_path, 'w', encoding='utf-8') as f:
    f.write(teacher_content)
print("[OK] Teacher Panel Refactored Successfully!")
