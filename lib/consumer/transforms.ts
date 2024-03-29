'use strict';

import {clearLine, getHighlightedString, getInspected, writeStatusToStdout, writeToStdout} from './bunion-utils';
import {consumer} from '../loggers';
import * as util from "util";
import {ConType} from './con';
import {utilInspectOpts} from './constants';

import {transformers, bunionConf, transformKeys} from '../conf';
import {onStandardizedJSON} from './on-std-json';
import {getErrorString} from '../utils';
import {opts} from "./opts";
import {Transformer} from "../bunion";

let transformer: Transformer = null;

if (opts.key) {
  transformer = transformKeys[opts.key];
  if (!transformer) {
    throw 'No transform object could be found for key: ' + opts.key;
  }
}

const getId = (v: any): string => {
  
  if (v && typeof v[0] === 'string') {
    return v[0].split(':')[0];  //   ["@app:version", x,y,z]
  }
  
  if (v && v.id && typeof v.id === 'string') {
    return v.id.split(':')[0]
  }
  
  // return <any>sym;
  return '';
  
};

const runTransform = (v: any, t: any, con: ConType, opts: any): boolean => {
  
  try {
    const c = t.transformToBunionFormat(v);
    if (c && typeof c === 'object') {
      onStandardizedJSON(con, opts, c);
      return true;
    }
  }
  catch (err) {
    return false;  // explicit for your pleasure
  }
  
};

export const onBunionUnknownJSON = (con: ConType, opts: any, v: any): void => {
  
  const t = transformer || transformKeys[getId(v)];
  
  if (t && runTransform(v, t, con, opts)) {
    return;
  }
  
  for (let k of transformers) {
    
    const t = transformKeys[k];
    
    if (t && typeof t.identifyViaJSObject === 'function') {
      
      try {
        let bool = t.identifyViaJSObject(v);
        if (bool && runTransform(v, t, con, opts)) {
          return;
        }
      }
      catch (err) {
        clearLine();
        consumer.error("6077a87d-12cf-4c32-a5e8-1068beeabda0", err);
        consumer.error('Could not call identifyViaJSObject(v) for value v:', v);
        consumer.error('The function body is:', t.identifyViaJSObject.toString());
      }
      
    }
    
  }
  
  // util.inspect(v, utilInspectOpts)
  // JSON.stringify(v))
  
  writeToStdout(getHighlightedString(getInspected(v, opts), con, opts), '\n');
  writeStatusToStdout(con);
  
};

export const getValFromTransform = (t: any, v: any, con: ConType, opts: any): string => {
  
  let val = '';
  
  if (typeof t.identifyViaJSObject === 'function') {
    
    let bool;
    try {
      bool = t.identifyViaJSObject(v);
    }
    catch (err) {
      clearLine();
      consumer.error("eb4ab246-38d5-48f2-b45e-9f114682dc02", err);
      consumer.error('Could not call identifyViaJSObject(v) for value v:', v);
      consumer.error('The function body is:', t.identifyViaJSObject.toString());
      writeStatusToStdout(con);
    }
    
    if (bool && typeof t.getValue === 'function') {
      try {
        val = t.getValue(v);
      }
      catch (err) {
        clearLine();
        consumer.error("790df3cf-2c3b-4cc2-adab-c6e6bfd805ae", err);
        consumer.error('Could not call getValue on value:', v);
        consumer.error('The function body is:', t.getValue.toString());
        writeStatusToStdout(con);
      }
      
    }
    
  }
  
  return getInspected(val, opts);
  
};

export const getValFromTransformAlreadyIdentified = (t: any, v: any, opts: any): string => {
  
  let val = '';
  
  try {
    if (typeof t.getValue === 'function') {
      val = t.getValue(v);
    }
  }
  catch (err) {
    consumer.error("02fd713c-0cbe-41ff-bc47-f957f8ad39e8", err);
  }
  
  return getInspected(val, opts);
  
  // if(val && val['@bunion-error'] === true){
  //   return getErrorString(1, val);
  // }
  //
  // return util.inspect(v, utilInspectOpts);
  
};

export const NOT_PARSED_SYMBOL = Symbol('could not parse value from message.');

export const getValue = (v: any, con: ConType, opts: any): string | Symbol => {
  
  if (!(v && typeof v === 'object')) {
    return typeof v === 'string' ? v : String(v);
  }
  
  const isArray = Array.isArray(v);
  const z = isArray ? v[v.length - 1] : v.value;
  
  if (isArray && String(v[0]).startsWith('@bunion')) {
    return getInspected(z, opts);
  }
  
  const t = transformKeys[getId(v)];
  
  let val = '';
  
  if (t) {
    
    try {
      val = getValFromTransformAlreadyIdentified(t, v, opts);
    }
    catch (e) {
      consumer.warn(e);
    }
    
    if (val) {
      return val;
    }
  }
  
  for (let k of transformers) {
    
    const t = transformKeys[k];
    
    try {
      val = getValFromTransform(t, v, con, opts);
    }
    catch (e) {
      consumer.warn(e);
    }
    
    if (val) {
      return val;
    }
    
  }
  
  if (v['@bunion'] === true && v.value) {
    return typeof v.value === 'string' ? v.value : util.inspect(v.value, utilInspectOpts);
  }
  
  return NOT_PARSED_SYMBOL;
  
};