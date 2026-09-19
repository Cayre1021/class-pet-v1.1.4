import sqlite3
import json

dbs = [
    'C:/Users/PC/.codex/sqlite/codex-dev.db', 
    'C:/Users/PC/.codex/sqlite/state_5.sqlite', 
    'C:/Users/PC/.codex/sqlite/logs_2.sqlite'
]

target_id = '01a05b32-3b20-7e02-98d9-817eca0f957c'

for db in dbs:
    print(f"\\n=== Checking {db} ===")
    try:
        conn = sqlite3.connect(db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        
        found_in_db = False
        for t in tables:
            # We just try to query columns that might contain 'id'
            cursor.execute(f"PRAGMA table_info({t})")
            cols = [c[1] for c in cursor.fetchall()]
            
            # If any column is likely to contain the ID, let's search it
            for col in cols:
                try:
                    cursor.execute(f"SELECT * FROM {t} WHERE {col} LIKE ?", (f'%{target_id}%',))
                    rows = cursor.fetchall()
                    if rows:
                        print(f"Found {len(rows)} matching rows in table '{t}', column '{col}'")
                        for r in rows:
                            print(r)
                        found_in_db = True
                except Exception as e:
                    pass
                    
        if not found_in_db:
            print("No matching rows found in this database.")
    except Exception as e:
        print(f"Error reading {db}: {e}")
