#!/usr/bin/env bash
#
# For app name "$1", run nginx static file server of "$3" contents, on port "$2"
set -euo pipefail

appPort="$1"
staticFiles="$(readlink -f "${2:-$(pwd)}")"

(( $# < 1 )) && {
  printf 'usage: PORT [STATIC_FILES_DIR]\n' >&2
  exit 1
}

cd "$staticFiles"
set -x
python3 -m http.server "$appPort"
