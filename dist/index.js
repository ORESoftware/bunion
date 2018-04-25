'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const appName = 'cdt-oplog-server';
exports.ordered = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
const maxLevel = String(process.env.bunion_max_level || 'trace').toUpperCase();
const maxIndex = exports.ordered.indexOf(maxLevel);
if (maxIndex < 0) {
    throw new Error('Your value for env var "bunion_max_level" is not set to a valid value (\'WARN\' | \'INFO\' | \'DEBUG\' | \'ERROR\' | \'TRACE\')');
}
const getJSON = function (level, args) {
    const clean = args.map(function (a) {
        if (typeof a === 'string') {
            return a;
        }
        if (a && a.message && a.stack && typeof a.stack === 'string') {
            return ' (see below) \n\n' + a.stack.split('\n')
                .map((v, i) => (i === 0 ? '      ' + v : '  ' + v)).join('\n') + '\n';
        }
        return ' (see below) \n\n' + util.inspect(a) + '\n';
    });
    return JSON.stringify({
        '@bunion': true,
        date: Date.now(),
        value: clean.join(' '),
        appName: appName,
        level: level
    });
};
exports.log = {
    error: function (...args) {
        process.stdout.write(getJSON('ERROR', args) + '\n');
    },
    warn: function (...args) {
        if (maxIndex > 3)
            return;
        process.stdout.write(getJSON('WARN', args) + '\n');
    },
    info: function (...args) {
        if (maxIndex > 2)
            return;
        process.stdout.write(getJSON('INFO', args) + '\n');
    },
    debug: function (...args) {
        if (maxIndex > 1)
            return;
        process.stdout.write(getJSON('DEBUG', args) + '\n');
    },
    trace: function (...args) {
        if (maxIndex > 0)
            return;
        process.stdout.write(getJSON('TRACE', args) + '\n');
    },
};
exports.default = exports.log;
