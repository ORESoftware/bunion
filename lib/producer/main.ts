'use strict';

import util = require('util');
import os = require('os');
import {getErrorStringSameProc} from "../utils";
import {producer} from '../loggers';
import chalk from "chalk";
import * as safe from '@oresoftware/safe-stringify';
import deepMixin from "@oresoftware/deep.mixin";
import {logTTY} from "./log-tty";
import {bunionConf} from '../conf';

import {BunionFieldMarker, BunionFields, BunionLevel, BunionLevelInternal, BunionOpts, Level, ordered} from "../bunion";
import {pkg} from "../pkg-json";
import {RawJSONBytesSymbol} from "@oresoftware/json-stream-parser";
import * as Domain from "domain";
import * as http from "http";

export {BunionLevel};
export {Level};
export {BunionConf} from '../bunion';
export {bunionConf} from '../conf';

process.on('SIGINT', s => {
  producer.debug('SIGINT received.', s);
});

process.on('SIGHUP', s => {
  producer.debug('SIGHUP received.', s);
});

process.on('SIGPIPE', s => {
  producer.debug('SIGPIPE received.', s);
});

process.on('SIGTERM', s => {
  producer.debug('SIGTERM received.', s);
});

const isOptimized = process.env.bunion_optimized === 'yes';

if (isOptimized) {
  if (!process.stdout.isTTY) {
    console.log(JSON.stringify({'@bunion': true, producer_pid: process.pid}));
  }
}

const getDefaultAppName = () => {
  return bunionConf.producer.appName || bunionConf.producer.name || '';
};

const getDefaultMaxLevel = () => {
  return bunionConf.producer.level || 'TRACE';
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
  depth: 44,
  maxArrayLength: 89,
  showHidden: false,
  colors: true,
  compact: false,
  sorted: true
};

const copyObj = (o: object) => {
  
  const v = {};
  
  for (const k of Object.getOwnPropertyNames(o)) {
    Object.defineProperty(v, k, {
      value: (o as any)[k],
      writable: false,
      configurable: true,
      enumerable: true
    })
    
  }
  
  return v;
  
};

const getJSON = (level: string, args: any[], appName: string, fields: object, host: string, opt?: boolean): string => {
  
  fields = fields || null;
  
  if (fields && typeof fields !== 'object') {
    throw new Error(chalk.red('First argument must be a "fields" object.'));
  }
  
  if (fields && Object.keys(fields).length > 8) {
    throw new Error(chalk.red('Fields object can have no more than 8 keys.'));
  }
  
  const isLogTTY = !forceRaw && process.stdout.isTTY && !opt;
  
  const clean = args.map((a, i): any => {
    
    if (typeof a === 'string') {
      return a;
    }
    
    if (a && typeof a === 'object' && a.hasOwnProperty('message') && a.hasOwnProperty('stack')
      && typeof a.message === 'string' && a.stack && typeof a.stack === 'string') {
      
      if (isLogTTY) {
        return getErrorStringSameProc(a);
      }
      
      const val = copyObj(a);
      
      // if (isLogTTY) {
      //   return util.inspect(val, {depth: 55, colors: true});
      // }
      
      return {
        ['@bunion-error']: true,
        ['@error']: val
      }
    }
    
    if (isLogTTY) {
      return util.inspect(a, utilOpts); //+ '\n';
    }
    
    return a;  // leave it as an object
  });
  
  if (isLogTTY) {
    return logTTY(0, 'short', {
      '@bunion': true,
      '@bunionVersion': pkg.version,
      appName,
      level: level as BunionLevelInternal,
      fields: fields as BunionFields,
      pid: process.pid,
      host: 'foo',
      date: new Date().toUTCString(),
      value: clean.join(' '),
    });
  }
  
  if (isOptimized) {
    
    if(fields && Object.keys(fields).length > 0){
      return safe.stringify([
        '@bunion',
        level,
        new Date().toUTCString(),
        fields,
        clean
      ]) + '\n';
    }
  
    return safe.stringify([
      '@bunion',
      level,
      new Date().toUTCString(),
      clean
    ]) + '\n';
    
  }
  
  // original object (instead of array) version:
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
  
  if(fields && Object.keys(fields).length > 0){
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
  }
  
  // we omit fields so we don't get meaningless "null" in the array
  return safe.stringify([
    '@bunion',
    appName,
    level,
    process.pid,
    host,
    new Date().toUTCString(),
    clean
  ]) + '\n';
  
};

