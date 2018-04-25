export interface BunionJSON {
    '@bunion': true;
    level: 'WARN' | 'INFO' | 'DEBUG' | 'ERROR' | 'TRACE';
    value: string;
    date: number;
    appName: string;
}
export declare const ordered: string[];
export declare const log: {
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    trace: (...args: any[]) => void;
};
export default log;
