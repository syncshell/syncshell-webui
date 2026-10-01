#!/bin/bash
set -euo pipefail

root=$(cd -- "$(dirname -- "$0")/.." && pwd)
runtime=$(mktemp -d -- "${TMPDIR:-/tmp}/syncshell-webui-test.XXXXXX")
fixture_pid=''

stop_fixture() {
	if [[ -n $fixture_pid ]]; then
		kill -TERM "$fixture_pid" 2>/dev/null || true
		wait "$fixture_pid" || true
	fi
}

remove_runtime() {
	if [[ ${SYNCSHELL_KEEP_TEST_RUNTIME:-0} != 1 ]]; then rm -rf -- "$runtime"; fi
}

cleanup() {
	stop_fixture
	remove_runtime
}

wait_for_fixture() {
	for _ in {1..300}; do
		[[ ! -f $runtime/peers/ready.json ]] || return 0
		if ! kill -0 "$fixture_pid"; then
			cat "$runtime/fixture.log"
			return 1
		fi
		sleep 0.1
	done
	cat "$runtime/fixture.log"
	return 1
}

start_fixture() {
	go -C tests/fixture test ./...
	go -C tests/fixture build -o "$runtime/fixture" .
	"$runtime/fixture" -fixture-assets "${SYNCSHELL_TEST_ASSETS:-$root/dist}" \
		-fixture-port "${SYNCSHELL_TEST_PORT:-18401}" \
		-runtime "$runtime/peers" >"$runtime/fixture.log" 2>&1 &
	fixture_pid=$!
	wait_for_fixture
}

run_acceptance_tests() {
	npm run test:browser
	node --test tests/live-acceptance.mjs
}

trap cleanup EXIT
cd -- "$root"
start_fixture
export SYNCSHELL_WEBUI_URL="http://127.0.0.1:${SYNCSHELL_TEST_PORT:-18401}"
export SYNCSHELL_TEST_RUNTIME="$runtime/peers/primary"
export SYNCSHELL_TEST_PEER="$runtime/peers/peer"
run_acceptance_tests