// export const metaMarker = Symbol('bunion-meta-fields-marker')
export const metaMarker = '_bunionCtx';

const getCombinedFields = function (fields: BunionFields, v?: object) {
  const meta = (process as any).domain && (process as any).domain[metaMarker];
  return deepMixin(fields, meta, v);
};

const getHostName = () => {
  
  let v = '', f = bunionConf.producer.getHostNameSync;
  
  if (typeof f === 'function') {
    v = f();
  }
  
  if (v && typeof v !== 'string') {
    throw `hostname should be a string, but was not => ${util.inspect(v, {depth: 5})}`;
  }
  
  return v || os.hostname() || process.env.HOSTNAME || 'unknown-host';
};

export class BunionLogger {
  
  public static HostName = getHostName();
  private readonly appName: string;
  private fields: BunionFields | null;
  private level: BunionLevel;
  private maxIndex: number;
  private hostname: string;
  private calledOnce = new Set<BunionLevelInternal>();
  
  constructor(opts?: BunionOpts) {
    opts = opts || {};
    this.appName = String((opts && (opts.appName || opts.name)) || getDefaultAppName());
    this.fields = opts && opts.fields || null;
    this.level = <BunionLevelInternal>String(opts.level || opts.maxlevel || opts.maxLevel || maxLevel || '').toUpperCase();
    this.maxIndex = ordered.indexOf(this.level);
    
    this.hostname = BunionLogger.HostName;
    
    if (this.maxIndex < 0) {
      throw new Error(
        chalk.red('Option "level" is not set to a valid value, must be one of: ' + Object.keys(BunionLevelInternal))
      );
    }
  }
  
  middleware(){
    return this.mw.apply(this,arguments)
  }
  
  addContext(req: any, v: {[key:string]: any}): void {
    
    const d = req._bunionDomain
    
    if(!d){
      log.warn(`could not add context to an object without a '_bunionDomain' property`);
      log.warn(`perhaps you need to register the log.mw() middleware before this point.`)
      return;
    }
    
    const c = d._bunionCtx
    
    if(!c){
      log.warn(`could read the '_bunionCtx' property from the bunionDomain`);
      log.warn(`perhaps you need to register the log.mw() middleware before this point.`)
      return;
    }
    
    Object.assign(c, v)
  }
  
  addLoggingContextForRequest(req: http.ClientRequest, v: {[key:string]: any}): void {
     this.addContext(req, v);
  }
  
  mw(){
    return (req: any, res: any, next: (err?: any) => void) : void => {
      const d = req._bunionDomain = res._bunionDomain = (req._havenDomain || Domain.create())
      d._bunionCtx = d._bunionCtx || {}
      if((process as any).domain === d){
        return next();
      }
      d.run(next);
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
    
    for (const k of keys) {
      if (typeof v[k] !== 'string') {
        throw new Error(chalk.red('Object must have key/value pairs that are all strings.'));
      }
      if (!v[k]) {
        throw new Error(chalk.red(`Object has a key ("${k}") that points to an empty string. See this object: ${util.inspect(v)}`));
      }
    }
  }
  
  addFields(v: BunionFields): this {
    this.validateFields(v);
    this.fields = Object.assign({}, this.fields || {}, v);
    return this;
  }
  
  addField(k: string, v: string): this {
    const f = new BunionFields()
    f[k] = v;
    this.addFields(f);
    return this;
  }
  
  setFields(v: BunionFields): this {
    this.validateFields(v);
    this.fields = Object.assign({}, v);
    return this;
  }
  
  clearFields(): this {
    this.fields = new BunionFields();
    return this;
  }
  
  child(shallow?: boolean): BunionLogger {
    return new BunionLogger({
      appName: this.appName,
      fields: shallow ? Object.assign({}, this.fields) : <any>deepMixin(this.fields),
      level: this.level
    });
  }
  
  times(i: number, ...args: any[]) {
    
    const argz = args.map(v => typeof v === 'string' ? v : util.inspect(v, {depth: 5, colors: true}));
    
    while (i > 0) {
      i--;
      for (const v of argz) {
        process.stdout.write(v);
      }
      
    }
  }
  
  newline() {
    process.stdout.write('\n');
  }
  
  pid() {
    process.stdout.write(JSON.stringify({'@bunion': true, '@pid': true, pid: process.pid}) + '\n');
  }
  
  newlineToStdout() {
    process.stdout.write('\n');
  }
  
  newlineToStderr() {
    process.stderr.write('\n');
  }
  
  logOnce(l: BunionLevelInternal) {
    if (!this.calledOnce.has(l)) {
      this.calledOnce.add(l);
      process.stdout.write(
        getJSON('WARN', [`the '${l}' logging level is not available in this process`],
          this.appName, this.fields, this.hostname)
      );
    }
  }
  
  fatal(...args: any[]): void {
    process.stdout.write(getJSON('FATAL', args, this.appName, getCombinedFields(this.fields), this.hostname));
  }
  
  fatalx(v: object, ...args: any[]): void {
    process.stdout.write(getJSON('FATAL', args, this.appName, getCombinedFields(this.fields, v), this.hostname));
  }
  
  error(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 4) {
      this.logOnce(BunionLevelInternal.ERROR);
      return;
    }
    const e = new Error(util.inspect(args, { breakLength: Infinity, colors: process.stdout.isTTY }));
    process.stdout.write(getJSON('ERROR', args.concat(e), this.appName, getCombinedFields(this.fields), this.hostname));
  }
  
