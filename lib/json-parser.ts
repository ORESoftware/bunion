'use strict';

import readline = require('readline');
import * as safe from '@oresoftware/safe-stringify';
import {JSONParser} from "@oresoftware/json-stream-parser";

//////////////////////////////////////////////////


export interface ParserOptions {
  onlyParseableOutput: boolean,
  clearLine: boolean
}

export const createParser = (opts: ParserOptions) => {
  
  const onlyParseableOutput = Boolean(opts.onlyParseableOutput);
  const clearLine = Boolean(opts.clearLine);
  
  const strm = new JSONParser({includeByteCount: true, emitNonJSON: true});
  
  strm.on('data', function (d:any) {
    
    // if (clearLine) {
    //   readline.clearLine(process.stdout, 0);  // clear current text
    //   readline.cursorTo(process.stdout, 0);   // move cursor to beginning of line
    // }
    
    if (d && d['@bunion'] === true) {
      strm.emit('bunion-json', d);
      return;
    }
    
    strm.emit('json', d);
    
  });
  
  return strm;
  
};

export default createParser;
