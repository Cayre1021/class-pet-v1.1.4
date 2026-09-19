import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

file_path = r"C:\Users\PC\.codex\sessions\2026\08\31\rollout-2026-08-31T21-20-13-01a05b32-3b20-7e02-98d9-817eca0f957c.jsonl"

last_assistant_msgs = []
record_after_msg14 = False

with open(file_path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip(): continue
        try:
            data = json.loads(line)
            payload = data.get('payload', {})
            p_type = payload.get('type')
            if p_type == 'message':
                role = payload.get('role')
                if role == 'user':
                    blocks = payload.get('content', [])
                    text = "".join([b.get('text', '') for b in blocks if b.get('type') in ('input_text', 'text')])
                    if "这些都废掉不要了，我只要Neo-Brutalism" in text:
                        record_after_msg14 = True
                elif role == 'assistant' and record_after_msg14:
                    blocks = payload.get('content', [])
                    text = "".join([b.get('text', '') for b in blocks if b.get('type') in ('input_text', 'text')])
                    last_assistant_msgs.append(text)
            elif p_type == 'function_call' and record_after_msg14:
                name = payload.get('name')
                args = payload.get('arguments', '')
                last_assistant_msgs.append(f"[Tool Call: {name}] {args}")
        except:
            pass

print(f"Items after Message 14: {len(last_assistant_msgs)}")
for item in last_assistant_msgs:
    print("-" * 50)
    print(item[:500])
