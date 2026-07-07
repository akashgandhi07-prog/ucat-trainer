#!/usr/bin/env bash
# Snapshot the entire workspace (root trainer app + nested uk/ planner repo,
# including both .git histories and any uncommitted work) to a timestamped
# tarball. node_modules and build output are excluded, so archives stay small.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$HOME/Backups/ucat-trainer}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/ucat-trainer-$STAMP.tgz"

mkdir -p "$DEST"
tar -czf "$OUT" \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  -C "$(dirname "$ROOT")" \
  "$(basename "$ROOT")"

echo "Backup written: $OUT ($(du -h "$OUT" | cut -f1))"
