# scripts/capture_storybook_shots.py
import os
import sys
import subprocess
import time

sys.stdout.reconfigure(encoding='utf-8')

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

shots_dir = r"d:\Desk\ALL Vibe\new-class-pet\screenshots_storybook"
os.makedirs(shots_dir, exist_ok=True)

targets = [
    ("01_bigscreen_storybook.png", r"d:\Desk\ALL Vibe\new-class-pet\electron-app\src\display_bigscreen_touch_pro.html"),
    ("02_teacher_panel_storybook.png", r"d:\Desk\ALL Vibe\new-class-pet\electron-app\src\teacher_panel_touch_pro.html"),
]

for out_name, html_path in targets:
    out_path = os.path.join(shots_dir, out_name)
    cmd = [
        edge_path,
        "--headless=new",
        f"--screenshot={out_path}",
        "--window-size=1920,1080",
        "--hide-scrollbars",
        f"file:///{html_path.replace(os.sep, '/')}"
    ]
    print(f"Capturing: {out_name}...")
    subprocess.run(cmd, check=True)
    time.sleep(1)
    if os.path.exists(out_path):
        size_kb = os.path.getsize(out_path) / 1024
        print(f"  [SUCCESS] {out_name} ({size_kb:.1f} KB)")
    else:
        print(f"  [FAILED] {out_name}")

print("\nStorybook Screenshots Captured Successfully!")
