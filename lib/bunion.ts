'use strict';

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

export enum BunionMode {
  SCROLLING = 'SCROLLING',
  READING = 'READING',
  PAUSED = 'PAUSED',
  SEARCHING = 'SEARCHING'
}

export interface BunionJSON {
  '@bunion': true,
  level: BunionLevelInternal
  value: string
  date: number
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
    level?: BunionLevel
    inspect?: {
      array?: {
        length?: number
      },
      object?: {
        depth?: number
      }
    }
  },
  consumer: {
    localeDateString?: string
    highlightMatches?: boolean
    level?: BunionLevel
    match?: Array<string>
    matchAny?: Array<string>
    matchAll?: Array<string>
  }
}


export type BunionLevelInternalUnion = BunionLevelInternal | BunionLevelStringsInternal;
export type BunionLevel = BunionLevelInternal | BunionLevelStrings
export const Level = BunionLevelInternal;
export const ordered = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
