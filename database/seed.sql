-- V1-Lite Seed Data
-- 依据 analysis_and_requirements/data_architecture/01_schema.md 5 节

-- 1. 物种目录 (8 种)
INSERT OR REPLACE INTO pet_species (code, display_name, default_nickname_template, asset_key, sort_order, is_placeholder) VALUES
('bird', '小鸟', '{studentName}的小鸟', 'bird', 1, 0),
('bunny', '兔子', '{studentName}的兔子', 'bunny', 2, 0),
('cat', '猫咪', '{studentName}的猫咪', 'cat', 3, 0),
('deer', '小鹿', '{studentName}的小鹿', 'deer', 4, 0),
('dog', '小狗', '{studentName}的小狗', 'dog', 5, 0),
('fish', '小鱼', '{studentName}的小鱼', 'fish', 6, 0),
('fox', '狐狸', '{studentName}的狐狸', 'fox', 7, 0),
('hamster', '仓鼠', '{studentName}的仓鼠', 'hamster', 8, 0);

-- 2. 应用元数据
INSERT OR REPLACE INTO app_meta (key, value) VALUES
('schema_version', '1'),
('reset_code_mode', 'dev'),
('auto_restore', '1');
