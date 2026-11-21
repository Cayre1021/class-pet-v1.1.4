#!/usr/bin/env bash
# scripts/verify_package.sh —— 发版前自检：白名单/asar 内容/真实启动一次，任何一项失败都不许发布
# 用法： bash scripts/verify_package.sh
set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAIL=0
ok(){ echo "  PASS  $1"; }
bad(){ echo "  FAIL  $1"; FAIL=1; }

VERSION="$(node -e "console.log(require('./electron-app/package.json').version)")"
INSTALLER="electron-app/release/ClassPet Setup ${VERSION}.exe"
PORTABLE="electron-app/release/ClassPet-Portable-${VERSION}.exe"
UNPACKED="electron-app/release/win-unpacked"
echo "== 1. 打包白名单（防 Cannot find module） =="
node tests/test_packaging_files.js > /tmp/pkgcheck.log 2>&1 && ok "test_packaging_files 通过" || { bad "test_packaging_files 失败"; tail -5 /tmp/pkgcheck.log; }

echo "== 2. 安装包与 asar 内容 =="
[ -f "$INSTALLER" ] && ok "安装包存在: $(basename "$INSTALLER")" || bad "缺少安装包 $INSTALLER"
[ -f "$PORTABLE" ] && ok "便携版存在: $(basename "$PORTABLE")" || bad "缺少便携版 $PORTABLE"
[ -f "$UNPACKED/resources/app.asar" ] || bad "缺少 win-unpacked/resources/app.asar"
if [ -f "$UNPACKED/resources/app.asar" ]; then
  LIST="$(npx --yes asar list "$UNPACKED/resources/app.asar" 2>/dev/null)"
  for f in main.js preload.js sqlite_service.js update_check.js; do
    echo "$LIST" | grep -qE "(^|[\\/])${f}$" && ok "asar 含 $f" || bad "asar 缺少 $f（装好会崩）"
  done
  CNT=$(echo "$LIST" | grep -cE "stage[0-9]-(pat|feed|play)\.png$")
  [ "$CNT" = "120" ] && ok "asar 含 120 张表情图" || bad "asar 表情图数量=$CNT（应为 120）"
fi

echo "== 3. 真实启动一次（抓主进程异常） =="
if [ -f "$UNPACKED/ClassPet.exe" ]; then
  TMPUD="$(mktemp -d)"
  ( env -u ELECTRON_RUN_AS_NODE "./$UNPACKED/ClassPet.exe" --user-data-dir="$TMPUD" > /tmp/pkgboot.log 2>&1 & )
  sleep 14
  if grep -qE "Cannot find module|Uncaught Exception|A JavaScript error occurred" /tmp/pkgboot.log; then
    bad "启动日志出现主进程异常："; grep -E "Cannot find module|Uncaught Exception" /tmp/pkgboot.log | head -3
  else
    grep -q "SQLite 服务初始化就绪" /tmp/pkgboot.log && ok "启动正常（SQLite 就绪，无 JS 异常）" || bad "启动日志里没有 SQLite 就绪标记"
  fi
  powershell -NoProfile -Command "Get-Process ClassPet -ErrorAction SilentlyContinue | Stop-Process -Force" >/dev/null 2>&1
  rm -rf "$TMPUD"
else
  bad "缺少 $UNPACKED/ClassPet.exe"
fi

echo ""
if [ "$FAIL" = "0" ]; then echo "✅ 包自检通过，可以发布 ${VERSION}"; exit 0; fi
echo "❌ 包自检未通过，禁止发布"; exit 1
