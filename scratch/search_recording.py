# -*- coding: utf-8 -*-
import os
import glob

# 搜索所有的 txt, md 文件在 scratch 和 analysis_and_requirements
files = glob.glob("scratch/*.txt") + glob.glob("analysis_and_requirements/**/*.md", recursive=True) + glob.glob("scratch/*.md")
print("Files to search:", files)

keywords = ["圆圈", "轮盘", "二级", "三级", "晃眼", "黑边", "刺眼", "边框", "赵六", "学科", "满级", "解锁", "右下", "阴影", "圆", "环形"]

for fpath in files:
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        try:
            with open(fpath, "r", encoding="gbk") as f:
                content = f.read()
        except Exception as e2:
            continue

    found_any = False
    for kw in keywords:
        if kw in content:
            if not found_any:
                print(f"\n=================== File: {fpath} ===================")
                found_any = True
            count = content.count(kw)
            print(f"Keyword '{kw}': {count} occurrences")
            # print snippets
            pos = 0
            shown = 0
            while shown < 3:
                pos = content.find(kw, pos)
                if pos == -1:
                    break
                s = max(0, pos - 80)
                e = min(len(content), pos + 120)
                snip = content[s:e].replace("\n", " ")
                print(f"   [{pos}] {snip}")
                pos += len(kw)
                shown += 1
