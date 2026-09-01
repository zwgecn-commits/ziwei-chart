#!/bin/bash
# publish.sh — @zwge/ziwei-chart 发布脚本 v2（韩立 2026-08-30）
# 前置：npm login（主人账号）。GitHub/Gitee 为可选后续，非发布阻塞。
# 用法：
#   ./publish.sh              # npm 先行（推荐·不依赖 GitHub）
#   ./publish.sh --mirror     # 发布后同步 Gitee（需 Gitee token）
#   ./publish.sh --github     # 发布后推送 GitHub（需 GitHub 可用）
set -euo pipefail
cd "$(dirname "$0")"

BUMP="patch"
MODE="${1:-}"
if [[ "$MODE" != --* ]]; then BUMP="${1:-patch}"; MODE=""; fi

echo "==> CI 断言预演（金标隔离+零遥测+冒烟）"
if find . -type f \( -name "gold_cases*.jsonl" -o -name "paipan_eval*.json" -o -name "*.db" \) | grep -q .; then
  echo "❌ 金标文件在检出树，禁止发布"; exit 1
fi
if grep -nE 'fetch\(|https?://|child_process' ziwei_chart.js | grep -qv '// '; then
  echo "❌ 源码含网络调用，禁止发布"; exit 1
fi
node --check ziwei_chart.js
node ziwei_chart.js 1986 12 2 6 male | grep -q '"success": true'

echo "==> 版本 bump"
npm version "$BUMP" --no-git-tag-version

echo "==> npm 发布（provenance 签名）"
npm publish
echo "✅ npm 发布完成: @zwge/ziwei-chart@$(node -p "require('./package.json').version")"

# ── 可选: Gitee 镜像 ──
if [[ "$MODE" == "--mirror" ]]; then
  GITEE_REMOTE="${GITEE_REMOTE:-git@gitee.com:zwge/ziwei-chart.git}"
  git add -A && git commit -m "release: v$(node -p "require('./package.json').version")" || true
  git remote add gitee "$GITEE_REMOTE" 2>/dev/null || true
  git push gitee main --tags && echo "✅ Gitee 镜像完成" || echo "⚠️ Gitee 推送失败（检查 token）"
fi

# ── 可选: GitHub ──
if [[ "$MODE" == "--github" ]]; then
  GH_REMOTE="${GH_REMOTE:-git@github.com:zwge/ziwei-chart.git}"
  git add -A && git commit -m "release: v$(node -p "require('./package.json').version")" || true
  git remote add origin "$GH_REMOTE" 2>/dev/null || true
  git push -u origin main --tags && echo "✅ GitHub 推送完成" || echo "⚠️ GitHub 推送失败（IP 风控时跳过，后补）"
fi
