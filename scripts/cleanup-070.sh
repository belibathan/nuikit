#!/usr/bin/env bash
# One-shot repo cleanup after the 0.7.0 checkpoint lands in lead/next.
# Closes PRs whose every commit is already on lead/next, and deletes branches fully contained in it.
# Needs: gh (logged in), and lead/next to contain #77. Dry run by default: pass --apply to do it.
set -euo pipefail
R=belibathan/nuikit
BASE=${BASE:-lead/next}
APPLY=${1:-}

echo "== PRs open against $R whose commits are all on $BASE"
for pr in $(gh api "repos/$R/pulls?state=open&per_page=100" --jq '.[].number'); do
  head=$(gh api "repos/$R/pulls/$pr" --jq '.head.ref')
  ahead=$(gh api "repos/$R/compare/$BASE...$head" --jq '.ahead_by' 2>/dev/null || echo "?")
  if [ "$ahead" = "0" ]; then
    echo "  #$pr ($head): superseded"
    if [ "$APPLY" = "--apply" ]; then
      gh api -X POST "repos/$R/issues/$pr/comments" -f body="Superseded: every commit here is already on \`$BASE\`, which ships to \`main\` as one 0.7.0 PR. Closing to keep the PR list honest." --silent
      gh api -X PATCH "repos/$R/pulls/$pr" -f state=closed --silent
    fi
  else
    echo "  #$pr ($head): KEEP ($ahead commit(s) not on $BASE)"
  fi
done

echo "== Branches fully contained in $BASE (deleted with --apply)"
KEEP='^(main|lead/next|next/combined|base/071|changeset-release/main|feat/(intents|services|adapter-spike|doctor|screens-071|blocks-071|lead-backlog))$'
# Superseded by content that reached lead/next another way (checked by hand, Oct 21):
#   lead/design-v2, next/design-v2: only merge commits of feat/identity + feat/hud-v2 (both rebased into lead/next)
#   next/blocks: 0.5.0-era commits, released in 0.5.0
#   feat/screens-menu-row-cleanup: PR #61, superseded by #73 (feat/screens-070)
SUPERSEDED='^(lead/design-v2|next/design-v2|next/blocks|feat/screens-menu-row-cleanup)$'
for b in $(gh api "repos/$R/branches?per_page=100" --paginate --jq '.[].name'); do
  if echo "$b" | grep -Eq "$KEEP"; then continue; fi
  ahead=$(gh api "repos/$R/compare/$BASE...$b" --jq '.ahead_by' 2>/dev/null || echo "?")
  if echo "$b" | grep -Eq "$SUPERSEDED"; then ahead=0; fi
  if [ "$ahead" = "0" ]; then
    echo "  $b: contained"
    [ "$APPLY" = "--apply" ] && gh api -X DELETE "repos/$R/git/refs/heads/$b" --silent
  else
    echo "  $b: KEEP ($ahead commit(s) not on $BASE)"
  fi
done

echo "== Issue #53 (agent bus, retired)"
if [ "$APPLY" = "--apply" ]; then
  gh api -X POST "repos/$R/issues/53/comments" -f body="The agent bus is retired (docs/next/dispatch.md). Closing." --silent
  gh api -X PATCH "repos/$R/issues/53" -f state=closed --silent
fi
[ "$APPLY" = "--apply" ] || echo "(dry run; re-run with --apply)"
