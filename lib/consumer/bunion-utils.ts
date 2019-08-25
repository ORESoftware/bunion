'use strict';

import * as util from "util";
import chalk from 'chalk';
import * as readline from "readline";
import {ConType} from './con';
import {BunionMode} from '../bunion';

const utilInspectOpts = {
  showHidden: true,
  colors: true,
  depth: 5,
  compact: false,
  sorted: true
};

export const getInspected = (v: any, opts: any): string => {
  
  if (typeof v === 'string') {
    return v;
  }
  
  if (!Array.isArray(v)) {
    if (true || opts.inspect) {
      return util.inspect(v, utilInspectOpts);
    }
    
    return JSON.stringify(v);
  }
  
  return v.map(v => {
      
      if (typeof v === 'string') {
        return v;
      }
      
      if (true || opts.inspect) {
        return util.inspect(v, utilInspectOpts);
      }
      
      //safe to stringify since it's already been serialized
      return JSON.stringify(v);
    })
    .join(' ');
  
};


export const replacer = function (match: any) {
  // p1 is nondigits, p2 digits, and p3 non-alphanumerics
  return chalk.redBright.bold(match);
};

export const getHighlightedString = (match: string, con: ConType, opts: any) => {
  
  if (opts.highlight && con.searchTerm !== '') {
    match = match.replace(new RegExp(con.searchTerm, 'ig'), replacer);
  }
  
  return match;
};

export const clearLine = () => {
  readline.clearLine(process.stdout, 0);  // clear current text
  readline.cursorTo(process.stdout, 0);   // move cursor to beginning of line
};

export const writeToStdout = (...args: string[]) => {
  clearLine();
  for (let v of args) {
    process.stdout.write(v + ' ');
  }
};


export const handleSearchTermMatched = (con: ConType, isMatched: boolean) => {
  
  let searchTermStr = ' ';
  
  if (con.stopOnNextMatch && isMatched) {
    con.mode = BunionMode.SEARCHING;
    searchTermStr = ` Stopped on match. `;
  }
  
  writeStatusToStdout(con, searchTermStr);
  
};

export const writeStatusToStdout = (con: ConType, searchTermStr?: string) => {
  
  if (false && !process.stdout.isTTY) {
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
