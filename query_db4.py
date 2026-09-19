import sqlite3
db = 'C:/Users/PC/.codex/sqlite/codex-dev.db'
conn = sqlite3.connect(db)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
for t in [x[0] for x in cursor.fetchall()]:
    cursor.execute(f"PRAGMA table_info({t})")
    cols = [c[1] for c in cursor.fetchall()]
    for col in cols:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {t} WHERE {col} LIKE '%01a05b32%'")
            c = cursor.fetchone()[0]
            if c > 0: print(f"Found {c} in {t}.{col}")
        except: pass
