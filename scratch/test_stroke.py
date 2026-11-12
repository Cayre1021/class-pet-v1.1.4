# -*- coding: utf-8 -*-
import sys, os, glob, shutil
from PIL import Image, ImageFilter, ImageOps

sys.stdout.reconfigure(encoding='utf-8')

def enhance_pet_edge(img_path, stroke_color=(30, 41, 59), stroke_radius=2, max_opacity=210):
    """
    在透明边缘周围添加 1.5~2px 柔和微描边，彻底解决浅色毛发在白底背景下的融底隐形问题。
    原图主体像素 100% 保持不变，仅向透明外沿扩充平滑阴影描边。
    """
    orig = Image.open(img_path).convert('RGBA')
    w, h = orig.size
    
    alpha = orig.split()[3]
    
    # 使用 MaxFilter 进行形态学外扩膨胀 (radius 2 对应 5x5 窗口)
    # 为了边缘柔和抗锯齿，我们使用两次较小半径或高斯模糊
    dilated = alpha.filter(ImageFilter.MaxFilter(2 * stroke_radius + 1))
    
    # 平滑过渡
    dilated_blur = dilated.filter(ImageFilter.GaussianBlur(radius=0.8))
    
    # 描边掩模 = 膨胀图 - 原主体图
    stroke_mask = ImageOps.invert(alpha)
    # stroke_mask 与 dilated_blur 取交集
    # 纯 Python 计算新 alpha
    stroke_alpha = Image.new('L', (w, h), 0)
    
    # 用 PIL 的 point 变换
    # 新图的底层是描边色
    stroke_img = Image.new('RGBA', (w, h), stroke_color + (0,))
    
    # 向量化计算描边 alpha：stroke_alpha = max(0, min(max_opacity, dilated_blur * (255 - alpha) / 255))
    alpha_data = list(alpha.getdata())
    dilated_data = list(dilated_blur.getdata())
    
    new_stroke_alpha = []
    for a, d in zip(alpha_data, dilated_data):
        if a >= 250:
            new_stroke_alpha.append(0)
        else:
            # 外围微描边透明度随距离平滑衰减
            factor = (255 - a) / 255.0
            val = int(d * factor * (max_opacity / 255.0))
            new_stroke_alpha.append(min(max_opacity, val))
            
    stroke_alpha.putdata(new_stroke_alpha)
    
    # 设置描边层的颜色与透明度
    r_chan = Image.new('L', (w, h), stroke_color[0])
    g_chan = Image.new('L', (w, h), stroke_color[1])
    b_chan = Image.new('L', (w, h), stroke_color[2])
    stroke_layer = Image.merge('RGBA', (r_chan, g_chan, b_chan, stroke_alpha))
    
    # 将原图合成在描边层之上 (Composite)
    result = Image.alpha_composite(stroke_layer, orig)
    return result

# 测试处理 bunny-stage1
test_path = 'electron-app/src/assets/pets/bunny/bunny-stage1.png'
res = enhance_pet_edge(test_path)
res.save('scratch/bunny_test_enhanced.png')
print("Successfully processed bunny-stage1 to scratch/bunny_test_enhanced.png")
