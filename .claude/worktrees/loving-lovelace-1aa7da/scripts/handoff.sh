#!/usr/bin/env bash
# Handoff: stage everything, commit, push, print the next-session resume hint.
# Usage: bash scripts/handoff.sh "[TRACK] area: imperative message"
# Run this when context is getting tight OR when NEXT TASK is done.
set -euo pipefail

msg="${1:-[WIP] handoff: end of session}"

# Warn if prompt.md looks stale (not in the diff). Not fatal — trunk moves fast.
if ! git status --porcelain | grep -Eq '(^|\s)prompt\.md$'; then
  echo "WARN: prompt.md is not in staged/unstaged changes."
  echo "      Did you update LAST SESSION SUMMARY / NEXT TASK?"
fi

git add -A

if git diff --cached --quiet; then
  echo "Nothing to commit. Skipping commit + push."
else
  git commit -m "$msg"
  git push
fi

hash=$(git rev-parse --short HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)

echo ""
echo "Handed off at ${hash} on ${branch}. Pushed."
echo ""
echo "Next session: paste the QUICK-RESUME PROMPT from prompt.md as the first message."
