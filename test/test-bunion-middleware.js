
const express = require('express');
const {log} = require('../dist/producer/main');

const app = express()

process.once('SIGINT', () => process.exit(0))
process.once('SIGTERM', () => process.exit(0))

app.use(log.mw())

app.use((req,res,next) => {
  
  log.addContext(req, {
     userId: 'some-uuid'
  });
  
  next();
  
});

app.use((req, res, next) => {
  
  setTimeout(() => {
    log.info('butterflies');
    res.json("dog")
  },1000)
  
  // throw 'boop';
});

app.use((err, req, res, next) => {
  log.warn({err});
  res.json({error: err})
})

app.listen(3000)