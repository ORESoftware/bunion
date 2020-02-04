#!/usr/bin/env sh

set -e;

if [[ "$bunion_skip_postinstall" = "yes" ]]; then
    echo "skipping postinstall routine.";
    exit 0;
fi

export FORCE_COLOR=1;
export bunion_skip_postinstall="yes";

mkdir -p "$HOME/.oresoftware/bin" || {
  echo "Could not create .oresoftware dir in user home.";
  exit 1;
}

is_file_older_than() {

  seconds="$1"
  file="$2"

  modified_secs="$(date -r "$file" +%s)"
  current_secs="$(date +%s)"

  diff="$(expr "$current_secs" - "$modified_secs")"

  if [[ "$diff" -gt "$seconds" ]]; then
    return 0
  fi

  return 1

}

(

  curl_url='https://raw.githubusercontent.com/oresoftware/run-tsc-if/master/install.sh'

  if ! is_file_older_than 50000; then
       exit 0;
  fi

  curl  -H 'Cache-Control: no-cache' -s -S -o- "$curl_url" | sh || {
     echo 'Could not install run-tsc-if on your system. That is a problem.';
     exit 1;
  }

) 2> /dev/null