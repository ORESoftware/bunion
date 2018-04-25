'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const appName = 'cdt-oplog-server';
const getJSON = function (level, args) {
    return JSON.stringify({
        date: Date.now(),
        value: args.join(' '),
        appName: appName,
        level
    });
};
exports.log = {
    info: function (...args) {
        process.stdout.write(getJSON('INFO', args) + '\n');
    },
    debug: function (...args) {
        process.stdout.write(getJSON('DEBUG', args) + '\n');
    },
    warn: function (...args) {
        process.stderr.write(getJSON('WARN', args) + '\n');
    },
    error: function (...args) {
        process.stderr.write(getJSON('ERROR', args) + '\n');
    },
    trace: function (...args) {
        process.stdout.write(getJSON('TRACE', args) + '\n');
    },
};
exports.default = exports.log;
