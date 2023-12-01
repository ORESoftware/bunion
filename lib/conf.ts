'use strict';

import * as os from "os";
import {producer, consumer} from "./loggers";
import deepMixin from "@oresoftware/deep.mixin";
import * as util from "util";
import path = require('path');
import AJV = require('ajv');
import {BunionConf, BunionLevel, BunionLevelInternal} from "./bunion";
import {findRootDir} from "residence";
import {BunionLevelToNum} from "./bunion";

const ajv = new AJV();
const schema = require('../assets/schema/bunion.conf.json');

export const getProducerLevel = (): BunionLevel => {
  return <BunionLevel>process.env.bunion_producer_max_level ||
    <BunionLevel>process.env.bunion_producer_level ||
    <BunionLevel>process.env.bunion_log_level ||
    <BunionLevel>process.env.bunion_level ||
    BunionLevelInternal.TRACE;
};

export const getConsumerLevel = (): BunionLevel => {
  return <BunionLevel>process.env.bunion_consumer_max_level ||
    <BunionLevel>process.env.bunion_consumer_level ||
    <BunionLevel>process.env.bunion_log_level ||
    <BunionLevel>process.env.bunion_level ||
    BunionLevelInternal.TRACE;
};


const getDefaultBunionConf = (): BunionConf => {
  return {
    producer: {
      appName: process.env.bunion_app_name || 'default',
      optimizedForConsumer: process.env.bunion_optimized === 'yes',
      forceRaw: process.env.bunion_force_raw === 'yes',
      level: getProducerLevel(),
      fields: {},
      getHostNameSync() {
        return process.env.bunion_host_name || os.hostname();
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
      level: getConsumerLevel(),
      match: [],
      matchAny: [],
      matchAll: [],
      formatDateToString(d: string | Date): string {
        if (!(d && d instanceof Date)) {
          return new Date(d).toUTCString();
        }
        return d.toUTCString();
      },
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
    producer.warn('Missing ".bunion.js" file:', err);
    conftemp = {};
  }
  
  conftemp = conftemp.default || conftemp;
  
  const conf = <BunionConf>deepMixin(getDefaultBunionConf(), conftemp);
  
  conf.producer.level = <BunionLevel>String(conf.producer.level || '').trim().toUpperCase();
  conf.consumer.level = <BunionLevel>String(conf.consumer.level || '').trim().toUpperCase();
  
  
  if (!(BunionLevelInternal as any)[conf.producer.level]) {
    throw new Error(`Bunion producer level is not valid: ${util.inspect(conf.producer.level)}`)
  }
  
  if (!(BunionLevelInternal as any)[conf.consumer.level]) {
    throw new Error(`Bunion consumer level is not valid: ${util.inspect(conf.consumer.level)}`)
  }
  
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
    consumer.debug('Error validating bunion conf:', e);
  }
  
  return conf;
  
};

export const bunionConf = getConf();
export const transformKeys = bunionConf.consumer.transform && bunionConf.consumer.transform.keys;
export const transformers = Object.keys(transformKeys || {});