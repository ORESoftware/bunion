'use strict';

import path = require('path');
import {BunionConf, BunionLevel, BunionLevelInternal} from "./bunion";
import {findRootDir} from "residence";
import AJV = require('ajv');
import * as util from "util";
import {producer} from "./logger";
import chalk from "chalk";
import deepMixin from '@oresoftware/deep.mixin';
import {consumer} from "./logger";
import * as os from 'os';
import {BunionJSON} from "./bunion";
import {bunionConf} from './conf';
import {pkg} from './pkg-json';

const ajv = new AJV();
const schema = require('../assets/schema/bunion.conf.json');
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
  return (i > 0 ? '' : ' (see below ⬃ )')
    + ' \n\n' + a.stack.split('\n')
                 .map((v: string, i: number) => (i === 0 ? '      ' + v : '  ' + v))
                 .join('\n') + '\n' + util.inspect(a, {depth: 33, colors: true});
  
};


const isOptimized = process.env.bunion_optimized === 'yes';
const pkgVersion = pkg.version.split('.')[0];

export const convertToBunionJSONFromArray = (v: Array<any>): BunionJSON => {
  
  const indx = String(v[0]).indexOf(':');
  const vers = parseInt(String(v[0]).slice(indx).trim());
  
  if (isOptimized) {
    return {
      '@bunion': true,
      '@version': pkgVersion,
      appName: appName,
      pid: process.pid,
      host: hstname,
      level: v[0],
      date: v[1],
      fields: v[2],
      value: v[3]
    }
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

const getDefaultBunionConf = (): BunionConf => {
  return {
    producer: {
      appName: process.env.bunion_app_name || 'default',
      optimizedForConsumer: process.env.bunion_optimized === 'yes',
      forceRaw: process.env.bunion_force_raw === 'yes',
      level: <BunionLevel>process.env.bunion_producer_max_level || BunionLevelInternal.TRACE,
      fields: {},
      getHostNameSync() {
        return os.hostname();
      },
      getDateStringSync(d: Date) {
        if (!(d && d instanceof Date)) {
          return new Date().toUTCString();
        }
        return d.toUTCString();
      }
    },
    consumer: {
      localeDateString: 'en-US',
      highlightMatches: true,
      level: <BunionLevel>process.env.bunion_consumer_max_level || BunionLevelInternal.TRACE,
      match: [],
      matchAny: [],
      matchAll: [],
      inspect: {
        array: {
          length: 69
        },
        object: {
          depth: 22
        }
      },
      transform: {
        keys: {}
      }
    }
  }
};

export const getConf = (): BunionConf => {
  
  let bunionConfFolder: string;
  
  try {
    bunionConfFolder = findRootDir(process.cwd(), '.bunion.js');
  }
  catch (err) {
    producer.error('bunion could not find the project root given the current working directory:', process.cwd());
    throw err;
  }
  
  bunionConfFolder = bunionConfFolder || process.cwd();
  
  let confPath, conftemp;
  
  try {
    confPath = path.resolve(bunionConfFolder + '/' + '.bunion.js');
    conftemp = require(confPath);
  }
  catch (err) {
    producer.warn('Missing ".bunion.js" file:', String(err.message || err).split('\n')[0]);
    conftemp = {};
  }
  
  conftemp = conftemp.default || conftemp;
  
  const conf = <BunionConf>deepMixin(getDefaultBunionConf(), conftemp);
  
  try {
    const valid = ajv.validate(schema, conf);
    
    if (!valid) {
      producer.warn('Your bunion configuation file has an invalid format, see the following error(s):');
      for (const e of ajv.errors) {
        producer.error(util.inspect(e, {depth: 5, colors: true}));
      }
    }
  }
  catch (e) {
    consumer.debug(e.message || e);
  }
  
  return conf;
  
};
