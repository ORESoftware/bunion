'use strict';

import * as util from "util";
import {BunionJSON} from "./bunion";
import {BunionLevelInternal} from "./bunion";
import {bunionConf} from './conf';
import {pkg} from './pkg-json';
import {bSettings} from "./settings";
import log from './logging';
import chalk from "chalk";

const hstname = bunionConf.producer.getHostNameSync();
const appName = bunionConf.producer.appName;

const cleanField = (v: any) => {
  return String(v || '#')
    .trim()
    .replace('"', '')
    .replace("'", '')
    .replace(')', '')
    .replace('(', '');
};

export const getFields = (fields: any) => {
  return Object.keys(fields)
               .reduce((s, k) => s + `(${cleanField(k)}=${cleanField(fields[k])}) `, '');
};

const copyError = (o: any) => {
  
  const v = {};
  
  for (const k of Object.keys(o)) {
    Object.defineProperty(v, k, {
      value: o[k],
      writable: false,
      configurable: true,
      enumerable: true
    });
    
  }
  
  return v;
  
};

const getInspectedErrString = (o: object): string => {
  const v = copyError(o);
  return Object.keys(v).length > 0 ? util.inspect(v, {depth: 55}) + '\n' : '';
};

export const getErrorStringSameProc = (a: any) => {
  return '\n\n' + chalk.redBright.italic(a.message) + '\n\n' + a.stack + '\n\n' + getInspectedErrString(a);
};

export const getErrorString = (i: number, a: any) => {
  
  try {
    
    const ownProps = Object.getOwnPropertyNames(a);
    
    const nonStackMessageProps = ownProps.length < 3 ? '' :
      'full inspection of extra props:' + util.inspect(a, {
                                                depth: 33,
                                                colors: true
                                              })
                                              .split('\n').map(v => '     ' + v).join('\n');
    
    return i > 0 ? '' : ' (see below ⬃ )' + ' \n\n' +
      a.stack.split('\n')
       .map((v: string, i: number) => (i === 0 ? '      ' + v : '  ' + v))
       .join('\n') + '\n\n ' + nonStackMessageProps;
    
  }
  catch (err) {
    return util.inspect(a, {depth: 33, colors: true});
  }
  
};

const isOptimized = process.env.bunion_optimized === 'yes';
const pkgVersion = pkg.version.split('.')[0];

export const fromStringToBunionMap = (v: string): BunionJSON => {
  
  if (isOptimized) {
    return {
      '@bunion': true,
      '@bunionVersion': pkgVersion,
      appName: appName,
      pid: bSettings.producerPID,
      host: hstname,
      level: BunionLevelInternal.WARN,
      date: new Date().toUTCString(),
      fields: null,
      value: v
    }
  }
  
  return {
    '@bunion': true,
    '@bunionVersion': pkgVersion,
    appName: 'unknown',
    level: BunionLevelInternal.WARN,
    pid: -1,
    host: 'unknown',
    date: 'unknown',
    fields: null,
    value: v
  }
  
};

export const convertToBunionMap = (v: any): BunionJSON => {
  
  if (!v) {
    throw 'Falsy/null/undefined value passed. Object/Array required.';
  }
  
  if (!Array.isArray(v)) {
    
    if (v['@bunion'] !== true) {
      log.warn('Object did not have a "@bunion" property pointing to true.');
      return {
        '@bunion': true,
        '@bunionVersion': pkgVersion,
        appName: 'unknown',
        level: BunionLevelInternal.WARN,
        pid: bSettings.producerPID,
        host: hstname,
        date: new Date().toUTCString(),
        fields: null,
        value: v
      }
    }
    
    v.level = v.level || 'WARN';
    
    return v;
  }
  
  const elems = String(v[0]).split(':');
  
  if (!elems[0].startsWith('@bunion')) {
    log.warn('First element of array was not a string that started with "@bunion".');
    log.warn('That array was:', v);
  }
  
  if (isOptimized) {
    return {
      '@bunion': true,
      '@bunionVersion': pkgVersion,
      appName: appName,
      pid: bSettings.producerPID,
      host: hstname,
      level: v[1] || 'WARN',
      date: v[2],
      fields: v[3] || null,
      value: v[4] || v
    }
  }
  
  let vers = '<unknown>';
  
  try {
    vers = String(elems[elems.length - 1]).trim();
  }
  catch (err) {
    log.warn('Could not parse integer:', err);
  }
  
  vers = vers[0] === 'v' ? vers : `v${vers}`
  
  return {
    '@bunion': true,
    '@bunionVersion': vers,
    appName: v[1],
    level: v[2] || 'WARN',
    pid: v[3] || bSettings.producerPID,
    host: v[4] || hstname,
    date: v[5] || new Date().toUTCString(),
    fields: v[6] || null,
    value: v[7] || v
  }
  
};


