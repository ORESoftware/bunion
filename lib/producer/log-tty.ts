'use strict';

import chalk from "chalk";
import {BunionJSON} from "../bunion";
import {getFields} from "../utils";
import * as util from "util";

const insp = (v: { value: string }) => {
  return v.value;
  // return util.inspect(v.value, {depth: 44});
};

export const logTTY = (logLevel: number, output: string, v: BunionJSON) => {

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

  // if (highlight) {
  //   v.value = getHighlightedString(v.value);
  // }

  if (v.fields) {
    fields = getFields(v.fields);
  }

  if (v.level === 'FATAL') {
    return `${chalk.gray(v.appName)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${insp(v)}\n`
  }

  if (v.level === 'ERROR' && logLevel < 6) {
    return `${chalk.gray(v.appName)} ${chalk.redBright.bold(v.level)} ${chalk.gray(fields)} ${insp(v)}\n`
  }

  if (v.level === 'WARN' && logLevel < 5) {
    return `${chalk.gray(v.appName)} ${chalk.magentaBright.bold(v.level)} ${chalk.gray(fields)} ${insp(v)}\n`
  }

  if (v.level === 'INFO' && logLevel < 4) {
    return `${chalk.gray(v.appName)} ${chalk.cyan(v.level)} ${chalk.gray(fields)} ${insp(v)}\n`
  }

  if (v.level === 'DEBUG' && logLevel < 3) {
    return `${chalk.gray(v.appName)} ${chalk.yellowBright.bold(v.level)} ${chalk.gray(fields)} ${insp(v)}\n`
  }

  if (v.level === 'TRACE' && logLevel < 2) {
    return `${chalk.gray(v.appName)} ${chalk.gray(v.level)} ${chalk.gray(fields)} ${insp(v)}\n`
  }

  return '(bunion internal error: fall-through in switch, please report this problem.)';

};