'use strict';

import path = require('path');
import {BunionConf, BunionLevelInternal} from "./bunion";
import {findProjectRoot} from "residence";
import AJV = require('ajv');
import * as util from "util";
import {producer} from "./logger";
import chalk from "chalk";
import deepMixin from '@oresoftware/deep.mixin';
const ajv = new AJV();
const schema = require('../assets/schema/bunion.conf.json');

///////////////////////////////////////////////////////////////////////////////

const getDefaultBunionConf = (): BunionConf => {
  return {
    producer: {
      name: 'default',
      appName: 'default',
      level: BunionLevelInternal.TRACE,
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
      level: BunionLevelInternal.TRACE,
      match: [],
      matchAny: [],
      matchAll: []
    }
  }
};

export const getConf = (): BunionConf => {

  let projectRoot: string;

  try {
    projectRoot = findProjectRoot(process.cwd());
  }
  catch (err) {
    console.error('bunion could not find the project root given the current working directory:', process.cwd());
    throw err;
  }

  let confPath, conftemp;

  try {
    confPath = path.resolve(projectRoot + '/' + '.bunion.json');
    conftemp = require(confPath);
  }
  catch (err) {
    console.error('Missing ".bunion.json" file:',err.message);
  }
  
  
  const conf = <BunionConf>deepMixin(getDefaultBunionConf(), conftemp);
  const valid = ajv.validate(schema, conf);

  if (!valid) {
    producer.error('Your bunion configuation file has an invalid format, see the following error(s):');
    ajv.errors.forEach(function (e) {
      console.error(util.inspect(e));
    });
    throw chalk.red('Bunion configuration error - your config is invalid, see above errors.')
  }

  return conf;
  
};
