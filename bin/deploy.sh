#!/usr/bin/env bash
#
# Deploys the current build to github.io pages

(( BASH_VERSINFO[0] < 4 )) && exit 99  # panic and tear hair out
set -e
set -x



#
# basic info and tools...
#

popdBranch="$(git symbolic-ref --short HEAD)"
repoDir="$(npm root)"
repoDir="${repoDir%/node_modules}"
pushTarget=origin

# returns 1 if there is stuff uncommitted, or untracked in the repo
isRepoDirty() {
  test -n "$(git diff --shortstat 2>&1)" ||
    test -n "$(git status --porcelain 2>&1)"
}

# Prints commit message for the gh-pages commit being made, given args:
# - $1 git version tag
buildDeployCommitMsg() {
  printf 'automatic github pages deploy, built from tree/%s v.%s' \
      "$popdBranch" \
      "$1"
}

# Prints the URL `git remote` reports for the origin deployed to
getRemoteUrl() {
  git remote --verbose | \
    grep "$pushTarget*(push)\$" | \
    sed -e 's/\s/\t/g' | \
    cut -f 2
}



#
# actual deploy steps...
#


cd "$repoDir"  # ensure we're at the root of the repo

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

mkTmpTemplate="$(basename "$repoDir")-deploy-v${versionDeploy}"


# setup somewhere else, don't want to make a mess of current repo
tempRepo="$(mktemp -d -t "${mkTmpTemplate}-repo.XXXXXXX")"
git clone "$repoDir" "$tempRepo"
cd "$tempRepo"
git checkout "$popdBranch"
buildTarBall="$(mktemp -t "${mkTmpTemplate}.XXXXXXX.tgz")"
# TODO(zacsh) Figure out how to get this from npm directly (in npm run scripts
# this is $npm_package_config_temp/, but not accessible via `npm config`
# command...)
npm install > /dev/null # too noisy
npm run clean
npm run build
cd tmp/
tar -zcvf "$buildTarBall" ./*

git checkout gh-pages

# clean house
git ls-files --others -i --exclude-standard | while read file; do
  rm -v "$file"  # git is so fng complicated stackoverflow.com/a/15931542
done
git clean -d --force -x  # rm untracked files and such
git rm -rf *

# unpack assets to top-level dir ./
tar -xvf "$buildTarBall"
git add .
git commit -a -m "$(buildDeployCommitMsg)"
ghPagesDeployHash="$(git rev-parse HEAD)"
git push "$pushTarget" gh-pages

git checkout "$popdBranch"

# cleanup after ourselves
rm -v "$buildTarBall"
rm -rfv "$tempRepo"

printf '\n\nDeploy pushed: %s/tree/%s\n' "$(getRemoteUrl)" "$ghPagesDeployHash"
