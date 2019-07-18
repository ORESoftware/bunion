'use strict';

import chalk from 'chalk';

export const producer =  {
  info: console.log.bind(console, chalk.bold('bunion:')),
  error: console.error.bind(console, chalk.red.bold.underline('bunion error:')),
  warn: console.error.bind(console, chalk.yellow.bold.underline('bunion warning:'))
};


export const consumer = {
  info: console.log.bind(console, chalk.bold('bunion consumer info:')),
  error: console.error.bind(console, chalk.red.bold.underline('bunion consumer error:')),
  warn: console.error.bind(console, chalk.yellow.bold.underline('bunion consumer warning:'))
};