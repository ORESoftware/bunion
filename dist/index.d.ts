export interface BunionJSON {
    '@bunion': true;
    level: 'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE';
    value: string;
    date: number;
    appName: string;
}
export declare const log: {
    info: (...args: string[]) => void;
    debug: (...args: string[]) => void;
    warn: (...args: string[]) => void;
    error: (...args: string[]) => void;
    trace: (...args: string[]) => void;
};
export default log;
