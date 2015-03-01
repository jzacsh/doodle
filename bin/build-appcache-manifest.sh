#!/usr/bin/env bash
#
# Builds an $1.manifest file for $2/ web root directory.
#
# NOTE: Total hack - assumes *everything* aside from index.html, is to be in
# CACHE section.

(( BASH_VERSINFO[0] < 4 )) && exit 99  # panic and tear hair out
set -e
set -x

versionHash="$(npm run -s version)"


appCacheFileName="${1}.manifest"
webRootDir="$2"


pushd "$webRootDir"

# start cache file
touch "$appCacheFileName"
appCacheFile="$(readlink -f "$appCacheFileName")"
printf 'CACHE MANIFEST\n# auto built for v.%s\n\nCACHE:\n' \
    "$versionHash" > "$appCacheFile"

# auto populate it with everything
find $PWD -mindepth 1 -type f | while read assetPath; do
  asset="${assetPath/$PWD\/}"
  [ "$asset" = index.html ] && continue

  printf '%s\n' "$asset" >> "$appCacheFile"
done

popd >/dev/null
