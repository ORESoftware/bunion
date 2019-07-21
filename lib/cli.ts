#!/usr/bin/env node
'use strict';

import {RawJSONBytesSymbol} from "@oresoftware/json-stream-parser";
import {createParser} from "./json-parser";
import {getConf, getFields} from "./utils";
import {consumer} from './logger';
import {BunionFields, BunionJSON, BunionLevelToNum, BunionMode, Level, ordered} from "./bunion";
import * as uuid from 'uuid';
import * as fs from 'fs';
import * as path from "path";
import {ReadStream} from "tty";
import * as util from "util";
import chalk from 'chalk';

const dashdash = require('dashdash');
import readline = require('readline');
import Timer = NodeJS.Timer;

process.on('uncaughtException', (e: any) => {
  consumer.error('Uncaught exception:', e || e);
});

process.on('unhandledRejection', (e: any) => {
  consumer.error('Unhandled rejection:', e || e);
});

process.on('SIGINT', function () {
  consumer.warn('SIGINT received.');
});

process.on('SIGHUP', function () {
  consumer.warn('SIGHUP received.');
});

process.on('SIGTERM', function () {
  consumer.warn('SIGTERM received.');
});

import options from './cli-options';

const allowUnknown = process.argv.indexOf('--allow-unknown') > 1;

let opts: any, parser = dashdash.createParser({options: options}, {allowUnknown});

try {
  opts = parser.parse(process.argv);
} catch (e) {
  consumer.error('bunion: error: %s', e.message);
  process.exit(1);
}

if (opts.help) {
  const help = parser.help({includeEnv: true}).trimRight();
  consumer.info('usage: node foo.js [OPTIONS]\n' + 'options:\n' + help);
  process.exit(0);
}

const flattenDeep = function (a: Array<string>): Array<string> {
  return a.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};


const bunionConf = getConf();

// console.log(bunionConf);
// process.exit(1);

let filter: { [key: string]: RegExp } = {};

try {
  if (opts.filter) {
    filter = JSON.parse(opts.filter);
  }
} catch (err) {
  consumer.error('Bunion could not parse your filter option (JSON) at the command line.');
  throw err;
}

try {
  Object.keys(filter).forEach(function (k) {
    filter[k] = new RegExp(filter[k]);
  });
} catch (err) {
  consumer.error('Bunion could not convert your filter option values to RegExp.');
  throw err;
}

const output = String(opts.output || 'medium').toLowerCase();
const maxLevel = String(opts.level || (bunionConf.consumer && bunionConf.consumer.level) || 'TRACE').toUpperCase();
const maxIndex = ordered.indexOf(maxLevel) + 1;
// console.log({maxLevel,maxIndex});
// process.exit(1);

if (maxIndex < 1) {
  throw new Error(
    chalk.red('Your value for env var "bunion_max_level" is not set to a valid value, must be one of: ' + Object.keys(Level))
  );
}

const andMatches = flattenDeep([opts.must_match]).filter(v => v).map(v => new RegExp(v, 'g'));
const orMatches = flattenDeep([opts.match]).filter(v => v).map(v => new RegExp(v, 'g'));
const highlight = true || opts.highlight && opts.no_highlight !== true || false;
const bg = String(opts.background || '').toLowerCase();

if (bg && !['dark', 'light'].includes(bg)) {
  throw new Error(chalk.red('Use either --bg=dark or --bg=light...'));
}

if (opts.light && opts.dark) {
  throw new Error(chalk.red('User specified both --dark and --light, pick one.'));
}

if (bg === 'dark' && opts.light) {
  throw new Error(chalk.red('User specified both --bg=dark and --light, pick one.'));
}

if (bg === 'light' && opts.dark) {
  throw new Error(chalk.red('User specified both --bg=light and --dark, pick one.'));
}

const darkBackground = (opts.bg !== 'light' && !opts.light);
const lightBackground = !darkBackground;

const matches = (v: string) => {
  
  if (orMatches.length < 1) {
    return true;
  }
  
  return orMatches.some(m => {
    return m.test(v);
  });
};

const mustMatches = (v: string) => {
  
  if (andMatches.length < 1) {
    return true;
  }
  
  return andMatches.every(m => {
    return m.test(v);
  });
};

const filterKeys = Object.keys(filter);

const matchFilterObject = (fields: BunionFields) => {
  
  if (!fields) {
    return true;
  }
  
  if (filterKeys.length < 1) {
    return true;
  }
  
  return filterKeys.some(function (k) {
    if (fields[k]) {
      return filter[k].test(fields[k]);
    }
  });
};

