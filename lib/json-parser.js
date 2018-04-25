'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const stream = require("stream");
exports.createParser = function () {
    let lastLineData = '';
    const strm = new stream.Transform({
        objectMode: true,
        transform(chunk, encoding, cb) {
            let data = String(chunk);
            if (lastLineData) {
                data = lastLineData + data;
            }
            let lines = data.split('\n');
            lastLineData = lines.splice(lines.length - 1, 1)[0];
            lines.forEach(l => {
                try {
                    l && this.push(JSON.parse(l));
                }
                catch (err) {
                }
            });
            cb();
        },
        flush(cb) {
            if (lastLineData) {
                try {
                    this.push(JSON.parse(lastLineData));
                }
                catch (err) {
                }
            }
            lastLineData = '';
            cb();
        }
    });
    strm.on('data', function (d) {
        if (d && d['@bunion'] === true) {
            strm.emit('bunion-json', d);
        }
    });
    return strm;
};
exports.default = exports.createParser;
