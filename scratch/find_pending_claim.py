# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('electron-app/src/display_bigscreen_touch_pro.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if '待认领' in l or '认领新宠' in l or '新宠' in l:
        print(f"{i+1}: {l.strip()}")
