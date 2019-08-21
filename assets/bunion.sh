#!/usr/bin/env bash


all_export="yep";

if [[ ! "$SHELLOPTS" =~ "allexport" ]]; then
    all_export="nope";
    set -a;  # we export every declared function using this flag
fi


export bunion_install_root="$(cd "$(dirname $(dirname "$BASH_SOURCE"))" && pwd)"


b4n(){
 :::
}

bxn_resource(){
 . "$BASH_SOURCE"
}


bxn_remove_old_runs(){
 rm -rf "$HOME/.bunion/runs/"*
 rm -rf "$HOME/.bunion/sockets/"*
}

__bxn_controlled(){

  local bxn_args_local=( "${!1}" )
  shift;

  local cmd="$1";
  shift;

  if [[ -z "$cmd" ]]; then
      echo 'No command argument - you need to pass a command to run.'
      return 1;
  fi

  if ! command -v "$cmd"  &> /dev/null && ! type cmd &> /dev/null; then
    if [[ ! -x "$cmd" ]]; then
      echo "The following command is not recognized: '$cmd'"
      echo "You need to run something like this: 'bxn --controlled your-command'";
      echo "where 'your-command' is an available program on the system path. You can use either -c or --controlled, it is the same flag.";
      echo 'Also, make sure the file is executable, and has the appropiate hashbang/shebang header.';
      return 1;
     fi
  fi

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
   # --ignore-controlled "${bxn_args[@]}"
  bunion -c "${bxn_args_local[@]}" | "$cmd" "$@" 2>&1 | bunion || rm -f "$bunion_uds_file" &&  rm -f "$bunion_uds_file"
}

__bxn_read_file(){

  echo 'reading file'

  local file_path="$(__bxn_get_next '-f' "$@")";

#  if [[ -L "$file_path" ]]; then
#     file_path="$(readlink "$file_path")";
#  fi

 if [[ ! -e "$file_path" ]]; then
    echo "You need to pass a file after the -f flag. The file path was: '$file_path'."
    echo 'This path did not appear to exist on the filesystem.';
    return 1;
  fi

#  if [[ ! -f "$file_path" ]]; then
#    echo "You need to pass a file after the -f flag. The resolved file path was: '$file_path'."
#    echo 'This path did not appear to exist on the filesystem.';
#    return 1;
#  fi

  export bxn_file_path="$file_path";

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
  bunion "$@" | bunion || rm -f "$bunion_uds_file" && rm -f "$bunion_uds_file"
}

__bunny(){

  local cmd="$1";
  shift;

  if ! command -v "$cmd"  &> /dev/null && ! type cmd &> /dev/null; then
      if [[ ! -x "$cmd" ]]; then
        echo "The following command is not recognized: '$cmd'"
        local fp="$(readlink "$cmd")"
        if [[ -f "$fp" ]] || [[ -f "$cmd" ]]; then
           echo "You passed in a file as the argument: 'bxn <file>'";
           echo "If you meant to have a controlled tailing of this file, then use the -f flag as in: 'bxn -f <file>'";
           return 1;
        fi
        echo "You need to run something like this: 'bxn your-command'";
        echo "where 'your-command' is an available program on the system path.";
        echo 'Also, make sure the file is executable, and has the appropiate hashbang/shebang header.';
        return 1;
      fi
  fi

  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(uuidgen).sock";
  "$cmd" "$@" | bunion || rm -f "$bunion_uds_file" && rm -f "$bunion_uds_file"
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
 local bxn_args=( );

 for v in "$@"; do

  if [[ "$v" != '-'* ]]; then
      break;
  fi

    bxn_args+=( "$v" );
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

     if [[ -t 0 ]]; then
       echo 'bxn: You passed no arguments to bxn, and ran it directly from a terminal.';
       echo 'bxn: You have two options:'
       echo '1. something like `echo foo | bxn`'
       echo '2. or something like: `bxn node app.js`'
       return 1;
     fi

      bunion;
      return;
   fi

  __bunny "${all_args[@]}"

}



# bunion --read makes a tcp/uds connection to bunion_uds_file



if [[ "$all_export" == "nope" ]]; then
  set +a;
fi