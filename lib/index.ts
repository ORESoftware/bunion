'use strict';

import util = require('util');
import chalk from 'chalk';
const appName = 'cdt-oplog-server';

export interface BunionJSON {
  '@bunion': true,
  level: 'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE',
  value: string,
  date: number,
  appName: string
}

export const ordered = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
const maxLevel = String(process.env.bunion_max_level || 'trace').toUpperCase();
const maxIndex = ordered.indexOf(maxLevel);

if (maxIndex < 0) {
  throw new Error('Your value for env var "bunion_max_level" is not set to a valid value (\'WARN\' | \'INFO\' | \'DEBUG\' | \'ERROR\' | \'TRACE\')');
}

const getJSON = function (level: string, args: any[]) {
  
  const clean = args.map(function (a) : string {
    
    if (typeof a === 'string') {
      return a;
    }
    
    if(a && a.message && a.stack && typeof a.stack === 'string'){
      return ' (see below) \n\n' + a.stack.split('\n')
      .map((v: string, i: number) => (i === 0  ? '      ' + v : '  ' + v)).join('\n') + '\n';
    }
    
   return ' (see below) \n\n' + util.inspect(a) + '\n';
  });
  
  return JSON.stringify({
    '@bunion': true,
    date: Date.now(),
    value: clean.join(' '),
    appName: appName,
    level: level
  });
};

export const log = {
  error: function (...args: any[]) {
    process.stdout.write(getJSON('ERROR', args) + '\n');
  },
  warn: function (...args: any[]) {
    if(maxIndex > 3) return;
    process.stdout.write(getJSON('WARN', args) + '\n');
  },
  info: function (...args: any[]) {
    if(maxIndex > 2) return;
    process.stdout.write(getJSON('INFO', args) + '\n');
  },
  debug: function (...args: any[]) {
    if(maxIndex > 1) return;
    process.stdout.write(getJSON('DEBUG', args) + '\n');
  },
  trace: function (...args: any[]) {
    if(maxIndex > 0) return;
    process.stdout.write(getJSON('TRACE', args) + '\n');
  },
};

export default log;
