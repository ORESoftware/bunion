'use strict';

import {createRawParser} from "./json-parser";
import {BunionJSON, BunionLevelToNum, BunionMode} from "./bunion";
import JSONParser, {RawJSONBytesSymbol, RawStringSymbol} from "@oresoftware/json-stream-parser";
import * as util from "util";
import chalk from "chalk";
import {getConf, getFields} from "./utils";
import * as readline from "readline";
import {consumer} from "./logger";
import {ReadStream} from "tty";
import Timer = NodeJS.Timer;
import uuid = require("uuid");
import {LinkedQueue} from "@oresoftware/linked-queue";
import * as fs from "fs";
import * as path from "path";
import * as cp from 'child_process';
import {LinkedQueueValue} from "@oresoftware/linked-queue";
import * as net from "net";

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

}

try {
  fs.mkdirSync(runs);
}
catch (e) {

}

try {
  fs.mkdirSync(runId);
}
catch (e) {

}

const maxIndex = 1;
const output = 'medium' || 'short';
const highlight = Boolean(true);
const darkBackground = Boolean(true);

const con = {
  rsi: null as ReadStream,
  fullTrace: false,
  tail: 0,
  keepLogFile: false,
  fromMemory: new Map<number, any>(),
  fromFile: new Map<number, any>(),
  current: 0 as number,
  head: 0 as number,
  mode: BunionMode.READING,
  searchTerm: '',
  logLevel: maxIndex,
  stopOnNextMatch: true,
  logChars: false,
  sigCount: 0,
  lastUserEvent: null as number,
  dataTo: null as Timer,
  to: null as Timer,
  searchRegex: null as RegExp,
  timeout: 555500  // 450 seconds
  
};

const budsFile =  process.env.bunion_uds_file || '';
const cwd = process.cwd();

const udsFile = budsFile ?
  path.resolve(budsFile) :
  path.resolve(cwd + '/.bunion.sock');

const connections = new Set<net.Socket>();

const server = net.createServer(c => {
  
  connections.add(c);
  
  c.pipe(new JSONParser())
    .on('error', e => {
      console.error('client conn error:', e);
    })
    .on('string', s => {
      console.log('string from client:', s);
    })
    .on('data', d => {
      console.log('json from client:', d);
    })
  
});

const sendRequestForData = () => {
  clearTimeout(con.dataTo);
  for (const c of connections) {
    c.write(JSON.stringify({
      bunionType: 'read',
      value: {
        bytesToRead: 30000
      }
    }) + '\n');
  }
};

try {
  fs.unlinkSync(udsFile);
}
catch (e) {
  // consumer.warn(e);
}

server.on('error', e => {
  consumer.warn(e);
});

server.listen(udsFile, () => {
  consumer.debug('Listening on unix domain socket:', udsFile);
});

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
  
  if (con.keepLogFile) {
    consumer.info('Log file path:', rawFileId);
  }
  else {
    tryAndLogErrors(() => fs.unlinkSync(rawFileId));
  }
  
  consumer.info('exiting with code:', code);
  process.exit(code);
});

const replacer = function (match: any) {
  // p1 is nondigits, p2 digits, and p3 non-alphanumerics
  return chalk.redBright.bold(match);
};

const getHighlightedString = (match: string) => {
  if (con.searchTerm !== '') {
    match = match.replace(new RegExp(con.searchTerm, 'ig'), replacer);
  }
  
  return match;
};

const clearLine = () => {
  readline.clearLine(process.stdout, 0);  // clear current text
  readline.cursorTo(process.stdout, 0);   // move cursor to beginning of line
};

const writeStatusToStdout = (searchTermStr?: string) => {
  
  if (!process.stdout.isTTY) {
    return;
  }
  
  // console.log();
  
  searchTermStr = searchTermStr || ' ';
  
  const stopMsg = (con.stopOnNextMatch && con.searchTerm !== '' && con.mode !== BunionMode.SEARCHING) ?
    ' Stopping on next match.' :
    '';
  
  const currentSearchTerm = con.searchTerm === '' ?
    ` no search term. ` :
    `current search term: '${con.searchTerm}' `;
  
  writeToStdout(
    chalk.bgBlack.whiteBright(
      ` Line # ${con.current}, mode: ${con.mode},${searchTermStr}Log level: ${con.logLevel}, ${currentSearchTerm} ${stopMsg}`
    )
  );
  
};

