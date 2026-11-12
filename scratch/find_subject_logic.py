# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['electron-app/src/classpet_core.js', 'electron-app/src/display_bigscreen_touch_pro.html', 'electron-app/src/teacher_panel_touch_pro.html']:
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f'=== {fname} ===')
    matches = list(re.finditer(r'赵六|hatch|subject|unlock|english|chinese|math', content, re.IGNORECASE))
    print(f'Total matches: {len(matches)}')
    for m in matches[:15]:
        start = max(0, m.start() - 50)
        end = min(len(content), m.end() + 70)
        snip = content[start:end].replace('\n', ' ')
        print(f'[{m.group()}] {snip}')
