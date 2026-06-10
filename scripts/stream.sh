#!/usr/bin/env bash
#
# stream.sh [delay_seconds]
#
# Continuously emit bunion array-format log lines to stdout, forever, until killed.
# This is the "foo" in `foo | bunion` when you want a live, never-ending stream to watch
# bunion tail / pause / scroll / search against.
#
#   bash scripts/stream.sh | bunion          # ~5 lines/sec (default delay 0.2s)
#   bash scripts/stream.sh 0.01 | bunion      # ~100 lines/sec
#   bash scripts/stream.sh 1 | bunion         # 1 line/sec
#
# Cycles through all log levels and emits a searchable "SPECIAL_TOKEN" every 20 lines.
# Stop it by quitting bunion (double ctrl-c) or ctrl-c here; the SIGPIPE ends the loop.
set -uo pipefail

delay="${1:-0.2}"
levels=(TRACE DEBUG INFO WARN ERROR FATAL)
i=0

while true; do
  i=$((i + 1))
  lvl="${levels[$((i % 6))]}"
  needle=""
  (( i % 20 == 0 )) && needle=" SPECIAL_TOKEN"
  printf '["@bunion","app","%s",%d,"localhost","%s",null,"event %d%s"]\n' \
    "$lvl" "$$" "$(date -u +%FT%TZ)" "$i" "$needle"
  sleep "$delay"
done