const writeToStdout = (...args: string[]) => {
  clearLine();
  for (let v of args) {
    process.stdout.write(v + ' ');
  }
};

const bunionConf = getConf();

const transformKeys = bunionConf.consumer.transform && bunionConf.consumer.transform.keys;
const transformers = Object.keys(transformKeys || {});

const getId = (v: any): string => {
  
  if (v && typeof v[0] === 'string') {
    return v[0].split(':')[0];  //   ["@app:version", x,y,z]
  }
  
  if (v && v.id && typeof v.id === 'string') {
    return v.id.split(':')[0]
  }
  
  // return <any>sym;
  return '';
  
};

const runTransform = (v: any, t: any): boolean => {
  
  try {
    const c = t.transformToBunionFormat(v);
    
    if (c && typeof c === 'object') {
      c[RawJSONBytesSymbol] = v[RawJSONBytesSymbol];
      onStandardizedJSON(c);
      return true;
    }
  }
  catch (err) {
    
    return false;  // explicit for your pleasure
  }
  
};

const onBunionUnknownJSON = (v: any): void => {
  
  const t = transformKeys[getId(v)];
  
  if (t && runTransform(v, t)) {
    return;
  }
  
  for (let k of transformers) {
    
    const t = transformKeys[k];
    
    if (t && typeof t.identifyViaJSObject === 'function') {
      
      try {
        let bool = t.identifyViaJSObject(v);
        if (bool && runTransform(v, t)) {
          return;
        }
      }
      catch (err) {
        clearLine();
        consumer.error(err);
        consumer.error('Could not call identifyViaJSObject(v) for value v:', v);
        consumer.error('The function body is:', t.identifyViaJSObject.toString());
      }
      
    }
    
  }
  
  writeToStdout(getHighlightedString(typeof v === 'string' ? v : util.inspect(v)), '\n');
  writeStatusToStdout();
  
};

const onData = (d: any) => {
  
  if (typeof d === 'string') {
    if (d) {
      clearLine();
      console.log(getHighlightedString(d));
      const isMatched = con.searchTerm !== '' && new RegExp(con.searchTerm, 'i').test(d);
      handleSearchTermMatched(isMatched)
    }
    return;
  }
  
  if (d && typeof d[0] === 'string' && d[0].split(':')[0] === '@bunion') {
    onJSON(d);
    return;
  }
  
  onBunionUnknownJSON(d);
  
};

const onJSON = (v: Array<any>) => {
  return onStandardizedJSON({
    '@bunion': true,
    appName: v[1],
    level: v[2],
    pid: v[3],
    host: v[4],
    date: v[5],
    fields: v[6],
    value: v[7],
    [RawJSONBytesSymbol]: v[<any>RawJSONBytesSymbol]
  });
};

const handleSearchTermMatched = (isMatched: boolean) => {
  
  let searchTermStr = ' ';
  
  if (con.stopOnNextMatch && isMatched) {
    con.mode = BunionMode.SEARCHING;
    searchTermStr = ` Stopped on match. `;
  }
  
  writeStatusToStdout(searchTermStr);
  
};

const getDarkOrlight = (str: string) => {
  return darkBackground ? `${chalk.white.bold(str)}` : `${chalk.black.bold(str)}`;
};

