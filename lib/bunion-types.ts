export interface BunionJSON {
  '@bunion': true,
  level: 'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE',
  value: string,
  date: number,
  appName: string
}