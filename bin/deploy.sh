#!/usr/bin/env bash
#
# Deploys the current build to github.io pages

(( BASH_VERSINFO[0] < 4 )) && exit 99  # panic and tear hair out
set -e
set -x



#
# basic info and tools...
#

POPD_BRANCH="$(git symbolic-ref --short HEAD)"
REPO_DIR="$(npm root)"
REPO_DIR="${REPO_DIR/node_modules\$/}"
PUSH_TARGET=origin

# returns 1 if there is stuff uncommitted, or untracked in the repo
isRepoDirty() {
  test -n "$(git diff --shortstat 2>&1)" ||
    test -n "$(git status --porcelain 2>&1)"
}

# Prints commit message for the gh-pages commit being made, given args:
# - $1 git version tag 
buildDeployCommitMsg() {
  printf 'automatic github pages deploy, built from tree/%s v.%s' \
      "$POPD_BRANCH" \
      "$1"
}

# Prints the URL `git remote` reports for the origin deployed to
getRemoteUrl() {
  git remote --verbose | \
    grep "$PUSH_TARGET.*(push)\$" | \
    sed -e 's/\s/\t/g' | \
    cut -f 2
}



#
# actual deploy steps...
#


cd $REPO_DIR  # ensure we're at the root of the repo

npm run clear
npm run build

versionDeploy="$(npm run -s version)"
if isRepoDirty;then
  if [ "$1" = -p ];then
    printf 'NOT IMPLEMENTED: -p(rompt) to force deploy\n' >&2
    exit 99
  else
    printf 'Must fix before deploying: repo is dirty or has untracked files.\n' >&2
    exit 1
  fi
fi

buildTarBall="$(mktemp -t "$(basename "$REPO_DIR")-deploy-v${versionDeploy}.XXXXXXX.tgz")"
# TODO(zacsh) Figure out how to get this from npm directly (in npm run scripts
# this is $npm_package_config_temp/, but not accessible via `npm config`
# command...)
cd tmp/
tar -zcvf "$buildTarBall" ./*

git checkout gh-pages
git rm -rf *
tar -xvf "$buildTarBall"
rm -v "$buildTarBall"
git add .
git commit -a -m "$(buildDeployCommitMsg)"
ghPagesDeployHash="$(git rev-parse HEAD)"
git push "$REMOTE_TARGET" gh-pages

git checkout "$POPD_BRANCH"

printf '\n\nDeploy pushed: %s/tree/%s\n' "$(getRemoteUrl)" "$ghPagesDeployHash"