const onStandardizedJSON = (v: BunionJSON) => {
  
  if (con.mode === BunionMode.CLOSED) {
    return;
  }
  
  if (con.mode === BunionMode.PAUSED) {
    return;
  }
  
  if (!(v && v['@bunion'] === true)) {
    throw 'we should not have non-bunion-json at this point in the program.'
  }
  
  clearLine();
  
  const isMatched = con.searchTerm !== '' && new RegExp(con.searchTerm, 'i').test(v.value);
  
  // if (!(v as any)[RawJSONBytesSymbol]) {
  //   throw new Error('Bunion JSON should have raw json bytes property: ' + util.inspect(v));
  // }
  
  // since we always log something after this line, we can add it here
  
  let fields = '';
  
  if (output === 'short') {
    v.d = '';
    v.appName && (v.appName = `app:${chalk.bold(v.appName)}`);
  }
  else if (output === 'medium') {
    const d = new Date(v.date);
    v.d = chalk.bold(`${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')}`);
    v.appName = `app:${chalk.bold(v.appName)}`;
  }
  else {
    const d = new Date(v.date);
    v.d = chalk.bold(`${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')}`);
    v.appName = `${v.host} ${v.pid} app:${chalk.bold(v.appName)}`;
  }
  
  if (highlight) {
    v.value = getHighlightedString(v.value);
  }
  
  if (v.fields) {
    fields = getFields(v.fields);
  }
  
  if (v.level === 'FATAL') {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${chalk.red.bold(v.value)} \n`
    );
  }
  
  if (v.level === 'ERROR' && con.logLevel < 6) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${getDarkOrlight(v.value)} \n`
    );
  }
  
  if (v.level === 'WARN' && con.logLevel < 5) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.magentaBright.bold(v.level)} ${chalk.gray(fields)} ${getDarkOrlight(v.value)} \n`
    );
  }
  
  if (v.level === 'INFO' && con.logLevel < 4) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.cyan(v.level)} ${chalk.gray(fields)} ${chalk.cyan.bold(v.value)} \n`
    );
  }
  
  if (v.level === 'DEBUG' && con.logLevel < 3) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.yellowBright.bold(v.level)} ${chalk.gray(fields)} ${chalk.yellow(v.value)} \n`
    );
  }
  
  if (v.level === 'TRACE' && con.logLevel < 2) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.gray(v.level)} ${chalk.gray(fields)} ${chalk.gray.bold(v.value)} \n`
    );
  }
  
  handleSearchTermMatched(isMatched);
  
};

const q = new LinkedQueue();

const readFromFile = (pos: number): any => {
  
  const start = pos * 50;
  const b = Buffer.alloc(299);
  fs.readSync(logFD, b, 0, b.length, start);
  const i = b.indexOf(0x00);
  const nb = b.slice(0, i);
  
  try {
    const v = JSON.parse(String(nb).trim());
    
    const nnb = Buffer.alloc(v.b);
    fs.readSync(rawFD, nnb, 0, nnb.length, v.p);
    return JSON.parse(String(nnb).trim());
  }
  catch (err) {
    return chalk.red(err.message);
  }
  
};

const writeToFile = (vals: Array<LinkedQueueValue<any>>) => {
  
  const val = vals.map(lqv => {
    
    const v = lqv.value;
    
    if (v && v[RawStringSymbol]) {
      return String(v[RawStringSymbol]).trim();
    }
    
    if (typeof v === 'string') {
      return v.trim();
    }
    
    return util.inspect(v);
    
  });
  
  const raw = val.join('\n');
  
  fs.appendFile(logFileId, raw, (e) => {
    e && consumer.warn(e.message || e);
  });
  
};

let pos = 0, currDel = 0;

const createDataTimeout = () => {
  clearTimeout(con.dataTo);
  con.dataTo = setTimeout(() => {
    sendRequestForData();
  }, 30);
};

const handleIn = (d: any) => {
  
  if (!d) {
    throw 'Should always be defined.'
  }
  
  createDataTimeout();
  
  const h = con.head++;
  
  if (con.mode === BunionMode.READING) {
    con.current = h;
  }
  
  const raw = JSON.stringify(d) + '\n';
  const byteLen = Buffer.byteLength(raw);
  
  con.fromMemory.set(h, d);
  
  // q.enqueue(h, d);
  
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
  
  // if (q.length > 100) {
  //   writeToFile(q.deq(100));
  // }
  
  if (con.fromMemory.size > -1) {
    con.fromMemory.delete(currDel++);
  }
  
  // while (con.head - con.tail > 9000) {
  //   con.fromMemory.delete(con.tail);
  //   con.current = Math.max(con.current, ++con.tail);
  // }
  
  if (con.mode === BunionMode.READING) {
    // console.log(h);
    onData(d);
  }
  
  // console.log(process.memoryUsage());
  
};