const allMatches = andMatches.concat(orMatches);

const replacer = function (match: any) {
  // p1 is nondigits, p2 digits, and p3 non-alphanumerics
  return chalk.redBright.bold(match);
};

const getHighlightedString = (str: string) => {
  
  let match = allMatches.reduce((s, r) => s.replace(r, replacer), str);
  
  if (container.searchTerm !== '') {
    match = match.replace(new RegExp(container.searchTerm, 'ig'), replacer);
  }
  
  return match;
  
};

const getDarkOrlight = (str: string) => {
  return darkBackground ? `${chalk.white.bold(str)}` : `${chalk.black.bold(str)}`;
};

const getMatchCountLine = (matchCount: number, filteredCount: number) => {
  const total = `[${chalk.cyan(String(matchCount + filteredCount))}]`;
  const match = `[${chalk.cyan(String(matchCount))}]`;
  const filtered = `[${chalk.cyan(String(filteredCount))}]`;
  
  return chalk.blueBright.bold(`Total records so far: ${total}, matched records:` +
    ` ${match}, records that were filtered out: ${filtered}.`);
};

let filteredCount = 0, matchCount = 0;
const fileId = uuid.v4();
const bunionHome = process.env.HOME + '/.bunion';
const bunionHomeFiles = path.resolve(bunionHome + '/files');

try {
  fs.mkdirSync(bunionHome);
} catch (err) {

}

try {
  fs.mkdirSync(bunionHomeFiles);
} catch (e) {

}

const logfile = path.resolve(bunionHomeFiles + '/' + fileId);

// process.stdin.setMaxListeners(300);

// const stdinStream = {
//   bytesWritten: 0
// };

let stdinStream = process.stdin.resume()
  .pipe(fs.createWriteStream(logfile));

// process.stdin.resume().on('data', d => {
//   fs.appendFileSync(logfile, d);
//   stdinStream.bytesWritten += d.length;
// });

const container = {
  lastUserEvent: Date.now(),
  currentBytes: 0,
  mode: BunionMode.READING,
  piper: null as any,
  prevStart: 0,
  searchTerm: '',
  logLevel: maxIndex,
  stopOnNextMatch: true,
  sigCount: 0,
  logChars: false,
  stopped: false,
  matched: false,
  showUnmatched: true,
  keepLogFile: false,
  onJSONCount: 0,
  capAmount: 10000,
  prevCap: 10000,
  to: null as Timer,
  timeout: 500000,
  extra: '',
  cleanUp: [] as Array<Function>
};

const unpipePiper = () => {
  
  if (container.piper) {
    
    // if (container.piper.bunionUnpiped) {
    //   return;
    // }
    //
    // container.piper.bunionUnpiped = true;
    
    // if (container.piper.bytesWritten) {
    //   console.log('WRITTEN BYTES:', container.piper.bytesWritten);
    //   throw 'truct';
    //   container.prevStart = container.piper.bytesWritten;
    // }
    //
    // if (container.piper.bytesRead) {
    //   console.log('READ BYTES:', container.piper.bytesRead);
    //   throw 'fuck';
    //   container.prevStart = container.piper.bytesRead;
    // }
    
    container.piper.unpipe();
    container.piper.removeAllListeners();
  }
  
  for (let v of process.stdin.listeners('data').slice(1)) {
    process.stdin.removeListener('data', <any>v);
  }
  
  for (let v of process.stdin.listeners('end').slice(1)) {
    process.stdin.removeListener('end', <any>v);
  }
  
  let cleanupTask = null;
  while (cleanupTask = container.cleanUp.pop()) {
    cleanupTask();
  }
  
};

process.once('exit', code => {
  
  unpipePiper();
  
  if (container.keepLogFile) {
    consumer.info('Log file path:', logfile);
  } else {
    fs.unlinkSync(logfile);
  }
  
  // process.stdin.cork();
  // process.stdin.end();
  // stdinStream.close();
  
  consumer.info('exiting with code:', code);
});

const clearLine = () => {
  readline.clearLine(process.stdout, 0);  // clear current text
  readline.cursorTo(process.stdout, 0);   // move cursor to beginning of line
};

