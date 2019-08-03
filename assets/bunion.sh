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

__bxn_controlled(){

  declare -a bxn_args=("${!1}")
  shift;

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
  bunion "${bxn_args[@]}" | "$@" | bunion
  rm "$bunion_uds_file"

}

__bxn_read_file(){

  echo "bxn read file: $@"
  return;

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
  bunion "$@" | bunion
  rm "$bunion_uds_file"
}

__bunny(){

  echo "bunny: $@"

  return;

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
  "$@" | bunion
  rm "$bunion_uds_file"

}


__bxn_contains(){

  first_arg="$1";
  shift;

  for v in "$@"; do
    if [[ "$v" == "$first_arg" ]]; then
        return 0;
    fi
  done;

  return 1;

}


bxn(){

 local all_args=( "$@" );
 local bxn_args=();

 for v in "$@"; do

  if [[ "$v" != '-'* ]]; then
      break;
  fi

    bxn_args+="$v";
    shift;

  done;


  # remaining_args_ln="$#";
  #
  # if [[ "$remaining_args_ln" == '0' ]]; then
  #    echo 'No remaining args - you need to pass a command for bunion to run.'
  #    return 1;
  # fi


  if __bxn_contains '-f' "${bxn_args[@]}" ; then
     __bxn_read_file "${all_args[@]}"
     return;
  fi

  if __bxn_contains '-c' "${bxn_args[@]}" ; then
     __bxn_controlled bxn_args[@] "$@"
     return;
  fi

   if __bxn_contains '--controlled' "${bxn_args[@]}" ; then
     __bxn_controlled bxn_args[@] "$@"
     return;
  fi


  __bunny "${all_args[@]}"

}



# bunion --read makes a tcp/uds connection to bunion_uds_file



if [[ "$all_export" == "nope" ]]; then
  set +a;
fi