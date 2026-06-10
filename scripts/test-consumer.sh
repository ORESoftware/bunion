#!/usr/bin/env bash
#
# test-consumer.sh [N]
#
# Self-cleaning, non-interactive smoke/throughput test for the bunion consumer (dist/consumer/cli.js).
#
# Generates N log lines (default 200000 -- enough to exceed the 4000-line in-memory window and push the
# raw-file byte offset well past 1e6, exercising the async write path + the fixed-width index format),
# pipes them through the consumer, and asserts:
#   * the consumer exits 0,
#   * stdout has ~N rendered lines,
#   * stderr contains no uncaught exceptions / unhandled rejections,
#   * no "Index record exceeds the N-byte slot" warning (validates the index-slot guard at large offsets).
#
# Everything (run dirs, raw/index files, the .bunion.sock) is contained by pointing HOME at a temp dir,
# which is removed on exit -- the real ~/.bunion is never touched.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT/dist/consumer/cli.js"
N="${1:-200000}"

if [[ ! -f "$CLI" ]]; then
  echo "ERROR: $CLI not found. Build first:  npx -p typescript tsc -p tsconfig.json" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/bunion-test.XXXXXX")"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

OUT="$WORK/rendered.out"
ERR="$WORK/consumer.err"

echo "==> generating $N lines and piping through the consumer (HOME=$WORK)"

start=$(date +%s)
set +e
# IMPORTANT: the env vars must be attached to the `node` command (right of the pipe), not the generator.
# In a shell pipeline `VAR=x a | b`, VAR applies only to `a`. Putting HOME / bunion_* on the generator
# (as an earlier version did) means the consumer never sees them: it would skip the force-exit and sit
# in SEARCHING mode forever, and write its run dir under the real $HOME instead of the temp dir.
( cd "$WORK" && \
  bash "$ROOT/scripts/gen-logs.sh" "$N" \
    | HOME="$WORK" \
      bunion_force_exit_on_stdin_end_event=yes \
      bunion_uds_file="$WORK/.bunion.sock" \
      node "$CLI" >"$OUT" 2>"$ERR" )
code=$?
set -e
end=$(date +%s)

elapsed=$(( end - start ))
[[ "$elapsed" -lt 1 ]] && elapsed=1
rendered=$(wc -l < "$OUT" | tr -d ' ')

echo "==> exit code:        $code"
echo "==> rendered lines:   $rendered (expected ~$N)"
echo "==> elapsed:          ${elapsed}s  (~$(( N / elapsed )) lines/s)"

fail=0
check() { # desc, condition-already-evaluated($1=0 ok)
  if [[ "$2" -eq 0 ]]; then echo "  PASS - $1"; else echo "  FAIL - $1"; fail=1; fi
}

[[ "$code" -eq 0 ]]; check "consumer exited 0" $?
[[ "$rendered" -ge $(( N * 9 / 10 )) ]]; check "rendered >= 90% of input" $?
! grep -q "Uncaught exception" "$ERR"; check "no uncaught exceptions" $?
! grep -q "Unhandled rejection" "$ERR"; check "no unhandled rejections" $?
! grep -q "Index record exceeds" "$ERR"; check "no index-slot overflow" $?

# Show any genuinely unexpected stderr (the missing-.bunion.js config warning is expected & filtered out).
unexpected=$(grep -v "Missing \".bunion.js\"" "$ERR" | grep -iE "error|exception|rejection" || true)
if [[ -n "$unexpected" ]]; then
  echo "==> note: stderr matches for error/exception/rejection:"
  echo "$unexpected" | head -10 | sed 's/^/     /'
fi

if [[ "$fail" -eq 0 ]]; then
  echo "==> ALL CHECKS PASSED"
else
  echo "==> SOME CHECKS FAILED" >&2
fi
exit "$fail"
