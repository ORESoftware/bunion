'use strict';

import readline = require('readline');
import * as safe from '@oresoftware/safe-stringify';
import {JSONParser} from "@oresoftware/json-stream-parser";

//////////////////////////////////////////////////


export interface ParserOptions {
  onlyParseableOutput: boolean,
  clearLine: boolean
}

export const  createRawParser = () => {
  return new JSONParser({includeByteCount: true, emitNonJSON: true, includeRawString: true});
};



export const createParser = () => {
  
  const strm = new JSONParser({includeByteCount: true, emitNonJSON: true});
  
  strm.on('data', function (d:any) {
    
    // if (clearLine) {
    //   readline.clearLine(process.stdout, 0);  // clear current text
    //   readline.cursorTo(process.stdout, 0);   // move cursor to beginning of line
    // }
  
    if (d && d[0] && String(d[0]).startsWith('@bunion')) {
      strm.emit('bunion-json', d);
      return;
    }
    
    // if (d && d['@bunion'] === true) {
    //   strm.emit('bunion-json', d);
    //   return;
    // }
    
    strm.emit('json', d);
    
  });
  
  return strm;
  
};

export default createParser;
