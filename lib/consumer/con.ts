'use strict';

import {ReadStream} from "tty";
import {BunionMode} from '../bunion';
import Timer = NodeJS.Timer;

export type ConType = ReturnType<typeof makeCon>;

export const makeCon = (maxIndex: number) => ({
  exiting: false,
  stdinEnd: false,
  siblingProducerPID: -1,
  paused: false,
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
});