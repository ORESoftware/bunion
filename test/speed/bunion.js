

const Bunion = require('bunion');

const log = Bunion.getNewLogger();


for(let i = 0; i < 100000; i++){
  log.info('booty');
}


process.exit(0);