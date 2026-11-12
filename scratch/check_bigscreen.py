import sys
import re

# Set stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

with open('electron-app/src/display_bigscreen_touch_pro.html', encoding='utf-8') as f:
    html = f.read()

print('=== 1. PK Mode Checks ===')
print('Has setPKDisplayMode:', 'setPKDisplayMode' in html)
pk_mode_match = re.search(r'function setPKDisplayMode[\s\S]*?\n\}', html)
if pk_mode_match:
    print('setPKDisplayMode implementation:\n', pk_mode_match.group(0))

pk_render_match = re.search(r'function renderPKRace[\s\S]*?\n\}', html)
if pk_render_match:
    print('renderPKRace snippet:\n', pk_render_match.group(0)[:600] + '...')

pk_btns = re.findall(r'<button[^>]*setPKDisplayMode[^>]*>.*?</button>', html, re.DOTALL)
print('PK Buttons in HTML:', pk_btns)

print('\n=== 2. Switch View and Scale Visibility Checks ===')
sv = re.search(r'function switchView\(view\)\s*\{[\s\S]*?\n\}', html)
if sv:
    print('switchView implementation:\n', sv.group(0))

scale_markup = re.search(r'<div[^>]*class=[\'"][^\'"]*scale[^\'"]*[\'"][^>]*>[\s\S]*?</div>', html)
if scale_markup:
    print('Scale controls markup:\n', scale_markup.group(0)[:300])

print('\n=== 3. Search Element Check in teacher panel ===')
with open('electron-app/src/teacher_panel_touch_pro.html', encoding='utf-8') as f:
    teacher_html = f.read()

search_inputs = re.findall(r'<input[^>]*type=[\'"]search[\'"][^>]*>|<input[^>]*id=[\'"][^\'"]*search[^\'"]*[\'"][^>]*>', teacher_html, re.IGNORECASE)
print('Search inputs in teacher panel:', search_inputs)

filter_func = re.search(r'function filterStudents[\s\S]*?\n\}', teacher_html)
if filter_func:
    print('filterStudents implementation:\n', filter_func.group(0))
