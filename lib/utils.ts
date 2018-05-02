'use strict';

import path = require('path');
import {BunionConf, BunionLevelInternal} from "./bunion";
import {findProjectRoot} from "residence";
import AJV = require('ajv');
import * as util from "util";
import {producer} from "./logger";
import chalk from "chalk";
const ajv = new AJV();
const schema = require('../assets/schema/bunion.conf.json');

///////////////////////////////////////////////////////////////////////////////

export const customStringify = function (v: object) {
  let cache = new Map<any, true>();
  return JSON.stringify(v, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.get(value) === true) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.set(value, true);
    }
    return value;
  });
};

const getDefaultBunionConf = function (): BunionConf {
  return {
    producer: {
      name: null,
      appName: null,
      level: BunionLevelInternal.INFO,
      inspect: {
        array: {
          length: 5
        },
        object: {
          depth: 5
        }
      }
    },
    consumer: {
      localeDateString: 'en-US',
      highlightMatches: true,
      level: BunionLevelInternal.INFO,
      match: [],
      matchAny: [],
      matchAll: []
    }
  }
};

export const getConf = function (): BunionConf {
  
  let projectRoot: string;
  
  try {
    projectRoot = findProjectRoot(process.cwd());
  }
  catch (err) {
    console.error('bunion could not find the project root given the current working directory:', process.cwd());
    throw err;
  }
  
  let confPath, conf;
  
  try {
    confPath = path.resolve(projectRoot + '/' + '.bunion.json');
    conf = require(confPath);
  }
  catch (err) {
    return getDefaultBunionConf();
  }
  
  const valid = ajv.validate(schema, conf);
  
  if (!valid) {
    producer.error('Your bunion configuation file has an invalid format, see the following error(s):');
    ajv.errors.forEach(function (e) {
      console.error(util.inspect(e));
    });
    throw chalk.red('Bunion configuration error - your config is invalid, see above errors.')
  }
  
  return Object.assign({}, getDefaultBunionConf(), conf);
  
};
