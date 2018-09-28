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

//////////////////////////////////////////////////

export const createParser = function (opts: ParserOptions) {
  
  const onlyParseableOutput = Boolean(opts.onlyParseableOutput);
  const clearLine = Boolean(opts.clearLine);
  
  const strm = new JSONParser();
  
  strm.on('data', function (d: string | IParsedObject) {
  
    if(clearLine){
      readline.clearLine(process.stdout, 0);  // clear current text
      readline.cursorTo(process.stdout, 0);   // move cursor to beginning of line
    }
    
    if (typeof d === 'string') {
      if (onlyParseableOutput === false) {
        process.stdout.write(d + '\n');
      }
      return;
    }
    
    if (d && !d['@bunion'] && onlyParseableOutput === false) {
      try {
        process.stdout.write(safe.stringify(d) + '\n');
      }
      catch (err) {
        process.stdout.write(String(d) + '\n');
      }
    }
  
    if (d && d['@bunion'] === true) {
      strm.emit('bunion-json', d);
      return;
    }
    
  });
  
  return strm;
  
};

export default createParser;
