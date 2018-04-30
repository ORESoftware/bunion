

const Bunion = require('bunion');

const log = Bunion.getNewLogger();


for(let i = 0; i < 1000000; i++){
  log.info('booty');
}


process.exit(0);