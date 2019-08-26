'use strict';

import chalk from 'chalk';

export const log = {
  info: console.log.bind(console, chalk.bold('bunion:')),
  warn: console.log.bind(console, chalk.yellow('bunion warning:')),
  error: console.error.bind(console, chalk.red.bold.underline('bunion error:'))
};

export default log;