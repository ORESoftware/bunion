#!/usr/bin/env node

const path = require('path');
const cp = require('child_process');


if (process.env.oresoftware_dev === 'yes') {
  const projectRoot = path.dirname(__dirname);
  // const {run} = require('./run-tsc-if-script');
  // cp.execSync(run(projectRoot));
  console.log('in the future, run tsc here.')
}


if (process.argv.indexOf('-f') > 1) {
  require('../dist/read-file/read-file.js');
  return;
}

if (process.argv.indexOf('-c') > 1 || process.argv.indexOf('--controlled') > 1) {
  require('../dist/controlled/controlled-input.js');
  return;
}

if (process.stdin.isTTY) {
  throw 'Cannot run from TTY';
}

require('../dist/consumer/cli.js');

