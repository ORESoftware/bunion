'use strict';

import {consumer} from '../loggers';

process.on('uncaughtException', (e: any) => {
  console.error();
  consumer.error('Uncaught exception:', e);
  console.error();
  if (process.env.bunion_no_exit_on_exception !== 'yes') {
    process.exit(1);
  }
  
});

process.on('unhandledRejection', (e: any) => {
  console.error();
  consumer.error('Unhandled rejection:', e);
  console.error();
  if (process.env.bunion_no_exit_on_exception !== 'yes') {
    process.exit(1);
  }
});

process.on('SIGINT', function () {
  console.error();
  consumer.warn('SIGINT received. Current pid:', process.pid);
});

process.on('SIGHUP', function () {
  console.error();
  consumer.warn('SIGHUP received. Current pid:', process.pid);
});

process.on('SIGTERM', function () {
  console.error();
  consumer.warn('SIGTERM received. Current pid:', process.pid);
});

process.on('SIGPIPE', () => {
  console.error();
  consumer.warn('SIGPIPE received. Current pid:', process.pid);
});