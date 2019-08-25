#!/usr/bin/env node

// console.log('process argv:', process.argv);

if (process.argv.indexOf('-f') > 1) {
  require('../dist/read-file/read-file.js');
  return;
}

if (process.argv.indexOf('-c') > 1 || process.argv.indexOf('--controlled') > 1) {
  require('../dist/controlled/controlled-input.js');
  return;
}

if(process.stdin.isTTY){
  throw 'Cannot run from TTY';
}

require('../dist/consumer/cli.js');

