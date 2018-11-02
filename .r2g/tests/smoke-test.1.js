#!/usr/bin/env node
'use strict';

/*

 the files in .r2g/tests will be copied to this location:

 $HOME/.r2g/temp/project/tests/*

 they do not need to be .js files, but they need to have a hashbang,
 so that r2g knows how to run the file.
 
 the test files in .r2g/tests can load non-test files from .r2g/fixtures.

*/


const assert = require('assert');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const fs = require('fs');
const EE = require('events');


process.on('unhandledRejection', (reason, p) => {
  // note: unless we force process to exit with 1, process may exit with 0 upon an unhandledRejection
  console.error(reason);
  process.exit(1);
});


// your test goes here
// assert.strictEqual(true, false, 'whoops');

const k = cp.spawn('bash');

// log.error(new Error('foo'));

k.stdin.end('node -e "' + `
    const {log} = require('bunion');
    log.info('just saying hi.');
    log.warn('shit hit the fan');
    log.error('burrito');
` + '"');




k.stdout
  .pipe(process.stdout);


// TODO: the following does not seem to log anything to stdout, whereas the above does?

k.stdout
  .pipe(cp.spawn('bunion').stdin)
  .pipe(process.stdout);
