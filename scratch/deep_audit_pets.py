# -*- coding: utf-8 -*-
import sys, os, glob
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

species_list = ['cat', 'dog', 'fox', 'bunny', 'bird', 'deer', 'hamster', 'fish']

print("="*80)
print("宠物形态在白色背景下的视觉辨识度与边缘裁切深度审查")
print("="*80)

# 对每个物种和 stage，详细分析其边缘和浅色区域
issues_found = []

for sp in species_list:
    for st in range(1, 6):
        fpath = f'electron-app/src/assets/pets/{sp}/{sp}-stage{st}.png'
        if not os.path.exists(fpath):
            continue
        im = Image.open(fpath).convert('RGBA')
        w, h = im.size
        pixels = im.load()
        
        # 1. 检查物理裁切截断（画布最外围 1px 是否有较强不透明像素 alpha > 100）
        clipped_sides = []
        top_clipped = sum(1 for x in range(w) if pixels[x, 0][3] > 80)
        bot_clipped = sum(1 for x in range(w) if pixels[x, h-1][3] > 80)
        left_clipped = sum(1 for y in range(h) if pixels[0, y][3] > 80)
        right_clipped = sum(1 for y in range(h) if pixels[w-1, y][3] > 80)
        
        if top_clipped > 5: clipped_sides.append(f"顶端截断({top_clipped}px)")
        if bot_clipped > 5: clipped_sides.append(f"底端截断({bot_clipped}px)")
        if left_clipped > 5: clipped_sides.append(f"左侧截断({left_clipped}px)")
        if right_clipped > 5: clipped_sides.append(f"右侧截断({right_clipped}px)")
        
        # 2. 检查白色/浅色边缘像素：寻找 alpha > 150 且亮度非常高 (R>220, G>220, B>220) 的主体像素，且它们在边缘附近（外围3px内）
        # 这种像素在白色背景下完全看不出来
        white_edge_pixels = 0
        total_edge_pixels = 0
        
        # 找边缘：自身不透明，且旁边有透明像素
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                r, g, b, a = pixels[x, y]
                if a < 100: continue
                
                # 检查四周是否有透明
                has_trans = any(pixels[x+dx, y+dy][3] < 50 for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)])
                if has_trans:
                    total_edge_pixels += 1
                    # 计算该边缘像素的亮度 (Luminance)
                    lum = 0.299 * r + 0.587 * g + 0.114 * b
                    # 如果边缘像素本身很亮（接近白色），在白底上完全没有描边
                    if lum > 215 and r > 200 and g > 200 and b > 200:
                        white_edge_pixels += 1
        
        ratio = (white_edge_pixels / max(1, total_edge_pixels)) * 100
        
        # 3. 统计主体内部的高亮白块比例（如肚皮、毛发、羽毛）
        solid_white_inner = 0
        solid_total = 0
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a > 150:
                    solid_total += 1
                    lum = 0.299 * r + 0.587 * g + 0.114 * b
                    if lum > 235 and r > 220 and g > 220 and b > 220:
                        solid_white_inner += 1
        inner_white_ratio = (solid_white_inner / max(1, solid_total)) * 100
        
        # 判断严重程度
        severity = "正常"
        reasons = []
        if ratio > 15:
            severity = "严重"
            reasons.append(f"边缘缺乏暗色描边/白毛融底({ratio:.1f}%)")
        elif ratio > 6:
            severity = "中度"
            reasons.append(f"部分边缘偏浅融底({ratio:.1f}%)")
            
        if clipped_sides:
            if severity == "正常": severity = "轻微"
            reasons.append(f"图片裁切边缘贴边: {', '.join(clipped_sides)}")
            
        if inner_white_ratio > 25 and ratio > 5:
            if severity != "严重": severity = "严重"
            reasons.append(f"主体浅色大面积融底(白块占比{inner_white_ratio:.1f}%)")
            
        issues_found.append({
            'sp': sp,
            'stage': st,
            'severity': severity,
            'ratio': ratio,
            'inner_white_ratio': inner_white_ratio,
            'clipped_sides': clipped_sides,
            'reasons': reasons
        })

for item in sorted(issues_found, key=lambda x: (0 if x['severity']=='严重' else (1 if x['severity']=='中度' else (2 if x['severity']=='轻微' else 3))), reverse=False):
    print(f"[{item['severity']:4s}] {item['sp']:7s} Stage {item['stage']} | 浅色边缘: {item['ratio']:5.1f}% | 浅白主体: {item['inner_white_ratio']:5.1f}% | 原因: {'; '.join(item['reasons']) if item['reasons'] else '轮廓分明'}")
