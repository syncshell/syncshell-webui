#!/bin/bash
set -euo pipefail
archive=${1:?usage: test-release.sh /absolute/release.tar.gz}
root=$(cd -- "$(dirname -- "$0")/.." && pwd)
temporary=$(mktemp -d -- "${TMPDIR:-/tmp}/syncshell-release-test.XXXXXX")
trap 'rm -rf -- "$temporary"' EXIT
tar -xzf "$archive" -C "$temporary"
bundle=$(find "$temporary" -mindepth 1 -maxdepth 1 -type d)
mkdir -p -- "$temporary/gui/default"
printf 'owner default\n' >"$temporary/gui/default/index.html"
bash "$bundle/install.sh" "$temporary/gui"
printf 'obsolete\n' >"$temporary/gui/syncshell-modern/obsolete.js"
bash "$bundle/install.sh" "$temporary/gui"
[[ ! -e $temporary/gui/syncshell-modern/obsolete.js ]]
[[ $(<"$temporary/gui/default/index.html") == 'owner default' ]]
before=$(sha256sum "$temporary/gui/syncshell-modern/index.html")
mkdir "$temporary/bin"
export SYNCSHELL_REAL_MV
SYNCSHELL_REAL_MV=$(command -v mv)
# shellcheck disable=SC2016
printf '%s\n' '#!/bin/bash' '[[ $1 != -- ]] || shift' \
	'if [[ $1 == */.syncshell-modern.* && $1 != *.previous && $2 == */syncshell-modern ]]; then exit 1; fi' \
	'exec "$SYNCSHELL_REAL_MV" -- "$@"' >"$temporary/bin/mv"
chmod 700 "$temporary/bin/mv"
if PATH="$temporary/bin:$PATH" bash "$bundle/install.sh" "$temporary/gui"; then
	printf 'Simulated replacement failure was ignored\n' >&2
	exit 1
fi
[[ $(sha256sum "$temporary/gui/syncshell-modern/index.html") == "$before" ]]
printf 'corrupt\n' >>"$bundle/gui/syncshell-modern/index.html"
if bash "$bundle/install.sh" "$temporary/gui"; then
	printf 'Corrupt release was accepted\n' >&2
	exit 1
fi
[[ $(sha256sum "$temporary/gui/syncshell-modern/index.html") == "$before" ]]
SYNCSHELL_TEST_ASSETS="$temporary/gui/syncshell-modern" bash "$root/scripts/test-integration.sh"
