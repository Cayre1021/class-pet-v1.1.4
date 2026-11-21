#!/usr/bin/env bash
# scripts/release_github.sh —— 把当前版本发布到 GitHub Releases（需要 gh CLI 且已登录）
# 用法： bash scripts/release_github.sh [--dry-run]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

VERSION="$(node -e "console.log(require('./electron-app/package.json').version)")"
TAG="v${VERSION}"
NOTES_FILE="docs/releases/${TAG}.md"
INSTALLER="electron-app/release/ClassPet Setup ${VERSION}.exe"
PORTABLE="electron-app/release/ClassPet-Portable-${VERSION}.exe"
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

echo "版本: ${VERSION}  标签: ${TAG}"
[ -f "$INSTALLER" ] || { echo "缺少安装包: $INSTALLER（先运行 npm run dist:win）" >&2; exit 1; }
[ -f "$PORTABLE" ] || { echo "缺少便携版: $PORTABLE" >&2; exit 1; }
[ -f "$NOTES_FILE" ] || { echo "缺少发布说明 $NOTES_FILE，先补一份再发布" >&2; exit 1; }

if [ "$DRY" = "1" ]; then
  echo "[dry-run] 将执行:"
  echo "  gh release create ${TAG} --title \"ClassPet ${VERSION}\" --notes-file $NOTES_FILE \"$INSTALLER#Windows 安装版\" \"$PORTABLE#免安装便携版\""
  exit 0
fi

# 发版前自检：白名单 / asar 内容 / 真实启动一次（任何一项失败都不发布）
bash scripts/verify_package.sh || { echo "包自检未通过，已中止发布" >&2; exit 1; }

command -v gh >/dev/null || { echo "未找到 gh CLI：https://cli.github.com/" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh 未登录：先运行 gh auth login" >&2; exit 1; }

# 网络不稳时重试 3 次（大陆访问 api.github.com 常见 ECONNRESET）
for i in 1 2 3; do
  if gh release create "${TAG}" \
      --title "ClassPet ${VERSION}" \
      --notes-file "$NOTES_FILE" \
      "$INSTALLER#Windows 安装版 ${VERSION}" \
      "$PORTABLE#免安装便携版 ${VERSION}"; then
    echo "已发布 ${TAG}"
    gh release view "${TAG}" --json url -q .url
    exit 0
  fi
  echo "第 $i 次发布失败，8 秒后重试…" >&2
  sleep 8
done
echo "三次都失败：多为网络无法访问 api.github.com。可改用网页手动上传（见 docs/V3_检查更新说明.md 第五节）" >&2
exit 1
