'use strict';

import {consumer} from '../logger';

process.on('uncaughtException', (e: any) => {
  console.error();
  consumer.error('Uncaught exception:', e || e);
  console.error();
  process.exit(1);
});

process.on('unhandledRejection', (e: any) => {
  console.error();
  consumer.error('Unhandled rejection:', e || e);
  console.error();
  process.exit(1);
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