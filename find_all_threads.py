import sqlite3
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\PC\.codex\sqlite\codex-dev.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    SELECT thread_id, display_title, source_created_at, source_updated_at, cwd, source_kind
    FROM local_thread_catalog
    WHERE cwd LIKE '%new-class-pet%'
    ORDER BY source_created_at ASC
""")

rows = cursor.fetchall()
print(f"Total threads found for new-class-pet: {len(rows)}\n")

for row in rows:
    tid, title, created, updated, cwd, kind = row
    print(f"Thread ID: {tid}")
    print(f"  Title: {title}")
    print(f"  Created: {created}, Updated: {updated}")
    print(f"  CWD: {cwd}")
    print(f"  Kind: {kind}")
    print("-" * 60)
