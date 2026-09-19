"""
Class Pet · 灵兽图像批量智能透明化与规格标准化引擎
功能：
1. 监听/扫描 `electron-app/src/assets/pets_raw/` 目录；
2. 采用“外边缘智能洪水阻断算法 (Boundary Flood-Fill)”：
   - 从外边界向内扫描纯白/米白背景并标记透明；
   - 遇到宠物轮廓微暗色/彩色勾线自动阻断；
   - 彻底杜绝误伤宠物内部纯白绒毛、肚皮、眼睛高光；
3. 边缘高斯柔化抗锯齿 (Anti-aliasing)，杜绝毛刺；
4. 规范化缩放至 512x512，PNG 体积优化；
5. 输出至 `electron-app/src/assets/pets/<category>/<filename>.png`；
6. 支持 `--from-old` 参数从旧版素材库一键提纯填充，实现即刻全量有图可用。
"""

import os
import sys
import glob
from collections import deque
from PIL import Image, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
PETS_RAW_DIR = os.path.join(PROJECT_DIR, "src", "assets", "pets_raw")
PETS_TARGET_DIR = os.path.join(PROJECT_DIR, "src", "assets", "pets")
OLD_PETS_DIR = os.path.abspath(os.path.join(PROJECT_DIR, "..", "old-class-pet", "class pet", "src", "assets", "pets"))

SPECIES_LIST = ["cat", "dog", "fox", "bunny", "bird", "deer", "hamster", "fish", "shared"]

def process_single_image(src_path, dst_path, target_size=512, bg_thresh=42):
    try:
        im = Image.open(src_path).convert("RGBA")
    except Exception as e:
        print(f"[-] 无法读取图片 {src_path}: {e}")
        return False

    im_resized = im.resize((target_size, target_size), Image.Resampling.LANCZOS)
    w, h = im_resized.size
    pixels = im_resized.load()

    is_bg_candidate = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 30:
                is_bg_candidate[y][x] = True
                continue
            dist = ((255 - r)**2 + (255 - g)**2 + (255 - b)**2) ** 0.5
            if dist < bg_thresh:
                is_bg_candidate[y][x] = True

    visited = [[False] * w for _ in range(h)]
    queue = deque()

    for x in range(w):
        if is_bg_candidate[0][x]:
            queue.append((x, 0))
            visited[0][x] = True
        if is_bg_candidate[h - 1][x]:
            queue.append((x, h - 1))
            visited[h - 1][x] = True

    for y in range(h):
        if is_bg_candidate[y][0] and not visited[y][0]:
            queue.append((0, y))
            visited[y][0] = True
        if is_bg_candidate[y][w - 1] and not visited[y][w - 1]:
            queue.append((w - 1, y))
            visited[y][w - 1] = True

    while queue:
        cx, cy = queue.popleft()
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                if not visited[ny][nx] and is_bg_candidate[ny][nx]:
                    visited[ny][nx] = True
                    queue.append((nx, ny))

    alpha_mask = Image.new("L", (w, h), 255)
    alpha_pixels = alpha_mask.load()
    for y in range(h):
        for x in range(w):
            if visited[y][x]:
                alpha_pixels[x, y] = 0

    alpha_soft = alpha_mask.filter(ImageFilter.GaussianBlur(radius=0.8))
    im_resized.putalpha(alpha_soft)

    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    im_resized.save(dst_path, "PNG", optimize=True)
    print(f"[+] 成功处理并输出: {dst_path} (尺寸: {target_size}x{target_size})")
    return True

def process_all(from_old=False):
    print("=" * 60)
    print("Class Pet 图像自动化处理管道启动")
    print("=" * 60)

    for sp in SPECIES_LIST:
        os.makedirs(os.path.join(PETS_TARGET_DIR, sp), exist_ok=True)

    processed_count = 0

    raw_images = []
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
        raw_images.extend(glob.glob(os.path.join(PETS_RAW_DIR, "**", ext), recursive=True))

    if raw_images:
        print(f"[*] 在 pets_raw 中检测到 {len(raw_images)} 张生图素材，开始智能去底与标准化...")
        for src in raw_images:
            rel = os.path.relpath(src, PETS_RAW_DIR)
            dst_name = os.path.splitext(rel)[0] + ".png"
            dst = os.path.join(PETS_TARGET_DIR, dst_name)
            if process_single_image(src, dst):
                processed_count += 1
    else:
        print("[*] pets_raw 暂无新生成的待处理图片。")

    if from_old or processed_count == 0:
        print(f"[*] 检查旧版素材目录: {OLD_PETS_DIR}")
        if os.path.exists(OLD_PETS_DIR):
            print("[*] 正在从旧版素材库自动提纯并填充现有 8 大物种 1~4 阶段基础素材...")
            for sp in SPECIES_LIST:
                old_sp_dir = os.path.join(OLD_PETS_DIR, sp)
                if not os.path.exists(old_sp_dir):
                    continue
                for fname in os.listdir(old_sp_dir):
                    if fname.lower().endswith(".png"):
                        src_file = os.path.join(old_sp_dir, fname)
                        dst_file = os.path.join(PETS_TARGET_DIR, sp, fname)
                        if not os.path.exists(dst_file):
                            if process_single_image(src_file, dst_file):
                                processed_count += 1

    print("=" * 60)
    print(f"处理完成！累计成功转换/优化输出 {processed_count} 张灵兽素材。")
    print(f"目标目录: {PETS_TARGET_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    from_old_flag = "--from-old" in sys.argv
    process_all(from_old=from_old_flag)
