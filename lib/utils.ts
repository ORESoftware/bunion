'use strict';



import * as util from "util";
import {producer} from "./logger";
import chalk from "chalk";
import deepMixin from '@oresoftware/deep.mixin';
import {consumer} from "./logger";
import * as os from 'os';
import {BunionJSON} from "./bunion";
import {bunionConf} from './conf';
import {pkg} from './pkg-json';
import {bSettings} from "./settings";

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
  
  if (isOptimized) {
    return {
      '@bunion': true,
      '@version': pkgVersion,
      appName: appName,
      pid: bSettings.producerPID,
      host: hstname,
      level: v[0],
      date: v[1],
      fields: v[2],
      value: v[3]
    }
  }
  
  const indx = String(v[0]).indexOf(':');
  const vers = parseInt(String(v[0]).slice(indx).trim());
  
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


