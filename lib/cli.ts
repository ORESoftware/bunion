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
    names: ['help'],
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
  },
  {
    names: ['match', 'or'],
    type: 'arrayOfString',
    default: [] as Array<string>
  },
  {
    names: ['must-match', 'and'],
    type: 'arrayOfString',
    default: [] as Array<string>
  },
  {
    names: ['highlight'],
    type: 'bool',
    default: true
  },
  {
    names: ['no-highlight'],
    type: 'bool',
    default: false
  },
  {
    names: ['dark'],
    type: 'bool',
    default: true
  },
  {
    names: ['light'],
    type: 'bool',
    default: false
  },
  {
    names: ['background', 'bg'],
    type: 'string',
    default: 'dark'
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

const flattenDeep = function (a: Array<string>): Array<string> {
  return a.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};

const level = opts.level;
const output = opts.output;
const maxLevel = String(level || 'trace').toUpperCase();
const maxIndex = ordered.indexOf(maxLevel);
const andMatches = flattenDeep([opts.must_match]).filter(v => v).map(v => new RegExp(v, 'g'));
const orMatches = flattenDeep([opts.match]).filter(v => v).map(v => new RegExp(v, 'g'));
const highlight = opts.highlight || opts.no_highlight !== true;

if (maxIndex < 0) {
  throw new Error('Your value for env var "bunion_max_level" is not set to a valid value (\'WARN\' | \'INFO\' | \'DEBUG\' | \'ERROR\' | \'TRACE\')');
}

const matches = function (v: string) {
  if (orMatches.length < 1) {
    return true;
  }
  
  return orMatches.some(function (m) {
    return m.test(v);
  });
};

const mustMatches = function (v: string) {
  return andMatches.every(function (m) {
    return m.test(v);
  });
};

const allMatches = andMatches.concat(orMatches);

const getHighlightedString = function (str: string) {
  return allMatches.reduce(function (s, r) {
    return s.replace(r, function replacer(match, p1, p2, p3, offset, string) {
      // p1 is nondigits, p2 digits, and p3 non-alphanumerics
      return chalk.magentaBright.bold(match);
    });
  }, str);
};

const getFields = function(fields: any){
  return Object.keys(fields).reduce(function(s, k){
      return s+= `(${k}=${String(fields[k])}) `;
  },'');
  
};

console.log('max level:',maxLevel);
console.log('all matches:',allMatches);

process.stdin.resume().pipe(createParser())
.on('bunion-json', function (v: BunionJSON) {
  
  if (!(matches(v.value) && mustMatches(v.value))) {
    return;
  }
  
  let fields = '';
  
  if (highlight) {
    v.value = getHighlightedString(v.value);
  }
  
  if(v.fields){
    fields = getFields(v.fields);
  }
  
  if (v.level === 'FATAL') {
    process.stderr.write(`${v.date} ${v.appName} ${chalk.redBright(v.level)} ${chalk.black(fields)} ${chalk.red.bold(v.value)} \n`);
    return;
  }
  
  if (v.level === 'ERROR' && maxIndex < 5) {
    process.stderr.write(`${v.date} ${v.appName} ${chalk.redBright(v.level)} ${chalk.black(fields)} ${chalk.whiteBright.bold(v.value)} \n`);
    return;
  }
  
  if (v.level === 'WARN' && maxIndex < 4) {
    process.stderr.write(`${v.date} ${v.appName} ${chalk.magentaBright(v.level)} ${chalk.black(fields)} ${chalk.black.bold(v.value)} \n`);
    return;
  }
  
  if (v.level === 'DEBUG' && maxIndex < 3) {
    process.stdout.write(`${v.date} ${v.appName} ${chalk.yellowBright.bold(v.level)} ${chalk.black(fields)} ${chalk.yellow(v.value)} \n`);
    return;
  }
  
  if (v.level === 'INFO' && maxIndex < 2) {
    process.stdout.write(`${v.date} ${v.appName} ${chalk.cyan(v.level)} ${chalk.black(fields)} ${chalk.cyan.bold(v.value)} \n`);
    return;
  }
  
  if (v.level === 'TRACE' && maxIndex < 1) {
    process.stdout.write(`${v.date} ${v.appName} ${chalk.gray(v.level)} ${chalk.black(fields)} ${chalk.gray(v.value)} \n`);
    return;
  }
  
});