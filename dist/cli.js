#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const json_parser_1 = require("./json-parser");
process.stdin.resume().pipe(json_parser_1.createParser())
    .on('bunion-json', function (v) {
    console.log(v.date, v.appName, v.level, chalk_1.default.cyan(v.value));
});
