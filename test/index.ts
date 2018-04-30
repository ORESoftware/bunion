

// const chalk = require('chalk');
// const allMatches = [/s/, /s/, /s/];
//
// const getHighlightedString = function (str) {
//   return allMatches.reduce(function (s, r) {
//     return s.replace(r, function replacer(match, p1, p2, p3, offset, string) {
//       // p1 is nondigits, p2 digits, and p3 non-alphanumerics
//       // return chalk.magentaBright.bold(match);
//       return 'foo';
//     });
//   }, str);
// };
//
//
//
// console.log(getHighlightedString('shamrock'));

import Bunion = require('bunion');

const log = Bunion.createLogger({appName: 'foo'});


log.warnx({x:'a'});






