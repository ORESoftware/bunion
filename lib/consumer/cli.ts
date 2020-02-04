'use strict';

import './handle-exit';
import {createRawParser} from "./json-parser";
import {BunionJSON, BunionLevelToNum, BunionMode} from "../bunion";
import JSONParser, {RawStringSymbol} from "@oresoftware/json-stream-parser";
import * as util from "util";
import chalk from "chalk";
import * as readline from "readline";
import {consumer} from "../loggers";
import {ReadStream} from "tty";
import {LinkedQueue, LinkedQueueValue} from "@oresoftware/linked-queue";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import options from './cli-options';
import log from '../logging'
import uuid = require("uuid");
import Timer = NodeJS.Timer;
import {makeCon} from './con';
import makeServer from './server';
import {bSettings} from "../settings";
import {
  getInspected,
  clearLine,
  getHighlightedString,
  replacer,
  writeToStdout,
  writeStatusToStdout, handleSearchTermMatched
} from './bunion-utils';
import {onStandardizedJSON} from './on-std-json';
import {getValue, onBunionUnknownJSON} from './transforms';
import {ctrlChars, levelMap} from './constants';
import {ConType} from "./con";
import {opts} from './opts';
import {convertToBunionMap} from "../utils";
import {NOT_PARSED_SYMBOL} from "./transforms";
import {utilInspectOpts} from "./constants";

const dirId = uuid.v4();
const bunionHome = path.resolve(process.env.HOME + '/.bunion');
const runs = path.resolve(bunionHome + '/runs');
const runId = path.resolve(runs + '/' + dirId);
const logFileId = path.resolve(runId + '/run.log');
const rawFileId = path.resolve(runId + '/raw.log');
// const fileDir = path.resolve(runId + '/files');

try {
  fs.mkdirSync(bunionHome);
}
catch (err) {
  // ignore
}

try {
  fs.mkdirSync(runs);
}
catch (e) {
  // ignore
}

try {
  fs.mkdirSync(runId);
}
catch (e) {
  // ignore
}

const maxIndex = 1;
const inspect = opts.inspect = true;
const output = opts.output = 'medium' || 'short';
const highlight = opts.highlight = Boolean(true);
const darkBackground = Boolean(true);
const con: ConType = makeCon(maxIndex);

const budsFile = process.env.bunion_uds_file || '';
const cwd = process.cwd();
const {sendRequestForData, connections} = makeServer(budsFile, cwd, con);

const rawFD = fs.openSync(rawFileId, 'w+');
const logFD = fs.openSync(logFileId, 'w+');

const tryAndLogErrors = (fn: EVCb<void>) => {
  try {
    fn(null);
  }
  catch (err) {
    consumer.warn(err.message || err);
  }
};

process.once('exit', code => {
  
  // process.removeAllListeners();
  
  tryAndLogErrors(() => fs.closeSync(rawFD));
  tryAndLogErrors(() => fs.closeSync(logFD));
  
  // tryAndLogErrors(() => con.rsi && con.rsi.destroy());
  // fs.unlinkSync(logFileId);
  // fs.unlinkSync(rawFileId);
  
  tryAndLogErrors(() => fs.unlinkSync(rawFileId));
  
  if (con.keepLogFile) {
    consumer.info('Log file path:', rawFileId);
  }
  else {
    tryAndLogErrors(() => fs.unlinkSync(logFileId));
    tryAndLogErrors(() => fs.rmdirSync(runId))
  }
  
  consumer.debug('exiting with code:', code);
  process.exit(code);
  
});

