#!/usr/bin/env bash


while true; do
  sleep 0.1
  echo "$(uuidgen)";
  echo '["@bunion:1",4444]';
  echo '["@bunion", "app", "INFO", 3333, "localhost", "date", {}, "args"]'
done;