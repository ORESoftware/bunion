#!/usr/bin/env node
'use strict';

import chalk from 'chalk';
import {createParser} from "./json-parser";
import {getConf} from "./utils";
import {consumer} from './logger';
import {BunionFields, BunionJSON, Level, ordered} from "./bunion";
import {BunionMode} from "./bunion";
import {BunionLevelToNum} from "./bunion";
import * as uuid from 'uuid';
import * as fs from 'fs';
import {ChildProcess} from "child_process";
import * as path from "path";
import {ReadStream} from "tty";
import {Transform} from "stream";

const dashdash = require('dashdash');
import readline = require('readline');

process.on('uncaughtException', (e: any) => {
  consumer.error('Uncaught exception:', e.message || e);
});

process.on('unhandledRejection', (e: any) => {
  consumer.error('Unhandled rejection:', e.message || e);
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

const options = [
  {
    name: 'version',
    type: 'bool',
    help: 'Print tool version and exit.'
  },
  {
    names: ['help'],
    type: 'bool',
    help: 'Print help and exit.'
  },
  {
    names: ['verbose', 'v'],
    type: 'arrayOfBool',
    help: 'Verbose output. Use multiple times for more verbose.'
  },
  {
    names: ['level', 'l'],
    type: 'string',
    default: 'trace'
  },
  {
    names: ['show'],
    type: 'string',
    default: 'thpalf'  // time, host, process/pid, appname, level, fields
  },
  {
    names: ['hide'],
    type: 'string',
    default: ''  // time, host, process/pid, appname, level, fields
  },
  {
    names: ['output', 'o'],
    type: 'string',
    default: ''
  },
  {
    names: ['match', 'or'],
    type: 'arrayOfString',
    default: [] as Array<string>
  },
  {
    names: ['filter'],
    type: 'string',
    default: ''
  },
  {
    names: ['must-match', 'and'],
    type: 'arrayOfString',
    default: [] as Array<string>
  },
  {
    names: ['highlight'],
    type: 'bool',
    default: true
  },
  {
    names: ['no-highlight'],
    type: 'bool',
    default: false
  },
  {
    // names: ['dark-background', 'dark-bg', 'darkbg', 'dark'],
    names: ['dark'],
    type: 'bool',
    default: false
  },
  {
    // names: ['light-background', 'light-bg', 'lightbg', 'light'],
    names: ['light'],
    type: 'bool',
    default: false
  },
  {
    names: ['background', 'bg'],
    type: 'string',
    default: '',
    enum: ['light', 'dark']
  },
  {
    names: ['only-parseable', 'only'],
    type: 'bool',
    default: false
  },
  {
    names: ['no-show-match-count'],
    type: 'bool',
    default: false
  },
  {
    names: ['always-show-match-count'],
    type: 'bool',
    default: false
  },

];

let opts: any, parser = dashdash.createParser({options: options});

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

const level = opts.level;
const output = String(opts.output || 'medium').toLowerCase();
const maxLevel = String(level || (bunionConf.consumer && bunionConf.consumer.level) || 'TRACE').toUpperCase();
const maxIndex = ordered.indexOf(maxLevel) + 1;

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
  return chalk.magentaBright.bold(match);
};

const getHighlightedString = (str: string) => {
  let match = allMatches.reduce((s, r) => {
    return s.replace(r, replacer);
  }, str);
  
  
  if (container.searchTerm !== '') {
    match = match.replace(new RegExp(container.searchTerm, 'g'), replacer);
  }
  
  return match;
  
};

const getFields = (fields: any) => {
  return Object.keys(fields).reduce(function (s, k) {
    return s += `(${k}=${String(fields[k])}) `;
  }, '');
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


process.stdin.setMaxListeners(300);

const stdinStream = process.stdin.resume()
  .pipe(fs.createWriteStream(logfile));


const container = {
  k: null as ChildProcess,
  currentBytes: 0,
  currentLines: 0,
  mode: BunionMode.READING,
  piper: null as any,
  prevStart: null as number,
  searchTerm: '',
  logLevel: maxIndex,
  stopOnNextMatch: true,
  sigCount: 0,
  logChars: false,
  stopped: false,
  matched: false,
  showUnmatched: true
};


process.once('exit', code => {
  
  fs.unlinkSync(logfile);
  
  if (container.piper) {
    container.piper.unpipe();
    container.piper.removeAllListeners();
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

const onJSON = (v: BunionJSON) => {
  
  
  if ((filterKeys.length > 0 || allMatches.length > 0 || container.searchTerm != '') && filteredCount > 0 && opts.no_show_match_count !== true) {
    clearLine();
  }
  
  if (!(matches(v.value) && mustMatches(v.value) && matchFilterObject(v.fields))) {
    filteredCount++;
    if (opts.no_show_match_count !== true) {
      process.stdout.write(getMatchCountLine(matchCount, filteredCount));
    }
    return true;
  }
  
  if (container.searchTerm !== '' && !new RegExp(container.searchTerm).test(v.value)) {
    filteredCount++;
    if (opts.no_show_match_count !== true) {
      process.stdout.write(getMatchCountLine(matchCount, filteredCount));
    }
    return true;
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
  
  if ((allMatches.length > 0 || filterKeys.length > 0) && filteredCount > 0 && opts.no_show_match_count !== true) {
    process.stdout.write(
      getMatchCountLine(matchCount, filteredCount)
    );
  }
  
  if (container.stopOnNextMatch && container.searchTerm != '') {
    container.matched = true;
    container.stopped = true;
    if (container.piper) {
      container.piper.unpipe();
      container.piper.removeAllListeners();
      clearLine();
      writeToStdout(chalk.bgBlack.whiteBright(`Stopped on match. (Search term is ${container.searchTerm})`));
    }
  }
  
};

const writeToStdout = (...args: string[]) => {
  for (let v of args) {
    process.stdout.write(v + ' ');
  }
};

const startReading = () => {
  
  const jsonParser = createParser({
    onlyParseableOutput: Boolean(opts.only_parseable),
    clearLine: allMatches.length > 0 && opts.no_show_match_count !== true
  });
  
  const piper = container.piper = process.stdin.pipe(jsonParser, {end: true});
  
  piper.on('bunion-json', function (v: BunionJSON) {
    onJSON(v);
  });
  
};

startReading();  // start tailing

const levelMap = new Map([
  ['6', BunionLevelToNum.FATAL],
  ['5', BunionLevelToNum.ERROR],
  ['4', BunionLevelToNum.WARN],
  ['3', BunionLevelToNum.INFO],
  ['2', BunionLevelToNum.DEBUG],
  ['1', BunionLevelToNum.TRACE],
]);


const unpipePiper = () => {
  if (container.piper) {
    container.piper.unpipe();
    container.piper.removeAllListeners();
  }
};

const t = new Transform();
t._transform = (c, e, cb) => cb(null, c);

const jsonParser = createParser({
  onlyParseableOutput: Boolean(opts.only_parseable),
  clearLine: allMatches.length > 0 && opts.no_show_match_count !== true
});

t.pipe(jsonParser).on('bunion-json', d => {
  onJSON(d);
});

// const fd = fs.openSync('/dev/tty', 'r+');

// console.log({fd});

const ctrlChars = new Set([
  '\u0003', //
  '\r',  // m
  '\u000e' // n
]);


const doTailing = () => {
  
  container.mode = BunionMode.TAILING;
  
  if (container.piper) {
    // container.piper.end();
    container.piper.unpipe();
    container.piper.removeAllListeners();
  }
  
  const jsonParser = createParser({
    onlyParseableOutput: Boolean(opts.only_parseable),
    clearLine: allMatches.length > 0 && opts.no_show_match_count !== true
  });
  
  jsonParser.on('bunion-json', d => {
    onJSON(d);
  });
  
  const fst = fs.createReadStream(logfile, {start: Math.max(stdinStream.bytesWritten - 300, 0)});
  container.piper = fst.pipe(jsonParser, {end: false});
  fst.once('end', () => {
    // paused
    container.piper = process.stdin.pipe(jsonParser);
  });
  
};


const scrollUp = () => {
  
  const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
  unpipePiper();
  clearLine();
  
  const b = Buffer.alloc(9501);
  const ps = container.prevStart;
  
  if (ps <= 0) {
    container.prevStart = 0;
    writeToStdout(chalk.bgBlack.whiteBright(' (beginning of file) '));
    return;
  }
  
  const raw = fs.readSync(logfilefd, b, 0, 9500, ps);
  // process.stdout.write('\x1Bc'); // clear screen
  
  const lines = String(b).split('\n');
  let lenToAdd = 0;
  
  for (let l of lines) {
    lenToAdd = Buffer.from(l + '\n').length;
    t.write(l + '\n');
  }
  
  container.prevStart -= lenToAdd;
  const currentSearchTerm = container.searchTerm === '' ? ` no search term. ` : `current search term: ${container.searchTerm} `;
  clearLine();
  writeToStdout(chalk.bgBlack.whiteBright(` Log level: ${container.logLevel}, ${currentSearchTerm} `));
  
};


const scrollDown = () => {
  
  const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
  unpipePiper();
  
  clearLine();
  
  const b = Buffer.alloc(3501);
  const ps = container.prevStart;
  
  if (ps >= stdinStream.bytesWritten) {
    container.prevStart = stdinStream.bytesWritten;
    writeToStdout(chalk.bgBlack.whiteBright(' (current end of file) '));
    return;
  }
  
  const raw = fs.readSync(logfilefd, b, 0, 3500, ps);
  
  // process.stdout.write('\x1Bc'); // clear screen
  const firstLine = String(b).split('\n')[0];
  const lenToAdd = Buffer.from(firstLine + '\n').length;
  t.write(firstLine + '\n');
  container.prevStart += lenToAdd;
  const currentSearchTerm = container.searchTerm === '' ? ` no search term. ` : `current search term: ${container.searchTerm} `;
  clearLine();
  writeToStdout(chalk.bgBlack.whiteBright(` Log level: ${container.logLevel}, ${currentSearchTerm} `));
  
};


const strm = new ReadStream(<any>1);
strm.setRawMode(true);

strm.on('data', (d: any) => {
  
  if (container.logChars) {
    console.log({d: String(d)});
  }
  
  if (String(d) === '\r' && container.stopped) {
    container.stopped = false;
    container.matched = false;
    startReading();
    return;
  }
  
  if (String(d) === '\u000e') {
    container.logChars = true;
    return;
  }
  
  if (String(d).trim() === '\u0004') {
    unpipePiper();
    console.log();
    consumer.warn('User hit ctrl-d');
    if (container.sigCount++ === 1) {
      process.exit(1);
      return;
    }
    consumer.warn('Hit ctrl-d/ctrl-c again to exit.');
    return;
  }
  
  if (String(d).trim() === '\u0003') {
    unpipePiper();
    console.log();
    consumer.warn('User hit ctrl-c');
    if (container.sigCount++ === 1) {
      process.exit(1);
      return;
    }
    consumer.warn('Hit ctrl-c/ctrl-d again to exit.');
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
  
  if (container.mode !== BunionMode.PAUSED && levelMap.has(String(d))) {
    container.logLevel = levelMap.get(String(d));
    // consumer.info('Log level changed to:', container.logLevel);
    return;
  }
  
  if (String(d) === '\u0014' && container.mode !== BunionMode.TAILING) {  // ctrl-t
    container.mode = BunionMode.TAILING;
    doTailing();
    return;
  }
  
  if (String(d) === 's' && container.mode !== BunionMode.SEARCHING && container.mode !== BunionMode.PAUSED) {
    container.mode = BunionMode.SEARCHING;
    container.prevStart = container.prevStart || stdinStream.bytesWritten;
    unpipePiper();
    console.log();
    const currentSearchTerm = container.searchTerm === '' ? ` no search term. ` : `current search term: ${container.searchTerm} `;
    clearLine();
    writeToStdout(chalk.bgBlack.whiteBright(` Log level: ${container.logLevel}, ${currentSearchTerm} `));
    return;
  }
  
  if (String(d) === '\u001b[A' && container.mode === BunionMode.SEARCHING) {
    scrollUp();
    return;
  }
  
  if (String(d) === '\u001b[2B' && container.mode === BunionMode.SEARCHING) {
    // container.mode = BunionMode.SCROLLING;
    if (container.matched && container.stopped) {
      clearLine();
      writeToStdout('Matched found.');
      return;
    }
    scrollDown();
    return;
  }
  
  if ((String(d) === '\r' || String(d) === '\u001b[B') && container.mode === BunionMode.SEARCHING) {
    // container.mode = BunionMode.SCROLLING;
    scrollDown();
    return;
  }
  
  if (String(d).trim() === 'p' && container.mode !== BunionMode.PAUSED) {
    container.mode = BunionMode.PAUSED;
    clearLine();
    writeToStdout(chalk.bgBlack.whiteBright(' (paused mode - use ctrl+p to return to reading mode.) '));
    container.currentBytes = Math.max(0, stdinStream.bytesWritten - 100);
    unpipePiper();
    return;
  }
  
  // up arrow: \u001b[A
  // down arrow: \u001b[B
  // shift up: \u001b[2A
  // shift down: \u001b[2B
  
  
  if (String(d).trim() === '\u0010' && container.mode !== BunionMode.READING) { // ctrl-p
    container.mode = BunionMode.READING;
    unpipePiper();
    writeToStdout(chalk.bgBlack.whiteBright(' (reading/tailing mode) '));
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
    // container.stopOnNextMatch = true;
    doTailing();
    return;
  }
  
  if (container.mode === BunionMode.PAUSED) {
    if (ctrlChars.has(String(d))) {
      consumer.warn('ctrl command ignored.');
      return;
    }
    container.searchTerm += String(d);
    clearLine();
    writeToStdout('Search term:', container.searchTerm);
    return;
  }
  
  
});


// killall: unknown signal f; valid signals:
// HUP INT QUIT ILL TRAP ABRT EMT FPE KILL BUS SEGV SYS PIPE ALRM TERM URG STOP
// TSTP CONT CHLD TTIN TTOU IO XCPU XFSZ VTALRM PROF WINCH INFO USR1 USR2

console.log('rows:', process.stdout.rows);
console.log('columns:', process.stdout.columns);





