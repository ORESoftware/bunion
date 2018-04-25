'use strict';


import chalk from 'chalk';
const appName = 'cdt-oplog-server';


const getJSON = function(level: string, args: string[]){
  return JSON.stringify({
    date: Date.now(),
    value: args.join(' '),
    appName: appName,
    level
  });
};


export const log = {
  info: function (...args: string[]) {
    process.stdout.write(getJSON('INFO', args) + '\n');
  },
  debug: function (...args: string[]) {
    process.stdout.write(getJSON('DEBUG', args) + '\n');
  },
  warn: function (...args: string[]) {
    process.stderr.write(getJSON('WARN', args) + '\n');
  },
  error: function (...args: string[]) {
    process.stderr.write(getJSON('ERROR', args) + '\n');
  },
  trace: function (...args: string[]) {
    process.stdout.write(getJSON('TRACE', args) + '\n');
  },
};



export default log;
