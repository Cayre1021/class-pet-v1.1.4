import sqlite3
import os
import uuid
import time

db_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(db_dir, "classpet.sqlite")
migration_path = os.path.join(db_dir, "migrations", "001_init.sql")
seed_path = os.path.join(db_dir, "seed.sql")

print(f"Connecting to SQLite database at: {db_path}")
conn = sqlite3.connect(db_path)
conn.execute("PRAGMA journal_mode=WAL;")
conn.execute("PRAGMA foreign_keys=ON;")
conn.execute("PRAGMA busy_timeout=5000;")
conn.execute("PRAGMA synchronous=NORMAL;")

# 1. 执行 DDL 迁移
print("Applying DDL migration (001_init.sql)...")
with open(migration_path, "r", encoding="utf-8") as f:
    ddl_sql = f.read()
conn.executescript(ddl_sql)

# 记录迁移历史
conn.execute("INSERT OR IGNORE INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)",
             (1, "001_init.sql", int(time.time() * 1000)))

# 2. 执行种子数据
print("Applying seed data (seed.sql)...")
with open(seed_path, "r", encoding="utf-8") as f:
    seed_sql = f.read()
conn.executescript(seed_sql)

# 3. 初始化测试教师与班级
teacher_id = "t_liu_01"
class_id = "c_class02_01"
now_ms = int(time.time() * 1000)