const writeStatusToStdout = (searchTermStr?: string) => {
  
  if (!process.stdout.isTTY) {
    return;
  }
  
  searchTermStr = searchTermStr || ' ';
  
  const stopMsg = (container.stopOnNextMatch && container.searchTerm !== '' && container.mode !== BunionMode.SEARCHING) ?
    ' Stopping on next match.' :
    '';
  
  const currentSearchTerm = container.searchTerm === '' ?
    ` no search term. ` :
    `current search term: '${container.searchTerm}' `;
  
  writeToStdout(
    chalk.bgBlack.whiteBright(
      ` # Mode: ${container.mode},${searchTermStr}Log level: ${container.logLevel}, ${currentSearchTerm} ${stopMsg} ${container.extra}`
    )
  );
  
};

const writeToStdout = (...args: string[]) => {
  clearLine();
  for (let v of args) {
    process.stdout.write(v + ' ');
  }
};

const showUnmatched = false;

const handleFileExcess = () => {
  
  if (stdinStream.bytesWritten >= container.prevCap) {
    
    const r = fs.readFileSync(logfile, {encoding: 'utf8'});
    
    if (r.length > container.capAmount) {
      const diff = r.length - container.capAmount;
      const b = r.slice(diff, r.length);
      console.log('buff len:', b.length);
      console.log('r len:', r.length);
      container.prevCap += container.capAmount;
      container.prevStart = Math.max(container.prevStart - diff, 0);
      // fs.truncateSync(logfile);
      fs.writeFileSync(logfile, b, {encoding: 'utf8'});
    }
    
  }
};

// const handleFileExcess = () => {
//
//   if (stdinStream.bytesWritten >= container.prevCap) {
//
//     const fd = fs.openSync(logfile, fs.constants.O_RDWR);
//
//     const {size} = fs.statSync(logfile);
//     const diff = size - container.capAmount;
//     const b = Buffer.alloc(diff);
//
//     const rawd = fs.readSync(fd, b, 0, diff, diff);
//
//     // const r = fs.readFileSync(logfile, {encoding:'utf8'});
//
//     fs.ftruncateSync(fd);
//
//     container.prevCap += container.capAmount;
//     container.prevStart = Math.max(container.prevStart - diff, 0);
//     // fs.truncateSync(logfile);
//     fs.writeSync(fd, b, 0, b.length, 0);
//
//     // if(r.length > container.capAmount){
//     //   const diff = r.length - container.capAmount;
//     //   const b = r.slice(diff, r.length);
//     //   console.log('buff len:', b.length);
//     //   console.log('r len:', r.length);
//     //   container.prevCap += container.capAmount;
//     //   container.prevStart = Math.max(container.prevStart - diff, 0);
//     //   // fs.truncateSync(logfile);
//     //   fs.writeFileSync(logfile, b, {encoding:'utf8'});
//     // }
//
//     fs.closeSync(fd);
//
//     // container.prevCap += container.capAmount;
//     // console.log({rawd});
//     // container.prevStart = Math.max(container.prevStart - rawd, 0);
//     // // fs.closeSync(fd);
//     //
//     // // fs.writeSync(fd, b, 0, b.length, 0);
//     // fs.writeFileSync(logfile, b);
//
//   }
// };

const closeStdin = () => {
  container.mode = BunionMode.CLOSED;
  unpipePiper();
  // process.stdin.pause();
  stdinStream.destroy();
  stdinStream = process.stdin.pipe(fs.createWriteStream('/dev/null'));
  clearLine();
  writeStatusToStdout();
};

const transformKeys = bunionConf.consumer.transform && bunionConf.consumer.transform.keys;
const transformers = Object.keys(transformKeys || {});

const onBunionUnknownJSON = (v: any) => {
  
  
  for (let k of transformers) {
    
    const t = transformKeys[k];
    
    if (t.identifyViaJSObject(v)) {
      const c = t.transformToBunionFormat(v);
      if (c) {
        c[RawJSONBytesSymbol] = v[RawJSONBytesSymbol];
        onStandardizedJSON(c);
        return;
      }
      
    }
    
  }
  
  const inspected = util.inspect(v);
  
  if (container.mode !== BunionMode.SEARCHING) {
    container.prevStart += Buffer.byteLength(inspected);  // newline is 1
  }
  
  writeToStdout(inspected);
  
};

const onBunionStr = (s: string) => {
  
  // unpipePiper();
  // clearLine();
  // process.stdout.write(s + '\n');
  
  if (container.mode !== BunionMode.SEARCHING) {
    container.prevStart += Buffer.byteLength(s + '\n');
  }
  
  // container.mode = BunionMode.SEARCHING;
  // createTimeout();
  // const searchTermStr = ` Stopped on raw string. `;
  // writeStatusToStdout(searchTermStr);
  
};

