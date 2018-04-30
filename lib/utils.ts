'use strict';

import path = require('path');
import {BunionConf, BunionLevelInternal} from "./bunion";
import {findProjectRoot} from "residence";

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
  
  try {
    const confPath = path.resolve(projectRoot + '/' + '.bunion.json');
    const conf = require(confPath);
    return Object.assign({}, getDefaultBunionConf(), conf);
  }
  catch (err) {
    return getDefaultBunionConf();
  }
};
