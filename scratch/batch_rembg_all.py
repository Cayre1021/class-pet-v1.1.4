import sys, os, glob
from PIL import Image
from rembg import remove

sys.stdout.reconfigure(encoding='utf-8')

PETS_RAW_DIR = 'electron-app/src/assets/pets_raw'
PETS_TARGET_DIR = 'electron-app/src/assets/pets'

raw_files = sorted(glob.glob(os.path.join(PETS_RAW_DIR, '**/*'), recursive=True))
images = [f for f in raw_files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]

print(f"Total raw images to process: {len(images)}")
processed = 0

for src in images:
    rel = os.path.relpath(src, PETS_RAW_DIR)
    dst_name = os.path.splitext(rel)[0] + ".png"
    dst = os.path.join(PETS_TARGET_DIR, dst_name)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    
    print(f"[{processed+1}/{len(images)}] Processing with AI Matting: {rel} -> {dst_name} ...")
    try:
        im = Image.open(src)
        out = remove(im)
        # 统一标准化为 512x512
        out_resized = out.resize((512, 512), Image.Resampling.LANCZOS)
        out_resized.save(dst, "PNG", optimize=True)
        processed += 1
    except Exception as e:
        print(f"[-] Error processing {src}: {e}")

print(f"\n=======================================================")
print(f"All {processed}/{len(images)} pet assets regenerated with AI semantic matting!")
print("=======================================================")
