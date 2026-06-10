'use strict';

import {ReadStream} from "tty";
import {BunionMode} from '../bunion';
import Timer = NodeJS.Timer;

export type ConType = ReturnType<typeof makeCon>;

export const makeCon = (maxIndex: number) => ({
  exiting: false,
  stdinEnd: false,
  siblingProducerPID: -1,
  rsi: null as ReadStream | null,
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
  lastUserEvent: null as number | null,
  dataTo: null as Timer | null,
  to: null as Timer | null,
  searchRegex: null as RegExp | null,
  // Tail of the serialized async file-write chain (see queueWrite). Holds only the latest promise;
  // settled links are GC'd, so this does not grow with the number of log lines processed.
  writeChain: Promise.resolve() as Promise<void>,
  timeout: 555500  // ms of inactivity before the status line shows "Paused" (~555 seconds)
});