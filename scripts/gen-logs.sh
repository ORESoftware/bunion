#!/usr/bin/env bash
#
# gen-logs.sh N
#
# Emit N bunion array-format log lines to stdout (fast, via awk). Cycles through all log levels
# and sprinkles a searchable "SPECIAL_TOKEN" every 1000 lines so the consumer's search ('p' then
# type, spacebar / ctrl-a to jump between matches) has something to find.
#
#   bash scripts/gen-logs.sh 50000 | node dist/consumer/cli.js     # interactive scroll/search
#
set -euo pipefail

N="${1:-100000}"

awk -v n="$N" 'BEGIN {
  split("TRACE DEBUG INFO WARN ERROR FATAL", L, " ");
  for (i = 1; i <= n; i++) {
    lvl = L[(i % 6) + 1];
    needle = (i % 1000 == 0) ? " SPECIAL_TOKEN" : "";
    printf("[\"@bunion\",\"app\",\"%s\",4444,\"localhost\",\"2024-01-01\",null,\"log line %d%s\"]\n", lvl, i, needle);
  }
}'
