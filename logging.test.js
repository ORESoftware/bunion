'use strict';

const {log} = require('bunion');

process.on('SIGINT', s => {
  process.exit(1);
});

(function run(){
  
  log.info('just saying hi.');
  log.warn('shit hit the fan');
  log.error(new Error('foo'));
  
  setTimeout(run,200);
  
})();
