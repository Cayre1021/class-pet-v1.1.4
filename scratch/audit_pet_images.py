# -*- coding: utf-8 -*-
import sys, os, glob, math
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

imgs = sorted(glob.glob('electron-app/src/assets/pets/**/*.png', recursive=True))
print(f"Total pet images to inspect: {len(imgs)}")

report = []

for path in imgs:
    relpath = os.path.relpath(path, 'electron-app/src/assets/pets')
    try:
        im = Image.open(path).convert('RGBA')
    except Exception as e:
        print(f"Error opening {path}: {e}")
        continue
    
    w, h = im.size
    pixels = im.load()
    
    # 查找所有主体的边界像素
    # 主体定义为 alpha > 20
    # 边界定义为自身 alpha > 20，且上下左右4邻域中至少有一个邻居 alpha <= 20 或者邻居在图片边界外
    
    touching_edges = set()
    total_boundary_pixels = 0
    almost_white_boundary = 0
    light_boundary = 0
    diff_sum = 0
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a <= 20:
                continue
            
            # 检查是否触碰图片物理边界（说明可能被截断/边缘紧贴）
            if y == 0: touching_edges.add('顶边')
            if y == h - 1: touching_edges.add('底边')
            if x == 0: touching_edges.add('左边')
            if x == w - 1: touching_edges.add('右边')
            
            # 检查邻域是否为透明
            is_boundary = False
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    if pixels[nx, ny][3] <= 20:
                        is_boundary = True
                        break
                else:
                    is_boundary = True
                    break
            
            if is_boundary:
                total_boundary_pixels += 1
                # 合成在纯白 (255, 255, 255) 上的实际视觉颜色
                alpha_norm = a / 255.0
                blend_r = r * alpha_norm + 255.0 * (1.0 - alpha_norm)
                blend_g = g * alpha_norm + 255.0 * (1.0 - alpha_norm)
                blend_b = b * alpha_norm + 255.0 * (1.0 - alpha_norm)
                
                # 距离白色 (255, 255, 255) 的色差
                diff = math.sqrt((255.0 - blend_r)**2 + (255.0 - blend_g)**2 + (255.0 - blend_b)**2)
                diff_sum += diff
                
                if diff < 35: # 极接近白色，肉眼几乎无法分辨与白底的边界
                    almost_white_boundary += 1
                elif diff < 65: # 浅色边界，对比度较弱
                    light_boundary += 1

    ratio_almost_white = almost_white_boundary / max(1, total_boundary_pixels)
    ratio_light = (almost_white_boundary + light_boundary) / max(1, total_boundary_pixels)
    mean_diff = diff_sum / max(1, total_boundary_pixels)
    
    # 另外检查宠物内部是否有大面积白色/极浅色区域接触边缘
    report.append({
        'file': relpath,
        'size': f"{w}x{h}",
        'ratio_almost_white': ratio_almost_white,
        'ratio_light': ratio_light,
        'touching_edges': list(touching_edges),
        'mean_diff': mean_diff,
        'boundary_pixels': total_boundary_pixels,
        'white_pixels': almost_white_boundary
    })

print("\n=== 图片边缘在白底下的对比度与裁切报告 ===")
for item in sorted(report, key=lambda x: x['ratio_almost_white'], reverse=True):
    flag = "⚠️ 严重白边/融底" if item['ratio_almost_white'] > 0.12 else ("⚡ 部分边缘偏浅" if item['ratio_almost_white'] > 0.04 else "✅ 轮廓清晰")
    edge_str = f" [紧贴画布边缘: {','.join(item['touching_edges'])}]" if item['touching_edges'] else ""
    print(f"{flag:14s} | {item['file']:25s} | 融底白边: {item['ratio_almost_white']*100:5.1f}% ({item['white_pixels']}/{item['boundary_pixels']}px) | 浅色边缘: {item['ratio_light']*100:5.1f}% | 边缘对比差: {item['mean_diff']:5.1f}{edge_str}")
