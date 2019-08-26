#!/usr/bin/env bash

set -e;

if [[ "$skip_postinstall" == "yes" ]]; then
    echo "skipping postinstall routine.";
    exit 0;
fi

if [[ "$skip_postinstall" == "yes" ]]; then
    echo "skipping postinstall routine.";
    exit 0;
fi

export FORCE_COLOR=1;
export skip_postinstall="yes";

mkdir -p "$HOME/.oresoftware/bin" || {
  echo "Could not create .oresoftware dir in user home.";
  exit 1;
}

(
  echo 'Installing run-tsc-if on your system.';
  curl  -H 'Cache-Control: no-cache' -s -S -o- https://raw.githubusercontent.com/oresoftware/run-tsc-if/master/install.sh | bash || {
     echo 'Could not install run-tsc-if on your system. That is a problem.';
     exit 1;
  }
) 2> /dev/null