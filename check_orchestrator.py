import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'codex_dialogue_archive\02_Main_Orchestrator_and_Planning_01a04d5a.md', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Find all user messages or delegations
turns = re.findall(r'## 👤 User\n\n([\s\S]*?)(?=\n## 🤖 Assistant|\Z)', text)
print(f"Total user turns in main orchestrator: {len(turns)}")
for i, t in enumerate(turns):
    print(f"\n--- User Turn {i} ---")
    print(t.strip()[:300])

# Find last assistant messages in main orchestrator
assistant_replies = re.findall(r'## 🤖 Assistant\n\n([\s\S]*?)(?=\n## 👤 User|\Z)', text)
print(f"\nTotal assistant replies: {len(assistant_replies)}")
if assistant_replies:
    print("\n--- Last Assistant Reply (First 1500 chars) ---")
    # filter out tool call blocks
    clean = re.sub(r'\*\*\[🔧 Tool Call:[\s\S]*?```', '', assistant_replies[-1])
    print(clean.strip()[:1500])
