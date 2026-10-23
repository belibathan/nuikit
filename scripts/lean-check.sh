#!/usr/bin/env bash
# Keep it lean (docs/roadmap.md Track E): no committed images outside the allow-list, and a size line for the job summary.
set -euo pipefail
allow='^(apps/www/public/(apple-touch-icon\.png|og\.jpg)|docs/assets/(banner|social-preview)\.png|docs/brand/[^/]+\.png|docs/next/feedback/.*)$'
bad=$(git ls-files | grep -E '\.(png|jpe?g|webp|gif|bmp|tiff?)$' | grep -vE "$allow" || true)
if [ -n "$bad" ]; then
  echo "::error title=Committed image::images are never committed (shots are CI artifacts; feedback screenshots go in docs/next/feedback/<date>/):"
  echo "$bad" | sed 's/^/  /'
  exit 1
fi
files=$(git ls-files | wc -l)
bytes=$(git ls-files -z | xargs -0 du -cb 2>/dev/null | tail -1 | cut -f1)
line="lean: $files tracked files, $((bytes / 1024 / 1024)) MB tracked"
echo "$line"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$line" >> "$GITHUB_STEP_SUMMARY" || true
