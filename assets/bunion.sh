


bxn2(){
  export bunion_socks="$HOME/.bunion/sockets"
  mkdir -p "$bunion_socks";
  export bunion_uds_file="$bunion_socks/$(date +%s%N).sock";
  bunion --read | "$@" | bunion
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


export -f bunny;
export -f bxn;