export const onData = (d: any) => {
  
  if (typeof d === 'string') {
    
    if (d.length < 1) {
      consumer.warn('Line had length less than 1.');
      return;
    }
    
    clearLine();
    console.log(getHighlightedString(d, con, opts));
    
    let val = null;
    try {
      val = getValue(d, con, opts);
    }
    catch (err) {
      log.error('error getting value:', err);
    }
    
    if (val === NOT_PARSED_SYMBOL) {
      consumer.warn('Could not parse value from:', d);
      val = '';
    }
    
    const isMatched = con.searchTerm !== '' && new RegExp(con.searchTerm, 'i').test(<string>val);
    handleSearchTermMatched(con, isMatched);
    
    return;
  }
  
  if (d && typeof d[0] === 'string' && d[0].split(':')[0] === '@bunion') {
    onJSON(d);
    return;
  }
  
  if (d && d['@bunion'] === true) {
    onStandardizedJSON(con, opts, d);
    return;
  }
  
  onBunionUnknownJSON(con, opts, d);
  
};

const onJSON = (v: Array<any>) => {
  return onStandardizedJSON(con, opts, convertToBunionMap(v));
};

const readFromFile = (pos: number): any => {
  
  const start = pos * 50;
  const b = Buffer.alloc(299);
  fs.readSync(logFD, b, 0, b.length, start);
  const i = b.indexOf(0x00);
  const nb = b.slice(0, i);
  
  try {
    var nbt = String(nb).trim();
    var v = JSON.parse(nbt);
  }
  catch (err) {
    consumer.warn('Could not parse:', nbt);
    consumer.warn('Parse error was:', typeof err === 'string' ? err : util.inspect(err, utilInspectOpts));
    return '[Could not parse line from file 1.]';
  }
  
  try {
    var nnb = Buffer.alloc(v.b);
    fs.readSync(rawFD, nnb, 0, nnb.length, v.p);
    var mys = String(nnb).trim();
    return JSON.parse(mys);
  }
  catch (err) {
    consumer.warn('Could not parse:', mys);
    consumer.warn('Parse error was:', typeof err === 'string' ? err : util.inspect(err, utilInspectOpts));
    return '[Could not parse line from file 2.]';
  }
  
};

let pos = 0, currDel = 0;

const createDataTimeout = (v: number) => {
  clearTimeout(con.dataTo);
  con.dataTo = setTimeout(() => {
    sendRequestForData();
  }, v);
};

export const handleIn = (d: any) => {
  
  if (con.exiting) {
    consumer.debug('Exiting switch has flipped.');
    return;
  }
  
  if (!d) { // do not check for !(d && typeof d === 'object') since it could be a string/boolean etc
    log.error('Internal error: object should always be defined.');
    log.error('The raw data was:', String(d));
    return;
  }
  
  if (d['@bunion'] === true && Number.isInteger(d.producer_pid)) {
    bSettings.producerPID = d.producer_pid;
    return;
  }
  
  if (d['@bunion'] === true && d['@pid'] === true && Number.isInteger(d.pid)) {
    con.siblingProducerPID = d.pid;
    return;
  }
  
  if (con.mode === BunionMode.READING || con.mode === BunionMode.TAILING) {
    createDataTimeout(20);
  }
  
  const h = con.head++;
  
  if (con.mode === BunionMode.READING) {
    con.current = h;
  }
  
  const raw = JSON.stringify(d) + '\n';
  const byteLen = Buffer.byteLength(raw);
  
  const newVal = JSON.parse(raw);
  con.fromMemory.set(h, newVal);
  
  try {
    fs.writeSync(rawFD, raw, pos);
  }
  catch (err) {
    consumer.warn(err.message || err);
  }
  
  try {
    fs.writeSync(logFD, JSON.stringify({p: pos, b: byteLen}), h * 50, 'utf-8');
  }
  catch (err) {
    consumer.warn(err.message || err);
  }
  
  pos += byteLen;
  
  if (con.fromMemory.size > 4000) {
    con.fromMemory.delete(currDel++);
  }
  
  if (con.mode === BunionMode.READING) {
    onData(newVal);
  }
  
};

const onStdinEnd = () => {
  if (process.env.bunion_force_read_on_stdin_end !== 'yes') {
    con.mode = BunionMode.SEARCHING;
  }
  con.stdinEnd = true;
  clearLine();
  consumer.debug('stdin end');
  writeStatusToStdout(con);
};

