'use strict';

import * as os from "os";
import {producer} from "./logger";
import deepMixin from "@oresoftware/deep.mixin";
import * as util from "util";
import {consumer} from "./logger";
import path = require('path');
import AJV = require('ajv');
import {BunionConf, BunionLevel, BunionLevelInternal} from "./bunion";
import {findRootDir} from "residence";
const ajv = new AJV();
const schema = require('../assets/schema/bunion.conf.json');

const getDefaultBunionConf = (): BunionConf => {
  return {
    producer: {
      appName: process.env.bunion_app_name || 'default',
      optimizedForConsumer: process.env.bunion_optimized === 'yes',
      forceRaw: process.env.bunion_force_raw === 'yes',
      level: <BunionLevel>process.env.bunion_producer_level || BunionLevelInternal.TRACE,
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

export const bunionConf = getConf();
export const transformKeys = bunionConf.consumer.transform && bunionConf.consumer.transform.keys;
export const transformers = Object.keys(transformKeys || {});