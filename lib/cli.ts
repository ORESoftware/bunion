#!/usr/bin/env node
'use strict';

import chalk from 'chalk';
import {createParser} from "./json-parser";
import {getConf} from "./utils";
import {consumer} from './logger';
import {BunionFields, BunionJSON, Level, ordered} from "./bunion";
import {BunionMode} from "./bunion";
import {BunionLevelInternal} from "./bunion";
import * as uuid from 'uuid';
import * as fs from 'fs';
import * as cp from 'child_process';
import {ChildProcess} from "child_process";
import * as path from "path";
import {ReadStream} from "tty";
import {Transform} from "stream";

const dashdash = require('dashdash');
import readline = require('readline');
import {BunionLevelToNum} from "./bunion";

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
const maxLevel = String(level || (bunionConf.consumer && bunionConf.consumer.level) || 'trace').toUpperCase();
const maxIndex = ordered.indexOf(maxLevel);

if (maxIndex < 0) {
  throw new Error(
    chalk.red('Your value for env var "bunion_max_level" is not set to a valid value, must be one of: ' + Object.keys(Level))
  );
}

const andMatches = flattenDeep([opts.must_match]).filter(v => v).map(v => new RegExp(v, 'g'));
const orMatches = flattenDeep([opts.match]).filter(v => v).map(v => new RegExp(v, 'g'));
const highlight = opts.highlight && opts.no_highlight !== true || false;
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

