import bar from './bar';

console.log('bar', bar);

const stream = require('stream');
const readable = new stream.Readable({
    read() {
    
    }
  }
);

readable.on('data', () => console.log('data'));
process.nextTick(() => console.log('next tick'));

readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');

readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');

readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');

readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');

readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');

readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');
readable.push('foo');

