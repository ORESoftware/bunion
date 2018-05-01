'use strict';

import util = require('util');
import {customStringify, getConf} from "./utils";
import {findProjectRoot} from "residence";
import path = require('path');
import logger from './logger';

import {
  BunionFields,
  BunionLevelInternal,
  BunionOpts,
  ordered,
  Level,
  BunionLevel
} from "./bunion";

const bunionConf = getConf();

const getDefaultAppName = function () {
  return process.env.bunyan_app_name || bunionConf.producer.appName || bunionConf.producer.name || '';
};

const getDefaultMaxLevel = function () {
  return process.env.bunion_max_level || bunionConf.producer.level || 'info';
};

const maxLevel = String(getDefaultMaxLevel()).toUpperCase();
const maxIndex = ordered.indexOf(maxLevel);

if (maxIndex < 0) {
  throw new Error('Your value for env var "bunion_max_level" is not set to a valid value => ' + Object.keys(BunionLevelInternal));
}

const globalSettings = {
  globalMaxLevel: '',
  globalMaxIndex: 0
};

export const setGlobalLogLevel = function (v: BunionLevelInternal) {
  const maxIndex = ordered.indexOf(String(v || '').toUpperCase());
  if (maxIndex < 0) {
    throw new Error('Buntion Log level is not set to a valid value, must be one of => ' + Object.keys(BunionLevelInternal));
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

const getJSON = function (level: string, args: any[], appName: string, fields: object) {
  
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

export {BunionLevel};
export {Level};

export class BunionLogger {
  
  private appName: string;
  private fields: BunionFields | null;
  private level: BunionLevel;
  private maxIndex: number;
  
  constructor(opts?: BunionOpts) {
    this.appName = String((opts && (opts.appName || opts.name)) || getDefaultAppName());
    this.fields = opts && opts.fields || null;
    this.level = <BunionLevelInternal> String((opts && (opts.level || opts.maxlevel) || maxLevel || '')).toUpperCase();
    this.maxIndex = ordered.indexOf(this.level);
    
    if (this.maxIndex < 0) {
      throw new Error('Option "level" is not set to a valid value, must be one of: ' + Object.keys(BunionLevelInternal));
    }
  }
  
  getFields() {
    return this.fields;
  }
  
  setLevel(v: BunionLevel) {
    const maxIndex = ordered.indexOf(String(v || '').toUpperCase());
    if (maxIndex < 0) {
      throw new Error('Option "level" is not set to a valid value, must be one of: ' + Object.keys(BunionLevelInternal));
    }
    this.level = v;
    this.maxIndex = maxIndex;
    return this;
  }
  
  private getCurrentLevel() {
    return globalSettings.globalMaxLevel || this.level;
  }
  
  private getCurrentMaxIndex() {
    return globalSettings.globalMaxIndex || this.maxIndex;
  }
  
  private validateFields(v: BunionFields) {
    if (!(v && typeof v === 'object')) {
      throw new Error('Child logger initialization value must be an object.');
    }
    
    const keys = Object.keys(v);
    
    if (keys.length > 8) {
      throw new Error('Child logger initialization object has more than the maximum 8 keys.');
    }
    
    keys.forEach(function (k) {
      if (typeof v[k] !== 'string') {
        throw new Error('Child logger initialization object must have key/value pairs that are both strings.');
      }
      if (!v[k]) {
        throw new Error(`Child logger initialization object has a key ("${k}") that points to an empty string. See this object: ${util.inspect(v)}`);
      }
    });
  }
  
  addFields(v: BunionFields) {
    this.validateFields(v);
    this.fields = Object.assign(this.fields, v);
  }
  
  addField(k: string, v: string) {
    const f = {[k]: v};
    this.addFields(f);
    return this;
  }
  
  setFields(v: BunionFields) {
    this.validateFields(v);
    this.fields = v;
    return this;
  }
  
  clearFields() {
    this.fields = {};
    return this;
  }
  
  child() {
    return new BunionLogger({
      appName: this.appName,
      fields: Object.assign({}, this.fields),
      level: this.level
    });
  }
  
  fatal(...args: any[]) {
    process.stdout.write(getJSON('FATAL', args, this.appName, this.fields));
  }
  
  fatalx(v: object, ...args: any[]) {
    process.stdout.write(getJSON('FATAL', args, this.appName, getCombinedFields(v, this.fields)));
  }
  
  error(...args: any[]) {
    if (this.getCurrentMaxIndex() > 4) return;
    process.stdout.write(getJSON('ERROR', args, this.appName, this.fields));
  }
  
  errorx(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 4) return;
    process.stdout.write(getJSON('ERROR', args, this.appName, getCombinedFields(v, this.fields)));
  }
  
  warn(...args: any[]) {
    if (this.getCurrentMaxIndex() > 3) return;
    process.stdout.write(getJSON('WARN', args, this.appName, this.fields));
  }
  
  warnx(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 3) return;
    process.stdout.write(getJSON('WARN', args, this.appName, getCombinedFields(v, this.fields)));
  }
  
  info(...args: any[]) {
    if (this.getCurrentMaxIndex() > 2) return;
    process.stdout.write(getJSON('INFO', args, this.appName, this.fields));
  }
  
  infox(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 2) return;
    process.stdout.write(getJSON('INFO', args, this.appName, getCombinedFields(v, this.fields)));
  }
  
  debug(...args: any[]) {
    if (this.getCurrentMaxIndex() > 1) return;
    process.stdout.write(getJSON('DEBUG', args, this.appName, this.fields));
  }
  
  debugx(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 1) return;
    process.stdout.write(getJSON('DEBUG', args, this.appName, getCombinedFields(v, this.fields)));
  }
  
  trace(...args: any[]) {
    if (this.getCurrentMaxIndex() > 0) return;
    process.stdout.write(getJSON('TRACE', args, this.appName, this.fields));
  }
  
  tracex(v: object, ...args: any[]) {
    if (this.getCurrentMaxIndex() > 0) return;
    process.stdout.write(getJSON('TRACE', args, this.appName, getCombinedFields(v, this.fields)));
  }
  
  isLevelEnabled(level: BunionLevel) {
    return this.isEnabled.apply(this, arguments);
  }
  
  isEnabled(level: BunionLevel) {
    const index = ordered.indexOf(String(level || '').toUpperCase());
    if (index < 0) {
      throw new Error(`The log level passed does not match one of ['WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL']`);
    }
    return index > this.getCurrentMaxIndex();
  }
}

export const getNewLogger = function (opts?: BunionOpts) {
  return new BunionLogger(opts);
};

export const createLogger = getNewLogger;
export const log = getNewLogger();
export default log;

