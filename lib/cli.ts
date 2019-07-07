#!/usr/bin/env node
'use strict';

import chalk from 'chalk';
import {createParser} from "./json-parser";

const dashdash = require('dashdash');
import readline = require('readline');
import {getConf} from "./utils";
import {consumer} from './logger';
import {ordered, Level, BunionLevelInternal, BunionJSON, BunionFields} from "./bunion";
import * as uuid from 'uuid';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from "path";

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
    help: 'Print this help and exit.'
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

const jsonParser = createParser({
  onlyParseableOutput: Boolean(opts.only_parseable),
  clearLine: allMatches.length > 0 && opts.no_show_match_count !== true
});

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

process.once('exit', code => {
  fs.unlinkSync(logfile);
  consumer.info('exiting with code:', code);
});

// const fd = fs.openSync(logfile, fs.constants.O_RDWR);

const startReading = (d: string) => {
  
  const v = fs.readFileSync(logfile);
  
  const k = cp.spawn(`bash`);
  k.stdin.end(`tail -f ${logfile}`);
  
  k.stderr.pipe(process.stderr);
  
  k.stdout.pipe(jsonParser).on('bunion-json', function (v: BunionJSON) {
    
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
      process.stderr.write(
        `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${chalk.red.bold(v.value)} \n`
      );
    }
    
    if (v.level === 'ERROR' && maxIndex < 5) {
      process.stderr.write(
        `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${getDarkOrlight(v.value)} \n`
      );
    }
    
    if (v.level === 'WARN' && maxIndex < 4) {
      process.stderr.write(
        `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.magentaBright.bold(v.level)} ${chalk.gray(fields)} ${getDarkOrlight(v.value)} \n`
      );
    }
    
    if (v.level === 'INFO' && maxIndex < 3) {
      process.stdout.write(
        `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.cyan(v.level)} ${chalk.gray(fields)} ${chalk.cyan.bold(v.value)} \n`
      );
    }
    
    if (v.level === 'DEBUG' && maxIndex < 2) {
      process.stdout.write(
        `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.yellowBright.bold(v.level)} ${chalk.gray(fields)} ${chalk.yellow(v.value)} \n`
      );
    }
    
    if (v.level === 'TRACE' && maxIndex < 1) {
      process.stdout.write(
        `${chalk.gray(v.d)} ${chalk.gray(v.appName)} ${chalk.gray(v.level)} ${chalk.gray(fields)} ${chalk.gray.bold(v.value)} \n`
      );
    }
    
    if ((allMatches.length > 0 || filterKeys.length > 0) && filteredCount > 0 && opts.no_show_match_count !== true) {
      process.stdout.write(
        getMatchCountLine(matchCount, filteredCount)
      );
    }
    
  });
  
  
};

process.stdin.resume()
  .once('data', startReading)
  .pipe(fs.createWriteStream(logfile));

// const inputStream = fs.createReadStream(logfile, {encoding: 'utf8'});
//
// inputStream.on('data', d => {
//   console.log({d});
// });


const fd = fs.openSync('/dev/tty','r+');

fs.createReadStream(null,{fd}).on('data', d => {
  console.log({d: String(d)});
});








