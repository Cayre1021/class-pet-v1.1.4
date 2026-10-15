"""
Class Pet · 灵兽图像高保真外轮廓智能裁切与零空洞提取引擎
功能：
1. 扫描 `electron-app/src/assets/pets_raw/` 原始高质量绘图（JPEG/PNG）；
2. 遵循“围绕宠物最外边缘裁剪”原则：
   - 提取宠物完整外轮廓闭环（External Contour Silhouette）；
   - 执行拓扑孔洞封堵（binary_fill_holes），将宠物内部（纯白绒毛、面颊、肚皮、眼睛高光）100% 实体化填充；
   - 彻底根除“内部被裁剪穿孔、镂空、缺失像素”的致命缺陷；
3. 保留纯正手绘水彩画风质感，绝不添加发脏、生硬的机械描边；
4. 边缘亚像素高斯抗锯齿柔化（Anti-Aliasing）；
5. 统一标准化输出为 512x512 高清透明 PNG 至 `electron-app/src/assets/pets/<category>/<filename>.png`；
6. 自动执行 0-孔洞全量质检验收。
"""

import os
import sys
import glob
import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
PETS_RAW_DIR = os.path.join(PROJECT_DIR, "src", "assets", "pets_raw")
PETS_TARGET_DIR = os.path.join(PROJECT_DIR, "src", "assets", "pets")

SPECIES_LIST = ["cat", "dog", "fox", "bunny", "bird", "deer", "hamster", "fish", "shared"]

def extract_pet_image(src_path, target_size=512):
    """
    高保真宠物提取：仅围绕宠物最外轮廓裁切，100% 保护体内所有手绘水彩像素与纯白毛发。
    """
    img_bgr = cv2.imread(src_path)
    if img_bgr is None:
        raise ValueError(f"无法读取图片文件: {src_path}")
    
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w = img_rgb.shape[:2]

    # 1. 采样物理外边界 10px 计算背景基准色
    top = img_rgb[0:10, :]
    bot = img_rgb[-10:, :]
    left = img_rgb[:, 0:10]
    right = img_rgb[:, -10:]
    border_pixels = np.concatenate([top, bot, left, right], axis=None).reshape(-1, 3)
    bg_median = np.median(border_pixels, axis=0)

    # 2. 距离背景基准色差与饱和度/亮度分析
    diff = np.abs(img_rgb.astype(float) - bg_median)
    dist = np.max(diff, axis=-1)

    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    s = hsv[:, :, 1]
    v = hsv[:, :, 2]

    # 宠物主体候选区：具有色彩 (S>8) 或 微暗色轮廓 (V<242) 或 色差微变 (dist>10)
    is_pet = (s > 8) | (v < 242) | (dist > 10)

    # 清除最外侧 4px 边缘（防止画幅边缘压缩噪点形成边框连通）
    is_pet[0:4, :] = 0
    is_pet[-4:, :] = 0
    is_pet[:, 0:4] = 0
    is_pet[:, -4:] = 0

    # 3. 闭运算连通毛发与勾线外闭环
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
    closed = cv2.morphologyEx(is_pet.astype(np.uint8), cv2.MORPH_CLOSE, kernel)

    # 4. 提取外部最外轮廓（RETR_EXTERNAL 忽略所有内凹孔洞）
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise ValueError(f"未检测到宠物轮廓: {src_path}")

    areas = [cv2.contourArea(c) for c in contours]
    max_area = max(areas)

    mask = np.zeros((h, w), dtype=np.uint8)
    for c, a in zip(contours, areas):
        # 保留宠物主体与重要附属物（花瓣、气泡、光效等，面积大于主体的 0.2%）
        if a > max(500, max_area * 0.002):
            cv2.drawContours(mask, [c], -1, 255, -1)

    # 5. 核心：拓扑空洞 100% 填实（binary_fill_holes）
    # 彻底杜绝体内由于毛发雪白或淡色造成的透明穿孔！
    mask = binary_fill_holes(mask > 0).astype(np.uint8) * 255

    # 清除最外侧 8px 边缘，确保亚像素羽化平滑衰减至画布边界内 (Alpha=0)
    mask[0:8, :] = 0
    mask[-8:, :] = 0
    mask[:, 0:8] = 0
    mask[:, -8:] = 0

    # 6. 边缘亚像素高斯平滑羽化，实现柔和自然的抗锯齿过渡
    mask_feather = cv2.GaussianBlur(mask, (5, 5), 0)

    # 7. 合成 4 通道 RGBA 并使用高质量 LANCZOS 缩放至指定分辨率
    rgba = np.dstack([img_rgb, mask_feather])
    im_pil = Image.fromarray(rgba).resize((target_size, target_size), Image.Resampling.LANCZOS)
    return im_pil

def process_all():
    print("=" * 70)
    print("Class Pet · 灵兽图像高保真外轮廓智能裁切与零空洞提取引擎 启动")
    print("=" * 70)

    for sp in SPECIES_LIST:
        os.makedirs(os.path.join(PETS_TARGET_DIR, sp), exist_ok=True)

    raw_images = []
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
        raw_images.extend(glob.glob(os.path.join(PETS_RAW_DIR, "**", ext), recursive=True))

    raw_images = sorted(raw_images)
    print(f"[*] 检测到 {len(raw_images)} 张原始生图素材，开始全量高保真裁切与内部空洞修复...")

    success_count = 0
    verification_results = []

    for src in raw_images:
        rel = os.path.relpath(src, PETS_RAW_DIR)
        dst_name = os.path.splitext(rel)[0] + ".png"
        dst_path = os.path.join(PETS_TARGET_DIR, dst_name)

        try:
            im_result = extract_pet_image(src, target_size=512)
            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
            im_result.save(dst_path, "PNG", optimize=True)
            success_count += 1

            # 验证生成的 PNG 是否 100% 无内部孔洞
            arr = np.array(im_result)
            alpha = arr[:, :, 3]
            contours, hierarchy = cv2.findContours((alpha > 128).astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
            num_holes = 0
            if hierarchy is not None:
                for h in hierarchy[0]:
                    if h[3] >= 0:
                        num_holes += 1

            border_alpha_max = max(alpha[0, :].max(), alpha[-1, :].max(), alpha[:, 0].max(), alpha[:, -1].max())
            status = "✅ PASS" if num_holes == 0 and border_alpha_max < 50 else "❌ FAIL"
            verification_results.append((dst_name, status, num_holes, border_alpha_max))
            print(f"[{status}] 成功处理: {dst_name:25s} | 内部穿孔数: {num_holes} | 画布边缘Alpha: {border_alpha_max}")
        except Exception as e:
            print(f"[-] 处理失败 {src}: {e}")

    print("=" * 70)
    print(f"处理完成！成功转换并优化输出: {success_count}/{len(raw_images)} 张素材。")
    all_clean = all(r[1] == "✅ PASS" for r in verification_results)
    print(f"全量素材零穿孔质检验收结果: {'全部完美达标 (100% 0穿孔)' if all_clean else '存在未达标文件'}")
    print("=" * 70)
    return all_clean

if __name__ == "__main__":
    process_all()
