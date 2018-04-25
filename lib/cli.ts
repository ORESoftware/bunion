#!/usr/bin/env node
'use strict';

import chalk from 'chalk';
import {createParser} from "./json-parser";
import {BunionJSON, log, ordered} from "./index";
const dashdash = require('dashdash');

const options = [
  {
    name: 'version',
    type: 'bool',
    help: 'Print tool version and exit.'
  },
  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'Print this help and exit.'
  },
  {
    names: ['verbose', 'v'],
    type: 'arrayOfBool',
    help: 'Verbose output. Use multiple times for more verbose.'
  },
  {
    names: ['level', 'l'],
    type: 'string',
    default: 'trace'
  },
  {
    names: ['output', 'o'],
    type: 'string',
    default: 'short'
  }
];

let opts, parser = dashdash.createParser({options: options});

try {
   opts = parser.parse(process.argv);
} catch (e) {
  log.error('bunion: error: %s', e.message);
  process.exit(1);
}


// Use `parser.help()` for formatted options help.
if (opts.help) {
  const help = parser.help({includeEnv: true}).trimRight();
  console.log('usage: node foo.js [OPTIONS]\n' + 'options:\n' + help);
  process.exit(0);
}

const level = opts.level;
const output = opts.output;
const maxLevel = String(level || 'trace').toUpperCase();
const maxIndex = ordered.indexOf(maxLevel);

if (maxIndex < 0) {
  throw new Error('Your value for env var "bunion_max_level" is not set to a valid value (\'WARN\' | \'INFO\' | \'DEBUG\' | \'ERROR\' | \'TRACE\')');
}


process.stdin.resume().pipe(createParser())
.on('bunion-json', function (v: BunionJSON) {
  // console.log(v.date, v.appName, v.level, v.value);
  
  if(v.level === 'ERROR'){
    process.stderr.write(`${v.date} ${v.appName} ${chalk.red(v.level)} ${chalk.black.bold(v.value)} \n`);
    return;
  }
  
  if(v.level === 'WARN' && maxIndex < 4){
    process.stderr.write(`${v.date} ${v.appName} ${chalk.magentaBright(v.level)} ${chalk.black.bold(v.value)} \n`);
    return;
  }
  
  if(v.level === 'DEBUG' && maxIndex < 3){
    process.stdout.write(`${v.date} ${v.appName} ${chalk.gray(v.level)} ${chalk.blue(v.value)} \n`);
    return;
  }
  
  if(v.level === 'INFO' && maxIndex < 2){
    process.stdout.write(`${v.date} ${v.appName} ${chalk.gray(v.level)} ${chalk.cyan.bold(v.value)} \n`);
    return;
  }
  
  if(v.level === 'TRACE' && maxIndex < 1){
    process.stdout.write(`${v.date} ${v.appName} ${chalk.gray(v.level)} ${chalk.gray(v.value)} \n`);
    return;
  }
  
});