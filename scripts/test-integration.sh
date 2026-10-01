#!/bin/bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")/.." && pwd)
runtime=$(mktemp -d -- "${TMPDIR:-/tmp}/syncshell-webui-test.XXXXXX")
fixture_pid=''
cleanup() {
  if [[ -n $fixture_pid ]]; then
    kill -TERM "$fixture_pid" 2>/dev/null || true
    wait "$fixture_pid" || true
  fi
  if [[ ${SYNCSHELL_KEEP_TEST_RUNTIME:-0} != 1 ]]; then rm -rf -- "$runtime"; fi
}
trap cleanup EXIT
cd -- "$root"
go -C tests/fixture test ./...
go -C tests/fixture build -o "$runtime/fixture" .
"$runtime/fixture" -fixture-assets "${SYNCSHELL_TEST_ASSETS:-$root/dist}" \
  -fixture-port "${SYNCSHELL_TEST_PORT:-18401}" -runtime "$runtime/peers" >"$runtime/fixture.log" 2>&1 &
fixture_pid=$!
for _ in {1..300}; do
  [[ ! -f $runtime/peers/ready.json ]] || break
  kill -0 "$fixture_pid" || { cat "$runtime/fixture.log"; exit 1; }
  sleep 0.1
done
[[ -f $runtime/peers/ready.json ]] || { cat "$runtime/fixture.log"; exit 1; }
export SYNCSHELL_WEBUI_URL="http://127.0.0.1:${SYNCSHELL_TEST_PORT:-18401}"
export SYNCSHELL_TEST_RUNTIME="$runtime/peers/primary"
export SYNCSHELL_TEST_PEER="$runtime/peers/peer"
npm run test:browser
node tests/live-auth.mjs
node tests/live-config.mjs
node tests/live-versions.mjs
node --test tests/installed.mjs
