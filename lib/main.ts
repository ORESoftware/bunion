'use strict';

import util = require('util');
import {getConf} from "./utils";
import {producer} from './logger';
import os = require('os');
import chalk from "chalk";
import * as safe from '@oresoftware/safe-stringify';

import {
  BunionFields,
  BunionLevelInternal,
  BunionOpts,
  ordered,
  Level,
  BunionLevel, BunionLevelInternalUnion
} from "./bunion";

import deepMixin from "@oresoftware/deep.mixin";
import {logTTY} from "./log-tty";

export {BunionConf} from './bunion';

process.on('SIGINT', s => {
  producer.warn('SIGINT received.', s);
});

process.on('SIGHUP', s => {
  producer.warn('SIGHUP received.', s);
});

process.on('SIGTERM', s => {
  producer.warn('SIGTERM received.', s);
});

const bunionConf = getConf();

const getDefaultAppName = () => {
  return bunionConf.producer.appName || bunionConf.producer.name || '';
};

const getDefaultMaxLevel = () => {
  return bunionConf.producer.level || 'info';
};

const maxLevel = String(getDefaultMaxLevel()).toUpperCase();
const maxIndex = ordered.indexOf(maxLevel);
const forceRaw = bunionConf.producer.forceRaw;

if (maxIndex < 0) {
  throw new Error(
    chalk.red('Your value for env var "bunion_max_level" is not set to a valid value => ' + Object.keys(BunionLevelInternal))
  );
}

const globalSettings = {
  globalMaxLevel: '',
  globalMaxIndex: 0
};

export const setGlobalLogLevel = (v: BunionLevelInternal) => {
  const maxIndex = ordered.indexOf(String(v || '').toUpperCase());
  if (maxIndex < 0) {
    throw new Error(
      chalk.red('Bunion Log level is not set to a valid value, must be one of => ' + Object.keys(BunionLevelInternal))
    );
  }
  globalSettings.globalMaxLevel = v;
  globalSettings.globalMaxIndex = maxIndex;
};

const utilOpts = {
  depth: 4,
  maxArrayLength: 10
};

const getJSON = (level: string, args: any[], appName: string, fields: object, host: string, opt?: boolean): string => {
  
  fields = fields || null;
  
  if (fields && typeof fields !== 'object') {
    throw new Error(chalk.red('First argument must be a "fields" object.'));
  }
  
  if (fields && Object.keys(fields).length > 8) {
    throw new Error(chalk.red('Fields object can have no more than 8 keys.'));
  }
  
  const clean = args.map((a, i): string => {
    
    if (typeof a === 'string') {
      return a;
    }
    
    if (a && a.message && a.stack && typeof a.stack === 'string') {
      return (i > 0 ? '' : ' (see below ⬃ )') + ' \n\n' + a.stack.split('\n')
        .map((v: string, i: number) => (i === 0 ? '      ' + v : '  ' + v)).join('\n') + '\n';
    }
    
    try {
      // we can only JSON.parse a message on the receiving end, if there is one object
      return a;  // leave it as an object
    }
    catch (err) {
      // ignore
    }
    
    return util.inspect(a, utilOpts); //+ '\n';
  });
  
  if (!forceRaw && process.stdout.isTTY && !opt) {
    return logTTY(3, 'short', {
      appName,
      level: level as BunionLevelInternal,
      fields: fields as BunionFields,
      pid: process.pid,
      host: 'foo',
      date: new Date().toUTCString(),
      value: clean.join(' '),
    });
  }
  
  // return safe.stringify({
  //   '@bunion': true,
  //   date: new Date(),
  //   value: clean.join(' '),
  //   appName: appName,
  //   level: level,
  //   pid: process.pid,
  //   fields: fields,
  //   host: host
  // }) + '\n';
  
  return safe.stringify([
    '@bunion',
    appName,
    level,
    process.pid,
    host,
    new Date().toUTCString(),
    fields,
    clean
  ]) + '\n';
};

const getCombinedFields = function (v: object, fields: object) {
  return deepMixin(fields, v);
};

const getHostName = () => {
  
  let v = '', f = bunionConf.producer.getHostNameSync;
  
  if (typeof f === 'function') {
    v = f();
  }
  
  if (v && typeof v !== 'string') {
    throw `hostname should be a string, but was not => ${util.inspect(v)}`;
  }
  
  return v || os.hostname() || process.env.HOSTNAME || 'unknown-host';
};

export {BunionLevel};
export {Level};

export class BunionLogger {
  
  public static HostName = getHostName();
  private readonly appName: string;
  private fields: BunionFields | null;
  private level: BunionLevel;
  private maxIndex: number;
  private hostname: string;
  
