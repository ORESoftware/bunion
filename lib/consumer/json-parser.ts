'use strict';

import readline = require('readline');
import * as safe from '@oresoftware/safe-stringify';
import {JSONParser} from "@oresoftware/json-stream-parser";

export interface ParserOptions {
  onlyParseableOutput: boolean,
  clearLine: boolean
}

export const createRawParser = () => {
  return new JSONParser({
    includeByteCount: true,
    emitNonJSON: true,
    includeRawString: true,
    delayEvery: 55
  });
};


