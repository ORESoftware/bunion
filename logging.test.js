'use strict';


const {log} = require('bunion');
const os = require('os');

process.on('SIGINT', s => {
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e.message || e);
});

process.on('unhandledRejection', (e) => {
  console.error('Unhandled rejection:', e.message || e);
});


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
  
  // log.infox({zebra: 'blues', dog: 'not cat'}, '');
  log.info(i++, 'just saying hi.');
  log.warn(i++, 'shit hit the fan');
  // log.error(i++, new Error('foo'));
  log.debug(i++, getRandomStr());
  log.trace(i++, getRandomStr());
  log.debug(i++, getRandomStr());
  // console.log('foo bar 133');
  
  // console.log(JSON.stringify({
  //   id: '@truvia',
  //   appName: 'garbo',
  //   message: getRandomStr(),
  //   host: os.hostname(),
  //   level: 'INFO',
  //   pid: process.pid,
  //   date: new Date().toUTCString(),
  //   fields: {a: 'foo', b: 5}
  // }));
  
  setTimeout(run, 200);
  
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
