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

  local cmd="$1";
  shift;

  if ! which "$cmd"  &> /dev/null && ! type cmd &> /dev/null; then
    echo "The following command is not recognized: $cmd"
    echo "You need to run something like this: 'bxn --controlled your-command'";
    echo "where 'your-command' is an available program on the system path. You can use either -c or --controlled, it is the same flag.";
    return 1;
  fi

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
  bunion "${bxn_args[@]}" | "$cmd" "$@" | bunion
  rm -f "$bunion_uds_file"

}

__bxn_read_file(){

  local file_path="$(__bxn_get_next '-f' "$@")";

  if [[ ! -f "$file_path" ]]; then
    echo 'You need go pass an actual file after the -f flag.';
    return 1;
  fi

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
  bunion "$@" | bunion
  rm "$bunion_uds_file"
}

__bunny(){

  local cmd="$1";
  shift;

  if ! which "$cmd"  &> /dev/null && ! type cmd &> /dev/null; then
    echo "The following command is not recognized: $cmd"
    echo "You need to run something like this: 'bxn your-command'";
    echo "where 'your-command' is an available program on the system path.";
    return 1;
  fi

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
  "$cmd" "$@" | bunion
  rm "$bunion_uds_file"

}


__bxn_get_next(){

   ## get value after a flag, such as -f <file>
   ## e.g.    __bxn_get_next '-f' "$@"

  local search_key="$1"
  shift;
  local stop='false'

  for v in "$@"; do

   if test "$stop" == 'true'; then
     echo "$v"
     break;
   fi

   if test "$v" == "$search_key"; then
    stop='true'
   fi

  done;

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


  remaining_args_ln="$#";

   if [[ "$remaining_args_ln" == '0' ]]; then
      echo 'No remaining args - you need to pass a command for bunion to run.'
      bunion;
      return;
   fi


  __bunny "${all_args[@]}"

}



# bunion --read makes a tcp/uds connection to bunion_uds_file



if [[ "$all_export" == "nope" ]]; then
  set +a;
fi