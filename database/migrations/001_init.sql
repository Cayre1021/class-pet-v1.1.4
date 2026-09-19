-- V1-Lite SQLite DDL Schema Migration 001_init.sql
-- 依据 analysis_and_requirements/data_architecture/01_schema.md

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pet_species (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  default_nickname_template TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_placeholder INTEGER NOT NULL DEFAULT 0 CHECK (is_placeholder IN (0, 1))
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  school_norm TEXT NOT NULL,
  class_norm TEXT NOT NULL,
  teacher_norm TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'bcryptjs',
  profile_color TEXT NOT NULL DEFAULT 'purple',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_opened_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_teacher_identity
  ON teachers(school_norm, class_norm, teacher_norm);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL UNIQUE,
  school_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  class_norm TEXT NOT NULL,
  default_subject_id TEXT,
  max_level INTEGER NOT NULL DEFAULT 20 CHECK (max_level >= 1 AND max_level <= 99),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_class_identity
  ON classes(teacher_id, class_norm);

CREATE TABLE IF NOT EXISTS local_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_preset INTEGER NOT NULL DEFAULT 0 CHECK (is_preset IN (0, 1)),
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE (class_id, code)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_no TEXT NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT,
  note TEXT,
  display_pet_id TEXT,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE (class_id, student_no)
);

CREATE INDEX IF NOT EXISTS ix_students_class_active
  ON students(class_id, archived_at, student_no);

CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  species_code TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  egg_color TEXT NOT NULL,
  exp INTEGER NOT NULL DEFAULT 0 CHECK (exp >= 0),
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  visual_stage INTEGER NOT NULL DEFAULT 0 CHECK (visual_stage BETWEEN 0 AND 5),
  pending_stage INTEGER CHECK (pending_stage IS NULL OR pending_stage BETWEEN 1 AND 5),
  is_display INTEGER NOT NULL DEFAULT 0 CHECK (is_display IN (0, 1)),
  teacher_positive_exp_total INTEGER NOT NULL DEFAULT 0 CHECK (teacher_positive_exp_total >= 0),
  interaction_exp_total INTEGER NOT NULL DEFAULT 0 CHECK (interaction_exp_total >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (species_code) REFERENCES pet_species(code),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE INDEX IF NOT EXISTS ix_pets_student ON pets(student_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pets_display ON pets(student_id) WHERE is_display = 1;

CREATE TABLE IF NOT EXISTS pet_stage_unlocks (
  pet_id TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 0 AND 5),
  unlocked_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  PRIMARY KEY (pet_id, stage),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);

CREATE TABLE IF NOT EXISTS class_level_thresholds (
  class_id TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 0),
  min_exp INTEGER NOT NULL CHECK (min_exp >= 0),
  PRIMARY KEY (class_id, level),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS class_visual_stages (
  class_id TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 0 AND 5),
  min_level INTEGER NOT NULL CHECK (min_level >= 0),
  code TEXT NOT NULL,
  PRIMARY KEY (class_id, stage),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS behavior_rules (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  CHECK ((type = 'positive' AND points > 0) OR (type = 'negative' AND points < 0))
);

CREATE TABLE IF NOT EXISTS score_operations (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  rule_id TEXT,
  action_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  remark TEXT,
  created_at INTEGER NOT NULL,
  undone_at INTEGER,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (rule_id) REFERENCES behavior_rules(id),
  UNIQUE (class_id, request_id)
);

CREATE TABLE IF NOT EXISTS score_entries (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  points_applied INTEGER NOT NULL,
  exp_before INTEGER NOT NULL,
  exp_after INTEGER NOT NULL,
  level_before INTEGER NOT NULL,
  level_after INTEGER NOT NULL,
  FOREIGN KEY (operation_id) REFERENCES score_operations(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);

CREATE INDEX IF NOT EXISTS ix_score_entries_student ON score_entries(student_id, operation_id);

CREATE TABLE IF NOT EXISTS interaction_events (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  action_code TEXT NOT NULL,
  exp_awarded INTEGER NOT NULL CHECK (exp_awarded >= 0),
  bubble_code TEXT,
  created_at INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);

CREATE INDEX IF NOT EXISTS ix_interaction_pet_action
  ON interaction_events(pet_id, action_code, created_at);

CREATE TABLE IF NOT EXISTS pet_interaction_state (
  pet_id TEXT NOT NULL,
  action_code TEXT NOT NULL,
  last_used_at INTEGER,
  daily_exp INTEGER NOT NULL DEFAULT 0,
  daily_date TEXT,
  PRIMARY KEY (pet_id, action_code),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);

CREATE TABLE IF NOT EXISTS class_interaction_config (
  class_id TEXT PRIMARY KEY,
  daily_exp_cap INTEGER NOT NULL DEFAULT 5,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS interaction_action_defs (
  class_id TEXT NOT NULL,
  action_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  cooldown_ms INTEGER NOT NULL,
  exp_min INTEGER NOT NULL,
  exp_max INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (class_id, action_code),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  CHECK (exp_min >= 0 AND exp_max >= exp_min)
);

CREATE TABLE IF NOT EXISTS backup_runs (
  id TEXT PRIMARY KEY,
  class_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('daily', 'manual', 'pre_restore')),
  file_path TEXT,
  format_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
  error_code TEXT
);
