import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

with open('codex_thread_01a05b32.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into sections
sections = re.split(r'\n(?=## 👤 User|## 🤖 Assistant)', content)
print(f"Total conversation blocks: {len(sections)}")

for idx, sec in enumerate(sections):
    lines = sec.strip().split('\n')
    header = lines[0] if lines else ""
    first_few = "\n".join(lines[1:6])
    print(f"\n--- Section {idx}: {header} ---")
    if "User" in header:
        print(sec[:400] + ("..." if len(sec) > 400 else ""))
    else:
        # Check tool calls or text
        tool_calls = re.findall(r'\*\*\[🔧 Tool Call: (.*?)\]\*\*', sec)
        if tool_calls:
            print(f"Tool Calls: {tool_calls}")
        # Look for created files
        files_created = re.findall(r'Path \"([^\"]+)\"', sec)
        if files_created:
            print(f"Files referenced/created: {set(files_created)}")
        # Check text length
        clean_text = re.sub(r'```[\s\S]*?```', '[CODE BLOCK]', sec)
        print("Assistant Message Preview:")
        print(clean_text[:300].strip())