const parser = process.stdin.resume()
                      .once('end', onStdinEnd)
                      .pipe(createRawParser())
                      .on('string', handleIn)
                      .on('data', handleIn);

const onTimeout = () => {
  con.paused = true;
  clearLine();
  writeStatusToStdout(con, 'Paused');
  // parser.destroy();
  // process.exit(1);
};

const createTimeout = () => {
  clearTimeout(con.to);
  con.to = setTimeout(onTimeout, con.timeout);
};

const resume = () => {
  
  return;
  
  clearLine();
  
  switch (con.mode) {
    
    case BunionMode.READING:
      return;
    
    case BunionMode.CLOSED:
      con.mode = BunionMode.READING;
      createTimeout();
      return;
    
    default:
      writeStatusToStdout(con);
  }
  
};

const createLoggedBreak = (m: string) => {
  
  let rawColumns = Number.isInteger(process.stdout.columns) ? process.stdout.columns : null;
  const columns = rawColumns || 40;
  const col = Math.max(columns - 8, 4);
  const line = new Array(Math.floor(col / 2)).fill('-').join('');
  
  console.log();
  console.log(`${line}${m}${line}`);
  console.log();
};

const gotoLine = (line: number) => {
  
  const rows = Math.max(25, (process.stdout.rows || 0) + 1);
  const start = Math.max(line - rows - 1, con.tail);
  
  con.current = start;
  
  for (let i = start; i < rows + start; i++) {
    
    if (i > con.head) {
      break;
    }
    
    con.current = i;
    onData(con.fromMemory.get(i) || readFromFile(i));
  }
  
  con.mode = BunionMode.SEARCHING;
  writeStatusToStdout(con);
  
};

type EVCb<T> = (err: any, v?: T) => void;

const onTimeoutSub = (i : number, cb : EVCb<any>) => {
  return () => {
    if (con.mode === BunionMode.TAILING) {
      doTailingSubroutine(i, cb);
    }
  };
};

const doTailingSubroutine = (i: number, cb: EVCb<any>) => {
  
  while (con.mode === BunionMode.TAILING) {
    
    i++;
    
    if (i >= con.head) {
      cb(null);
      break;
    }
    
    con.current = i;
    onData(con.fromMemory.get(i) || readFromFile(i));
    
    if (i % 185 === 0) {
      setTimeout(onTimeoutSub(i, cb), 35);
      break;
    }
  }
  
};

const doTailing = (startPoint?: number) => {
  
  con.mode = BunionMode.TAILING;
  clearLine();
  createLoggedBreak('[ctrl-t]');
  
  let i = Number.isInteger(startPoint) ? startPoint : con.current;
  
  doTailingSubroutine(i, e => {
    
    if (con.mode === <any>BunionMode.SEARCHING) {
      return;
    }
    
    con.mode = BunionMode.READING;
    clearLine();   // remove later, do not need
    createLoggedBreak('[ctrl-p]');  // remove later, do not need
    writeStatusToStdout(con);
    
  });
  
};

const startReading = () => {
  con.current = con.head;
  con.mode = BunionMode.READING;
  clearLine();
  createLoggedBreak('[ctrl-p]');
  writeStatusToStdout(con);
};

const findPreviousMatch = () => {
  
  if (con.searchTerm === '') {
    con.mode = BunionMode.SEARCHING;
    writeToStdout('No search term.');
    return;
  }
  
  let i = Math.max(con.current - 1, con.tail), matched = false;
  const st = con.searchTerm;
  const r = new RegExp(st, 'i');
  
  while (i >= con.tail) {
    
    const v = con.fromMemory.get(i) || readFromFile(i);
    
    let val = null;
    
    try {
      val = getValue(v, con, opts);
    }
    catch (err) {
      log.error('error getting value:', err);
    }
    
    if (val === NOT_PARSED_SYMBOL) {
      consumer.warn('warning: value could not be parsed from:\n', v);
      i--;
      continue;
    }
    
    if (val && r.test(<string>val)) {
      matched = true;
      break;
    }
    
    i--;
  }
  
  if (matched) {
    con.current = i + 5;
    scrollUpFive();
    con.mode = BunionMode.SEARCHING;
    return;
  }
  
  writeToStdout(`Could not find anything matching: '${con.searchTerm}'`);
  con.stopOnNextMatch = true;
  con.mode = BunionMode.SEARCHING;
  
};

