import os
import sys
import subprocess
import time

sys.stdout.reconfigure(encoding='utf-8')

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
base_dir = r"D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\ui_exploration"
shots_dir = r"D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\ui_exploration\screenshots_verified"
os.makedirs(shots_dir, exist_ok=True)

pages = [
    ("01_whiteboard_lab_dock.png", "prototype_interactive_whiteboard_solutions.html"),
    ("02_student_bigscreen_42cards.png", "prototype_neo_brutalism_display.html"),
    ("03_teacher_panel.png", "prototype_neo_brutalism_teacher.html"),
    ("04_portal_and_auth.png", "prototype_portal_and_auth.html"),
    ("05_states_gallery.png", "prototype_states_gallery.html")
]

for out_name, html_name in pages:
    html_path = os.path.join(base_dir, html_name)
    out_path = os.path.join(shots_dir, out_name)
    
    cmd = [
        edge_path,
        "--headless=new",
        f"--screenshot={out_path}",
        "--window-size=1920,1080",
        "--hide-scrollbars",
        f"file:///{html_path.replace(os.sep, '/')}"
    ]
    
    print(f"Capturing: {html_name} -> {out_name}...")
    subprocess.run(cmd, check=True)
    time.sleep(1)
    
    if os.path.exists(out_path):
        size_kb = os.path.getsize(out_path) / 1024
        print(f"  [SUCCESS] {out_name} ({size_kb:.1f} KB)")
    else:
        print(f"  [FAILED] {out_name}")

print("\nAll screenshots captured successfully!")