const onStdinEnd = () => {
  con.mode = BunionMode.SEARCHING;
  clearLine();
  consumer.info('stdin end');
  writeStatusToStdout();
};

const parser = process.stdin.resume()
  .on('end', onStdinEnd)
  .pipe(createRawParser())
  .on('string', handleIn)
  .on('data', handleIn);

const onTimeout = () => {
  console.log('TIMED OUT.');
  parser.destroy();
  process.exit(1);
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
      writeStatusToStdout();
  }
  
};

const ctrlChars = new Set([
  '\t', // tab
  '\u0001', //a
  '\u0004', // d
  '\u0003', // c
  '\r',  // m
  '\u000e', // n
  '\u001a', // z,
  '\u0018',  // x
  '\u0012',  // r
  '\u001b\r'  // alt-return (might need to be \u001b\\r with escaped slash
]);

const levelMap = new Map([
  ['6', BunionLevelToNum.FATAL],
  ['5', BunionLevelToNum.ERROR],
  ['4', BunionLevelToNum.WARN],
  ['3', BunionLevelToNum.INFO],
  ['2', BunionLevelToNum.DEBUG],
  ['1', BunionLevelToNum.TRACE],
]);

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
  
  const rows = process.stdout.rows;
  const start = Math.max(line - rows - 1, con.tail);
  
  con.current = start;
  
  for (let i = start; i < rows + start; i++) {
    
    // if (!con.fromMemory.has(i)) {
    //   break;
    // }
    
    if (i > con.head) {
      break;
    }
    
    con.current = i;
    onData(con.fromMemory.get(i) || readFromFile(i));
  }
  
  con.mode = BunionMode.SEARCHING;
  writeStatusToStdout();
  
};

type EVCb<T> = (err: any, v?: T) => void;

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
      setTimeout(() => {
        if (con.mode === BunionMode.TAILING) {
          doTailingSubroutine(i, cb);
        }
      }, 35);
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
    writeStatusToStdout();
    
  });
  
};

const startReading = () => {
  con.current = con.head;
  con.mode = BunionMode.READING;
  clearLine();
  createLoggedBreak('[ctrl-p]');
  writeStatusToStdout();
};

const getValFromTransform = (t: any, v: any): string => {
  
  let val = '';
  
  if (typeof t.identifyViaJSObject === 'function') {
    
    let bool;
    try {
      bool = t.identifyViaJSObject(v);
    }
    catch (err) {
      clearLine();
      consumer.error(err);
      consumer.error('Could not call identifyViaJSObject(v) for value v:', v);
      consumer.error('The function body is:', t.identifyViaJSObject.toString());
      writeStatusToStdout();
    }
    
    if (bool && typeof t.getValue === 'function') {
      try {
        val = t.getValue(v);
      }
      catch (err) {
        clearLine();
        consumer.error(err);
        consumer.error('Could not call getValue on value:', v);
        consumer.error('The function body is:', t.getValue.toString());
        writeStatusToStdout();
      }
      
    }
    
  }
  
  if (typeof val === 'string') {
    return val;
  }
  
  return util.inspect(val);
  
};

const getValFromTransformAlreadyIdentified = (t: any, v: any): string => {
  
  let val = '';
  
  try {
    if (typeof t.getValue === 'function') {
      val = t.getValue(v);
    }
  }
  catch (err) {
    consumer.error(err);
  }
  
  if (typeof val === 'string') {
    return val;
  }
  
  return util.inspect(v);
  
};