const getValue = (v: any) => {
  
  if (!(v && typeof v === 'object')) {
    return '';
  }
  
  const z = Array.isArray(v) ? v[v.length - 1] : v.value;
  
  if (typeof z === 'string') {
    return z;
  }
  
  for (let k of transformers) {
    
    const t = transformKeys[k];
    
    let val = '';
    
    if (t.identifyViaJSObject(v)) {
      if (typeof t.getValue === 'function') {
        val = t.getValue(v);
      }
    }
    
    if (val && typeof val === 'string') {
      return val;
    }
    
  }
  
  return '';
  
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

const onStandardizedJSON = (v: BunionJSON) => {
  
  if (++container.onJSONCount % 5 === 0) {
    // handleFileExcess();
  }
  
  if (container.mode === BunionMode.CLOSED) {
    return;
  }
  
  if (Date.now() - container.lastUserEvent > 30000) {
    if (stdinStream.bytesWritten > 3000000) {
      closeStdin();
      return;
    }
  }
  
  if (container.mode === BunionMode.PAUSED) {
    return;
  }
  
  
  // container.currentBytes = (container.piper && container.piper.bytesRead) || container.currentBytes;
  
  if (!(v && v['@bunion'] === true)) {
    throw 'we should not have non-bunion-json at this point in the program.'
  }
  
  clearLine();
  
  const isMatched = container.searchTerm !== '' && new RegExp(container.searchTerm, 'i').test(v.value);
  
  if (showUnmatched) {
    if (!(matches(v.value) && mustMatches(v.value) && matchFilterObject(v.fields))) {
      filteredCount++;
      if (opts.no_show_match_count !== true) {
        process.stdout.write(getMatchCountLine(matchCount, filteredCount));
      }
      return true;
    }
    
    if (isMatched) {
      filteredCount++;
      if (opts.no_show_match_count !== true) {
        process.stdout.write(getMatchCountLine(matchCount, filteredCount));
      }
      return true;
    }
  }
  
  if (!(v as any)[RawJSONBytesSymbol]) {
    throw new Error('Bunion JSON should have raw json bytes property: ' + util.inspect(v));
  }
  
  
  // since we always log something after this line, we can add it here
  
  if (container.mode !== BunionMode.SEARCHING) {
    container.prevStart += ((v as any)[RawJSONBytesSymbol] + 1);
  }
  
  
  matchCount++;
  let fields = '';
  
  if (output === 'short') {
    v.d = '';
    v.appName && (v.appName = `app:${chalk.bold(v.appName)}`);
  } else if (output === 'medium') {
    const d = new Date(v.date);
    v.d = chalk.bold(`${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')}`);
    v.appName = `app:${chalk.bold(v.appName)}`;
  } else {
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
  
  if (v.level === 'ERROR' && container.logLevel < 6) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${getDarkOrlight(v.value)} \n`
    );
  }
  
  if (v.level === 'WARN' && container.logLevel < 5) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.magentaBright.bold(v.level)} ${chalk.gray(fields)} ${getDarkOrlight(v.value)} \n`
    );
  }
  
  if (v.level === 'INFO' && container.logLevel < 4) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.cyan(v.level)} ${chalk.gray(fields)} ${chalk.cyan.bold(v.value)} \n`
    );
  }
  
  if (v.level === 'DEBUG' && container.logLevel < 3) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.yellowBright.bold(v.level)} ${chalk.gray(fields)} ${chalk.yellow(v.value)} \n`
    );
  }
  
  if (v.level === 'TRACE' && container.logLevel < 2) {
    process.stdout.write(
      `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.gray(v.level)} ${chalk.gray(fields)} ${chalk.gray.bold(v.value)} \n`
    );
  }
  
  if (showUnmatched) {
    if ((allMatches.length > 0 || filterKeys.length > 0) && filteredCount > 0 && opts.no_show_match_count !== true) {
      process.stdout.write(getMatchCountLine(matchCount, filteredCount));
    }
  }
  
  let searchTermStr = ' ';
  
  if (container.stopOnNextMatch && isMatched) {
    unpipePiper();
    // clearLine();
    container.mode = BunionMode.SEARCHING;
    createTimeout();
    searchTermStr = ` Stopped on match. `;
  }
  
  writeStatusToStdout(searchTermStr);
  
};

const uncloseStdin = () => {
  stdinStream.destroy();
  stdinStream = process.stdin.resume()
    .pipe(fs.createWriteStream(logfile, {flags: 'a'}));
};

