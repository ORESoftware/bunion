#!/usr/bin/env bash

set -eo pipefail;

if [[ -f "$(cd .. && pwd)/go.mod" ]]; then
    cd ..
fi

if [[ -f "$PWD/json-logging/go.mod" ]]; then
    cd "$PWD/json-logging"
fi

echo 'compiling to make sure it works...'
tsc -p tsconfig.json
echo 'done compiling with tsc'

ssh-add -D
ssh-add ~/.ssh/id_ed25519

combined=""
for arg in "${@}"; do
  combined="${combined} ${arg}"
done

trimmed="$(echo "$combined" | xargs)"

if test "${trimmed}" == '' ; then
  trimmed="squash-me";
fi

git add .
git add -A
git commit -am "${trimmed}" || {
  echo "could not create a new commit"
}

git push origin || {
  echo
}

#git push gitlab || {
#  echo
#}