conn.execute("""
INSERT OR REPLACE INTO teachers (id, school_name, teacher_name, class_name, school_norm, class_norm, teacher_norm, password_hash, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (teacher_id, "实验小学", "刘老师", "三年级二班", "实验小学", "三年级二班", "刘老师", "$2a$10$dummyhash...", now_ms, now_ms))

conn.execute("""
INSERT OR REPLACE INTO classes (id, teacher_id, school_name, class_name, class_norm, default_subject_id, max_level, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (class_id, teacher_id, "实验小学", "三年级二班", "三年级二班", "subj_chinese", 20, now_ms, now_ms))

# 4. 插入 3 门预设学科
subjects = [
    ("subj_chinese", class_id, "chinese", "语文", 1, now_ms),
    ("subj_math", class_id, "math", "数学", 1, now_ms),
    ("subj_english", class_id, "english", "英语", 1, now_ms)
]
conn.executemany("INSERT OR REPLACE INTO subjects (id, class_id, code, name, is_preset, created_at) VALUES (?, ?, ?, ?, ?, ?)", subjects)

# 5. 插入 20 级经验阈值表（2026-11-20 起：破壳 50，此后每级 +100）
thresholds = [
    (0, 0), (1, 50), (2, 150), (3, 250), (4, 350),
    (5, 450), (6, 550), (7, 650), (8, 750), (9, 850),
    (10, 950), (11, 1050), (12, 1150), (13, 1250), (14, 1350),
    (15, 1450), (16, 1550), (17, 1650), (18, 1750), (19, 1850), (20, 1950)
]
for lvl, exp in thresholds:
    conn.execute("INSERT OR REPLACE INTO class_level_thresholds (class_id, level, min_exp) VALUES (?, ?, ?)", (class_id, lvl, exp))

# 6. 插入 6 阶段视觉节点
stages = [
    (0, 0, "egg"),
    (1, 1, "form1"),
    (2, 4, "form2"),
    (3, 8, "form3"),
    (4, 13, "form4"),
    (5, 20, "form5")
]
for stg, min_lvl, code in stages:
    conn.execute("INSERT OR REPLACE INTO class_visual_stages (class_id, stage, min_level, code) VALUES (?, ?, ?, ?)", (class_id, stg, min_lvl, code))

# 7. 插入 13 项标准行为规则
behavior_rules = [
    ("rule_p1", class_id, "帮助打扫卫生", 5, "positive", 1, now_ms),
    ("rule_p2", class_id, "帮忙擦黑板", 3, "positive", 2, now_ms),
    ("rule_p3", class_id, "作业优秀", 5, "positive", 3, now_ms),
    ("rule_p4", class_id, "主动回答问题", 3, "positive", 4, now_ms),
    ("rule_p5", class_id, "好人好事", 5, "positive", 5, now_ms),
    ("rule_p6", class_id, "乐于助人", 4, "positive", 6, now_ms),
    ("rule_p7", class_id, "听课认真", 3, "positive", 7, now_ms),
    ("rule_p8", class_id, "思维活跃", 4, "positive", 8, now_ms),
    ("rule_n1", class_id, "迟到/早退", -3, "negative", 9, now_ms),
    ("rule_n2", class_id, "课上讲话", -5, "negative", 10, now_ms),
    ("rule_n3", class_id, "逃避值日", -5, "negative", 11, now_ms),
    ("rule_n4", class_id, "未交作业", -5, "negative", 12, now_ms),
    ("rule_n5", class_id, "乱扔垃圾", -3, "negative", 13, now_ms)
]
conn.executemany("INSERT OR REPLACE INTO behavior_rules (id, class_id, name, points, type, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", behavior_rules)

# 8. 插入 42 名学生及初始宠物
names = [
    '张三', '李四', '王五', '赵六', '孙七', '周八', '吴九',
    '郑十', '陈一', '林二', '黄三', '何四', '郭五', '马六',
    '朱七', '罗八', '梁九', '宋十', '谢一', '唐二', '许三',
    '韩四', '冯五', '邓六', '曹七', '彭八', '曾九', '肖十',
    '田一', '董二', '袁三', '潘四', '于五', '蒋六', '蔡七',
    '余八', '杜九', '叶十', '程一', '苏二', '魏三', '吕四'
]
species_list = ['cat', 'dog', 'fox', 'hamster', 'bunny', 'deer', 'bird', 'fish']

for i, name in enumerate(names):
    st_id = f"st_{i+1:02d}"
    st_no = f"{i+1:02d}"
    group_name = f"第{(i%4)+1}组"
    pet_id = f"pet_{i+1:02d}"
    species = species_list[i % len(species_list)]

    conn.execute("""
    INSERT OR REPLACE INTO students (id, class_id, student_no, name, group_name, display_pet_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (st_id, class_id, st_no, name, group_name, pet_id, now_ms, now_ms))

    # 经验设定：孙七(1250满级), 其余阶梯
    exp = 1250 if i == 4 else (280 if i % 5 == 0 else (600 if i % 3 == 0 else 50))
    lvl = 20 if exp >= 1250 else (13 if exp >= 585 else (8 if exp >= 260 else (4 if exp >= 90 else 2)))
    stage = 5 if lvl == 20 else (4 if lvl >= 13 else (3 if lvl >= 8 else (2 if lvl >= 4 else 1)))

    conn.execute("""
    INSERT OR REPLACE INTO pets (id, class_id, student_id, species_code, subject_id, nickname, egg_color, exp, level, visual_stage, is_display, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (pet_id, class_id, st_id, species, "subj_chinese", f"{name}的小宠", "#FFAA00", exp, lvl, stage, 1, now_ms, now_ms))

conn.commit()

# 9. 运行验证测试查询
cursor = conn.cursor()
cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table';")
table_count = cursor.fetchone()[0]
cursor.execute("SELECT count(*) FROM students WHERE class_id = ?", (class_id,))
student_count = cursor.fetchone()[0]
cursor.execute("SELECT count(*) FROM pets WHERE class_id = ?", (class_id,))
pet_count = cursor.fetchone()[0]
cursor.execute("SELECT count(*) FROM class_level_thresholds WHERE class_id = ?", (class_id,))
threshold_count = cursor.fetchone()[0]
cursor.execute("SELECT count(*) FROM behavior_rules WHERE class_id = ?", (class_id,))
rule_count = cursor.fetchone()[0]

print("\n" + "="*50)
print(" DATABASE VERIFICATION REPORT")
print("="*50)
print(f"Total Tables Created:       {table_count}")
print(f"Students in Class:          {student_count} (Expected: 42)")
print(f"Pets in Class:              {pet_count} (Expected: 42)")
print(f"Level Thresholds (0-20):    {threshold_count} (Expected: 21)")
print(f"Default Behavior Rules:     {rule_count} (Expected: 13)")
print(f"Database File Size:         {os.path.getsize(db_path)/1024:.1f} KB")
print("="*50)
print("SQLite Database successfully initialized and verified!\n")

conn.close()
