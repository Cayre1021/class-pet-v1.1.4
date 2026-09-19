import subprocess
import os
import time

pages = [
    ("index.html", "v2_00_master_hub.png"),
    ("display_bigscreen.html", "v2_01_display_bigscreen.png"),
    ("teacher_panel.html", "v2_02_teacher_panel.png"),
    ("whiteboard_touch_lab.html", "v2_03_whiteboard_lab.png"),
    ("portal_auth.html", "v2_04_portal_auth.png"),
    ("system_states.html", "v2_05_system_states.png")
]

base_dir = r"D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\ui_exploration\v2_classroom_optimized"
output_dir = os.path.join(base_dir, "screenshots")
os.makedirs(output_dir, exist_ok=True)

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

for html_file, out_name in pages:
    file_path = os.path.join(base_dir, html_file)
    out_path = os.path.join(output_dir, out_name)
    file_url = "file:///" + file_path.replace("\\", "/")
    
    cmd = [
        edge_path,
        "--headless",
        "--disable-gpu",
        "--window-size=1920,1080",
        "--force-device-scale-factor=1",
        f"--screenshot={out_path}",
        file_url
    ]
    
    print(f"Capturing: {html_file} -> {out_name}...")
    subprocess.run(cmd, check=True)
    if os.path.exists(out_path):
        size_kb = os.path.getsize(out_path) / 1024
        print(f"  [SUCCESS] {out_name} ({size_kb:.1f} KB)")
    else:
        print(f"  [FAILED] {out_name}")

print("\nAll V2 screenshots captured successfully!")
