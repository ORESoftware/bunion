'use strict';

import options from "./cli-options";
import {consumer} from "../loggers";

const dashdash = require('dashdash');
const allowUnknown = process.argv.indexOf('--allow-unknown') > 1;
let opts: any, cliParser = dashdash.createParser({options: options}, {allowUnknown});

try {
  opts = cliParser.parse(process.argv);
}
catch (e) {
  consumer.error("c7abf3f6-827b-4673-b396-c548e8bacf6d:", e);
  process.exit(1);
}

if (opts.help) {
  const help = cliParser.help({includeEnv: true}).trimRight();
  consumer.info('usage: node foo.js [OPTIONS]\n' + 'options:\n' + help);
  process.exit(0);
}

export {opts};