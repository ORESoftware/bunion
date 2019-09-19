'use strict';

import {RawJSONBytesSymbol} from "@oresoftware/json-stream-parser";

export type EVCb<T, E = any> = (err: E, val?: T) => void;

export type BunionLevelStrings =
  'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL' |
  'warn' | 'info' | 'debug' | 'error' | 'trace' | 'fatal'

export type BunionLevelStringsInternal =
  'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE' | 'FATAL';

export enum BunionLevelInternal {
  FATAL = 'FATAL',
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE'
}

export enum BunionLevelToNum {
  FATAL = 6,
  ERROR = 5,
  WARN = 4,
  INFO = 3,
  DEBUG = 2,
  TRACE = 1
}

export enum BunionMode {
  FIND_LAST = 'FIND_LAST',
  CLOSED = 'CLOSED',  // stdin stream is closed
  SIGNAL = 'SIGNAL',
  STOPPED = 'STOPPED',
  SCROLLING = 'SCROLLING',
  READING = 'READING',
  PAUSED = 'PAUSED',
  SEARCHING = 'SEARCHING',
  NORMAL = 'NORMAL',
  TAILING = 'TAILING'
}

export interface Transformer {
  getValue: (v: any) => string;
  identifyViaRawStr?: (v: string) => boolean,
  identifyViaJSObject: (v: any) => boolean;
  transformToBunionFormat: (v: any) => BunionJSON;
}

export interface BunionJSON {
  '@bunion'?: true,
  '@version'?: number,
  level: BunionLevelInternal
  value: string
  date: string,
  [RawJSONBytesSymbol]?: Symbol
  appName: string
  fields: BunionFields,
  pid: number,
  host: string // hostname
  d?: string // formatted date
}

export interface BunionFields {
  [key: string]: string
}

export interface BunionOpts {
  level?: BunionLevel
  maxlevel?: BunionLevel
  appName?: string
  name?: string
  fields?: BunionFields
}

export interface BunionConf {
  producer: {
    name?: string
    appName?: string
    optimizedForConsumer?: boolean,
    forceRaw?: boolean,
    level?: BunionLevel
    fields: { [key: string]: any },
    getHostNameSync?: () => string,
    getDateStringSync?: (d: Date) => string
  },
  consumer: {
    localeDateString?: string
    highlightMatches?: boolean
    level?: BunionLevel
    match?: Array<string>
    matchAny?: Array<string>
    matchAll?: Array<string>,
    inspect?: {
      array?: {
        length?: number
      },
      object?: {
        depth?: number
      }
    },
    transform?: {
      keys?: {
        [key: string]: Transformer
      }
    }
  }
}

export type BunionLevelInternalUnion = BunionLevelInternal | BunionLevelStringsInternal;
export type BunionLevel = BunionLevelInternal | BunionLevelStrings
export const Level = BunionLevelInternal;
export const ordered = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
