'use strict';

import {consumer} from '../loggers';

process.on('uncaughtException', (e: any) => {
  console.error();
  consumer.error("a02c3aab-6111-4012-a8a6-33d66e646cde", 'Uncaught exception:', e);
  console.error();
  if (process.env.bunion_no_exit_on_exception !== 'yes') {
    process.exit(1);
  }
  
});

process.on('unhandledRejection', (e: any) => {
  console.error();
  consumer.error("73a7efb5-79cd-4e21-be9e-66ddff7ae87d", 'Unhandled rejection:', e);
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