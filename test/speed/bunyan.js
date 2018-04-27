const bunyan = require('bunyan');

const log = bunyan.createLogger({name: 'foo'});


for(let i = 0; i < 100000; i++){
  log.info('booty');
}


process.exit(0);