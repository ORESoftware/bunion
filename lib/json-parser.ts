'use strict';

import * as stream from 'stream';
import readline = require('readline');
import {customStringify} from "./utils";

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
  
  let lastLineData = '';
  
  const strm = new stream.Transform({
    
    objectMode: true,
    
    transform(chunk: any, encoding: string, cb: Function) {
      
      let data = String(chunk);
      if (lastLineData) {
        data = lastLineData + data;
      }
      
      let lines = data.split('\n');
      lastLineData = lines.splice(lines.length - 1, 1)[0];
      
      lines.forEach(l => {
        try {
          // l might be an empty string; ignore if so
          l && this.push(JSON.parse(l));
        }
        catch (err) {
          l && this.push(l);
        }
      });
      
      cb();
      
    },
    
    flush(cb: Function) {
      if (lastLineData) {
        try {
          this.push(JSON.parse(lastLineData));
        }
        catch (err) {
          this.push(lastLineData);
        }
      }
      lastLineData = '';
      cb();
    }
  });
  
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
        process.stdout.write(customStringify(d) + '\n');
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
