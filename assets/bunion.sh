#!/usr/bin/env bash


all_export="yep";

if [[ ! "$SHELLOPTS" =~ "allexport" ]]; then
    all_export="nope";
    set -a;  # we export every declared function using this flag
fi


export bunion_install_root="$(cd "$(dirname $(dirname "$BASH_SOURCE"))" && pwd)"


bxn_resource(){
 . "$BASH_SOURCE"
}


bxn_remove_old_runs(){
 rm -rf "$HOME/.bunion/runs/"*
}

bxn_controlled(){
  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(date +%s%N).sock";
  bunion --controlled | "$@" | bunion
  rm "$bunion_uds_file"
}

bxn_read_file(){
  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(date +%s%N).sock";
  bunion -f "$1" | bunion
  rm "$bunion_uds_file"
}

bunny(){
  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(date +%s%N).sock";
  "$@" | bunion
  rm "$bunion_uds_file"
}

# bunion --read makes a tcp/uds connection to bunion_uds_file



if [[ "$all_export" == "nope" ]]; then
  set +a;
fi