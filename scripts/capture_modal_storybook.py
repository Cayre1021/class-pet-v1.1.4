# scripts/capture_modal_storybook.py
import os
import subprocess
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

html_path = r"d:\Desk\ALL Vibe\new-class-pet\electron-app\src\display_bigscreen_touch_pro.html"
test_modal_path = r"d:\Desk\ALL Vibe\new-class-pet\electron-app\src\test_modal_preview.html"
out_path = r"d:\Desk\ALL Vibe\new-class-pet\screenshots_storybook\03_student_modal_storybook.png"

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

script_injection = """
<script>
let modalCheck = setInterval(() => {
    if (typeof store !== 'undefined' && store.students && store.students.length > 0 && typeof openStudentDetailsModal === 'function') {
        clearInterval(modalCheck);
        setTimeout(() => {
            openStudentDetailsModal(store.students[0].id);
        }, 150);
    }
}, 80);
</script>
</body>
"""

injected = content.replace('</body>', script_injection)
with open(test_modal_path, 'w', encoding='utf-8') as f:
    f.write(injected)

cmd = [
    edge_path,
    "--headless=new",
    "--virtual-time-budget=3500",
    f"--screenshot={out_path}",
    "--window-size=1920,1080",
    "--hide-scrollbars",
    f"file:///{test_modal_path.replace(os.sep, '/')}"
]

print("Capturing modal screenshot from inside electron-app/src...")
subprocess.run(cmd, check=True)
print(f"Modal capture complete. Exists: {os.path.exists(out_path)}")

# Clean up temporary test file
if os.path.exists(test_modal_path):
    os.remove(test_modal_path)
