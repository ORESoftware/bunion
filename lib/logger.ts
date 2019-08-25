'use strict';

import chalk from 'chalk';
const isDebug = process.argv.indexOf('--debug') > 1 || process.env.is_bxn_debug == 'yes';

export const producer = {
  info: console.log.bind(console, chalk.bold('bunion:')),
  error: console.error.bind(console, chalk.red.bold.underline('bunion error:')),
  warn: console.error.bind(console, chalk.yellow.bold.underline('bunion warning:')),
  debug(...args: Array<any>) {
    if (isDebug) {
      console.error('debug:', ...args);
    }
  }
};

export const consumer = {
  info: console.log.bind(console, chalk.bold('bunion consumer info:')),
  error: console.error.bind(console, chalk.red.bold.underline('bunion consumer error:')),
  warn: console.error.bind(console, chalk.yellow.bold.underline('bunion consumer warning:')),
  debug(...args: Array<any>) {
    if (isDebug) {
      console.error('debug:', ...args);
    }
  }
};