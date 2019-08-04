'use strict';

import path = require('path');
import {BunionConf, BunionLevelInternal} from "./bunion";
import {findProjectRoot} from "residence";
import AJV = require('ajv');
import * as util from "util";
import {producer} from "./logger";
import chalk from "chalk";
import deepMixin from '@oresoftware/deep.mixin';
import {consumer} from "./logger";

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

const getDefaultBunionConf = (): BunionConf => {
  return {
    producer: {
      name: 'default',
      appName: 'default',
      forceRaw: false,
      level: BunionLevelInternal.TRACE,
      inspect: {
        array: {
          length: 5
        },
        object: {
          depth: 5
        }
      },
      fields: {}
    },
    consumer: {
      localeDateString: 'en-US',
      highlightMatches: true,
      level: BunionLevelInternal.TRACE,
      match: [],
      matchAny: [],
      matchAll: [],
      transform: {
        keys: {}
      }
    }
  }
};

export const getConf = (): BunionConf => {
  
  let projectRoot: string;
  
  try {
    projectRoot = findProjectRoot(process.cwd());
  }
  catch (err) {
    producer.error('bunion could not find the project root given the current working directory:', process.cwd());
    throw err;
  }
  
  projectRoot = projectRoot || process.cwd();
  
  let confPath, conftemp;
  
  try {
    confPath = path.resolve(projectRoot + '/' + '.bunion.js');
    conftemp = require(confPath);
  }
  catch (err) {
    producer.error('Missing ".bunion.js" file:', err.message);
    conftemp = {};
  }
  
  conftemp = conftemp.default || conftemp;
  
  const conf = <BunionConf>deepMixin(getDefaultBunionConf(), conftemp);
  
  try {
    const valid = ajv.validate(schema, conf);
    
    // console.log({conf});
    
    if (!valid) {
      producer.warn('Your bunion configuation file has an invalid format, see the following error(s):');
      for (const e of ajv.errors) {
        producer.error(util.inspect(e));
      }
    }
  }
  catch (e) {
    consumer.debug(e.message || e);
  }
  
  return conf;
  
};
