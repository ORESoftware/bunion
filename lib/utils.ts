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

const ajv = new AJV();
const schema = require('../assets/schema/bunion.conf.json');

///////////////////////////////////////////////////////////////////////////////

const cleanField = (v: any) => {
  return String(v || '#')
  .trim()
  .replace('"', '')
  .replace("'", '')
  .replace(')', '')
  .replace('(', '');
};

export const getFields = (fields: any) => {
  return Object.keys(fields).reduce(function (s, k) {
    return s + `(${cleanField(k)}=${cleanField(fields[k])}) `;
  }, '');
};

export const getErrorString = (i: number, a: any) => {
  return (i > 0 ? '' : ' (see below ⬃ )')
    + ' \n\n' + a.stack.split('\n')
                 .map((v: string, i: number) => (i === 0 ? '      ' + v : '  ' + v))
                 .join('\n') + '\n' + util.inspect(a, {depth: 33});
  
};

const getDefaultBunionConf = (): BunionConf => {
  return {
    producer: {
      appName: process.env.bunion_app_name || 'default-app-name',
      forceRaw: process.env.bunion_force_raw === 'yes',
      level: <BunionLevel>process.env.bunion_producer_max_level || BunionLevelInternal.TRACE,
      fields: {},
      getHostNameSync() {
        return os.hostname();
      },
      getDateStringSync(d: Date) {
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
          length: 25
        },
        object: {
          depth: 5
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
