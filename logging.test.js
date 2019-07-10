'use strict';


const {log} = require('bunion');

process.on('SIGINT', s => {
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e.message || e);
});

process.on('unhandledRejection', (e) => {
  console.error('Unhandled rejection:', e.message || e);
});


(function run(){
  
  log.info('just saying hi.');
  log.warn('shit hit the fan');
  log.error(new Error('foo'));
  
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
