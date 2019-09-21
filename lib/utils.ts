'use strict';

import * as util from "util";
import {BunionJSON} from "./bunion";
import {BunionLevelInternal} from "./bunion";
import {bunionConf} from './conf';
import {pkg} from './pkg-json';
import {bSettings} from "./settings";
import log from './logging';

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

export const getErrorString = (i: number, a: any) => {
  
  try {
    
    const ownProps = Object.getOwnPropertyNames(a);
    
    const nonStackMessageProps = ownProps.length < 3 ? '' :
      'full inspection of extra props:' + util.inspect(a, {
                                                depth: 33,
                                                colors: true
                                              })
                                              .split('\n').map(v => '     ' + v).join('\n');
    
    return (i > 0 ? '' : ' (see below ⬃ )')
      + ' \n\n' + a.stack.split('\n')
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
      '@version': pkgVersion,
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
    '@version': -1,
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
    }
    
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
      '@version': pkgVersion,
      appName: appName,
      pid: bSettings.producerPID,
      host: hstname,
      level: v[1],
      date: v[2],
      fields: v[3],
      value: v[4]
    }
  }
  
  let vers = -1;
  
  try {
    vers = parseInt(String(elems[elems.length - 1]).trim());
  }
  catch (err) {
    log.warn(err);
  }
  
  return {
    '@bunion': true,
    '@version': Number.isInteger(vers) ? vers : -1,
    appName: v[1],
    level: v[2],
    pid: v[3],
    host: v[4],
    date: v[5],
    fields: v[6],
    value: v[7]
  }
  
};


