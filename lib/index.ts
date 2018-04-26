'use strict';

import util = require('util');
import chalk from 'chalk';

export interface BunionJSON {
  '@bunion': true,
  level: 'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL',
  value: string,
  date: number,
  appName: string
}

export interface BunionOpts {
  maxlevel?: 'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL',
  appName?: string,
  isDefaultLogger?: boolean
}

export const ordered = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
const maxLevel = String(process.env.bunion_max_level || 'trace').toUpperCase();
const maxIndex = ordered.indexOf(maxLevel);

if (maxIndex < 0) {
  throw new Error('Your value for env var "bunion_max_level" is not set to a valid value.');
}

const pid = process.pid;
const defaultLoggerValues = {
  appName: '',
  maxFieldKeys: 8
};

const getJSON = function (level: string, args: any[], appName: string, isDefaultLogger: boolean, fields?: object) {
  
  if (isDefaultLogger) {
    appName = defaultLoggerValues.appName;
  }
  
  if (fields && typeof fields !== 'object') {
    throw new Error('First argument must be a "fields" object.');
  }
  
  if (fields && Object.keys(fields).length > 8) {
    throw new Error('Fields object can have no more than 8 keys.');
  }
  
  const clean = args.map(function (a): string {
    
    if (typeof a === 'string') {
      return a;
    }
    
    if (a && a.message && a.stack && typeof a.stack === 'string') {
      return ' (see below) \n\n' + a.stack.split('\n')
      .map((v: string, i: number) => (i === 0 ? '      ' + v : '  ' + v)).join('\n') + '\n';
    }
    
    return ' (see below) \n\n' + util.inspect(a) + '\n';
  });
  
  return JSON.stringify({
    '@bunion': true,
    date: Date.now(),
    value: clean.join(' '),
    appName: appName,
    level: level,
    pid: pid
  }) + '\n';
};

export const getLogger = function (opts?: BunionOpts) {
  
  const appName: string = String(opts && opts.appName || '');
  const isDefaultLogger: boolean = Boolean(opts && opts.isDefaultLogger);
  
  return {
    
    fatal(...args: any[]) {
      process.stdout.write(getJSON('FATAL', args, appName, isDefaultLogger));
    },
    
    fatalx(v: object, ...args: any[]) {
      process.stdout.write(getJSON('FATAL', args, appName, isDefaultLogger, v));
    },
    
    ////
    
    error(...args: any[]) {
      if (maxIndex > 4) return;
      process.stdout.write(getJSON('ERROR', args, appName, isDefaultLogger));
    },
    
    errorx(v: object, ...args: any[]) {
      if (maxIndex > 4) return;
      process.stdout.write(getJSON('ERROR', args, appName, isDefaultLogger, v));
    },
    
    ////
    
    warn(...args: any[]) {
      if (maxIndex > 3) return;
      process.stdout.write(getJSON('WARN', args, appName, isDefaultLogger));
    },
    
    warnx(v: object, ...args: any[]) {
      if (maxIndex > 3) return;
      process.stdout.write(getJSON('WARN', args, appName, isDefaultLogger, v));
    },
    
    ////
    
    info(...args: any[]) {
      if (maxIndex > 2) return;
      process.stdout.write(getJSON('INFO', args, appName, isDefaultLogger));
    },
    
    infox(v: object, ...args: any[]) {
      if (maxIndex > 2) return;
      process.stdout.write(getJSON('INFO', args, appName, isDefaultLogger, v));
    },
    
    ////
    
    debug(...args: any[]) {
      if (maxIndex > 1) return;
      process.stdout.write(getJSON('DEBUG', args, appName, isDefaultLogger));
    },
    
    debugx(v: object, ...args: any[]) {
      if (maxIndex > 1) return;
      process.stdout.write(getJSON('DEBUG', args, appName, isDefaultLogger, v));
    },
    
    /////
    
    trace(...args: any[]) {
      if (maxIndex > 0) return;
      process.stdout.write(getJSON('TRACE', args, appName, isDefaultLogger));
    },
    
    tracex(v: object, ...args: any[]) {
      if (maxIndex > 0) return;
      process.stdout.write(getJSON('TRACE', args, appName, isDefaultLogger, v));
    },
    
    //////
    
    isEnabled(level: string) {
      const index = ordered.indexOf(String(level).toUpperCase());
      if (index < 0) {
        throw new Error(`The log level passed does not match one of ['WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL']`);
      }
      return index > maxIndex;
    }
  };
};

export const createLogger = getLogger;
export const log = getLogger({isDefaultLogger: true});
export default log;

export const initDefaultLogger = function (opts: BunionOpts) {
  defaultLoggerValues.appName = opts && opts.appName || '';
};