const findLatestMatch = () => {
  
  if (con.searchTerm === '') {
    con.mode = BunionMode.SEARCHING;
    writeToStdout('No search term.');
    return;
  }
  
  let i = con.head, matched = false;
  const st = con.searchTerm;
  const r = new RegExp(st, 'i');
  
  while (i >= con.tail) {
    
    const v = con.fromMemory.get(i) || readFromFile(i);
    
    let val = null;
    
    try {
      val = getValue(v, con, opts);
    }
    catch (err) {
      consumer.error('error getting value:', err);
    }
    
    if (val === NOT_PARSED_SYMBOL) {
      consumer.warn('warning: value could not be parsed from:\n', v);
      i--;
      continue;
    }
    
    if (val && r.test(<string>val)) {
      matched = true;
      break;
    }
    
    i--;
  }
  
  if (matched) {
    con.current = i + 5;
    scrollUpFive();
    con.mode = BunionMode.SEARCHING;
    return;
  }
  
  writeToStdout(`Could not find anything matching: '${con.searchTerm}'`);
  con.stopOnNextMatch = true;
  con.mode = BunionMode.SEARCHING;
  
};

const scrollUpOneLine = () => {
  
  const rows = Math.max(25, (process.stdout.rows || 0) + 1);
  const lines: Array<any> = [];
  
  let i = con.current - 1, count = 0;
  
  if (i < con.tail) {
    writeToStdout('(beginning of file)');
    return;
  }
  
  while (count < rows && i >= con.tail) {
    lines.push(con.fromMemory.get(i) || readFromFile(i));
    count++;
    i--;
  }
  
  const ln = lines.length;
  
  for (let i = 0; i < (rows + 1 - ln); i++) {
    process.stdout.write('\n');
  }
  
  con.current--;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    onData(lines[i]);
  }
  
};

const scrollUpFive = () => {
  
  const rows = Math.max(25, (process.stdout.rows || 0) + 1);
  const lines: Array<any> = [];
  
  let amount = 5;
  let i = con.current - amount, count = 0;
  
  while (i < con.tail) {
    amount--;
    i = con.current - amount;
  }
  
  if (i >= con.current) {
    writeToStdout('(beginning of file)');
    return;
  }
  
  while (count < rows && i >= con.tail) {
    lines.push(con.fromMemory.get(i) || readFromFile(i));
    count++;
    i--;
  }
  
  const ln = lines.length;
  
  for (let i = 0; i < (rows - ln); i++) {
    process.stdout.write('\n');
  }
  
  for (let i = lines.length - 1; i >= 0; i--) {
    onData(lines[i]);
  }
  
  con.current -= amount;
  
};

const scrollDown = () => {
  
  let next = con.current + 1;
  
  if (next >= con.head) { // makes no sense, should be next > con.head, but works?
    writeToStdout('(Current end of file)');
    return;
  }
  
  con.current = next;
  onData(con.fromMemory.get(next) || readFromFile(next));
  
};

const scrollDownFive = () => {
  
  let i = 5, next = con.current + i;
  
  while (next > con.head && i > 0) {
    i--;
    next = con.current + i;
  }
  
  if (next >= con.head) {
    writeToStdout('(Current end of file)');
    return;
  }
  
  for (let v = 0; v < i; v++) {
    let z = ++con.current;
    onData(con.fromMemory.get(z) || readFromFile(z));
  }
  
};

