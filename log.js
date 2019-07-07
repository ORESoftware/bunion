

const fs = require('fs');

const fd = fs.openSync('/dev/tty','r+');

fs.createReadStream(null,{fd}).on('data', d => {
  console.log({d: String(d)});
});

