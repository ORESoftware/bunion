

const {log} = require('bunion');
// const log = Bunion.getNewLogger();


// log.addFields({foo:'stank'});

for(let i = 0; i < 100000; i++){
  log.info('booty');
  log.warn('biggo');
  log.error('zzzz');
}


process.exit(0);