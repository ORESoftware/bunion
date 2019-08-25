'use strict';

import {BunionLevelToNum} from '../bunion';

export const ctrlChars = new Set([
  '\t', // tab
  '\u0001', //a
  '\u0004', // d
  '\u0003', // c
  '\r',  // m
  '\u001b[A', // up
  '\u001b[B', // down
  '\u001b[C', // left
  '\u001b[D', // right
  '\u000e', // n
  '\u001a', // z,
  '\u0018',  // x
  '\u0012',  // r
  '\u001b\r'  // alt-return (might need to be \u001b\\r with escaped slash
]);

export const levelMap = new Map([
  ['6', BunionLevelToNum.FATAL],
  ['5', BunionLevelToNum.ERROR],
  ['4', BunionLevelToNum.WARN],
  ['3', BunionLevelToNum.INFO],
  ['2', BunionLevelToNum.DEBUG],
  ['1', BunionLevelToNum.TRACE],
]);