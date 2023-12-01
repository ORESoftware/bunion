#!/usr/bin/env node
'use strict';

import log from '../producer/main';
import os = require('os');

process.on('SIGINT', s => {
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error("05c50edc-e96e-4b8a-871f-598a3d16dac5", 'Uncaught exception:', e.message || e);
});

process.on('unhandledRejection', (e: any) => {
  console.error("1f7d9e00-5106-4591-8385-87121a54f22c", 'Unhandled rejection:', e);
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

const run = () => {
  
  log.infox({zebra: 'blues', dog: 'not cat'}, i++, 'fanny');
  log.infox({zebra: 'blues', dog: 'not cat'}, i++, {here: {comes: {the: 'tranny'}}});
  log.info(i++, 'just saying hi.');
  log.warn(i++, 'shit hit the fan');
  
  log.info({"these": {has: {do: {not: 'run'}}}});
  
  // log.error(new Error('bux'));
  
  log.debug(i++, getRandomStr());
  log.trace(i++, getRandomStr());
  log.debug(i++, getRandomStr());
  
  console.log(JSON.stringify({
    id: '@truvia',
    appName: 'garbo',
    message: i++ + ' ' + getRandomStr() + '  XXXZ',
    host: os.hostname(),
    level: 'INFO',
    pid: process.pid,
    date: new Date().toUTCString(),
    fields: {a: 'foo', b: 5}
  }));
  
  console.log(i++, 'this is the real zone, this is not fantasy.');
  console.log(i++, 'easy come easy go.');
  
};

process.stdin.resume().on('data', v => {
  
  const value = String(v || '').split(':');
  
  if (value[0] === 'read') {
    run();
  }
  else{
    console.log(String(v));
  }
  
});