  constructor(opts?: BunionOpts) {
    this.appName = String((opts && (opts.appName || opts.name)) || getDefaultAppName());
    this.fields = opts && opts.fields || null;
    this.level = <BunionLevelInternal>String((opts && (opts.level || opts.maxlevel) || maxLevel || '')).toUpperCase();
    this.maxIndex = ordered.indexOf(this.level);
    
    this.hostname = BunionLogger.HostName;
    
    if (this.maxIndex < 0) {
      throw new Error(
        chalk.red('Option "level" is not set to a valid value, must be one of: ' + Object.keys(BunionLevelInternal))
      );
    }
  }
  
  getJSON(logLevel: BunionLevelInternal | string, ...args: any[]) {
    return getJSON(logLevel, args, this.appName, this.fields, this.hostname, true)
  }
  
  getFields() {
    return this.fields;
  }
  
  setLevel(v: BunionLevel): this {
    const maxIndex = ordered.indexOf(String(v || '').toUpperCase());
    if (maxIndex < 0) {
      throw new Error(
        chalk.red('Option "level" is not set to a valid value, must be one of: ' + Object.keys(BunionLevelInternal))
      );
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
  
  private validateFields(v: BunionFields): void {
    if (!(v && typeof v === 'object')) {
      throw new Error(chalk.red('Value must be an object.'));
    }
    
    const keys = Object.keys(v);
    
    if (keys.length > 8) {
      throw new Error(chalk.red('Object has more than the maximum 8 keys.'));
    }
    
    keys.forEach(function (k) {
      if (typeof v[k] !== 'string') {
        throw new Error(chalk.red('Object must have key/value pairs that are all strings.'));
      }
      if (!v[k]) {
        throw new Error(chalk.red(`Object has a key ("${k}") that points to an empty string. See this object: ${util.inspect(v)}`));
      }
    });
  }
  
  addFields(v: BunionFields): this {
    this.validateFields(v);
    this.fields = Object.assign({}, this.fields || {}, v);
    return this;
  }
  
  addField(k: string, v: string): this {
    const f = {[k]: v};
    this.addFields(f);
    return this;
  }
  
  setFields(v: BunionFields): this {
    this.validateFields(v);
    this.fields = Object.assign({}, v);
    return this;
  }
  
  clearFields(): this {
    this.fields = {};
    return this;
  }
  
  child(shallow?: boolean): BunionLogger {
    return new BunionLogger({
      appName: this.appName,
      fields: shallow ? Object.assign({}, this.fields) : <any>deepMixin(this.fields),
      level: this.level
    });
  }
  
  fatal(...args: any[]): void {
    process.stdout.write(getJSON('FATAL', args, this.appName, this.fields, this.hostname));
  }
  
  fatalx(v: object, ...args: any[]): void {
    process.stdout.write(getJSON('FATAL', args, this.appName, getCombinedFields(v, this.fields), this.hostname));
  }
  
  error(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 4) return;
    process.stdout.write(getJSON('ERROR', args, this.appName, this.fields, this.hostname));
  }
  
  errorx(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 4) return;
    process.stdout.write(getJSON('ERROR', args, this.appName, getCombinedFields(v, this.fields), this.hostname));
  }
  
  warn(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 3) return;
    process.stdout.write(getJSON('WARN', args, this.appName, this.fields, this.hostname));
  }
  
  warnx(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 3) return;
    process.stdout.write(getJSON('WARN', args, this.appName, getCombinedFields(v, this.fields), this.hostname));
  }
  
  info(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 2) return;
    process.stdout.write(getJSON('INFO', args, this.appName, this.fields, this.hostname));
  }
  
  infox(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 2) return;
    process.stdout.write(getJSON('INFO', args, this.appName, getCombinedFields(v, this.fields), this.hostname));
  }
  
  debug(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 1) return;
    process.stdout.write(getJSON('DEBUG', args, this.appName, this.fields, this.hostname));
  }
  
  debugx(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 1) return;
    process.stdout.write(getJSON('DEBUG', args, this.appName, getCombinedFields(v, this.fields), this.hostname));
  }
  
  trace(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 0) return;
    process.stdout.write(getJSON('TRACE', args, this.appName, this.fields, this.hostname));
  }
  
  tracex(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 0) return;
    process.stdout.write(getJSON('TRACE', args, this.appName, getCombinedFields(v, this.fields), this.hostname));
  }
  
  isLevelEnabled(level: BunionLevel): boolean {
    return this.isEnabled.apply(this, arguments);
  }
  
  isEnabled(level: BunionLevel): boolean {
    const index = ordered.indexOf(String(level || '').toUpperCase());
    if (index < 0) {
      throw new Error(
        chalk.red(`The log level passed does not match one of: ${Object.keys(BunionLevelInternal)}`)
      );
    }
    return index > this.getCurrentMaxIndex();
  }
}

export const getNewLogger = function (opts?: BunionOpts): BunionLogger {
  return new BunionLogger(opts);
};

export const createLogger = getNewLogger;
export const log = getNewLogger();
export default log;

export const r2gSmokeTest = () => {
  return true;
};
