'use strict';

import {BunionJSON, BunionMode} from '../bunion';
import {clearLine, getHighlightedString, getInspected, handleSearchTermMatched} from './bunion-utils';
import chalk from 'chalk';
import {getFields} from '../utils';
import {ConType} from './con';
import {consumer} from '../loggers';

const getDarkOrlight = (str: string, opts: any) => {
  return opts.darkBackground ? `${chalk.white.bold(str)}` : `${chalk.black.bold(str)}`;
};

const makeBold = (str: string) => {
  return chalk.bold(str);
};

const getCleanAppName = (v: { appName: string }): string => {
  return String(v.appName).startsWith('app:') ? v.appName : `app:${chalk.bold(v.appName)}`;
};

const acceptableLevels = new Set([
  'WARN', 'ERROR', 'FATAL', 'DEBUG', 'TRACE', 'INFO'
]);

export const onStandardizedJSON = (con: ConType, opts: any, v: BunionJSON) => {
  
  if (con.mode === BunionMode.CLOSED) {
    return;
  }
  
  if (con.mode === BunionMode.PAUSED) {
    return;
  }
  
  if (!(v && v['@bunion'] === true)) {
    throw 'Internal bunion error - we should not have non-bunion-json at this point in the program. Please report this problem.';
  }
  
  clearLine();
  
  const msgVal = getHighlightedString(getInspected(v.value, opts), con, opts);
  const isMatched = con.searchTerm !== '' && new RegExp(con.searchTerm, 'i').test(msgVal);
  
  // if (!(v as any)[RawJSONBytesSymbol]) {
  //   throw new Error('Bunion JSON should have raw json bytes property: ' + util.inspect(v));
  // }
  
  // since we always log something after this line, we can add it here
  
  let fields = '', theDate = '';
  
  if (opts.output === 'short') {
    theDate = '';
    v.appName && (v.appNameDisplay = getCleanAppName(v));
  }
  else if (opts.output === 'medium') {
    // const d = new Date(v.date);
    // v.d = chalk.bold(`${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')}`);
    theDate = v.date;
    v.appNameDisplay = getCleanAppName(v);
  }
  else {
    // const d = new Date(v.date);
    // v.d = chalk.bold(`${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')}`);
    theDate = v.date;
    v.appNameDisplay = `${v.host} ${v.pid} ${getCleanAppName(v)}`;
  }
  
  // const msgVal = getInspected(v.value);
  
  if (v.fields) {
    fields = getFields(v.fields);
  }
  
  if (v.level === 'FATAL') {
    process.stdout.write(
      `${chalk.gray(theDate)} ${chalk.gray(v.appNameDisplay)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${makeBold(msgVal)} \n`
    );
  }
  
  if (v.level === 'ERROR' && con.logLevel < 6) {
    process.stdout.write(
      `${chalk.gray(theDate)} ${chalk.gray(v.appNameDisplay)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${makeBold(msgVal)} \n`
    );
  }
  
  if (v.level === 'WARN' && con.logLevel < 5) {
    process.stdout.write(
      `${chalk.gray(theDate)} ${chalk.gray(v.appNameDisplay)} ${chalk.blue.bold.underline.italic(v.level)} ${chalk.gray(fields)} ${msgVal} \n`
    );
  }
  
  if (v.level === 'INFO' && con.logLevel < 4) {
    process.stdout.write(
      `${chalk.gray(theDate)} ${chalk.gray(v.appNameDisplay)} ${chalk.blueBright(v.level)} ${chalk.gray(fields)} ${msgVal} \n`
    );
  }
  
  if (v.level === 'DEBUG' && con.logLevel < 3) {
    process.stdout.write(
      `${chalk.gray(theDate)} ${chalk.gray(v.appNameDisplay)} ${chalk.cyan(v.level)} ${chalk.gray(fields)} ${msgVal} \n`
    );
  }
  
  if (v.level === 'TRACE' && con.logLevel < 2) {
    process.stdout.write(
      `${chalk.gray(theDate)} ${chalk.gray(v.appNameDisplay)} ${chalk.gray(v.level)} ${chalk.gray(fields)} ${msgVal} \n`
    );
  }
  
  if (!acceptableLevels.has(v.level)) {
    consumer.warn('The following object does not have a valid level property:', v);
  }
  
  handleSearchTermMatched(con, isMatched);
  
};