import json
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

input_file = r"C:\Users\PC\.codex\sessions\2026\08\31\rollout-2026-08-31T21-20-13-01a05b32-3b20-7e02-98d9-817eca0f957c.jsonl"
output_file = r"d:\Desk\ALL Vibe\new-class-pet\codex_thread_01a05b32.md"

with open(input_file, 'r', encoding='utf-8') as f_in, open(output_file, 'w', encoding='utf-8') as f_out:
    f_out.write("# Codex Thread Export (01a05b32-3b20-7e02-98d9-817eca0f957c)\n\n")
    for line in f_in:
        if not line.strip(): continue
        try:
            data = json.loads(line)
            if 'payload' in data:
                payload = data['payload']
                p_type = payload.get('type')
                
                if p_type == 'message':
                    role = payload.get('role')
                    if role == 'developer': continue # Skip system prompt
                    
                    content_blocks = payload.get('content', [])
                    text_parts = []
                    for b in content_blocks:
                        if b.get('type') in ('input_text', 'text'):
                            text_parts.append(b.get('text', ''))
                    full_text = "\\n".join(text_parts)
                    
                    if role == 'user':
                        f_out.write(f"## 👤 User\\n\\n{full_text}\\n\\n")
                    elif role == 'assistant':
                        f_out.write(f"## 🤖 Assistant\\n\\n{full_text}\\n\\n")
                
                elif p_type == 'function_call':
                    name = payload.get('name')
                    args = payload.get('arguments', '')
                    f_out.write(f"**[🔧 Tool Call: {name}]**\\n```json\\n{args}\\n```\\n\\n")
                
                elif p_type == 'function_result':
                    name = payload.get('name', 'tool')
                    # Optionally include result, but it can be huge. We'll skip for now.
                    pass
        except Exception as e:
            pass

print(f"Exported to {output_file}")
