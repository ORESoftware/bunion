

const {log} = require('bunion');
// const log = Bunion.getNewLogger();


log.addFields({foo:'stank'});

// const log2 = log.child().addField('mark','rubio');


for(let i = 0; i < 100000; i++){
  // if(Math.random() > 0.01) process.stdout.write('foo biz baz');
  log.info('booty');
  log.warn('biggo');
  // log2.info('sam');
  log.error('zzzz');
}


process.exit(0);