const handleSearchTermTyping = (d: string) => {
  
  clearLine();
  
  if (ctrlChars.has(String(d))) {
    writeToStdout('ctrl command ignored. to match a tab, use \\t, to exit use return/tab keys.');
    return;
  }
  
  const newSearchTerm = con.searchTerm + String(d);
  
  try {
    con.searchRegex = new RegExp(newSearchTerm, 'ig');
  }
  catch (e) {
    consumer.warn('Could not create regex from string:', newSearchTerm);
    return;
  }
  
  con.searchTerm = newSearchTerm;
  writeToStdout('Search term:', con.searchTerm);
  
};

const handleShutdown = (signal: string) => () => {
  
  con.mode = BunionMode.SEARCHING;
  
  clearLine();
  
  con.sigCount++;
  
  if (con.sigCount > 2) {
    return;
  }
  
  if (con.sigCount === 2) {
    
    con.exiting = true;
    
    consumer.debug(`User hit ${signal} again, now exiting.`);
    
    if (signal === 'ctrl-d') {
      con.keepLogFile = true;
    }
    
    if (con.siblingProducerPID < 1) {
      process.exit(1);
      return;
    }
    
    process.kill(con.siblingProducerPID, 'SIGINT');
    
    clearLine();
    
    // process.removeAllListeners('SIGINT');
    
    if (con.stdinEnd) {
      process.exit(1);
      return;
    }
    
    setTimeout(() => {
      clearLine();
      process.exit(1);
    }, 200);
    
    return;
  }
  
  consumer.debug(`User hit ${signal}.`);
  consumer.info('Hit ctrl-d/ctrl-c again to exit. Use ctrl-d to keep the log file, ctrl-c will delete it.');
};

const handleCtrlC = handleShutdown('ctrl-c');
const handleCtrlD = handleShutdown('ctrl-d');