const resume = () => {
  
  clearLine();
  
  switch (container.mode) {
    case BunionMode.READING:
      return;
    case BunionMode.CLOSED:
      uncloseStdin();
      // doTailing();
      container.mode = BunionMode.SEARCHING;
      createTimeout();
      return;
    default:
      writeStatusToStdout();
  }
  
};

const doTailing = () => {
  
  container.mode = BunionMode.TAILING;
  
  unpipePiper();
  clearLine();
  
  createLoggedBreak('[ctrl-t]');
  
  const jsonParser = createParser();
  jsonParser.on('json', onBunionUnknownJSON);
  jsonParser.on('bunion-json', onJSON);
  jsonParser.on('string', onBunionStr);
  
  const fst = fs.createReadStream(logfile, {start: Math.max(container.prevStart - 5, 0)});
  
  container.piper = fst.pipe(jsonParser, {end: false});
  
  // container.piper = fst.pipe(jsonParser, {end: true});
  
  // container.piper = process.stdin.pipe(jsonParser);
  
  const corked = process.stdin.pipe(jsonParser);
  corked.cork();
  
  const cleaup = () => {
    fst.destroy();
    // corked.unpipe();
    // jsonParser.destroy();
    jsonParser.removeAllListeners();
    fst.removeAllListeners();
    corked.removeAllListeners();
    // corked.destroy();
  };
  
  container.cleanUp.push(cleaup);
  
  fst.once('end', () => {
    
    // paused
    
    // const i = container.cleanUp.indexOf(cleaup);
    // if(i > -1){
    //   container.cleanUp.splice(i,1);
    // }
    //
    // cleaup();
    
    corked.uncork();
    container.piper = corked;
  });
  
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

const startReading = () => {
  
  container.mode = BunionMode.READING;
  
  unpipePiper();
  clearLine();
  
  createLoggedBreak('[ctrl-p]');
  
  const jsonParser = createParser();
  const piper = container.piper = process.stdin.pipe(jsonParser, {end: true});
  
  piper.on('bunion-json', onJSON);
  piper.on('string', onBunionStr);
  piper.on('json', onBunionUnknownJSON);
  
};

startReading(); // start reading right away

const levelMap = new Map([
  ['6', BunionLevelToNum.FATAL],
  ['5', BunionLevelToNum.ERROR],
  ['4', BunionLevelToNum.WARN],
  ['3', BunionLevelToNum.INFO],
  ['2', BunionLevelToNum.DEBUG],
  ['1', BunionLevelToNum.TRACE],
]);

const bJsonParser = createParser();
bJsonParser.on('bunion-json', onJSON);
bJsonParser.on('string', onBunionStr);
bJsonParser.on('json', onBunionUnknownJSON);

// const fd = fs.openSync('/dev/tty', 'r+');
// console.log({fd});

const ctrlChars = new Set([
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

const findLast = (logfilefd: number) => {
  
  if (container.searchTerm === '') {
    container.mode = BunionMode.SEARCHING;
    unpipePiper();
    fs.closeSync(logfilefd);
    writeToStdout('No search term.');
    return;
  }
  
  if (container.mode !== BunionMode.FIND_LAST) {
    consumer.warn('Wrong mode - should be mode:FIND_LAST but was not.');
    return;
  }
  
  unpipePiper();
  clearLine();
  
  const b = Buffer.alloc(9501);
  container.prevStart -= 9500;
  
  const ps = container.prevStart;
  
  if (ps <= 0) {
    container.prevStart = 0;
    container.mode = BunionMode.SEARCHING;
    writeToStdout(chalk.bgBlack.whiteBright(' (beginning of file 1) '));
    fs.closeSync(logfilefd);
    return;
  }
  
  const raw = fs.readSync(logfilefd, b, 0, 9500, ps);
  // process.stdout.write('\x1Bc'); // clear screen
  const lines = String(b).split('\n');
  let lenToAdd = 0;
  
  const st = container.searchTerm;
  let hoppedOut = false;
  
  for (let l of lines) {
    
    lenToAdd = Buffer.byteLength(l + '\n');
    container.prevStart += lenToAdd;
    
    let val = null;
    try {
      val = getValue(JSON.parse(l));
    } catch (err) {
      continue;
    }
    
    if (new RegExp(st, 'i').test(val)) {
      container.extra = val.split(/\s+/)[0];
      hoppedOut = true;
      break;
    }
    
  }
  
  if (hoppedOut) {
    fs.closeSync(logfilefd);
    container.mode = BunionMode.SEARCHING;
    scrollUpOriginal();
    return;
  }
  
  container.prevStart -= 9500;
  findLast(logfilefd);
  
};

const getMinBytes = () => {
  const rows = process.stdout.rows;
  const columns = process.stdout.columns;
  return rows * columns * 4;
};


const scrollUpOriginal = () => {
  
  const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
  // unpipePiper();
  // clearLine();
  
  // console.log(getMinBytes());
  
  const b = Buffer.alloc(9501);
  const ps = container.prevStart - 9500;
  
  if (ps <= 0) {
    container.prevStart = 0;
    writeToStdout(chalk.bgBlack.whiteBright(' (beginning of file 2) '));
    fs.closeSync(logfilefd);
    return;
  }
  
  // createLoggedBreak('[scrolling up top]');
  
  const raw = fs.readSync(logfilefd, b, 0, 9500, ps);
  // process.stdout.write('\x1Bc'); // clear screen
  fs.closeSync(logfilefd);
  
  const lines = String(b).split('\n');
  let lenToAdd = 0;
  
  for (let l of lines) {
    lenToAdd = Buffer.byteLength(l + '\n');
    bJsonParser.write(l + '\n');
  }
  
  container.prevStart -= lenToAdd;
  
};


const scrollUp2 = () => {
  
  // unpipePiper();
  // clearLine();
  // console.log(getMinBytes());
  
  
  if (container.prevStart <= 1000) {
    container.prevStart = 0;
    // process.stdout.write('\n');
    clearLine();
    writeToStdout(chalk.bgBlack.whiteBright(' (beginning of file - scrolling up) '));
    return;
  }
  
  
  let i = process.stdout.rows;
  while (i > 0) {
    i--;
    process.stdout.write('\n');
  }
  
  const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
  
  let ps = container.prevStart - 9500, abs = 9500;
  
  if (container.prevStart <= 9500) {
    
    ps = 0;
    abs = Math.max(container.prevStart - 1000, 10);
    
    // if(container.prevStart - 1000 <= 0){
    //   ps = 0;
    //   abs = container.prevStart;
    // }
    // else{
    //   ps = container.prevStart - 1000;
    //   abs = 1000;
    // }
    
  }
  
  const b = Buffer.alloc(abs);
  
  // const ps = container.prevStart - (v || 9500);
  
  // if (ps <= 0) {
  //
  //   console.log('we below.');
  //   fs.closeSync(logfilefd);
  //
  //   if (typeof v === "undefined") {
  //     scrollUp(9300, ++count);
  //     return;
  //   }
  //
  //   const mx = Math.max(Math.floor(v - 200), 0);
  //
  //   if(mx < 10){
  //     console.log('returning early.');
  //     return;
  //   }
  //
  //   scrollUp(mx, ++count);
  //   return;
  // }
  
  // createLoggedBreak('[scrolling up top]');
  
  const raw = fs.readSync(logfilefd, b, 0, abs, ps);
  // process.stdout.write('\x1Bc'); // clear screen
  fs.closeSync(logfilefd);
  
  const lines = String(b).split('\n');
  let lenToAdd = 0;
  
  for (let l of lines) {
    lenToAdd = Buffer.byteLength(l + '\n');
    bJsonParser.write(l + '\n');
  }
  
  container.prevStart -= lenToAdd;
  
};


const scrollUp = () => {
  
  
  if (container.prevStart <= 0) {
    container.prevStart = 0;
    // process.stdout.write('\n');
    clearLine();
    writeToStdout(chalk.bgBlack.whiteBright(' (beginning of file - scrolling up) '));
    return;
  }
  
  
  const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
  let ps = container.prevStart - 9500, abs = 9500;
  
  if (container.prevStart <= 9500) {
    
    let i = process.stdout.rows + 1;
    while (i > 0) {
      i--;
      process.stdout.write('\n');
    }
    
    ps = 0;
    abs = container.prevStart;
    
  }
  
  const b = Buffer.alloc(abs);
  
  const raw = fs.readSync(logfilefd, b, 0, abs, ps);
  fs.closeSync(logfilefd);
  
  const lines = String(b).split('\n');
  let lastLine = lines.pop();
  let lenToAdd = Buffer.byteLength(lastLine + '\n');
  
  if (lastLine.trim() === '') {
    lenToAdd += Buffer.byteLength(lines.pop() + '\n');
  }
  
  for (let l of lines) {
    bJsonParser.write(l + '\n');
  }
  
  container.prevStart -= lenToAdd;
  
};

const scrollUpFive = (): boolean => {
  
  // unpipePiper();
  
  const b = Buffer.alloc(15001);
  const ps = container.prevStart - 15000;
  
  if (ps <= 0) {
    container.prevStart = 0;
    clearLine();
    writeToStdout(chalk.bgBlack.whiteBright(' (beginning of file - scrolling up 5 at a time) '));
    return false;
  }
  
  const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
  const raw = fs.readSync(logfilefd, b, 0, 15000, ps);
  fs.closeSync(logfilefd);
  
  const lines = String(b).split('\n');
  let lenToAdd = 0;
  
  let i = 0;
  while (lines.length > 1) {
    i++;
    lenToAdd += Buffer.byteLength(lines.pop() + '\n');
    if (i >= 5) {
      break;
    }
  }
  
  for (let l of lines) {
    l && bJsonParser.write(l + '\n');
  }
  
  container.prevStart -= lenToAdd;
  return true;
  
};

const scrollDownFive = (): boolean => {
  
  // unpipePiper();
  
  const b = Buffer.alloc(15001);
  const ps = container.prevStart;
  
  if (ps >= stdinStream.bytesWritten) {
    container.prevStart = stdinStream.bytesWritten;
    clearLine();
    writeToStdout(chalk.bgBlack.whiteBright(' (current end of file) '));
    return false;
  }
  
  const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
  const raw = fs.readSync(logfilefd, b, 0, 15000, ps);
  fs.closeSync(logfilefd);
  
  const lines = String(b).split('\n');
  let lenToAdd = 0;
  
  let i = 0;
  for (let l of lines) {
    i++;
    lenToAdd += Buffer.byteLength(l + '\n');
    l && bJsonParser.write(l + '\n');
    if (i >= 5) {
      break;
    }
  }
  
  container.prevStart += lenToAdd;
  return true;
  
};

const scrollDown = (): boolean => {
  
  // unpipePiper();
  // clearLine();
  
  const b = Buffer.alloc(3501);
  const ps = container.prevStart;
  
  if (ps >= stdinStream.bytesWritten) {
    container.prevStart = stdinStream.bytesWritten;
    clearLine();
    writeToStdout(chalk.bgBlack.whiteBright(' (current end of file) '));
    return false;
  }
  
  const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
  const raw = fs.readSync(logfilefd, b, 0, 3500, ps);
  fs.closeSync(logfilefd);
  // process.stdout.write('\x1Bc'); // clear screen
  const firstLine = String(b).split('\n')[0];
  const lenToAdd = Buffer.byteLength(firstLine + '\n');
  bJsonParser.write(firstLine + '\n');
  container.prevStart += lenToAdd;
  return true;
  
};

const createTimeout = () => {
  clearTimeout(container.to);
  container.to = setTimeout(closeStdin, container.timeout);
};

const handleSearchTermTyping = (d: string) => {
  if (ctrlChars.has(String(d))) {
    consumer.warn('ctrl command ignored.');
    return;
  }
  container.searchTerm += String(d);
  clearLine();
  writeToStdout('Search term:', container.searchTerm);
};

const handleShutdown = (signal: string) => () => {
  unpipePiper();
  console.log();
  consumer.warn(`User hit ${signal}.`);
  if (container.sigCount++ === 1) {
    if (signal === 'ctrl-d') {
      container.keepLogFile = true;
    }
    process.exit(1);
    return;
  }
  consumer.warn('Hit ctrl-d/ctrl-c again to exit. Use ctrl-d to keep the log file, ctrl-c will delete it.');
};

const handleCtrlC = handleShutdown('ctrl-c');
const handleCtrlD = handleShutdown('ctrl-d');

let firstScrollAfterSearch = false;

if (process.stdout.isTTY) {
  
  {
    
    const strm = new ReadStream(<any>1);   // previously fd =  fs.open('/dev/tty','r+')
    strm.setRawMode(true);
    
    strm.on('data', (d: any) => {
      
      
      createTimeout();
      container.lastUserEvent = Date.now();
      
      if (container.logChars) {
        console.log({d: String(d)});
      }
      
      // if (String(d) === '\r' && container.mode === BunionMode.SEARCHING) {
      //   unpipePiper();
      //   clearLine();
      //   startReading();
      //   return;
      // }
      
      if (String(d) === '\u000e') {
        container.logChars = !container.logChars;
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
      
      container.sigCount = 0;
      
      if (String(d) === '\u0002') { // ctrl-b
        container.searchTerm = '';
        clearLine();
        writeToStdout('Cleared search term.');
        return;
      }
      
      // if (String(d) === '\u0012') {  // ctrl-r
      //   container.searchTerm = '';
      //   console.log('Search term cleared.');
      //   return;
      // }
      
      if (String(d) === '\u0013') {  // ctrl-s
        container.stopOnNextMatch = true;
        return;
      }
      
      if (String(d) === '\u0018') {  // ctrl-x
        container.stopOnNextMatch = false;
        return;
      }
      
      if (String(d) === '\u0001') {
        if (container.mode !== BunionMode.FIND_LAST) {
          container.mode = BunionMode.FIND_LAST;
          container.prevStart = stdinStream.bytesWritten;
          unpipePiper();
          const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
          findLast(logfilefd);
        }
        return;
      }
      
      // if(container.mode === BunionMode.SEARCHING && String(d) === '\r'){
      //   doTailing();
      //   return;
      // }
      
      if (container.mode === BunionMode.SEARCHING && String(d) === '\t') {
        container.stopOnNextMatch = true;
        doTailing();
        return;
      }
      
      if (container.mode === BunionMode.TAILING && String(d) === '\r') {
        container.stopOnNextMatch = true;
        return;
      }
      
      if (container.mode !== BunionMode.PAUSED && levelMap.has(String(d))) {
        container.logLevel = levelMap.get(String(d));
        writeStatusToStdout();
        return;
      }
      
      if (String(d) === '\u0014' && container.mode !== BunionMode.TAILING) {  // ctrl-t
        container.mode = BunionMode.TAILING;
        container.stopOnNextMatch = false;
        doTailing();
        return;
      }
      
      if (String(d) === 's' && container.mode !== BunionMode.PAUSED) {
        if (container.mode !== BunionMode.SEARCHING) {
          firstScrollAfterSearch = true;
          if (container.mode === BunionMode.READING) {
            container.prevStart = stdinStream.bytesWritten;
          }
          container.mode = BunionMode.SEARCHING;
          container.prevStart = container.prevStart || stdinStream.bytesWritten;
          unpipePiper();
          writeStatusToStdout();
        }
        return;
      }
      
      if (String(d) === '\u001b[A' && container.mode === BunionMode.SEARCHING) {
        if (firstScrollAfterSearch) {
          firstScrollAfterSearch = false;
          container.prevStart += 50;
        }
        scrollUp();
        return;
      }
      
      if ((String(d) === '\u001b[2A' || String(d) === '\u001b[1;2A') && container.mode === BunionMode.SEARCHING) {
        scrollUpFive();
        return;
      }
      
      if ((String(d) === '\u001b[2B' || String(d) === '\u001b[1;2B') && container.mode === BunionMode.SEARCHING) {
        scrollDownFive();
        return;
      }
      
      if ((String(d) === '\r' || String(d) === '\u001b[B') && container.mode === BunionMode.SEARCHING) {
        // container.mode = BunionMode.SCROLLING;
        if (firstScrollAfterSearch) {
          firstScrollAfterSearch = false;
          container.prevStart -= 50;
        }
        scrollDown();
        return;
      }
      
      if (String(d).trim() === 'p' && container.mode !== BunionMode.PAUSED) {
        container.mode = BunionMode.PAUSED;
        unpipePiper();
        clearLine();
        // writeToStdout(chalk.bgBlack.whiteBright(`Mode: ${container.mode} - use ctrl+p to return to reading mode. `));
        writeStatusToStdout();
        container.currentBytes = Math.max(0, stdinStream.bytesWritten - 100);
        return;
      }
      
      // up arrow: \u001b[A
      // down arrow: \u001b[B
      // shift up: \u001b[2A
      // shift down: \u001b[2B
      
      if (String(d).trim() === '\u0010' && container.mode !== BunionMode.READING) { // ctrl-p
        startReading();
        return;
      }
      
      if (container.mode === BunionMode.PAUSED && String(d) === '') { // backspace!
        container.searchTerm = container.searchTerm.slice(0, -1);
        clearLine();
        writeToStdout('Search term:', container.searchTerm);
        return;
      }
      
      if (String(d) === '\r' && container.mode === BunionMode.PAUSED) {
        container.stopOnNextMatch = true;
        doTailing();
        return;
      }
      
      if (container.mode === BunionMode.PAUSED) {
        handleSearchTermTyping(d);
        return;
      }
      
      if (String(d) === '\r') {
        resume();
      }
      
    });
  }
  
}

// killall: unknown signal f; valid signals:
// HUP INT QUIT ILL TRAP ABRT EMT FPE KILL BUS SEGV SYS PIPE ALRM TERM URG STOP
// TSTP CONT CHLD TTIN TTOU IO XCPU XFSZ VTALRM PROF WINCH INFO USR1 USR2






