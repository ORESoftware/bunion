import chalk from 'chalk';

export default  {
  info: console.log.bind(console, chalk.bold('bunion:')),
  error: console.error.bind(console, chalk.red.bold.underline('bunion error:'))
};