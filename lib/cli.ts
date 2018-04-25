#!/usr/bin/env node
'use strict';

import chalk from 'chalk';
import {createParser} from "./json-parser";
import {BunionJSON} from "./index";

process.stdin.resume().pipe(createParser())
.on('bunion-json', function (v: BunionJSON) {
  console.log(v.date, v.appName, v.level, chalk.cyan(v.value));
});