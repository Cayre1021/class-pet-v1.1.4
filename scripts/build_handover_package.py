# -*- coding: utf-8 -*-
"""
ClassPet v1.1.4 Handover Package Builder
Consolidates the latest source code, v1.1.4 release packages, and the driving series of documentation into a pristine handover directory.
"""
import os
import shutil
import sys

SOURCE_ROOT = r"d:\Desk\ALL Vibe\new-class-pet"
TARGET_ROOT = r"d:\Desk\ALL Vibe\class-pet-v1.1.4-handover"

def copy_file(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    print(f"[COPY] {os.path.relpath(src, SOURCE_ROOT)} -> {os.path.relpath(dst, TARGET_ROOT)}")

def copy_tree(src, dst, ignore=None):
    if not os.path.exists(src):
        print(f"[SKIP] {src} does not exist.")
        return
    os.makedirs(dst, exist_ok=True)
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        dest_dir = os.path.join(dst, rel) if rel != '.' else dst
        os.makedirs(dest_dir, exist_ok=True)
        if ignore:
            dirs[:], files[:] = ignore(root, dirs, files)
        for f in files:
            src_f = os.path.join(root, f)
            dest_f = os.path.join(dest_dir, f)
            shutil.copy2(src_f, dest_f)
    print(f"[COPY TREE] {os.path.relpath(src, SOURCE_ROOT)} -> {os.path.relpath(dst, TARGET_ROOT)}")

def main():
    if os.path.exists(TARGET_ROOT):
        print(f"Cleaning existing target directory: {TARGET_ROOT}")
        shutil.rmtree(TARGET_ROOT)
    os.makedirs(TARGET_ROOT, exist_ok=True)

    # 1. Copy docs (驱动系列文档)
    docs_dir = os.path.join(TARGET_ROOT, "docs")
    os.makedirs(docs_dir, exist_ok=True)

    doc_mappings = [
        ("班级电子宠物系统_全功能模块需求与产品逻辑提炼文档(PRD交接基线).md", "01_PRD_全功能模块需求与产品逻辑提炼文档(交接基线).md"),
        ("班级电子宠物系统_历史踩坑与必须严格规避的Bug红线清单.md", "02_BUG红线_历史踩坑与必须严格规避的Bug清单.md"),
        ("班级电子宠物重构全案_极省Token执行路线图与代码逻辑动效指南.md", "03_技术架构_执行路线图与核心代码动效逻辑指南.md"),
        ("儿童绘本风格UI重构与48小时极速交付全景指南.md", "04_设计规范_儿童绘本风格UI重构全景设计指南.md"),
        ("班级电子宠物系统_全会话记录与决策全过程整理文档.md", "05_决策全景_系统全会话记录与决策全过程整理文档.md"),
        ("重构任务交付提示词(Codex与AI工具专享版).md", "06_AI协作_重构任务交付提示词(Codex与AI专用).md"),
        ("全文件夹审查报告_2026-10-03.md", "07_历史审查_代码与资产全文件夹审查报告.md")
    ]

    for src_name, dst_name in doc_mappings:
        src_path = os.path.join(SOURCE_ROOT, src_name)
        if os.path.exists(src_path):
            copy_file(src_path, os.path.join(docs_dir, dst_name))
        else:
            print(f"[WARN] Document {src_name} not found!")

    # Copy client requirements from 甲方意见
    client_dir = os.path.join(SOURCE_ROOT, "甲方意见")
    if os.path.exists(client_dir):
        dest_client_dir = os.path.join(docs_dir, "08_原始需求_甲方意见")
        os.makedirs(dest_client_dir, exist_ok=True)
        for f in os.listdir(client_dir):
            copy_file(os.path.join(client_dir, f), os.path.join(dest_client_dir, f))

    # 2. Copy electron-app latest code
    # Exclude node_modules, release, backup folders, test scripts, etc.
    electron_src = os.path.join(SOURCE_ROOT, "electron-app")
    electron_dst = os.path.join(TARGET_ROOT, "electron-app")

    for f in ["package.json", "package-lock.json", "main.js", "preload.js", "sqlite_service.js"]:
        copy_file(os.path.join(electron_src, f), os.path.join(electron_dst, f))

    # src/
    src_dir = os.path.join(electron_src, "src")
    dest_src_dir = os.path.join(electron_dst, "src")
    for f in [
        "index.html", "portal_auth.html",
        "teacher_panel_touch_pro.html", "teacher_panel.html", "teacher_panel_zoom150.html",
        "display_bigscreen_touch_pro.html", "display_bigscreen.html", "display_bigscreen_zoom150.html",
        "system_states.html", "classpet_core.js", "fireworks_engine.js"
    ]:
        p = os.path.join(src_dir, f)
        if os.path.exists(p):
            copy_file(p, os.path.join(dest_src_dir, f))

    # src/js/
    for f in ["classpet_core.js", "fireworks_engine.js"]:
        p = os.path.join(src_dir, "js", f)
        if os.path.exists(p):
            copy_file(p, os.path.join(dest_src_dir, "js", f))

    # src/assets/icons and src/assets/vendor
    copy_tree(os.path.join(src_dir, "assets", "icons"), os.path.join(dest_src_dir, "assets", "icons"))
    copy_tree(os.path.join(src_dir, "assets", "vendor"), os.path.join(dest_src_dir, "assets", "vendor"))

    # src/assets/pets (only production pets)
    copy_tree(os.path.join(src_dir, "assets", "pets"), os.path.join(dest_src_dir, "assets", "pets"))

    # scripts/
    scripts_src = os.path.join(electron_src, "scripts")
    if os.path.exists(scripts_src):
        os.makedirs(os.path.join(electron_dst, "scripts"), exist_ok=True)
        proc_py = os.path.join(scripts_src, "process_pets.py")
        if os.path.exists(proc_py):
            copy_file(proc_py, os.path.join(electron_dst, "scripts", "process_pets.py"))

    # 3. Copy database
    db_src = os.path.join(SOURCE_ROOT, "database", "classpet.sqlite")
    if os.path.exists(db_src):
        copy_file(db_src, os.path.join(TARGET_ROOT, "database", "classpet.sqlite"))

    # 4. Copy test suite to tests/
    tests_dst = os.path.join(TARGET_ROOT, "tests")
    os.makedirs(tests_dst, exist_ok=True)
    test_files = [
        "test_global_master_verification.js",
        "test_v114_verification.js",
        "test_subject_switch_locked_hatch.js",
        "test_restart_scoring_freeze.js",
        "test_csv_template_import.js"
    ]
    for tf in test_files:
        tp = os.path.join(SOURCE_ROOT, tf)
        if os.path.exists(tp):
            copy_file(tp, os.path.join(tests_dst, tf))

    # 5. Copy v1.1.4 release packages
    release_src = os.path.join(electron_src, "release")
    release_dst = os.path.join(TARGET_ROOT, "release")
    os.makedirs(release_dst, exist_ok=True)
    for rf in [
        "ClassPet Setup 1.1.4.exe",
        "ClassPet Setup 1.1.4.exe.blockmap",
        "ClassPet-Portable-1.1.4.exe"
    ]:
        rp = os.path.join(release_src, rf)
        if os.path.exists(rp):
            copy_file(rp, os.path.join(release_dst, rf))
        else:
            print(f"[WARN] Release file {rf} not found!")

    print(f"\n[DONE] Successfully assembled handover package at: {TARGET_ROOT}")

if __name__ == "__main__":
    main()