const handleUserInput = () => {
  
  const fd = fs.openSync('/dev/tty', 'r');
  // const strm = con.rsi = new ReadStream(<any>1);
  const strm = con.rsi = new ReadStream(<any>fd);
  strm.setRawMode(true);
  
  strm.on('data', (d: any) => {
    
    con.paused = false;
    createTimeout();
    createDataTimeout(20);
    
    for (const c of connections) {
      // writeToConn(c, {signal: d});
    }
    
    con.lastUserEvent = Date.now();
    
    if (con.logChars) {
      console.log({d: String(d)});
    }
    
    if (con.mode !== BunionMode.STOPPED && con.mode !== BunionMode.PAUSED && String(d) === ':') {
      con.mode = BunionMode.STOPPED;
      writeToStdout(':');
      return;
    }
    
    if (String(d) === '\u000e') {
      con.logChars = !con.logChars;
      return;
    }
    
    if (String(d).trim() === '\u0003') {
      handleCtrlC();
      return;
    }
    
    if (String(d).trim() === '\u0004') {
      handleCtrlD();
      return;
    }
    
    con.sigCount = 0;
    
    if (String(d) === '\u0002') { // ctrl-l
      gotoLine(0);
      return;
    }
    
    if (String(d) === '\f') { // ctrl-l
      con.searchTerm = '';
      clearLine();
      writeToStdout('Cleared search term.');
      return;
    }
    
    // if (String(d) === '\u0012') {  // ctrl-r
    //   con.searchTerm = '';
    //   console.log('Search term cleared.');
    //   return;
    // }
    
    if (String(d) === '\u0013') {  // ctrl-s
      con.stopOnNextMatch = true;
      return;
    }
    
    if (String(d) === '\u0018') {  // ctrl-x
      con.stopOnNextMatch = false;
      return;
    }
    
    if (String(d) === '\u0001') {  // ctrl-a
      if (con.mode !== BunionMode.FIND_LAST) {
        con.mode = BunionMode.FIND_LAST;
        findLatestMatch();
      }
      return;
    }
    
    if (String(d) === ' ') {  // spacebar not ctrl-z
      if (con.mode !== BunionMode.FIND_LAST) {
        con.mode = BunionMode.FIND_LAST;
        findPreviousMatch();
      }
      return;
    }
    
    // if(con.mode === BunionMode.SEARCHING && String(d) === '\r'){
    //   doTailing();
    //   return;
    // }
    
    if (con.mode !== BunionMode.PAUSED && String(d) === '\u001b[Z') {
      console.log('shift tab');
      return;
    }
    
    if (con.mode === BunionMode.SEARCHING && String(d) === '\t') {
      con.stopOnNextMatch = true;
      doTailing();
      return;
    }
    
    if (con.mode === BunionMode.TAILING && String(d) === '\r') {
      con.stopOnNextMatch = true;
      return;
    }
    
    if (con.mode !== BunionMode.PAUSED && levelMap.has(String(d))) {
      con.logLevel = levelMap.get(String(d));
      writeStatusToStdout(con);
      return;
    }
    
    if (String(d) === '\u0014' && con.mode !== BunionMode.TAILING) {  // ctrl-t
      con.stopOnNextMatch = false;
      doTailing();
      return;
    }
    
    if (String(d) === 's' && con.mode !== BunionMode.PAUSED) {
      if (con.mode !== BunionMode.SEARCHING) {
        con.mode = BunionMode.SEARCHING;
        writeStatusToStdout(con);
      }
      return;
    }
    
    if (String(d) === '\u001b[A' && con.mode === BunionMode.SEARCHING) {
      scrollUpOneLine();
      return;
    }
    
    if ((String(d) === '\u001b[2A' || String(d) === '\u001b[1;2A') && con.mode === BunionMode.SEARCHING) {
      scrollUpFive();
      return;
    }
    
    if ((String(d) === '\u001b[2B' || String(d) === '\u001b[1;2B') && con.mode === BunionMode.SEARCHING) {
      scrollDownFive();
      return;
    }
    
    if ((String(d) === '\r' || String(d) === '\u001b[B') && con.mode === BunionMode.SEARCHING) {
      scrollDown();
      return;
    }
    
    if (String(d).trim() === 'p' && con.mode !== BunionMode.PAUSED) {
      con.mode = BunionMode.PAUSED;
      clearLine();
      // writeToStdout(chalk.bgBlack.whiteBright(`Mode: ${con.mode} - use ctrl+p to return to reading mode. `));
      writeStatusToStdout(con);
      return;
    }
    
    // up arrow: \u001b[A
    // down arrow: \u001b[B
    // shift up: \u001b[2A
    // shift down: \u001b[2B
    
    if (String(d).trim() === '\u0010' && con.mode !== BunionMode.READING) { // ctrl-p
      startReading();
      return;
    }
    
    if (con.mode === BunionMode.PAUSED && String(d) === '') { // backspace!
      con.searchTerm = con.searchTerm.slice(0, -1);
      clearLine();
      writeToStdout('Search term:', con.searchTerm);
      return;
    }
    
    if (String(d) === '\t' && con.mode === BunionMode.PAUSED) {
      con.stopOnNextMatch = true;
      doTailing();
      return;
    }
    
    if (String(d) === '\r' && con.mode === BunionMode.PAUSED) {
      con.stopOnNextMatch = true;
      con.mode = BunionMode.SEARCHING;
      writeStatusToStdout(con);
      return;
    }
    
    if (con.mode === BunionMode.PAUSED) {
      handleSearchTermTyping(d);
      return;
    }
    
    if (String(d) === '\r') {
      resume();
    }
    
  });
  
};

// if(process.stdin.isTTY){
//   consumer.debug('handing b/c of stdin.')
//   handleUserInput();
// }

if (process.stdout.isTTY) {
  consumer.info('Handing user keyboard input b/c stdout is a TTY.');
  handleUserInput();
}
else if(process.env.bunion_force_tty === 'yes'){
  consumer.info('Handing user keyboard input b/c env var "bunion_force_tty=yes".');
  handleUserInput();
}
else {
  consumer.warn('Not connected to stdin.')
}


