#!/bin/bash
set -euo pipefail

[[ $1 != -- ]] || shift
if [[ $1 == */.syncshell-modern.* && $1 != *.previous && $2 == */syncshell-modern ]]; then
	exit 1
fi
exec "$SYNCSHELL_REAL_MV" -- "$@"
