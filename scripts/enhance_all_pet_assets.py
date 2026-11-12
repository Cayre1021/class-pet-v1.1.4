# -*- coding: utf-8 -*-
"""
[DEPRECATED & DISABLED]
此脚本已被废弃并永久禁用。
原因：向治愈系水彩绘本风萌宠强行施加机械深色膨胀描边（Stroke/Dilate）会导致：
1. 柔和水彩边缘与深色混合产生严重脏色、脏斑（Fringing/Muddying）；
2. 变成生硬突兀的剪纸/贴纸风，严重破坏绘本的美术纯粹性与质感；
3. 纤细结构（绒毛、小鸟羽尖、胡须）失真变形。

正确且工业级的解决方案：
1. 宠物 PNG 保持 100% 原始未污染水彩手绘像素；
2. 浅色物体融底问题统一在 UI 容器层解决：使用温润暖米纸色/奶油色托底（如 #F5F3EF / #FAF8F5）；
3. 配合 CSS 极轻柔环境光漫反射投影（filter: drop-shadow(...)），自然显现白色绒毛轮廓，0脏边、0生硬感。
"""
import sys
print("Notice: enhance_all_pet_assets.py is deprecated and disabled to protect original watercolor assets.")
sys.exit(0)
