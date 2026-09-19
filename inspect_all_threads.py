import os
import sys
import glob
import json

sys.stdout.reconfigure(encoding='utf-8')

session_dir = r"C:\Users\PC\.codex\sessions"
target_threads = [
    ("01a048d4-7872-73a0-b9d8-66c3801f752d", "Read PRD for title"),
    ("01a04d5a-f30d-74b3-9f36-81126f8f2fe2", "主对话main"),
    ("01a05b32-3b20-7e02-98d9-817eca0f957c", "V1-Lite 高保真 UI 方案与原型探索"),
    ("01a05b33-08dd-7031-b0b3-c37a09bab437", "V1-Lite 本地数据架构与迁移方案"),
    ("01a05b33-96b0-7d82-a704-3d63b4d0c48b", "V1-Lite 宠物素材盘点与资源映射"),
    ("01a05b34-492a-7791-9b55-d150c66c357e", "V1-Lite Electron 22 与 Win7 ia32 兼容性验证"),
    ("01a05b3c-5b66-7232-a548-cfc5ef3b3a93", "V1-Lite 宠物素材盘点与资源映射 (2)"),
    ("01a05b45-dfee-7cb3-b778-6b7197599829", "V1-Lite 宠物素材审计（自由收束版）"),
]

# Find all jsonl files
all_jsonl = glob.glob(os.path.join(session_dir, "**", "*.jsonl"), recursive=True)

thread_to_file = {}
for path in all_jsonl:
    for tid, title in target_threads:
        if tid in path:
            thread_to_file[tid] = path

print(f"Matched {len(thread_to_file)} / {len(target_threads)} session files.\n")

for tid, title in target_threads:
    file_path = thread_to_file.get(tid)
    if not file_path:
        print(f"[-] Thread {tid} ({title}): No session file found.")
        continue
    
    file_size_kb = os.path.getsize(file_path) / 1024
    print(f"[+] Thread: {title} ({tid})")
    print(f"    File: {file_path} ({file_size_kb:.1f} KB)")
    
    # Read first user prompt and last assistant message
    first_user_msg = ""
    last_assistant_msg = ""
    last_event_type = ""
    total_messages = 0
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            try:
                data = json.loads(line)
                if 'payload' in data:
                    payload = data['payload']
                    p_type = payload.get('type')
                    last_event_type = p_type
                    
                    if p_type == 'message':
                        role = payload.get('role')
                        if role == 'developer': continue
                        total_messages += 1
                        
                        # extract text
                        content_blocks = payload.get('content', [])
                        text = "".join([b.get('text', '') for b in content_blocks if b.get('type') in ('input_text', 'text')])
                        
                        if role == 'user' and not first_user_msg:
                            first_user_msg = text
                        elif role == 'assistant':
                            last_assistant_msg = text
            except:
                pass
                
    print(f"    Total User/Assistant Turns: {total_messages}")
    print(f"    Last Event Type: {last_event_type}")
    print(f"    Initial Prompt (truncated): {first_user_msg.strip()[:180]}...")
    if last_assistant_msg:
        print(f"    Final Assistant Reply (truncated): {last_assistant_msg.strip()[-200:]}...")
    else:
        print("    Final Assistant Reply: [None or tool call was last]")
    print("=" * 70)
