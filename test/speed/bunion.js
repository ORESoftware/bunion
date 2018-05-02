

const {log} = require('bunion');
// const log = Bunion.getNewLogger();

log.addFields({foo:'stank'});

const log2 = log.child().addField('mark','rubio');


for(let i = 0; i < 100000; i++){
  Math.random() > 0.2 && console.log('foo biz baz');
  log.info('booty');
  log.warn('biggo');
  Math.random() > 0.2 && console.error(' 1 2 3');
  log2.info('sam');
  log.error('zzzz');
}


process.exit(0);