const getValue = (v: any): string => {
  
  if (!(v && typeof v === 'object')) {
    return typeof v === 'string' ? v : String(v);
  }
  
  const z = Array.isArray(v) ? v[v.length - 1] : v.value;
  
  if (typeof z === 'string') {
    return z;
  }
  
  const t = transformKeys[getId(v)];
  
  let val = '';
  
  if (t) {
    
    try {
      val = getValFromTransformAlreadyIdentified(t, v);
    }
    catch (e) {
      consumer.warn(e);
    }
    
    if (val) {
      return val;
    }
  }
  
  for (let k of transformers) {
    
    const t = transformKeys[k];
    
    try {
      val = getValFromTransform(t, v);
    }
    catch (e) {
      consumer.warn(e);
    }
    
    if (val) {
      return val;
    }
    
  }
  
  return '';
  
};

const findLatestMatch = () => {
  
  if (con.searchTerm === '') {
    con.mode = BunionMode.SEARCHING;
    writeToStdout('No search term.');
    return;
  }
  
  const startPoint = con.head;
  let i = con.head, matched = false;
  const st = con.searchTerm;
  const r = new RegExp(st, 'i');
  
  while (i >= con.tail) {
    
    const v = con.fromMemory.get(i) || readFromFile(i);
    
    let val = null;
    
    try {
      val = getValue(v);
    }
    catch (err) {
      // ignore
      console.error(err);
    }
    
    // clearLine();
    // writeToStdout('Searching line:', String(i));
    
    if (val && r.test(val)) {
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
  
  writeToStdout('Could not find anything matching:', con.searchTerm);
  con.stopOnNextMatch = true;
  con.mode = BunionMode.SEARCHING;
  // doTailing(startPoint);
  
};

const scrollUpOneLine = () => {
  
  const rows = process.stdout.rows + 1;
  const lines: Array<any> = [];
  
  let i = con.current - 1, count = 0;
  
  if (i < con.tail) {
    // console.log('head:', con.head, 'tail:', con.tail, 'current:', con.current);
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
  
  const rows = process.stdout.rows + 1;
  const lines: Array<any> = [];
  
  let amount = 5;
  let i = con.current - amount, count = 0;
  
  while (i < con.tail) {
    amount--;
    i = con.current - amount;
  }
  
  if (i >= con.current) {
    // console.log('head:', con.head, 'tail:', con.tail, 'current:', con.current);
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
  
  // if (con.fromMemory.has(next)) {
  con.current = next;
  onData(con.fromMemory.get(next) || readFromFile(next));
  // }
  
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
    consumer.warn('ctrl command ignored.');
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
  
  if (con.sigCount++ === 1) {
    consumer.warn(`User hit ${signal} again, now exiting.`);
    if (signal === 'ctrl-d') {
      con.keepLogFile = true;
    }
    process.exit(1);
    return;
  }
  
  consumer.info(`User hit ${signal}.`);
  consumer.info('Hit ctrl-d/ctrl-c again to exit. Use ctrl-d to keep the log file, ctrl-c will delete it.');
};

const handleCtrlC = handleShutdown('ctrl-c');
const handleCtrlD = handleShutdown('ctrl-d');

const handleUserInput = () => {
  
  const strm = con.rsi = new ReadStream(<any>1);   // previously fd =  fs.open('/dev/tty','r+')
  strm.setRawMode(true);
  
  strm.on('data', (d: any) => {
    
    createTimeout();
    
    con.lastUserEvent = Date.now();
    
    if (con.logChars) {
      console.log({d: String(d)});
    }
    
    if (con.mode !== BunionMode.STOPPED && con.mode !== BunionMode.PAUSED && String(d) === ':') {
      con.mode = BunionMode.STOPPED;
      writeToStdout(':');
      return;
    }
    
    // if (String(d) === '\r' && con.mode === BunionMode.SEARCHING) {
    //   unpipePiper();
    //   clearLine();
    //   startReading();
    //   return;
    // }
    
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
      writeStatusToStdout();
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
        writeStatusToStdout();
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
      writeStatusToStdout();
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
    
    if (String(d) === '\r' && con.mode === BunionMode.PAUSED) {
      con.stopOnNextMatch = true;
      doTailing();
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
  consumer.debug('handing b/c of stdout.');
  handleUserInput();
}