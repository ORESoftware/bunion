'use strict';

import util = require('util');
import {customStringify} from "./util";
import {findProjectRoot} from "residence";
import path = require('path');

export interface BunionJSON {
  '@bunion': true,
  level: 'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL',
  value: string,
  date: number,
  appName: string,
  fields: object
}

export interface BunionOpts {
  maxlevel?: 'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL',
  appName?: string,
  isDefaultLogger?: boolean,
  fields?: object;
  level?: string;
}

export interface BunionConf {
  producer: {
    inspect?: {
      array?: {
        length?: number
      },
      object?: {
        depth?: number
      }
    }
  },
  consumer: {}
}

let projectRoot: string, bunionConf: BunionConf;

try {
  projectRoot = findProjectRoot(process.cwd());
}
catch (err) {
  console.error('bunion could not find the project root given the current working directory:', process.cwd());
  throw err;
}

try {
  bunionConf = require(path.resolve(projectRoot + '/' + '.bunion.json'))
}
catch (err) {
  bunionConf = {producer: {}, consumer: {}};
}

export const ordered = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
const maxLevel = String(process.env.bunion_max_level || 'trace').toUpperCase();
const maxIndex = ordered.indexOf(maxLevel);

if (maxIndex < 0) {
  throw new Error('Your value for env var "bunion_max_level" is not set to a valid value.');
}

const globalSettings = {
  globalMaxLevel: '',
  globalMaxIndex: 0
};

export const updateGlobalLogLevel = function (v: string) {
  const maxIndex = ordered.indexOf(String(v || '').toUpperCase());
  if (maxIndex < 0) {
    throw new Error('Option "level" is not set to a valid value.');
  }
  globalSettings.globalMaxLevel = v;
  globalSettings.globalMaxIndex = maxIndex;
};

const defaultLoggerValues = {
  appName: process.env.bunion_app_name || '',
  maxFieldKeys: 8
};

const utilOpts = {
  depth: 4,
  maxArrayLength: 10
};

const getJSON = function (level: string, args: any[], appName: string, isDefaultLogger: boolean, fields: object) {
  
  if (isDefaultLogger) {
    appName = defaultLoggerValues.appName;
    // console.log('setting app name to default val:', defaultLoggerValues.appName)
  }
  
  fields = fields || null;
  
  if (fields && typeof fields !== 'object') {
    throw new Error('First argument must be a "fields" object.');
  }
  
  if (fields && Object.keys(fields).length > 8) {
    throw new Error('Fields object can have no more than 8 keys.');
  }
  
  const clean = args.map(function (a, i): string {
    
    if (typeof a === 'string') {
      return a;
    }
    
    if (a && a.message && a.stack && typeof a.stack === 'string') {
      return (i > 0 ? '' : ' (see below ⬃ )') + ' \n\n' + a.stack.split('\n')
      .map((v: string, i: number) => (i === 0 ? '      ' + v : '  ' + v)).join('\n') + '\n';
    }
    
    return util.inspect(a, utilOpts); //+ '\n';
  });
  
  return customStringify({
    '@bunion': true,
    date: Date.now(),
    value: clean.join(' '),
    appName: appName,
    level: level,
    pid: process.pid,
    fields: fields
  }) + '\n';
};

const getCombinedFields = function (v: object, fields: object) {
  return Object.assign({}, v, fields);
};

export class BunionLogger {
  
  appName: string;
  isDefaultLogger: boolean;
  fields: object;
  level: string;
  maxIndex: number;
  
  constructor(opts?: BunionOpts) {
    this.appName = String(opts && opts.appName || '');
    this.isDefaultLogger = Boolean(opts && opts.isDefaultLogger);
    this.fields = opts && opts.fields || null;
    this.level = String((opts && opts.level) || maxLevel || '').toUpperCase();
    this.maxIndex = ordered.indexOf(this.level);
    
    if (this.maxIndex < 0) {
      throw new Error('Option "level" is not set to a valid value.');
    }
    
  }
  
  getFields() {
    return this.fields;
  }
  
  setLevel(v: string) {
    const maxIndex = ordered.indexOf(String(v || '').toUpperCase());
    if (maxIndex < 0) {
      throw new Error('Option "level" is not set to a valid value.');
    }
    this.level = v;
    this.maxIndex = maxIndex;
  }
  
  getCurrentLevel() {
    return globalSettings.globalMaxLevel || this.level;
  }
  
  getCurrentMaxIndex() {
    return globalSettings.globalMaxIndex || this.maxIndex;
  }
  
  child(v: object) {
    return new BunionLogger({
      appName: this.appName,
      fields: Object.assign({}, this.fields || {}, v)
    });
  }
  
  fatal(...args: any[]) {
    process.stdout.write(getJSON('FATAL', args, this.appName, this.isDefaultLogger, this.fields));
  }
  
  fatalx(v: object, ...args: any[]) {
    process.stdout.write(getJSON('FATAL', args, this.appName, this.isDefaultLogger, getCombinedFields(v, this.fields)));
  }
  
  error(...args: any[]) {
    if (this.getCurrentMaxIndex() > 4) return;
    process.stdout.write(getJSON('ERROR', args, this.appName, this.isDefaultLogger, this.fields));
  }
  
  errorx(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 4) return;
    process.stdout.write(getJSON('ERROR', args, this.appName, this.isDefaultLogger, getCombinedFields(v, this.fields)));
  }
  
  warn(...args: any[]) {
    if (this.getCurrentMaxIndex() > 3) return;
    process.stdout.write(getJSON('WARN', args, this.appName, this.isDefaultLogger, this.fields));
  }
  
  warnx(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 3) return;
    process.stdout.write(getJSON('WARN', args, this.appName, this.isDefaultLogger, getCombinedFields(v, this.fields)));
  }
  
  info(...args: any[]) {
    if (this.getCurrentMaxIndex() > 2) return;
    process.stdout.write(getJSON('INFO', args, this.appName, this.isDefaultLogger, this.fields));
  }
  
  infox(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 2) return;
    process.stdout.write(getJSON('INFO', args, this.appName, this.isDefaultLogger, getCombinedFields(v, this.fields)));
  }
  
  debug(...args: any[]) {
    if (this.getCurrentMaxIndex() > 1) return;
    process.stdout.write(getJSON('DEBUG', args, this.appName, this.isDefaultLogger, this.fields));
  }
  
  debugx(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 1) return;
    process.stdout.write(getJSON('DEBUG', args, this.appName, this.isDefaultLogger, getCombinedFields(v, this.fields)));
  }
  
  trace(...args: any[]) {
    if (this.getCurrentMaxIndex() > 0) return;
    process.stdout.write(getJSON('TRACE', args, this.appName, this.isDefaultLogger, this.fields));
  }
  
  tracex(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 0) return;
    process.stdout.write(getJSON('TRACE', args, this.appName, this.isDefaultLogger, getCombinedFields(v, this.fields)));
  }
  
  isEnabled(level: string) {
    const index = ordered.indexOf(String(level || '').toUpperCase());
    if (index < 0) {
      throw new Error(`The log level passed does not match one of ['WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL']`);
    }
    return index > maxIndex;
  }
}

export const getNewLogger = function (opts?: BunionOpts) {
  return new BunionLogger(opts);
};

export const createLogger = getNewLogger;
export const log = getNewLogger({isDefaultLogger: true});
export default log;

export const initDefaultLogger = function (opts: BunionOpts) {
  defaultLoggerValues.appName = opts && opts.appName || '';
};
