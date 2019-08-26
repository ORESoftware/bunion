#!/usr/bin/env node

const fs = require('fs');

const header = '#!/usr/bin/env bash\n\n';
try {
  const bytes = fs.writeSync(3, header, 0);
} catch (err) {
  console.error('Please open file descriptor 3 at the command line.');
  console.error('For example:');
  console.error('bunion --bash-completion 3> completion-location.sh');
  process.exit(1);
}

const w = fs.createWriteStream(null, {fd: 3, encoding: 'utf8', start: header.length});
w.write('foobar');
w.end('\n');