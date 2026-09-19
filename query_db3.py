import sqlite3
import json
import sys
# Set console encoding to UTF-8 to prevent char map errors
sys.stdout.reconfigure(encoding='utf-8')

db = 'C:/Users/PC/.codex/sqlite/codex-dev.db'
target_id = '01a05b32-3b20-7e02-98d9-817eca0f957c'

conn = sqlite3.connect(db)
cursor = conn.cursor()

cursor.execute("SELECT payload_json FROM thread_timeline_ledger WHERE thread_id = ? ORDER BY sequence ASC", (target_id,))
rows = cursor.fetchall()

if not rows:
    print("No records found in thread_timeline_ledger.")
else:
    print(f"Found {len(rows)} messages/timeline events.")
    for i, row in enumerate(rows):
        payload = row[0]
        try:
            parsed = json.loads(payload)
            print(f"\\n--- Event {i} ---")
            print(json.dumps(parsed, indent=2, ensure_ascii=False)[:1000]) # Print first 1000 chars to avoid huge spam
        except Exception as e:
            print(f"Could not parse event {i}: {e}")
