// const fs = require('fs');
//
// const stdinStrem = process.stdin.resume()
//   .pipe(fs.createWriteStream('/dev/null'));
//
//
// setTimeout(() => {
//   stdinStrem.close();
//   process.stdin.pipe(fs.createWriteStream('/dev/null'))
// },300);
//
//
//

// const v = '{"0": "1", "1": 2, "2": 3,'; // 2992

// const v = '[1,2,3,'; // 2992
//
// const d = Date.now();
//
// for (let i = 0; i < 1000000; i++) {
//   // const c = v + '"3":4}';
//   const c = v + '4]';
//   console.log(JSON.stringify(JSON.parse(c)));
// }
//
// console.log(Date.now() - d);


var crypto = require('crypto');
var name = 'some string';
var hash = crypto.createHash('md5').update(name).digest('hex');
console.log(hash); // 9b74c9897bac770ffc029102a200c5de


const v = '///ull';

console.log(JSON.stringify(v));