  errorx(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 4) {
      this.logOnce(BunionLevelInternal.ERROR);
      return;
    }
    process.stdout.write(getJSON('ERROR', args, this.appName, getCombinedFields(this.fields), this.hostname));
  }
  
  warn(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 3) {
      this.logOnce(BunionLevelInternal.WARN);
      return;
    }
    process.stdout.write(getJSON('WARN', args, this.appName, getCombinedFields(this.fields), this.hostname));
  }
  
  warnx(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 3) {
      this.logOnce(BunionLevelInternal.WARN);
      return;
    }
    process.stdout.write(getJSON('WARN', args, this.appName, getCombinedFields(this.fields, v), this.hostname));
  }
  
  info(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 2) {
      this.logOnce(BunionLevelInternal.INFO);
      return;
    }
    process.stdout.write(getJSON('INFO', args, this.appName, getCombinedFields(this.fields), this.hostname));
  }
  
  infox(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 2) {
      this.logOnce(BunionLevelInternal.INFO);
      return;
    }
    process.stdout.write(getJSON('INFO', args, this.appName, getCombinedFields(this.fields, v), this.hostname));
  }
  
  debug(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 1) {
      this.logOnce(BunionLevelInternal.DEBUG);
      return;
    }
    process.stdout.write(getJSON('DEBUG', args, this.appName, getCombinedFields(this.fields), this.hostname));
  }
  
  debugx(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 1) {
      this.logOnce(BunionLevelInternal.DEBUG);
      return;
    }
    process.stdout.write(getJSON('DEBUG', args, this.appName, getCombinedFields(this.fields, v), this.hostname));
  }
  
  trace(...args: any[]): void {
    if (this.getCurrentMaxIndex() > 0) {
      this.logOnce(BunionLevelInternal.TRACE);
      return;
    }
    process.stdout.write(getJSON('TRACE', args, this.appName, getCombinedFields(this.fields), this.hostname));
  }
  
  tracex(v: object, ...args: any[]): void {
    if (this.getCurrentMaxIndex() > 0) {
      this.logOnce(BunionLevelInternal.TRACE);
      return;
    }
    process.stdout.write(getJSON('TRACE', args, this.appName, getCombinedFields(this.fields, v), this.hostname));
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

if (!process.stdout.isTTY) {
  log.pid();
}

export {convertToBunionMap, fromStringToBunionMap} from '../utils';

const con = {
  forceCli: false
};

export const onData = (d: any) => {
  throw new Error('You must use the "bunion_force_cli=yes" env var to call the onData pseudo handler.');
};

export const handleIn = (d: any) => {
  throw new Error('You must use the "bunion_force_cli=yes" env var to call the handleIn pseudo handler.');
};

if (process.env.bunion_force_cli === 'yes') {
  producer.warn('Using cli to read from stdin.');
  exports.onData = require('../consumer/cli').onData;
  exports.handleIn = require('../consumer/cli').handleIn;
}

export const r2gSmokeTest = () => {
  return true;
};
