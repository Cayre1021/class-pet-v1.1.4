# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['electron-app/src/display_bigscreen_touch_pro.html', 'electron-app/src/teacher_panel_touch_pro.html']:
    with open(fname, 'r', encoding='utf-8') as f:
        text = f.read()
    m = re.search(r'<select[^>]*id=[\'\"]themeSelect[\'\"][\s\S]*?</select>', text)
    if m:
        print(f"=== {fname} ===")
        print(m.group(0))
