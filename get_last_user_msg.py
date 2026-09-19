import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

file_path = r"C:\Users\PC\.codex\sessions\2026\08\31\rollout-2026-08-31T21-20-13-01a05b32-3b20-7e02-98d9-817eca0f957c.jsonl"

user_messages = []
with open(file_path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip(): continue
        try:
            data = json.loads(line)
            if data.get('type') == 'response_item' or 'payload' in data:
                payload = data.get('payload', {})
                if payload.get('type') == 'message' and payload.get('role') == 'user':
                    blocks = payload.get('content', [])
                    text = "".join([b.get('text', '') for b in blocks if b.get('type') in ('input_text', 'text')])
                    user_messages.append(text)
        except Exception as e:
            pass

print(f"Total user messages found: {len(user_messages)}")
for i, msg in enumerate(user_messages):
    print(f"\n================ User Message {i} ================")
    print(msg.strip())
