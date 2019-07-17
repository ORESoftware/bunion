'use strict';

import readline = require('readline');
import * as safe from '@oresoftware/safe-stringify';
import {JSONParser} from "@oresoftware/json-stream-parser";

//////////////////////////////////////////////////

export interface IParsedObject {
  [index: string]: any
}

export interface ParserOptions {
  onlyParseableOutput: boolean,
  clearLine: boolean
}

export const createParser = (opts: ParserOptions) => {
  
  const onlyParseableOutput = Boolean(opts.onlyParseableOutput);
  const clearLine = Boolean(opts.clearLine);
  
  const strm = new JSONParser({includeByteCount: true});
  
  
  strm.on('string', d => {
  
  
  });
  
  strm.on('data', function (d: string | IParsedObject) {
    
    // if (clearLine) {
    //   readline.clearLine(process.stdout, 0);  // clear current text
    //   readline.cursorTo(process.stdout, 0);   // move cursor to beginning of line
    // }
    
    if (typeof d === 'string') {
      throw 'This should not happen - json-parser should only emit JS objects from the data handler.';
    }
    
    
    if (d && d['@bunion'] === true) {
      strm.emit('bunion-json', d);
      return;
    }
    
    if(!(d && typeof d === 'object')){
      throw 'value should be an object here.';
    }
    
    strm.emit('json', d);
    
  });
  
  return strm;
  
};

export default createParser;
