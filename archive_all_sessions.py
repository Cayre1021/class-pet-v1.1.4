import os
import sys
import glob
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

session_dir = r"C:\Users\PC\.codex\sessions"
target_threads = [
    ("01a048d4-7872-73a0-b9d8-66c3801f752d", "01_PRD_Analysis_and_Audit"),
    ("01a04d5a-f30d-74b3-9f36-81126f8f2fe2", "02_Main_Orchestrator_and_Planning"),
    ("01a05b32-3b20-7e02-98d9-817eca0f957c", "03_UI_UX_HighFidelity_Exploration"),
    ("01a05b33-08dd-7031-b0b3-c37a09bab437", "04_Local_Data_Architecture_and_Migration"),
    ("01a05b33-96b0-7d82-a704-3d63b4d0c48b", "05_Pet_Assets_Inventory_v1"),
    ("01a05b34-492a-7791-9b55-d150c66c357e", "06_Electron22_Win7_ia32_Compatibility"),
    ("01a05b45-dfee-7cb3-b778-6b7197599829", "07_Pet_Assets_Audit_Final"),
]

output_dir = r"d:\Desk\ALL Vibe\new-class-pet\codex_dialogue_archive"
os.makedirs(output_dir, exist_ok=True)

all_jsonl = glob.glob(os.path.join(session_dir, "**", "*.jsonl"), recursive=True)

summary_records = []

for tid, tag in target_threads:
    file_path = None
    for p in all_jsonl:
        if tid in p:
            file_path = p
            break
            
    if not file_path:
        continue
        
    out_md = os.path.join(output_dir, f"{tag}_{tid[:8]}.md")
    
    user_prompts = []
    assistant_replies = []
    created_files = set()
    executed_commands = []
    
    with open(file_path, 'r', encoding='utf-8') as f_in, open(out_md, 'w', encoding='utf-8') as f_out:
        f_out.write(f"# Codex Thread Export: {tag} ({tid})\n\n")
        f_out.write(f"> Source File: `{file_path}`\n\n---\n\n")
        
        for line in f_in:
            if not line.strip(): continue
            try:
                data = json.loads(line)
                if 'payload' in data:
                    payload = data['payload']
                    p_type = payload.get('type')
                    
                    if p_type == 'message':
                        role = payload.get('role')
                        if role == 'developer': continue
                        content_blocks = payload.get('content', [])
                        text_parts = []
                        for b in content_blocks:
                            if b.get('type') in ('input_text', 'text'):
                                text_parts.append(b.get('text', ''))
                        full_text = "\n".join(text_parts).strip()
                        
                        if role == 'user':
                            user_prompts.append(full_text)
                            f_out.write(f"## 👤 User\n\n{full_text}\n\n")
                        elif role == 'assistant':
                            assistant_replies.append(full_text)
                            f_out.write(f"## 🤖 Assistant\n\n{full_text}\n\n")
                            
                    elif p_type == 'function_call':
                        name = payload.get('name')
                        args_str = payload.get('arguments', '')
                        f_out.write(f"**[🔧 Tool Call: {name}]**\n```json\n{args_str}\n```\n\n")
                        try:
                            args_json = json.loads(args_str)
                            if 'cmd' in args_json:
                                cmd = args_json['cmd']
                                executed_commands.append(cmd)
                                # Check file creation
                                match = re.search(r'Out-File\s+-FilePath\s+[\"\']([^\"\']+)[\"\']', cmd)
                                if match:
                                    created_files.add(match.group(1))
                                match2 = re.search(r'New-Item.*?-Path\s+[\"\']([^\"\']+)[\"\']', cmd)
                                if match2:
                                    created_files.add(match2.group(1))
                        except:
                            pass
            except:
                pass
                
    summary_records.append({
        "tid": tid,
        "tag": tag,
        "file": out_md,
        "user_turns": len(user_prompts),
        "assistant_turns": len(assistant_replies),
        "first_prompt": user_prompts[0] if user_prompts else "",
        "created_files": list(created_files),
        "commands_count": len(executed_commands)
    })
    print(f"Exported {tag} -> {out_md}")

# Write a Master Index
index_md = os.path.join(output_dir, "README_MASTER_ARCHIVE_INDEX.md")
with open(index_md, 'w', encoding='utf-8') as f:
    f.write("# Codex new-class-pet 全部历史会话与项目知识总库\n\n")
    f.write(f"归档时间：2026-09-01\n\n## 会话总览表\n\n")
    f.write("| 序号 | 模块/任务名称 | 会话ID | 交互轮次 | 产出文件数 | 归档链接 |\n")
    f.write("|---|---|---|---|---|---|\n")
    for idx, r in enumerate(summary_records, 1):
        f.write(f"| {idx} | {r['tag']} | `{r['tid']}` | {r['user_turns']}轮 | {len(r['created_files'])}个 | [{os.path.basename(r['file'])}](./{os.path.basename(r['file'])}) |\n")
    f.write("\n---\n")

print(f"\nMaster Index generated at {index_md}")
