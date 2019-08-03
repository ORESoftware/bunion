#!/usr/bin/env node

if (process.argv.indexOf('-f') > 1) {
  require('../dist/read-file.js');
  return;
}

if (process.argv.indexOf('-c') > 1 || process.argv.indexOf('--controlled') > 1) {
  require('../dist/read-file.js');
  return;
}


require('../dist/cli.js');

