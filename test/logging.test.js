'use strict';

const fs = require('fs');
const {ReadStream} = require("tty");

const {log} = require('bunion');
const os = require('os');

process.on('SIGINT', s => {
  log.warn('sigint received by producer.');
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e);
});

process.on('unhandledRejection', (e) => {
  console.error('Unhandled rejection:', e);
});

// const fd = fs.openSync('/dev/tty', 'r');
// const strm  = new ReadStream(fd);
// strm.setRawMode(true);

// strm.on('data', (d) => {
//   console.log('logger.!!!');
// });

let i = 0;

const getRandomStr = () => {
  let i = 0, res = '';
  while (i++ < 12) {
    res += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  return res;
  
};

// log.setFields({zebra: '5', car: 'choose'});

(function run() {
  
  log.infox({zebra: 'blues', dog: 'not cat'}, i++, 'fanny');
  log.info(i++, 'just saying hi.');
  log.warn(i++, 'shit hit the fan');
  
  log.error(i++, {"these": {colors: {do: {not: 'run'}}}});
  
  log.error(i++, new Error('bux'));
  
  log.debug(i++, getRandomStr());
  log.trace(i++, getRandomStr());
  log.debug(i++, getRandomStr());
  
  console.log(JSON.stringify({
    id: '@truvia',
    appName: 'garbo',
    message: i++ + ' ' + getRandomStr() + '  XXXZ',
    host: os.hostname(),
    level: 'INFO',
    pid: process.pid,
    date: new Date().toUTCString(),
    fields: {a: 'foo', b: 5}
  }));
  
  console.log(i++, 'this is the real zone, this is not fantasy.');
  console.log(i++, 'easy come easy go.');
  
  setTimeout(run, Math.floor(10 + Math.random() * 10));
  
})();

// const fs = require('fs');
// const {ReadStream} = require("tty");
//
// const fd = fs.openSync('/dev/tty', 'r+');
//
// console.log({fd});
//
// const strm = new ReadStream(fd);
//
// strm.setRawMode(true);
//
// strm.on('data', (d) => {
//
//   console.log(111, {d: String(d)});
//
//   if(String(d) === '\u0004'){
//     console.warn('producer: User hit control-D');
//     process.exit(1);
//   }
//
//   if(String(d) === '\u0003'){
//     console.warn('producer: User hit control-C');
//     process.exit(1);
//   }
//
// });

