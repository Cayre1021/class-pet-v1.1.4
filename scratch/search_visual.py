# -*- coding: utf-8 -*-
import sys
import glob

sys.stdout.reconfigure(encoding='utf-8')


files = glob.glob("scratch/*.txt") + glob.glob("analysis_and_requirements/**/*.md", recursive=True)

terms = ['晃', '刺', '边框', '黑边', '累', '暗夜', '右下', '投影', '阴影', '粗边']
for fpath in files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        continue
    for t in terms:
        idx = 0
        while True:
            idx = content.find(t, idx)
            if idx == -1: break
            s = max(0, idx - 60)
            e = min(len(content), idx + 80)
            snip = content[s:e].replace("\n", " ")
            print(f"[{fpath}] [{t} @ {idx}]: {snip}")
            idx += len(t)