const getHighlightedString = (str: string) => {
  return allMatches.reduce((s, r) => {
    return s.replace(r, function replacer(match, p1, p2, p3, offset, string) {
      // p1 is nondigits, p2 digits, and p3 non-alphanumerics
      return chalk.magentaBright.bold(match);
    });
  }, str);
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


const stdinStream = process.stdin.resume()
  .pipe(fs.createWriteStream(logfile));

process.once('exit', code => {
  fs.unlinkSync(logfile);
  // process.stdin.end();
  // stdinStream.close();
  consumer.info('exiting with code:', code);
});


const container = {
  k: null as ChildProcess,
  currentBytes: 0,
  currentLines: 0,
  mode: BunionMode.READING,
  piper: null as any,
  prevStart: null as number,
  searchTerm: '.*',
  logLevel: maxIndex,
};


const onJSON = (v: BunionJSON) => {
  
  
  if ((filterKeys.length > 0 || allMatches.length > 0) && filteredCount > 0 && opts.no_show_match_count !== true) {
    readline.clearLine(process.stdout, 0);  // clear current text
    readline.cursorTo(process.stdout, 0);   // move cursor to beginning of line
  }
  
  
  if (!(matches(v.value) && mustMatches(v.value) && matchFilterObject(v.fields))) {
    filteredCount++;
    if (opts.no_show_match_count !== true) {
      process.stdout.write(getMatchCountLine(matchCount, filteredCount));
    }
    return;
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
  
};

const startReading = () => {
  
  // const k = container.k = cp.spawn(`tail`, ['-n', String(d), '-f', logfile]);
  
  // const k = container.k = cp.spawn(`bash`, [], {detached: false});
  
  // k.stdin.end(`on_sigkill(){ exit 0; }; export -f on_sigkill; trap KILL SIGKILL SIGINT INT on_sigkill ; tail -n ${d} -f ${logfile}`);
  
  // k.stdin.end(`tail -n ${d} -f ${logfile}`);
  
  // const p = k.stderr.pipe(process.stderr);
  
  // k.once('exit', code => {
  //   p.destroy();
  //   p.removeAllListeners();
  //   consumer.warn('tail process exiting with:', code);
  // });
  
  const jsonParser = createParser({
    onlyParseableOutput: Boolean(opts.only_parseable),
    clearLine: allMatches.length > 0 && opts.no_show_match_count !== true
  });
  
  const piper = container.piper = process.stdin.pipe(jsonParser);
  
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


// const inputStream = fs.createReadStream(logfile, {encoding: 'utf8'});
// inputStream.on('data', d => {
//   console.log({d});
// });

const t = new Transform();
t._transform = (c, e, cb) => cb(null, c);

const jsonParser = createParser({
  onlyParseableOutput: Boolean(opts.only_parseable),
  clearLine: allMatches.length > 0 && opts.no_show_match_count !== true
});

t.pipe(jsonParser).on('bunion-json', d => {
  onJSON(d);
});

const fd = fs.openSync('/dev/tty', 'r+');

console.log({fd});

const strm = new ReadStream(<any>fd);

strm.setRawMode(true);

strm.on('data', (d: any) => {
  
  console.log({d: String(d)});
  
  if (container.mode !== BunionMode.PAUSED && levelMap.has(String(d))) {
    container.logLevel = levelMap.get(String(d));
    consumer.info('Log level changed to:', container.logLevel);
    return;
  }
  
  if (String(d) === '\u0014' && container.mode !== BunionMode.TAILING) {
    
    console.log('we are tailing now:');
    
    container.mode = BunionMode.TAILING;
    
    if(container.piper){
      container.piper.end();
      container.piper.removeAllListeners();
    }
    
    const jsonParser = createParser({
      onlyParseableOutput: Boolean(opts.only_parseable),
      clearLine: allMatches.length > 0 && opts.no_show_match_count !== true
    });
    
    jsonParser.on('bunion-json', d => {
      onJSON(d);
    });
    
    const fst = fs.createReadStream(logfile);
    container.piper = fst.pipe(jsonParser, {end: false});
    fst.once('end', () => {
      container.piper =  process.stdin.pipe(jsonParser);
    });
    
    return;
  }
  
  if (String(d) === 's' && container.mode !== BunionMode.SEARCHING) {
    container.mode = BunionMode.SEARCHING;
    console.log(chalk.bgBlack.whiteBright(' (search mode) '));
    const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
    container.piper.end();
    container.piper.removeAllListeners();
    const b = Buffer.alloc(1001);
    const ps = container.prevStart = Math.max(0, stdinStream.bytesWritten - 1000);
    const raw = fs.readSync(logfilefd, b, 0, 1000, ps);
    // console.log(String(b));
    process.stdout.write('\x1Bc'); // clear screen
    for (let s of String(b).split('\n')) {
      t.write(s + '\n');
    }
    console.log();
    console.log(chalk.bgBlack.whiteBright(` Log level: ${container.logLevel}, current search term: ${container.searchTerm} `));
    return;
  }
  
  if (String(d) === '\r' && container.mode === BunionMode.SEARCHING) {
    // container.mode = BunionMode.SCROLLING;
    const logfilefd = fs.openSync(logfile, fs.constants.O_RDWR);
    container.piper.end();
    container.piper.removeAllListeners();
    const b = Buffer.alloc(1501);
    let eof = false;
    let ps = container.prevStart + 200;
    
    if (ps >= stdinStream.bytesWritten) {
      ps = container.prevStart = stdinStream.bytesWritten - 200;
      eof = true;
    }
    
    const raw = fs.readSync(logfilefd, b, 0, 1500, ps);
    
    process.stdout.write('\x1Bc'); // clear screen
    
    let lenToAdd = 0;
    
    for (let s of String(b).split('\n')) {
      
      lenToAdd += Buffer.from(s + '\n').length;
      t.write(s + '\n');
      
      if (!eof) {
        break;
      }
    }
    
    if (!eof) {
      container.prevStart += lenToAdd;
    }
    
    if (eof) {
      console.log();
      console.log(chalk.bgBlack.whiteBright(' (current end of file) '));
    }
    
    console.log();
    console.log(chalk.bgBlack.whiteBright(` Log level: ${container.logLevel}, current search term: ${container.searchTerm} `));
    return;
  }
  
  if (String(d).trim() === 'p' && container.mode === BunionMode.READING) {
    container.mode = BunionMode.PAUSED;
    console.log();
    console.log(chalk.bgBlack.whiteBright(' (paused mode - use ctrl+p to return to reading mode.) '));
    console.log();
    
    container.piper.end();
    container.piper.removeAllListeners();
    // container.k.kill('SIGKILL');
    // process.exit(1);
    return;
  }
  
  // up arrow: \u001b[A
  // down arrow: \u001b[B
  
  if (String(d).trim() === '\u0010' && container.mode !== BunionMode.READING) {
    container.mode = BunionMode.READING;
    console.log(chalk.bgBlack.whiteBright(' (reading/tailing mode) '));
    startReading();
    return;
  }
  
  if (String(d).trim() === '\u0004') {
    consumer.warn('User hit control-D');
    process.exit(1);
    return;
  }
  
  if (String(d).trim() === '\u0003') {
    consumer.warn('User hit control-C');
    // process.exit(1);
    return;
  }
  
});


//
// fs.createReadStream(null,{fd}).setRawMode(true).on('data', d => {
//   console.log({d: String(d)});
// });


// killall: unknown signal f; valid signals:
// HUP INT QUIT ILL TRAP ABRT EMT FPE KILL BUS SEGV SYS PIPE ALRM TERM URG STOP
// TSTP CONT CHLD TTIN TTOU IO XCPU XFSZ VTALRM PROF WINCH INFO USR1 USR2

console.log('rows:', process.stdout.rows);
console.log('columns:', process.stdout.columns);





